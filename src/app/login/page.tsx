import Link from "next/link";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { createClient } from "@/utils/supabase/server";
import { demoSignIn } from "@/app/(auth)/actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};

  async function login(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      redirect("/login?error=Please%20enter%20email%20and%20password");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <AppHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Log in to continue managing quotes with QuoteMate NZ.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {params.error}
          </p>
        ) : null}

        {params.message ? (
          <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {params.message}
          </p>
        ) : null}

        <form action={login} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-zinc-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-zinc-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
          >
            Log in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          New to QuoteMate NZ?{" "}
          <Link href="/signup" className="font-medium text-white hover:text-zinc-200">
            Create an account
          </Link>
        </p>

        {process.env.DEMO_EMAIL && process.env.DEMO_PASSWORD && (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-700" />
              <span className="text-xs text-zinc-500">or</span>
              <div className="h-px flex-1 bg-zinc-700" />
            </div>
            <form action={demoSignIn} className="mt-4">
              <button
                type="submit"
                className="w-full rounded-full border border-zinc-600 bg-transparent px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-400 hover:bg-zinc-800/60"
              >
                Try demo — no signup required
              </button>
            </form>
          </>
        )}
        </section>
      </main>
    </div>
  );
}
