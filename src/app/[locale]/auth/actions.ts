"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/url";
import { grantTrialIfNew } from "@/lib/trial";

const credentialsSchema = z.object({
  email: z.email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const emailSchema = z.email("Please enter a valid email.");
const localeSchema = z.enum(["en", "de"]).default("en");

export type AuthFormState = {
  error?: string;
  success?: boolean;
  fieldErrors?: { email?: string[]; password?: string[] };
} | undefined;

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const locale = localeSchema.parse(formData.get("locale") ?? "en");

  // New signups get a 14-day no-card free trial, so they land straight in the app
  // instead of on /pricing. We do NOT create a Stripe customer here — that happens
  // at checkout when they convert, so unconfirmed signups never create dangling
  // Stripe customers.
  const next = `/${locale}/portfolio`;
  const sb = await createServerSupabase();
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getBaseUrl()}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: error.message };

  // Grant the trial for genuinely new accounts only. When the email already exists,
  // Supabase returns an obfuscated user with an empty `identities` array (signup
  // enumeration protection) — skip those so we never touch an existing user's row.
  if (data.user?.identities?.length) await grantTrialIfNew(data.user.id);

  // Email confirmation ON → no session yet; tell the user to check their inbox.
  // (If confirmation is disabled, a session exists and we go straight on.)
  if (!data.session) return { success: true };
  redirect(next);
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const locale = localeSchema.parse(formData.get("locale") ?? "en");

  const sb = await createServerSupabase();
  const { error } = await sb.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  redirect(`/${locale}/portfolio`);
}

// Starts the Google OAuth flow. Calling signInWithOAuth server-side writes the
// PKCE code-verifier cookie (server actions have a writable cookie store), then we
// redirect the browser to the Supabase-generated Google consent URL. Google →
// Supabase → /api/auth/callback?code=… exchanges the code for a session. New users
// land on /portfolio, where the (app) gate sends them to /pricing if unsubscribed.
export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const locale = localeSchema.parse(formData.get("locale") ?? "en");
  const next = `/${locale}/portfolio`;
  const sb = await createServerSupabase();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getBaseUrl()}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) redirect(`/${locale}/login?auth_error=1`);
  redirect(data.url);
}

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = localeSchema.parse(formData.get("locale") ?? "en");
  const sb = await createServerSupabase();
  await sb.auth.signOut();
  redirect(`/${locale}`);
}

// Sends a password-reset email. Always reports success (never reveals whether an
// account exists). The recovery link routes through /api/auth/callback, which
// establishes a session and forwards to /reset-password.
export async function requestPasswordResetAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { fieldErrors: { email: z.flattenError(parsed.error).formErrors } };
  }
  const locale = localeSchema.parse(formData.get("locale") ?? "en");
  const next = `/${locale}/reset-password`;

  const sb = await createServerSupabase();
  await sb.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${getBaseUrl()}/api/auth/callback?next=${encodeURIComponent(next)}`,
  });
  return { success: true };
}

// Sets a new password for the user. Requires the recovery session established by
// the callback (the reset-password page is reached via the recovery link).
export async function updatePasswordAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = z.string().min(8, "Password must be at least 8 characters.").safeParse(formData.get("password"));
  if (!password.success) {
    return { fieldErrors: { password: z.flattenError(password.error).formErrors } };
  }
  const locale = localeSchema.parse(formData.get("locale") ?? "en");

  const sb = await createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Please request a new one." };

  const { error } = await sb.auth.updateUser({ password: password.data });
  if (error) return { error: error.message };

  redirect(`/${locale}/portfolio`);
}
