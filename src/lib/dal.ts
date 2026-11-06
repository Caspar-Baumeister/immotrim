import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/firebase/session";
import { getUserDoc, type Subscription } from "@/lib/data/users";

// Free accounts track one property with every KPI. Plus unlocks more properties,
// document analysis and the bank overview.
export const FREE_PROPERTY_LIMIT = 1;

// Returns the logged-in user or redirects to /login. Memoized per render.
export const verifySession = cache(async (): Promise<SessionUser> => {
  const user = await getSessionUser();
  if (!user) redirect(`/login`);
  return user;
});

export type { Subscription };

// The stored subscription, without entitlement filtering (account page copy).
export const getSubscription = cache(async (uid: string): Promise<Subscription | null> => {
  return (await getUserDoc(uid))?.subscription ?? null;
});

// Plus = an active or trialing Stripe subscription (or lifetime) whose period
// has not ended.
export function isEntitled(sub: Subscription | null | undefined): boolean {
  if (!sub) return false;
  return ["active", "trialing"].includes(sub.status)
    && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
}

export const hasPlus = cache(async (uid: string): Promise<boolean> => {
  return isEntitled(await getSubscription(uid));
});
