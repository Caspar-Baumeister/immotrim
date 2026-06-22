import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { grantTrialIfNew } from "@/lib/trial";

// Handles Supabase auth redirects: email confirmation (signup) and password
// recovery. Supabase sends the user here with either a PKCE `code` or a
// `token_hash` + `type`; we exchange it for a session (cookies set here because
// route handlers have a writable cookie store) and forward to `next`.
//
// Lives under /api so it is skipped by proxy.ts (i18n + auth) — the `next`
// target carries the locale-prefixed path to land on.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNext(searchParams.get("next"));

  const sb = await createServerSupabase();

  if (code) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      // OAuth (Google) signup and login both land here. Grant the trial only for
      // brand-new users; grantTrialIfNew is a no-op for anyone who already has a row,
      // so a wrong guess is harmless.
      if (data.user && isNewUser(data.user)) await grantTrialIfNew(data.user.id);
      return NextResponse.redirect(new URL(next, origin));
    }
  } else if (tokenHash && type) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/?auth_error=1", origin));
}

// A brand-new user's account was created moments ago, so created_at and
// last_sign_in_at are within seconds of each other. Returning users have signed in
// long after their account was created.
function isNewUser(user: User): boolean {
  if (!user.last_sign_in_at) return true;
  const created = new Date(user.created_at).getTime();
  const lastSignIn = new Date(user.last_sign_in_at).getTime();
  return Math.abs(lastSignIn - created) < 10_000;
}

// Only allow internal redirects (must start with a single "/") to avoid open redirects.
function sanitizeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}
