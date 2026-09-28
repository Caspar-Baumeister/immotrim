import "server-only";
import type { RequestSupabase } from "./supabase/request";

// Entitlement check for the mobile API routes. Same rule as getActiveSubscription
// in dal.ts (which is bound to the cookie client and React cache): the user's
// subscriptions row has status active|trialing AND no period end or a period end
// in the future. Works for Stripe and RevenueCat rows alike; the webhooks keep
// the row in this shape.
export async function isEntitled(sb: RequestSupabase, userId: string): Promise<boolean> {
  const { data } = await sb
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return false;
  return (
    ["active", "trialing"].includes(data.status)
    && (!data.current_period_end || new Date(data.current_period_end) > new Date())
  );
}
