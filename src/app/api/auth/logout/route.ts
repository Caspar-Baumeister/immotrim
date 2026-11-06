import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSessionUser } from "@/lib/firebase/session";
import { adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST() {
  const user = await getSessionUser();
  // Ends every session of this user, not only this browser's cookie.
  if (user) await adminAuth().revokeRefreshTokens(user.uid).catch(() => {});
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
