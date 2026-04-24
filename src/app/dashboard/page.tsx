import Link from "next/link";
import { redirect } from "next/navigation";
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

function formatBudget(min: number | null, max: number | null) {
  if (min !== null && max !== null) {
    return `NZ$ ${min.toLocaleString()} - ${max.toLocaleString()}`;
  }
  if (min !== null) {
    return `NZ$ ${min.toLocaleString()}+`;
  }
  return null;
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("inquiries")
    .select("id, title, description, budget_min, budget_max, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const inquiries = (data ?? []) as Inquiry[];
  const email = user.email ?? "there";

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <section className="mx-auto w-full max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="mt-3 text-lg text-zinc-300">Welcome back, {email}</p>
          </div>
          <Link
            href="/inquiries/new"
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
          >
            + New inquiry
          </Link>
        </div>

        <div className="mt-8 space-y-4">
          {inquiries.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-zinc-300">
              No inquiries yet. Create your first one!
            </div>
          ) : (
            inquiries.map((inquiry) => {
              const budgetLabel = formatBudget(inquiry.budget_min, inquiry.budget_max);

              return (
                <article
                  key={inquiry.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-[0_0_30px_rgba(0,0,0,0.2)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-white">{inquiry.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{inquiry.description}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusClasses(
                        inquiry.status,
                      )}`}
                    >
                      {inquiry.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
                    {budgetLabel ? <span>{budgetLabel}</span> : null}
                    <span>{formatCreatedAt(inquiry.created_at)}</span>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
