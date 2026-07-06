import "server-only";
import type Stripe from "stripe";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type SubUpdate = {
  status: string;
  stripe_subscription_id?: string;
  price_id?: string | null;
  plan_interval?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  updated_at?: string;
};

export function subscriptionToUpdate(sub: Stripe.Subscription): SubUpdate {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const interval = item?.price?.recurring?.interval ?? null;
  const periodEndSec = (item as unknown as { current_period_end?: number } | undefined)?.current_period_end
    ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return {
    status: sub.status,
    stripe_subscription_id: sub.id,
    price_id: priceId,
    plan_interval: planFromPriceId(priceId) ?? interval,
    current_period_end: periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
}

// Given a completed Checkout Session, upserts the user's subscriptions row directly —
// the same write the webhook's checkout.session.completed handler performs. Called from
// both the webhook (async, eventual) and the checkout-return route (synchronous, on
// redirect back from Stripe) so a paying user is never stuck waiting on webhook delivery.
// Idempotent via onConflict: "user_id" — safe to call more than once for the same session.
export async function syncSubscriptionFromCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.user_id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!userId || !customerId) return;
  const admin = getSupabaseAdmin();

  // One-time purchase (lifetime): no subscription object. A null current_period_end
  // makes the entitlement gate in dal.ts grant access permanently.
  if (session.mode === "payment") {
    await admin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      status: "active",
      stripe_subscription_id: null,
      price_id: process.env.STRIPE_PRICE_LIFETIME ?? null,
      plan_interval: "lifetime",
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    return;
  }

  const subField = session.subscription;
  const subId = typeof subField === "string" ? subField : subField?.id;
  if (!subId) return;

  // Reuse an already-expanded subscription object if the caller provided one;
  // otherwise fetch it (the webhook's event payload is never expanded).
  const subscription = subField && typeof subField !== "string"
    ? (subField as Stripe.Subscription)
    : await getStripe().subscriptions.retrieve(subId);

  await admin.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    ...subscriptionToUpdate(subscription),
  }, { onConflict: "user_id" });
}
