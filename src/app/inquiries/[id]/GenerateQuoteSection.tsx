"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateQuote } from "@/app/inquiries/actions";
import type {
  GenerateQuoteLineItem,
  GenerateQuoteSuccess,
  StreamSummaryRequest,
} from "@/lib/quote-types";

type GeneratedQuote = GenerateQuoteSuccess["quote"];

type GenerateState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "streaming"; quote: GeneratedQuote; summary: string }
  | { status: "done"; quote: GeneratedQuote; summary: string }
  | { status: "error"; message: string };

type Props = { inquiryId: string };

async function readStreamErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (
      data !== null &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
    ) {
      return (data as { error: string }).error;
    }
  } catch {
    // not JSON or empty body
  }
  return `Failed to stream summary (status: ${res.status})`;
}

function categoryBadgeClass(category: GenerateQuoteLineItem["category"]) {
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

function formatMoney(n: number) {
  return `NZ$ ${n.toLocaleString("en-NZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function QuoteTable({ quote }: { quote: GeneratedQuote }) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
      <table className="w-full text-left text-sm text-zinc-200">
        <thead className="border-b border-zinc-800 bg-zinc-950/50 text-xs font-medium uppercase tracking-wide text-zinc-400">
          <tr>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Amount (NZD)</th>
          </tr>
        </thead>
        <tbody>
          {quote.line_items.map((item, idx) => (
            <tr
              key={`${item.description}-${idx}`}
              className="border-b border-zinc-800/80 last:border-b-0"
            >
              <td className="px-4 py-3 text-zinc-100">{item.description}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${categoryBadgeClass(
                    item.category,
                  )}`}
                >
                  {item.category}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatMoney(item.amount_nzd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-300">
        <div className="flex justify-between gap-4">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney(quote.subtotal_nzd)}</span>
        </div>
        <div className="mt-2 flex justify-between gap-4">
          <span>GST (15%)</span>
          <span className="tabular-nums">{formatMoney(quote.gst_nzd)}</span>
        </div>
        <div className="mt-2 flex justify-between gap-4 font-semibold text-white">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney(quote.total_nzd)}</span>
        </div>
      </div>
      <div className="border-t border-zinc-800 px-4 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Assumptions
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-300">
          {quote.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function GenerateQuoteSection({ inquiryId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<GenerateState>({ status: "idle" });

  async function handleGenerate() {
    setState({ status: "generating" });

    try {
      const result = await generateQuote(inquiryId);

      if (!result.ok) {
        setState({ status: "error", message: result.error });
        return;
      }

      const quote = result.quote;
      setState({ status: "streaming", quote, summary: "" });

      const body: StreamSummaryRequest = {
        inquiry_id: inquiryId,
        line_items: quote.line_items,
        total_nzd: quote.total_nzd,
        assumptions: quote.assumptions,
      };

      const res = await fetch("/api/quotes/stream-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = await readStreamErrorMessage(res);
        setState({ status: "error", message: msg });
        return;
      }

      if (!res.body) {
        setState({
          status: "error",
          message: `Failed to stream summary (status: ${res.status})`,
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        accumulated += decoder.decode(value, { stream: true });
        setState({ status: "streaming", quote, summary: accumulated });
      }

      accumulated += decoder.decode();
      setState({ status: "done", quote, summary: accumulated });
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: "error", message });
    }
  }

  return (
    <div className="mt-4">
      {state.status === "idle" && (
        <button
          type="button"
          onClick={() => {
            void handleGenerate();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-600 bg-zinc-800/60 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-800"
        >
          🤖 Generate AI Quote Draft
        </button>
      )}

      {state.status === "generating" && (
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/60 px-5 py-2.5 text-sm font-semibold text-zinc-400"
        >
          <span
            className="h-4 w-4 shrink-0 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin"
            aria-hidden
          />
          Drafting quote...
        </button>
      )}

      {state.status === "streaming" && (
        <>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/60 px-5 py-2.5 text-sm font-semibold text-zinc-400"
          >
            Streaming summary...
          </button>
          <QuoteTable quote={state.quote} />
          <div className="mt-6 max-w-2xl">
            <p className="text-base leading-relaxed text-zinc-200 md:text-lg whitespace-pre-wrap">
              {state.summary}
              <span className="inline-block animate-pulse text-zinc-400">▋</span>
            </p>
          </div>
        </>
      )}

      {state.status === "done" && (
        <>
          <button
            type="button"
            onClick={() => {
              void handleGenerate();
            }}
            className="inline-flex items-center justify-center rounded-full border border-zinc-600 bg-zinc-800/60 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-800"
          >
            Regenerate
          </button>
          <QuoteTable quote={state.quote} />
          <div className="mt-6 max-w-2xl">
            <p className="text-base leading-relaxed text-zinc-200 md:text-lg whitespace-pre-wrap">
              {state.summary}
            </p>
          </div>
        </>
      )}

      {state.status === "error" && (
        <div className="mt-2 space-y-3">
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {state.message}
          </p>
          <button
            type="button"
            onClick={() => {
              void handleGenerate();
            }}
            className="inline-flex items-center justify-center rounded-full border border-zinc-600 bg-zinc-800/60 px-5 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-800"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
