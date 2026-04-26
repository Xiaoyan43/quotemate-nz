import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctaHref = user ? "/dashboard" : "/login";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <AppHeader />

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <section className="w-full max-w-5xl text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">QuoteMate NZ</h1>
          <p className="mt-6 text-lg text-zinc-300 sm:text-xl">
            AI quoting assistant for New Zealand trade businesses
          </p>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]">
              <div className="text-2xl">💬</div>
              <h2 className="mt-4 text-lg font-semibold text-white">Quote in 30 seconds</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                New inquiry comes in — AI drafts a structured quote, ready for your review
              </p>
            </article>

            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]">
              <div className="text-2xl">📧</div>
              <h2 className="mt-4 text-lg font-semibold text-white">Never miss a follow-up</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                No reply in three days? We'll remind you to follow up
              </p>
            </article>

            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]">
              <div className="text-2xl">📊</div>
              <h2 className="mt-4 text-lg font-semibold text-white">Pipeline at a glance</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                New, quoting, won — one board to track them all
              </p>
            </article>
          </div>
          <Link
            href={ctaHref}
            className="mt-12 inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Get started
          </Link>
        </section>
      </main>
    </div>
  );
}
