import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "./supabase/server";

// Returns the auth user or redirects to /login. Memoized per render via React cache().
export const verifySession = cache(async (locale: string = "en") => {
  const sb = await createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
});

export type ActiveSubscription = {
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  price_id: string | null;
  plan_interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

// Returns the user's subscription row if entitled to access, else null.
// "Entitled" = status active|trialing AND (no period end OR period end in the future).
export const getActiveSubscription = cache(async (
  userId: string,
): Promise<ActiveSubscription | null> => {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("subscriptions")
    .select(
      "status, stripe_customer_id, stripe_subscription_id, price_id, plan_interval, current_period_end, cancel_at_period_end",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  const entitled = ["active", "trialing"].includes(data.status)
    && (!data.current_period_end || new Date(data.current_period_end) > new Date());
  return entitled ? data : null;
});

// Returns the subscription row (or null) without entitlement filtering — useful for the
// Account page to show "your subscription is past_due / canceled" copy.
export const getSubscription = cache(async (userId: string) => {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
});
