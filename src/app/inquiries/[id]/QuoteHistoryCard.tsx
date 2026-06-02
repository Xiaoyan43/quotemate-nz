"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GenerateQuoteLineItem } from "@/lib/quote-types";
import { deleteQuote, updateQuoteLineItems } from "../actions";

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

type EditItem = {
  description: string;
  category: LineItemCategory;
  amount_nzd: string;
};

type Props = { quote: QuoteHistoryRow; inquiryId: string };

const CATEGORIES: LineItemCategory[] = ["materials", "labor", "subcontractor", "other"];

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

  if (absMs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
  if (absMs < day) return rtf.format(Math.round(diffMs / hour), "hour");
  return rtf.format(Math.round(diffMs / day), "day");
}

function formatNzd(amount: number) {
  return `NZ$ ${amount.toLocaleString("en-NZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
    for (const a of assumptions) lines.push(`- ${a}`);
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

function computeTotals(items: EditItem[]) {
  const subtotal = items.reduce((s, it) => {
    const v = parseFloat(it.amount_nzd);
    return s + (Number.isFinite(v) ? v : 0);
  }, 0);
  const gst = Math.round(subtotal * 0.15 * 100) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;
  return { subtotal, gst, total };
}

function toEditItems(lineItems: GenerateQuoteLineItem[]): EditItem[] {
  return lineItems.map((li) => ({
    description: li.description,
    category: li.category,
    amount_nzd: li.amount_nzd.toString(),
  }));
}

export default function QuoteHistoryCard({ quote, inquiryId }: Props) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const lineItems = parseLineItems(quote.line_items);
  const itemLabel = `${lineItems.length} item${lineItems.length === 1 ? "" : "s"}`;
  const assumptions = quote.assumptions ?? [];
  const hasTokens = quote.input_tokens !== null || quote.output_tokens !== null;

  function enterEditMode() {
    setEditItems(toEditItems(lineItems));
    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setSaveError(null);
  }

  async function handleCopy() {
    const text = buildQuoteText(quote, lineItems);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this quote:", text);
    }
  }

  async function handleSave() {
    setSaveError(null);
    setIsSaving(true);

    const parsed: GenerateQuoteLineItem[] = editItems.map((it) => ({
      description: it.description.trim(),
      category: it.category,
      amount_nzd: parseFloat(it.amount_nzd),
    }));

    const result = await updateQuoteLineItems(quote.id, inquiryId, parsed);

    setIsSaving(false);

    if (result?.error) {
      setSaveError(result.error);
      return;
    }

    setIsEditing(false);
    router.refresh();
  }

  function updateItem(idx: number, field: keyof EditItem, value: string) {
    setEditItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    );
  }

  function removeItem(idx: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setEditItems((prev) => [
      ...prev,
      { description: "", category: "materials", amount_nzd: "" },
    ]);
  }

  const { subtotal: editSubtotal, gst: editGst, total: editTotal } = computeTotals(editItems);

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
          className={`mt-1 shrink-0 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded ? (
        <div className="border-t border-zinc-800 px-4 py-4">
          {isEditing ? (
            <EditTable
              items={editItems}
              subtotal={editSubtotal}
              gst={editGst}
              total={editTotal}
              isSaving={isSaving}
              saveError={saveError}
              onUpdate={updateItem}
              onRemove={removeItem}
              onAdd={addItem}
              onSave={() => { void handleSave(); }}
              onCancel={cancelEdit}
            />
          ) : (
            <>
              {lineItems.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-zinc-800">
                  <table className="w-full text-left text-xs text-zinc-200">
                    <thead className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                      <tr>
                        <th className="px-3 py-2 font-medium uppercase tracking-wide">Description</th>
                        <th className="px-3 py-2 font-medium uppercase tracking-wide">Category</th>
                        <th className="px-3 py-2 text-right font-medium uppercase tracking-wide">Amount (NZD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={`${item.description}-${idx}`} className="border-b border-zinc-800/80 last:border-b-0">
                          <td className="px-3 py-2 text-zinc-100">{item.description}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${categoryBadgeClass(item.category)}`}>
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

              <div className="mt-3 flex items-center justify-between gap-2">
                <form
                  action={deleteQuote}
                  onSubmit={(event) => {
                    if (!window.confirm("Delete this quote? This cannot be undone.")) {
                      event.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="inquiryId" value={inquiryId} />
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </form>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={enterEditMode}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700/60"
                  >
                    Edit
                  </button>
                  <a
                    href={`/quotes/${quote.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700/60"
                  >
                    Download PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => { void handleCopy(); }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700/60"
                  >
                    {copied ? (
                      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      </svg>
                    )}
                    {copied ? "Copied!" : "Copy quote"}
                  </button>
                </div>
              </div>

              {assumptions.length > 0 ? (
                <div className="mt-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Assumptions</h4>
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
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

type EditTableProps = {
  items: EditItem[];
  subtotal: number;
  gst: number;
  total: number;
  isSaving: boolean;
  saveError: string | null;
  onUpdate: (idx: number, field: keyof EditItem, value: string) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
  onSave: () => void;
  onCancel: () => void;
};

function EditTable({
  items,
  subtotal,
  gst,
  total,
  isSaving,
  saveError,
  onUpdate,
  onRemove,
  onAdd,
  onSave,
  onCancel,
}: EditTableProps) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="w-full text-left text-xs text-zinc-200">
          <thead className="border-b border-zinc-700 bg-zinc-900/60 text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-medium uppercase tracking-wide">Description</th>
              <th className="w-36 px-3 py-2 font-medium uppercase tracking-wide">Category</th>
              <th className="w-32 px-3 py-2 text-right font-medium uppercase tracking-wide">Amount (NZD)</th>
              <th className="w-8 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-zinc-800/80 last:border-b-0">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => onUpdate(idx, "description", e.target.value)}
                    placeholder="Line item description"
                    className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/40"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={item.category}
                    onChange={(e) => onUpdate(idx, "category", e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/40"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount_nzd}
                    onChange={(e) => onUpdate(idx, "amount_nzd", e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-right text-xs text-white outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/40"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    disabled={items.length <= 2}
                    aria-label="Remove line item"
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length < 6 && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 text-xs text-zinc-400 transition hover:text-zinc-200"
        >
          + Add line item
        </button>
      )}

      <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-3 text-xs text-zinc-300">
        <div className="flex justify-between gap-4">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatNzd(subtotal)}</span>
        </div>
        <div className="mt-1.5 flex justify-between gap-4">
          <span>GST (15%)</span>
          <span className="tabular-nums">{formatNzd(gst)}</span>
        </div>
        <div className="mt-1.5 flex justify-between gap-4 font-semibold text-white">
          <span>Total</span>
          <span className="tabular-nums">{formatNzd(total)}</span>
        </div>
      </div>

      {saveError ? (
        <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {saveError}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-full border border-zinc-600 px-4 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-400 hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
