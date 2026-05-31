"use client";

import { useState } from "react";
import type { GenerateQuoteLineItem } from "@/lib/quote-types";

type LineItemCategory = GenerateQuoteLineItem["category"];

type QuoteHistoryRow = {
  id: string;
  created_at: string;
  total: number | null;
  subtotal: number | null;
  gst: number | null;
  line_items: unknown;
  assumptions: string[] | null;
  model_used: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
};

type Props = { quote: QuoteHistoryRow };

function isLineItemCategory(value: unknown): value is LineItemCategory {
  return (
    value === "materials" ||
    value === "labor" ||
    value === "subcontractor" ||
    value === "other"
  );
}

function isValidLineItem(value: unknown): value is GenerateQuoteLineItem {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.description === "string" &&
    isLineItemCategory(v.category) &&
    typeof v.amount_nzd === "number" &&
    Number.isFinite(v.amount_nzd)
  );
}

function parseLineItems(value: unknown): GenerateQuoteLineItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isValidLineItem);
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  const rtf = new Intl.RelativeTimeFormat("en-NZ", { numeric: "auto" });

  if (absMs < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }
  if (absMs < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }
  return rtf.format(Math.round(diffMs / day), "day");
}

function formatNzd(amount: number) {
  return `NZ$ ${amount.toLocaleString("en-NZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Build a clean, customer-ready plain-text version of the quote for the trade
// owner to paste straight into an email or text message.
function buildQuoteText(
  quote: QuoteHistoryRow,
  lineItems: GenerateQuoteLineItem[],
): string {
  const date = new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium" }).format(
    new Date(quote.created_at),
  );
  const assumptions = quote.assumptions ?? [];

  const lines: string[] = [`Quote — ${date}`, ""];

  for (const item of lineItems) {
    lines.push(`- ${item.description} (${item.category}): ${formatNzd(item.amount_nzd)}`);
  }

  lines.push(
    "",
    `Subtotal: ${formatNzd(quote.subtotal ?? 0)}`,
    `GST (15%): ${formatNzd(quote.gst ?? 0)}`,
    `Total: ${formatNzd(quote.total ?? 0)}`,
  );

  if (assumptions.length > 0) {
    lines.push("", "Assumptions:");
    for (const a of assumptions) {
      lines.push(`- ${a}`);
    }
  }

  return lines.join("\n");
}

function categoryBadgeClass(category: LineItemCategory) {
  switch (category) {
    case "materials":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "labor":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "subcontractor":
      return "bg-violet-500/15 text-violet-300 border-violet-500/30";
    case "other":
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  }
}

export default function QuoteHistoryCard({ quote }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const lineItems = parseLineItems(quote.line_items);
  const itemLabel = `${lineItems.length} item${lineItems.length === 1 ? "" : "s"}`;
  const assumptions = quote.assumptions ?? [];
  const hasTokens = quote.input_tokens !== null || quote.output_tokens !== null;

  async function handleCopy() {
    const text = buildQuoteText(quote, lineItems);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — fall back to
      // a prompt so the user can still copy the text manually.
      window.prompt("Copy this quote:", text);
    }
  }

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/30">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-zinc-900/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-zinc-300">{formatRelativeTime(quote.created_at)}</span>
            <span className="font-semibold text-zinc-100">
              {formatNzd(quote.total ?? 0)}
            </span>
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            <span>{itemLabel}</span>
            {quote.model_used ? <span className="ml-3">{quote.model_used}</span> : null}
          </div>
        </div>
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`mt-1 shrink-0 text-zinc-500 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded ? (
        <div className="border-t border-zinc-800 px-4 py-4">
          {lineItems.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-zinc-800">
              <table className="w-full text-left text-xs text-zinc-200">
                <thead className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide">
                      Description
                    </th>
                    <th className="px-3 py-2 font-medium uppercase tracking-wide">
                      Category
                    </th>
                    <th className="px-3 py-2 text-right font-medium uppercase tracking-wide">
                      Amount (NZD)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr
                      key={`${item.description}-${idx}`}
                      className="border-b border-zinc-800/80 last:border-b-0"
                    >
                      <td className="px-3 py-2 text-zinc-100">{item.description}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${categoryBadgeClass(
                            item.category,
                          )}`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatNzd(item.amount_nzd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Could not parse line items.</p>
          )}

          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-3 text-xs text-zinc-300">
            <div className="flex justify-between gap-4">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatNzd(quote.subtotal ?? 0)}</span>
            </div>
            <div className="mt-1.5 flex justify-between gap-4">
              <span>GST (15%)</span>
              <span className="tabular-nums">{formatNzd(quote.gst ?? 0)}</span>
            </div>
            <div className="mt-1.5 flex justify-between gap-4 font-semibold text-white">
              <span>Total</span>
              <span className="tabular-nums">{formatNzd(quote.total ?? 0)}</span>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700/60"
            >
              {copied ? "Copied!" : "Copy quote"}
            </button>
          </div>

          {assumptions.length > 0 ? (
            <div className="mt-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                Assumptions
              </h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-zinc-300">
                {assumptions.map((a, idx) => (
                  <li key={`${idx}-${a.slice(0, 16)}`}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasTokens ? (
            <div className="mt-3 text-[11px] text-zinc-500">
              Tokens: {quote.input_tokens ?? 0} in / {quote.output_tokens ?? 0} out
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
