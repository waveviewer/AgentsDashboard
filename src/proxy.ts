import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Proxy guarding the dashboard (Next.js 16's renamed `middleware`). This is an
 * *optimistic* check — it only verifies a session cookie is present, which is
 * cheap and runs on every request. Full session validation still happens in each
 * server component / API route via requireSession(); never trust this check
 * alone for authorization.
 */
export function proxy(request: NextRequest) {
  const hasSession = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Already authenticated users shouldn't see the login page.
  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Dashboard requires a session cookie; bounce to login otherwise.
  if (pathname.startsWith("/dashboard") && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
