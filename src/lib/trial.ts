import "server-only";
import { getSupabaseAdmin } from "./supabase/admin";

// Length of the no-credit-card free trial. Overridable via env for testing.
export const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 14);

// Grants a 14-day free trial to a newly signed-up user by inserting a "trialing"
// subscription row with current_period_end = now + TRIAL_DAYS. The entitlement
// gate in dal.ts treats this as access; it expires automatically once the period
// end passes — no Stripe customer, no card, no webhook, no cron involved.
//
// Uses ignoreDuplicates so it is a no-op when the user already has a row: it never
// resets an existing trial, never clobbers a real subscription, and never re-grants
// a trial after one has expired (the expired row still exists). Safe to call from
// any signup path, including on a best-effort new-user guess.
export async function grantTrialIfNew(userId: string): Promise<void> {
  const periodEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      status: "trialing",
      plan_interval: "trial",
      current_period_end: periodEnd.toISOString(),
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (error) console.error("[trial] failed to grant trial", error);
}
