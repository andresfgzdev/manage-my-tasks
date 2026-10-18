import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// A fast first filter from the cookie alone (D16): no database call here. The app
// layout checks the session for real, and the API answers 401 on its own. /login is
// not handled here: with a stale cookie, sending it to the app would loop.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  // Prefetches skip it (Next's documented pattern): a signed-out landing page would
  // otherwise bounce every app link it prefetches through a redirect.
  matcher: [
    {
      source: "/(today|next|inbox|week)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
