import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "there";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-white">
      <section className="w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-4 text-lg text-zinc-300">Welcome back, {email}</p>
        <p className="mt-6 text-sm leading-7 text-zinc-400">
          This is where you&apos;ll manage quotes, customers, and inquiries. Coming soon.
        </p>
        <Link
          href="/"
          className="mt-10 inline-flex items-center justify-center rounded-full border border-zinc-600 px-6 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-800/60"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
