import { notFound, redirect } from "next/navigation";
import type { GenerateQuoteLineItem } from "@/lib/quote-types";
import { createClient } from "@/utils/supabase/server";
import PrintActions from "./PrintActions";

type LineItemCategory = GenerateQuoteLineItem["category"];

type PrintQuotePageProps = {
  params: Promise<{ quoteId: string }>;
};

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

function formatNzd(amount: number) {
  return `NZ$ ${amount.toLocaleString("en-NZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function PrintQuotePage({ params }: PrintQuotePageProps) {
  const { quoteId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // RLS scopes this to the owner; only the user's own quote is returned.
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, inquiry_id, created_at, subtotal, gst, total, line_items, assumptions")
    .eq("id", quoteId)
    .single();

  if (error || !quote) {
    notFound();
  }

  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("title")
    .eq("id", quote.inquiry_id)
    .single();

  const lineItems = parseLineItems(quote.line_items);
  const assumptions = (quote.assumptions ?? []) as string[];
  const issuedOn = new Intl.DateTimeFormat("en-NZ", { dateStyle: "long" }).format(
    new Date(quote.created_at),
  );
  const reference = quote.id.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-2xl px-8 py-10 print:px-0 print:py-0">
        <PrintActions />

        <header className="flex items-start justify-between border-b border-zinc-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">QuoteMate NZ</h1>
            <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
          </div>
          <div className="text-right text-sm text-zinc-600">
            <p className="font-semibold text-zinc-900">Quote</p>
            <p className="mt-1">Ref: {reference}</p>
            <p>{issuedOn}</p>
          </div>
        </header>

        {inquiry?.title ? (
          <section className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Re
            </p>
            <p className="mt-1 text-lg font-semibold">{inquiry.title}</p>
          </section>
        ) : null}

        <section className="mt-8">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-300 text-xs uppercase tracking-wide text-zinc-500">
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 text-right font-medium">Amount (NZD)</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={`${item.description}-${idx}`} className="border-b border-zinc-100">
                  <td className="py-2.5 pr-4">{item.description}</td>
                  <td className="py-2.5 pr-4 capitalize text-zinc-600">{item.category}</td>
                  <td className="py-2.5 text-right tabular-nums">
                    {formatNzd(item.amount_nzd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto w-full max-w-xs text-sm">
            <div className="flex justify-between py-1">
              <span className="text-zinc-600">Subtotal</span>
              <span className="tabular-nums">{formatNzd(quote.subtotal ?? 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-600">GST (15%)</span>
              <span className="tabular-nums">{formatNzd(quote.gst ?? 0)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-zinc-300 py-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatNzd(quote.total ?? 0)}</span>
            </div>
          </div>
        </section>

        {assumptions.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Assumptions
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {assumptions.map((a, idx) => (
                <li key={`${idx}-${a.slice(0, 16)}`}>{a}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="mt-10 border-t border-zinc-200 pt-6 text-xs text-zinc-500">
          This is a draft quote for review. All amounts are in NZD and include 15% GST
          where shown. Prepared with QuoteMate NZ.
        </footer>
      </div>
    </div>
  );
}
