import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export default async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="shrink-0 border-b border-zinc-800/50 px-6 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-white transition hover:text-zinc-200"
        >
          QuoteMate NZ
        </Link>
        <div className="flex items-center justify-end gap-3">
          {user ? (
            <>
              <span className="hidden max-w-[220px] truncate text-sm text-zinc-400 sm:inline">
                {user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md border border-zinc-600 bg-transparent px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-400 hover:bg-zinc-800/60"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-zinc-300 transition hover:text-white">
                Log in
              </Link>
              <Link href="/signup" className="text-sm text-zinc-300 transition hover:text-white">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
