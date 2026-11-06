import { type NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSessionUser } from "@/lib/firebase/session";
import { syncSubscriptionFromCheckoutSession } from "@/lib/stripe-sync";

export const runtime = "nodejs";

// Stripe Checkout's success_url points here (with ?session_id={CHECKOUT_SESSION_ID}),
// so the subscriptions row is synced synchronously before the user ever lands back in
// the app — entitlement doesn't depend on the async webhook having already arrived.
// The webhook (src/app/api/stripe/webhook/route.ts) remains the eventual-consistency
// backstop for renewals/cancellations and for this route's own failure cases below.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const portfolio = new URL(`/dashboard`, origin);

  if (!sessionId) {
    console.error("[checkout-return] missing session_id");
    return NextResponse.redirect(portfolio);
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/login`, origin));
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    // Defense-in-depth: the just-paid session must belong to the logged-in user.
    if (session.metadata?.user_id === user.uid) {
      await syncSubscriptionFromCheckoutSession(session);
    } else {
      console.warn("[checkout-return] session user_id mismatch", {
        sessionUser: session.metadata?.user_id,
        authUser: user.uid,
      });
    }
  } catch (err) {
    console.error("[checkout-return] failed to sync session", err);
    // Fall through — the webhook remains the backstop.
  }

  return NextResponse.redirect(portfolio);
}
