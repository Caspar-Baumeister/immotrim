import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

// Paths that require an authenticated session (optimistic check).
// Secure entitlement check happens in src/app/(app)/layout.tsx.
const APP_PATHS = [
  "/dashboard",
  "/haushalt",
  "/stammdaten",
  "/strategie",
  "/banken",
  "/checklist",
  "/objekte",
  "/portfolio",
  "/wishlist",
  "/property",
  "/account",
];

export default async function proxy(req: NextRequest) {
  const { response, user } = await updateSession(req);

  const path = req.nextUrl.pathname;
  const isAppPath = APP_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  // Optimistic gate: unauthenticated user trying to enter a gated path → bounce to landing.
  if (isAppPath && !user) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
