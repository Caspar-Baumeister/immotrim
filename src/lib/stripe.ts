import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Prefer the canonical STRIPE_SECRET_KEY, which Vercel sets per environment (live on
// Production, test on Preview/staging). Fall back to the split TEST/LIVE naming for local
// dev and any unscoped setup, keyed off VERCEL_ENV — NOT NODE_ENV, which Vercel sets to
// "production" on every deploy (previews included), so it can't distinguish prod from preview.
function getStripeSecretKey(): string {
  const single = process.env.STRIPE_SECRET_KEY;
  if (single) return single;
  const isProd = process.env.VERCEL_ENV === "production";
  const key = isProd ? process.env.STRIPE_SECRET_KEY_LIVE : process.env.STRIPE_SECRET_KEY_TEST;
  if (!key) throw new Error("Missing Stripe secret key. Set STRIPE_SECRET_KEY (per environment) or STRIPE_SECRET_KEY_TEST/_LIVE.");
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

export type Plan = "monthly" | "yearly" | "lifetime";

// Lifetime is a one-time purchase (Checkout `mode: "payment"`), not a recurring subscription.
export const isOneTimePlan = (plan: Plan): boolean => plan === "lifetime";

export function priceIdForPlan(plan: Plan): string {
  if (plan === "lifetime") return process.env.STRIPE_PRICE_LIFETIME!;
  return plan === "yearly"
    ? process.env.STRIPE_PRICE_YEARLY!
    : process.env.STRIPE_PRICE_MONTHLY!;
}

export function planFromPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return "yearly";
  if (priceId === process.env.STRIPE_PRICE_LIFETIME) return "lifetime";
  return null;
}
