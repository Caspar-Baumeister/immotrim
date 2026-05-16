import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intl = createIntlMiddleware(routing);

// Paths under /[locale] that require an authenticated session (optimistic check).
// Secure entitlement check happens in src/app/[locale]/(app)/layout.tsx.
const APP_PATHS = ["/portfolio", "/wishlist", "/property", "/account"];

function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(en|de)(\/.*)?$/);
  return m ? (m[2] ?? "/") : pathname;
}

function getLocale(pathname: string): string {
  const m = pathname.match(/^\/(en|de)(?:\/|$)/);
  return m ? m[1] : routing.defaultLocale;
}

export default async function proxy(req: NextRequest) {
  const { response: sessionResponse, user } = await updateSession(req);

  const path = req.nextUrl.pathname;
  const localePath = stripLocale(path);
  const locale = getLocale(path);
  const isAppPath = APP_PATHS.some((p) => localePath === p || localePath.startsWith(`${p}/`));

  // Optimistic gate: unauthenticated user trying to enter a gated path → bounce to landing.
  if (isAppPath && !user) {
    return NextResponse.redirect(new URL(`/${locale}`, req.nextUrl));
  }

  // Run next-intl on the same request, then merge the auth cookies into its response.
  const intlResponse = intl(req);
  for (const cookie of sessionResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie);
  }
  return intlResponse;
}

export const config = {
  matcher: [
    "/",
    "/(de|en)/:path*",
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
