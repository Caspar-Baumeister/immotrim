"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/firebase/session";
import { getSubscription } from "@/lib/dal";
import { writeSubscription } from "@/lib/data/users";
import { getStripe, priceIdForPlan, isOneTimePlan, type Plan } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/url";

const planSchema = z.enum(["monthly", "yearly", "lifetime"]);

// Look up the user's Stripe customer id (if any), create one on the fly otherwise.
async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const existing = await getSubscription(userId);
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email,
    metadata: { user_id: userId },
  });
  // Only the customer id; status follows once Checkout completes (webhook or
  // the checkout-return route).
  await writeSubscription(userId, existing
    ? { stripe_customer_id: customer.id }
    : { stripe_customer_id: customer.id, status: "incomplete" });
  return customer.id;
}

// Server action — invoke as `<form action={startCheckout}>` with hidden `plan`.
export async function startCheckoutAction(formData: FormData): Promise<void> {
  const plan: Plan = planSchema.parse(formData.get("plan"));

  const user = await getSessionUser();
  if (!user) {
    redirect(`/signup?plan=${plan}`);
  }

  const customerId = await getOrCreateStripeCustomer(user.uid, user.email ?? "");
  const baseUrl = getBaseUrl();

  const oneTime = isOneTimePlan(plan);
  const session = await getStripe().checkout.sessions.create({
    mode: oneTime ? "payment" : "subscription",
    customer: customerId,
    line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
    metadata: { user_id: user.uid },
    // Recurring plans carry user_id on the subscription; one-time on the payment intent.
    ...(oneTime
      ? { payment_intent_data: { metadata: { user_id: user.uid } } }
      : { subscription_data: { metadata: { user_id: user.uid } } }),
    success_url: `${baseUrl}/api/billing/checkout-return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  redirect(session.url);
}

// Server action — opens the Stripe Customer Portal for the logged-in user.
export async function startPortalAction(_formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) redirect(`/login`);

  const sub = await getSubscription(user.uid);

  if (!sub?.stripe_customer_id) redirect(`/pricing`);

  const baseUrl = getBaseUrl();
  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${baseUrl}/account`,
  });

  redirect(session.url);
}
