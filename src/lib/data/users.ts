import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

// users/{uid}: account-level data. The subscription mirrors the user's Stripe
// subscription and is written only by the server (webhook, checkout return).
export type Subscription = {
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  price_id: string | null;
  plan_interval: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at?: string;
};

export type UserDoc = {
  email: string | null;
  displayName?: string | null;
  createdAt?: string;
  subscription?: Subscription | null;
};

export const userRef = (uid: string) => adminDb().collection("users").doc(uid);

/**
 * Pairspace and inredia share the Stripe account, so their checkouts reach our
 * webhook too, with their own user ids in the metadata. Only ids that exist in
 * Immotrim's Firebase Auth belong to us.
 */
export async function isImmotrimUser(uid: string | null | undefined): Promise<boolean> {
  if (!uid) return false;
  return adminAuth()
    .getUser(uid)
    .then(() => true)
    .catch(() => false);
}

export async function ensureUserDoc(uid: string, email: string | null): Promise<void> {
  const ref = userRef(uid);
  const snap = await ref.get();
  if (snap.exists) {
    if (email && snap.get("email") !== email) await ref.update({ email });
    return;
  }
  await ref.set({ email, createdAt: new Date().toISOString() });
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await userRef(uid).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

export async function setDisplayName(uid: string, displayName: string): Promise<void> {
  await userRef(uid).set({ displayName: displayName.trim() || null }, { merge: true });
}

// Merges a partial subscription update (Stripe is the source of truth).
export async function writeSubscription(uid: string, patch: Partial<Subscription>): Promise<void> {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  await userRef(uid).set(
    { subscription: { ...clean, updated_at: new Date().toISOString() } },
    { merge: true },
  );
}

export async function findUidByStripeCustomer(customerId: string): Promise<string | null> {
  const q = await adminDb()
    .collection("users")
    .where("subscription.stripe_customer_id", "==", customerId)
    .limit(1)
    .get();
  return q.empty ? null : q.docs[0].id;
}

// Monthly AI extraction counter, keyed "YYYY-MM" (UTC). Free accounts get a
// few runs to try document analysis on their property.
export const MONTHLY_EXTRACTION_LIMIT = Number(process.env.AI_EXTRACTION_MONTHLY_LIMIT ?? 300);
export const FREE_MONTHLY_EXTRACTIONS = Number(process.env.FREE_MONTHLY_EXTRACTIONS ?? 3);

export async function getMonthlyUsage(uid: string, plus: boolean): Promise<{ used: number; limit: number }> {
  const period = new Date().toISOString().slice(0, 7);
  const snap = await userRef(uid).get();
  const used = (snap.get(`aiUsage.${period}`) as number | undefined) ?? 0;
  return { used, limit: plus ? MONTHLY_EXTRACTION_LIMIT : FREE_MONTHLY_EXTRACTIONS };
}

export async function consumeMonthlyUsage(uid: string): Promise<void> {
  const period = new Date().toISOString().slice(0, 7);
  await userRef(uid)
    .set({ aiUsage: { [period]: FieldValue.increment(1) } }, { merge: true })
    .catch((e) => console.error("[usage] increment failed", e));
}
