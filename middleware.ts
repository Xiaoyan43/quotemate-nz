import { type NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { updateSession } from "@/utils/supabase/middleware";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);

function normalizePathname(pathname: string): string {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export async function middleware(request: NextRequest) {
  const authSink: { user: User | null } = { user: null };
  const supabaseResponse = await updateSession(request, authSink);
  const { user } = authSink;
  const pathname = normalizePathname(request.nextUrl.pathname);

  const url = request.nextUrl.clone();

  if (!user && !isPublicPath(pathname)) {
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    url.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
