"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, priceIdForPlan, type Plan } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/url";

const planSchema = z.enum(["monthly", "yearly"]);
const localeSchema = z.enum(["en", "de"]).default("en");

// Look up the user's Stripe customer id (if any), create one on the fly otherwise.
async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email,
    metadata: { user_id: userId },
  });

  await admin.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customer.id,
    status: "incomplete",
  }, { onConflict: "user_id" });

  return customer.id;
}

// Server action — invoke as `<form action={startCheckout}>` with hidden `plan` + `locale`.
export async function startCheckoutAction(formData: FormData): Promise<void> {
  const plan: Plan = planSchema.parse(formData.get("plan"));
  const locale = localeSchema.parse(formData.get("locale") ?? "en");

  const sb = await createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    redirect(`/${locale}/signup?plan=${plan}`);
  }

  const customerId = await getOrCreateStripeCustomer(user.id, user.email ?? "");
  const baseUrl = getBaseUrl();

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${baseUrl}/${locale}/portfolio`,
    cancel_url: `${baseUrl}/${locale}/pricing`,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  redirect(session.url);
}

// Server action — opens the Stripe Customer Portal for the logged-in user.
export async function startPortalAction(formData: FormData): Promise<void> {
  const locale = localeSchema.parse(formData.get("locale") ?? "en");

  const sb = await createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: sub } = await sb
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) redirect(`/${locale}/pricing`);

  const baseUrl = getBaseUrl();
  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${baseUrl}/${locale}/account`,
  });

  redirect(session.url);
}
