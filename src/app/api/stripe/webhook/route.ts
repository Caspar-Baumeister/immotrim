import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, planFromPriceId } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SubUpdate = {
  status: string;
  stripe_subscription_id?: string;
  price_id?: string | null;
  plan_interval?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  updated_at?: string;
};

function subscriptionToUpdate(sub: Stripe.Subscription): SubUpdate {
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

async function upsertSubscriptionByCustomer(customerId: string, update: SubUpdate) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("subscriptions")
    .update(update)
    .eq("stripe_customer_id", customerId);
  if (error) console.error("[stripe webhook] failed to update subscription", error);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe webhook] signature verification failed:", msg);
    return NextResponse.json({ error: `Invalid signature: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!userId || !customerId || !subId) break;

        const subscription = await stripe.subscriptions.retrieve(subId);
        const admin = getSupabaseAdmin();
        await admin.from("subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          ...subscriptionToUpdate(subscription),
        }, { onConflict: "user_id" });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await upsertSubscriptionByCustomer(customerId, subscriptionToUpdate(sub));
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await upsertSubscriptionByCustomer(customerId, {
            status: "past_due",
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      default:
        // Ignore irrelevant events
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
