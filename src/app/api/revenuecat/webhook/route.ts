import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// RevenueCat webhook (iPhone app billing). RevenueCat POSTs one event per call
// with the configured "Authorization" header value; we compare it against
// REVENUECAT_WEBHOOK_SECRET (accepting both "Bearer <secret>" and the raw
// secret) and mirror the event into the user's subscriptions row via the
// service-role client. The app registers the Supabase user id as the RevenueCat
// app user id, so app_user_id is the row key.

// RevenueCat event v1, only the fields we read.
type RcEvent = {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  period_type?: string; // TRIAL | NORMAL | INTRO | PROMOTIONAL
  expiration_at_ms?: number | null;
  purchased_at_ms?: number | null;
};

const ENTITLING_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secretsMatch(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Anonymous RevenueCat ids ("$RCAnonymousID:...") cannot be mapped to a user.
// Prefer app_user_id; fall back to a uuid among the aliases (set when the app
// identified the user after an anonymous purchase).
function resolveUserId(event: RcEvent): string | null {
  const candidates = [event.app_user_id, ...(event.aliases ?? []), event.original_app_user_id];
  for (const c of candidates) {
    if (typeof c === "string" && UUID_RE.test(c)) return c.toLowerCase();
  }
  return null;
}

function planIntervalFrom(productId: string | undefined): string {
  return productId && productId.toLowerCase().endsWith("_yearly") ? "yearly" : "monthly";
}

function isoFromMs(ms: number | null | undefined): string | null {
  return typeof ms === "number" && Number.isFinite(ms) && ms > 0
    ? new Date(ms).toISOString()
    : null;
}

function isEntitledRow(row: { status: string; current_period_end: string | null }): boolean {
  return (
    ["active", "trialing"].includes(row.status)
    && (!row.current_period_end || new Date(row.current_period_end) > new Date())
  );
}

export async function POST(request: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[revenuecat webhook] REVENUECAT_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const header = (request.headers.get("authorization") ?? "").trim();
  const presented = header.replace(/^Bearer\s+/i, "").trim();
  if (!presented || !secretsMatch(presented, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let event: RcEvent;
  try {
    const body = (await request.json()) as { event?: RcEvent } | null;
    if (!body || typeof body !== "object" || !body.event || typeof body.event !== "object") {
      throw new Error("missing event");
    }
    event = body.event;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const type = typeof event.type === "string" ? event.type : "";
  if (!type) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Dashboard "send test event": acknowledge, change nothing.
  if (type === "TEST") return NextResponse.json({ received: true, ignored: "test" });

  const userId = resolveUserId(event);
  if (!userId) return NextResponse.json({ received: true, ignored: "anonymous_app_user_id" });

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  try {
    const { data: existing } = await admin
      .from("subscriptions")
      .select("status, source, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    // A paying web customer keeps their Stripe entitlement whatever RevenueCat
    // reports (e.g. an expired App Store trial must not cancel a Stripe plan).
    if (existing && existing.source === "stripe" && isEntitledRow(existing)) {
      console.warn(`[revenuecat webhook] ${type} for entitled stripe row ${userId}: ignored`);
      return NextResponse.json({ received: true, ignored: "stripe_entitled" });
    }

    const rcFields = {
      source: "revenuecat",
      rc_app_user_id: typeof event.app_user_id === "string" ? event.app_user_id : userId,
      rc_product_id: typeof event.product_id === "string" ? event.product_id : null,
      updated_at: now,
    };

    if (ENTITLING_EVENTS.has(type)) {
      const { error } = await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          status: event.period_type === "TRIAL" ? "trialing" : "active",
          plan_interval: planIntervalFrom(event.product_id),
          current_period_end: isoFromMs(event.expiration_at_ms),
          cancel_at_period_end: false,
          ...rcFields,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    } else if (type === "CANCELLATION") {
      // Auto-renew switched off: the user stays entitled until the period ends.
      if (existing) {
        const { error } = await admin
          .from("subscriptions")
          .update({ cancel_at_period_end: true, ...rcFields })
          .eq("user_id", userId);
        if (error) throw error;
      }
    } else if (type === "EXPIRATION") {
      const { error } = await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          status: "canceled",
          current_period_end: isoFromMs(event.expiration_at_ms),
          ...rcFields,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    } else if (type === "BILLING_ISSUE") {
      const { error } = await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          status: "past_due",
          ...rcFields,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    } else {
      // SUBSCRIBER_ALIAS, TRANSFER, SUBSCRIPTION_PAUSED, ... carry no entitlement
      // change we track.
      return NextResponse.json({ received: true, ignored: type });
    }
  } catch (err) {
    console.error("[revenuecat webhook] handler error:", err);
    return NextResponse.json({ error: "handler_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
