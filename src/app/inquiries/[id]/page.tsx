import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/utils/supabase/server";
import { updateInquiryStatus } from "../actions";
import DeleteInquiryButton from "./DeleteInquiryButton";
import GenerateQuoteSection from "./GenerateQuoteSection";
import QuoteHistoryCard from "./QuoteHistoryCard";

type InquiryStatus = "new" | "quoted" | "accepted" | "declined" | "archived";

const INQUIRY_STATUSES: InquiryStatus[] = [
  "new",
  "quoted",
  "accepted",
  "declined",
  "archived",
];

type Inquiry = {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  status: InquiryStatus;
  created_at: string;
};

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

type InquiryDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function statusClasses(status: InquiryStatus) {
  switch (status) {
    case "new":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "quoted":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    case "accepted":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "declined":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "archived":
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  }
}

function formatBudget(min: number | null, max: number | null) {
  if (min !== null && max !== null) {
    return `NZ$ ${min.toLocaleString()} - NZ$ ${max.toLocaleString()}`;
  }
  if (min !== null) {
    return `NZ$ ${min.toLocaleString()}+`;
  }
  return null;
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

export default async function InquiryDetailPage({
  params,
  searchParams,
}: InquiryDetailPageProps) {
  const { id } = await params;
  const queryParams = (await searchParams) ?? {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase.from("inquiries").select("*").eq("id", id).single();

  if (error || !data) {
    notFound();
  }

  const inquiry = data as Inquiry;
  const budgetLabel = formatBudget(inquiry.budget_min, inquiry.budget_max);

  const { data: quotesData, error: quotesError } = await supabase
    .from("quotes")
    .select("id, created_at, total, subtotal, gst, line_items, assumptions, model_used, input_tokens, output_tokens")
    .eq("inquiry_id", id)
    .order("created_at", { ascending: false });

  if (quotesError) {
    throw new Error(quotesError.message);
  }

  const quotes = (quotesData ?? []) as QuoteHistoryRow[];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <AppHeader />
      <main className="flex-1 px-6 py-12">
        <section className="mx-auto w-full max-w-4xl">
        <Link href="/dashboard" className="text-sm text-zinc-400 transition hover:text-zinc-200">
          ← Back to Dashboard
        </Link>

        {queryParams.error ? (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {queryParams.error}
          </p>
        ) : null}

        <article className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusClasses(
                  inquiry.status,
                )}`}
              >
                {inquiry.status}
              </span>

              <form
                action={updateInquiryStatus}
                className="flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="id" value={inquiry.id} />
                <select
                  name="status"
                  defaultValue={inquiry.status}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
                >
                  {INQUIRY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700/60"
                >
                  Update
                </button>
              </form>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/inquiries/${inquiry.id}/edit`}
                className="inline-flex items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700/60"
              >
                Edit
              </Link>
              <DeleteInquiryButton inquiryId={inquiry.id} />
            </div>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">{inquiry.title}</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-300">{inquiry.description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
            {budgetLabel ? <span>{budgetLabel}</span> : null}
            <span>{formatRelativeTime(inquiry.created_at)}</span>
          </div>
        </article>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
          <h2 className="text-xl font-semibold tracking-tight">Quotes</h2>
          {quotes.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Quote History
              </h3>
              <div className="mt-3 space-y-3">
                {quotes.map((quote) => (
                  <QuoteHistoryCard key={quote.id} quote={quote} inquiryId={id} />
                ))}
              </div>
            </div>
          ) : null}
          <GenerateQuoteSection inquiryId={id} />
        </section>
        </section>
      </main>
    </div>
  );
}
