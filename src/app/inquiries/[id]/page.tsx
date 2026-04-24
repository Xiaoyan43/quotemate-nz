import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type InquiryStatus = "new" | "quoted" | "accepted" | "declined" | "archived";

type Inquiry = {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  status: InquiryStatus;
  created_at: string;
};

type InquiryDetailPageProps = {
  params: Promise<{ id: string }>;
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
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
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

export default async function InquiryDetailPage({ params }: InquiryDetailPageProps) {
  const { id } = await params;

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

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto w-full max-w-4xl">
        <Link href="/dashboard" className="text-sm text-zinc-400 transition hover:text-zinc-200">
          ← Back to Dashboard
        </Link>

        <article className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusClasses(
              inquiry.status,
            )}`}
          >
            {inquiry.status}
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">{inquiry.title}</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-300">{inquiry.description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
            {budgetLabel ? <span>{budgetLabel}</span> : null}
            <span>{formatRelativeTime(inquiry.created_at)}</span>
          </div>
        </article>

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
          <h2 className="text-xl font-semibold tracking-tight">Quotes</h2>
          <p className="mt-3 text-sm text-zinc-300">No quote generated yet.</p>

          <button
            type="button"
            disabled
            className="mt-5 inline-flex cursor-not-allowed items-center justify-center rounded-full border border-zinc-700 bg-zinc-800/60 px-5 py-2.5 text-sm font-semibold text-zinc-300"
          >
            🤖 Generate AI Quote Draft
          </button>
          <p className="mt-2 text-xs text-zinc-500">AI integration coming soon</p>
        </section>
      </section>
    </main>
  );
}
