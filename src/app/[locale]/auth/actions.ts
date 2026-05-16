"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, priceIdForPlan, type Plan } from "@/lib/stripe";

const credentialsSchema = z.object({
  email: z.email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const planSchema = z.enum(["monthly", "yearly"]).optional();
const localeSchema = z.enum(["en", "de"]).default("en");

export type AuthFormState = {
  error?: string;
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
  const plan = planSchema.parse(formData.get("plan") ?? undefined) ?? "monthly";

  const sb = await createServerSupabase();
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };
  const user = data.user;
  if (!user) return { error: "Sign up failed — please try again." };

  // Account created and session set. Create a Stripe customer + Checkout session, then redirect.
  const admin = getSupabaseAdmin();
  const customer = await getStripe().customers.create({
    email: user.email ?? parsed.data.email,
    metadata: { user_id: user.id },
  });
  await admin.from("subscriptions").upsert({
    user_id: user.id,
    stripe_customer_id: customer.id,
    status: "incomplete",
  }, { onConflict: "user_id" });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customer.id,
    line_items: [{ price: priceIdForPlan(plan as Plan), quantity: 1 }],
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${baseUrl}/${locale}/portfolio`,
    cancel_url: `${baseUrl}/${locale}/pricing`,
    allow_promotion_codes: true,
  });
  if (!session.url) return { error: "Stripe did not return a Checkout URL." };
  redirect(session.url);
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

export async function logoutAction(formData: FormData): Promise<void> {
  const locale = localeSchema.parse(formData.get("locale") ?? "en");
  const sb = await createServerSupabase();
  await sb.auth.signOut();
  redirect(`/${locale}`);
}
