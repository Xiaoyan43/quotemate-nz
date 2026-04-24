import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type SignupPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = (await searchParams) ?? {};

  async function signup(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!email || !password || !confirmPassword) {
      redirect("/signup?error=Please%20fill%20in%20all%20fields");
    }

    if (password !== confirmPassword) {
      redirect("/signup?error=Passwords%20do%20not%20match");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/login?message=Check%20your%20email%20to%20confirm%20your%20account");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
        <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Start using AI-powered quoting for your tradie business.
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

        <form action={signup} className="mt-6 space-y-4">
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
              placeholder="Create a password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm text-zinc-300">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-200"
          >
            Sign up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-white hover:text-zinc-200">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
