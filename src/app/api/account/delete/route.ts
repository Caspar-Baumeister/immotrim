import { NextResponse } from "next/server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/firebase/session";
import { adminAuth, adminBucket, adminDb } from "@/lib/firebase/admin";
import { getUserDoc, userRef } from "@/lib/data/users";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

// Deletes the account: cancels a running Stripe subscription, removes all
// documents in Storage, the user's Firestore data and the login.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sub = (await getUserDoc(user.uid))?.subscription;
  if (sub?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(sub.status)) {
    try {
      await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
    } catch (e) {
      // A subscription Stripe no longer knows is fine; anything else stops the
      // deletion so nobody keeps paying for a deleted account.
      const code = (e as { code?: string }).code;
      if (code !== "resource_missing") {
        console.error("[account-delete] stripe cancel failed", e);
        return NextResponse.json({ error: "stripe_cancel_failed" }, { status: 502 });
      }
    }
  }

  await adminBucket().deleteFiles({ prefix: `users/${user.uid}/` }).catch((e) => {
    console.error("[account-delete] storage cleanup failed", e);
  });
  await adminDb().recursiveDelete(userRef(user.uid));
  await adminAuth().deleteUser(user.uid).catch(() => {});

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
