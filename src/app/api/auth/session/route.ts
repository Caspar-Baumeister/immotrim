import { NextResponse } from "next/server";
import { createSessionCookie, cookieOptions, SESSION_COOKIE } from "@/lib/firebase/session";
import { ensureUserDoc } from "@/lib/data/users";

export const runtime = "nodejs";

// Trades a fresh Firebase ID token for the httpOnly session cookie.
export async function POST(request: Request) {
  let idToken: string | undefined;
  try {
    idToken = (await request.json())?.idToken;
  } catch {}
  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const { user, cookie } = await createSessionCookie(idToken);
    await ensureUserDoc(user.uid, user.email);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, cookie, cookieOptions);
    return res;
  } catch (e) {
    console.error("[session] could not create session", e);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
