import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth } from "./admin";

// The login session lives in an httpOnly cookie minted by Firebase Admin from a
// fresh ID token (POST /api/auth/session). Server components, actions and route
// handlers read it here; the browser never sees it.
export const SESSION_COOKIE = "__session";
export const SESSION_DAYS = 14;

export type SessionUser = { uid: string; email: string | null };

export async function createSessionCookie(idToken: string): Promise<{ user: SessionUser; cookie: string }> {
  const auth = adminAuth();
  // Only accept tokens from a sign-in in the last few minutes (Firebase guidance).
  const decoded = await auth.verifyIdToken(idToken);
  if (Date.now() / 1000 - decoded.auth_time > 5 * 60) throw new Error("stale_login");
  const cookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
  return { user: { uid: decoded.uid, email: decoded.email ?? null }, cookie };
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

// Returns the logged-in user, or null. Memoized per request.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(value, true);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
});
