import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Pick TEST key in development, LIVE in production.
// Supports either split naming (STRIPE_SECRET_KEY_TEST / _LIVE) or a single STRIPE_SECRET_KEY.
function getStripeSecretKey(): string {
  const single = process.env.STRIPE_SECRET_KEY;
  if (single) return single;
  const isProd = process.env.NODE_ENV === "production";
  const key = isProd ? process.env.STRIPE_SECRET_KEY_LIVE : process.env.STRIPE_SECRET_KEY_TEST;
  if (!key) throw new Error("Missing Stripe secret key. Set STRIPE_SECRET_KEY_TEST (dev) or STRIPE_SECRET_KEY_LIVE (prod).");
  return key;
}

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getStripeSecretKey(), {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

export type Plan = "monthly" | "yearly";

export function priceIdForPlan(plan: Plan): string {
  return plan === "yearly"
    ? process.env.STRIPE_PRICE_YEARLY!
    : process.env.STRIPE_PRICE_MONTHLY!;
}

export function planFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return "yearly";
  return null;
}
