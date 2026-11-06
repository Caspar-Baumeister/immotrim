import { NextResponse, type NextRequest } from "next/server";

// Paths that require a login (optimistic check on the cookie only; the (app)
// layout verifies the session for real).
const APP_PATHS = ["/dashboard", "/portfolio", "/property", "/bankuebersicht", "/account"];

export default function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isAppPath = APP_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  if (isAppPath && !req.cookies.has("__session")) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|__|.*\\..*).*)"],
};
