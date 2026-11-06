import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { findUidByStripeCustomer, writeSubscription } from "@/lib/data/users";
import { subscriptionToUpdate, syncSubscriptionFromCheckoutSession, type SubUpdate } from "@/lib/stripe-sync";

export const runtime = "nodejs";

// Finds the user by Stripe customer id, falling back to the user_id the
// subscription carries in its metadata.
async function upsertSubscriptionByCustomer(customerId: string, update: SubUpdate, metaUid?: string) {
  const uid = (await findUidByStripeCustomer(customerId)) ?? metaUid ?? null;
  if (!uid) {
    console.error("[stripe webhook] no user for customer", customerId);
    return;
  }
  await writeSubscription(uid, { stripe_customer_id: customerId, ...update });
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
        // Also performed synchronously by /api/billing/checkout-return when the
        // user lands back from Checkout — this handler is the eventual-consistency
        // backstop, so this is a harmless, idempotent re-write if that already ran.
        await syncSubscriptionFromCheckoutSession(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        await upsertSubscriptionByCustomer(customerId, subscriptionToUpdate(sub), sub.metadata?.user_id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (customerId) {
          await upsertSubscriptionByCustomer(customerId, { status: "past_due" });
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
