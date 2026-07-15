import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "./supabase/server";
import {
  profileCompletion,
  type ProfileCompletion,
} from "@/features/profile/completeness";
import type { SaMeta } from "@/lib/selbstauskunft/completeness";
import type {
  Stammdaten,
  Haushalt,
  Strategie,
} from "@/features/profile/types";
import type { PropertyInputs } from "@/lib/supabase";

// Returns the auth user or redirects to /login. Memoized per render via React cache().
export const verifySession = cache(async () => {
  const sb = await createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/login`);
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

// Returns true only for a PAID, currently-active plan — a real subscription
// (monthly/yearly) or a one-time lifetime purchase. Unlike getActiveSubscription
// this deliberately EXCLUDES "trialing": creating a Selbstauskunft / bank report
// requires a paid account, not just the free trial.
export const hasPaidPlan = cache(async (userId: string): Promise<boolean> => {
  const sb = await createServerSupabase();
  const { data } = await sb
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return false;
  return (
    data.status === "active"
    && (!data.current_period_end || new Date(data.current_period_end) > new Date())
  );
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

// Per-section completion percentages for the sidebar bars + section headers.
// Reads the profile sections and the properties' Selbstauskunft metadata, then
// runs the pure completeness engine. Memoized per render so the layout and the
// pages can both call it cheaply.
export const getProfileCompletion = cache(
  async (userId: string): Promise<ProfileCompletion> => {
    const sb = await createServerSupabase();
    const [{ data: profile }, { data: properties }, { data: borrowerDocs }] =
      await Promise.all([
        sb
          .from("profiles")
          .select("stammdaten, haushalt, strategie")
          .eq("user_id", userId)
          .maybeSingle(),
        sb.from("properties").select("inputs").eq("user_id", userId),
        // Borrower/personal docs (not property- or draft-scoped) back the checklist bar.
        sb
          .from("documents")
          .select("doc_type")
          .eq("user_id", userId)
          .is("property_id", null)
          .is("draft_id", null),
      ]);

    const propertyMetas = ((properties ?? []) as { inputs: PropertyInputs }[]).map(
      (p) => ({ selbstauskunft: p.inputs?.selbstauskunft as SaMeta | undefined }),
    );

    return profileCompletion({
      stammdaten: (profile?.stammdaten as Stammdaten) ?? {},
      haushalt: (profile?.haushalt as Haushalt) ?? {},
      strategie: (profile?.strategie as Strategie) ?? {},
      properties: propertyMetas,
      checklistDocTypes: ((borrowerDocs ?? []) as { doc_type: string | null }[]).map(
        (d) => d.doc_type,
      ),
    });
  },
);
