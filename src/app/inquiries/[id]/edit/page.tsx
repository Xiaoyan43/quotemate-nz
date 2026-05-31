import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/utils/supabase/server";
import { updateInquiry } from "../../actions";

type EditInquiryPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

type EditableInquiry = {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
};

export default async function EditInquiryPage({
  params,
  searchParams,
}: EditInquiryPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("inquiries")
    .select("id, title, description, budget_min, budget_max")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const inquiry = data as EditableInquiry;
  const queryParams = (await searchParams) ?? {};

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
          <Link
            href={`/inquiries/${inquiry.id}`}
            className="text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            ← Back to inquiry
          </Link>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Edit inquiry</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Update the details for this customer inquiry.
          </p>

          {queryParams.error ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {queryParams.error}
            </p>
          ) : null}

          <form action={updateInquiry} className="mt-6 space-y-4">
            <input type="hidden" name="id" value={inquiry.id} />

            <div>
              <label htmlFor="title" className="mb-2 block text-sm text-zinc-300">
                Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={inquiry.title}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
                placeholder="e.g. Kitchen renovation quote request"
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-2 block text-sm text-zinc-300">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={5}
                defaultValue={inquiry.description}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
                placeholder="Describe the job scope, timeline, and customer notes"
              />
            </div>

            <div>
              <label htmlFor="budgetMin" className="mb-2 block text-sm text-zinc-300">
                Budget min (NZ$)
              </label>
              <input
                id="budgetMin"
                name="budgetMin"
                type="number"
                step="0.01"
                min="0"
                defaultValue={inquiry.budget_min ?? ""}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="budgetMax" className="mb-2 block text-sm text-zinc-300">
                Budget max (NZ$)
              </label>
              <input
                id="budgetMax"
                name="budgetMax"
                type="number"
                step="0.01"
                min="0"
                defaultValue={inquiry.budget_max ?? ""}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
                placeholder="Optional"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
            >
              Save changes
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
