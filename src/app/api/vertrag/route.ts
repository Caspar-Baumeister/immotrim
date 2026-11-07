import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";

import {
  CONTACT_EMAIL,
  LIMITS,
  declarationLines,
  formatDate,
  formatDateTime,
  validateDeclaration,
  type ContractAutomation,
  type ContractDeclaration,
} from "@/lib/contract";
import { getUserDoc, writeSubscription } from "@/lib/data/users";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { escapeHtml, sendMail } from "@/lib/mail";
import { getStripe } from "@/lib/stripe";
import { subscriptionToUpdate } from "@/lib/stripe-sync";

/**
 * Cancellations (§ 312k BGB) and withdrawals (§ 356a BGB) from the public
 * pages /kuendigen and /widerrufen. No sign in, on purpose.
 *
 * Every declaration is stored in contractRequests/{id}, then the person gets
 * a receipt with the full content, date and time, and Caspar gets a copy. A
 * cancellation whose email belongs to an account with a Stripe subscription
 * is carried out right away (cancel_at_period_end), so the receipt can name
 * the end date. Withdrawals are never automated, the refund is done by hand.
 *
 * The answer never says whether the email has an account.
 */

const MAX_BODY = 8_000;
const WINDOW_MS = 10 * 60 * 1000;
const PER_WINDOW = 5;

/** Per instance, which is enough to stop a script hammering the form. */
const hits = new Map<string, number[]>();

function limited(key: string, now: number): boolean {
  const since = now - WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((at) => at > since);
  if (recent.length >= PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5_000) {
    for (const [k, list] of hits) if (!list.some((at) => at > since)) hits.delete(k);
  }
  return false;
}

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** Keyed, so a stored hash cannot be turned back into an address by trying all of them. */
function ipHash(ip: string): string {
  const key = createHash("sha256")
    .update(`contract-ip:${process.env.STRIPE_SECRET_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT ?? "immotrim-local"}`)
    .digest();
  return createHmac("sha256", key).update(ip).digest("hex").slice(0, 32);
}

type Account = { uid: string; subscriptionId: string | null } | null;

async function findAccount(email: string): Promise<Account> {
  const user = await adminAuth()
    .getUserByEmail(email)
    .catch(() => null);
  if (!user) return null;
  const doc = await getUserDoc(user.uid);
  return { uid: user.uid, subscriptionId: doc?.subscription?.stripe_subscription_id ?? null };
}

/**
 * A cancellation always ends the plan at the end of the period at the
 * latest, so that part is safe to do at once. A date after the period end is
 * left to Caspar, Stripe would otherwise end it too early.
 */
async function cancelInStripe(d: ContractDeclaration, account: Account): Promise<ContractAutomation> {
  if (!account) return { status: "manual", reason: "no-account" };
  if (!account.subscriptionId) return { status: "manual", reason: "no-subscription" };
  try {
    const stripe = getStripe();
    const current = await stripe.subscriptions.retrieve(account.subscriptionId);
    const before = subscriptionToUpdate(current);
    const periodEnd = before.current_period_end ? Date.parse(before.current_period_end) : undefined;
    if (current.status === "canceled" || current.status === "incomplete_expired") {
      return { status: "already-ended", subscriptionId: current.id, endsAt: periodEnd };
    }
    if (d.when === "date" && d.date && periodEnd && Date.parse(`${d.date}T23:59:59Z`) > periodEnd) {
      return { status: "manual", reason: "later-date", subscriptionId: current.id, endsAt: periodEnd };
    }
    const updated = current.cancel_at_period_end
      ? current
      : await stripe.subscriptions.update(current.id, {
          cancel_at_period_end: true,
          cancellation_details: { comment: "Kündigungsbutton immotrim.com/kuendigen" },
        });
    const after = subscriptionToUpdate(updated);
    await writeSubscription(account.uid, after);
    return { status: "done", subscriptionId: updated.id, endsAt: after.current_period_end ? Date.parse(after.current_period_end) : periodEnd };
  } catch (e) {
    console.error("[vertrag] stripe cancel failed", account.subscriptionId, e);
    return { status: "failed", subscriptionId: account.subscriptionId, error: e instanceof Error ? e.message.slice(0, 300) : "unknown" };
  }
}

function receipt(id: string, d: ContractDeclaration, receivedAt: number, automation: ContractAutomation) {
  const what = d.kind === "cancel" ? "Kündigung" : "Widerruf";
  const lines = [...declarationLines(d), { label: "Eingegangen am", value: formatDateTime(receivedAt) }, { label: "Eingangsnummer", value: id }];
  const next =
    d.kind === "withdraw"
      ? "Wir bearbeiten deinen Widerruf und erstatten dir die Zahlungen innerhalb von 14 Tagen."
      : automation.status === "done" && automation.endsAt
        ? `Dein Abo endet am ${formatDate(automation.endsAt)}. Bis dahin kannst du Immotrim Plus weiter nutzen.`
        : "Wir bearbeiten deine Kündigung und melden uns, falls etwas fehlt.";
  const text = [
    `Hallo ${d.name},`,
    "",
    `wir haben deine ${what} erhalten. Hier sind deine Angaben:`,
    "",
    ...lines.map((l) => `${l.label}: ${l.value}`),
    "",
    next,
    "",
    `Fragen? Antworte einfach auf diese Mail oder schreib an ${CONTACT_EMAIL}.`,
    "",
    "Immotrim, Caspar Baumeister, Dernburgstraße 7, 14057 Berlin",
  ].join("\n");
  const rows = lines
    .map((l) => `<tr><td style="padding:4px 16px 4px 0;color:#6b7280;vertical-align:top">${escapeHtml(l.label)}</td><td style="padding:4px 0;color:#101828">${escapeHtml(l.value)}</td></tr>`)
    .join("");
  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#101828;max-width:560px">
<p>Hallo ${escapeHtml(d.name)},</p>
<p>wir haben deine ${what} erhalten. Hier sind deine Angaben:</p>
<table style="border-collapse:collapse;font-size:14px">${rows}</table>
<p>${escapeHtml(next)}</p>
<p>Fragen? Antworte einfach auf diese Mail oder schreib an ${CONTACT_EMAIL}.</p>
<p style="color:#6b7280;font-size:13px">Immotrim, Caspar Baumeister, Dernburgstraße 7, 14057 Berlin</p>
</div>`;
  return { subject: `Bestätigung deiner ${what} bei Immotrim`, text, html };
}

export async function POST(request: Request) {
  const now = Date.now();
  const hash = ipHash(clientIp(request));
  if (limited(hash, now)) return NextResponse.json({ error: "rate-limited" }, { status: 429 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "too-large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const checked = validateDeclaration(body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  const data = checked.value;

  const account = await findAccount(data.email);
  const automation: ContractAutomation =
    data.kind === "cancel" ? await cancelInStripe(data, account) : { status: "manual", reason: "withdrawal" };

  // Stored before any mail goes out, so a declaration is never lost.
  const ref = adminDb().collection("contractRequests").doc();
  await ref.set({
    kind: data.kind,
    data,
    receivedAt: now,
    ipHash: hash,
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, LIMITS.userAgent),
    account,
    automation,
  });

  const mail = receipt(ref.id, data, now, automation);
  const [toPerson, toCaspar] = await Promise.all([
    sendMail({ to: data.email, ...mail, replyTo: CONTACT_EMAIL }),
    sendMail({
      to: CONTACT_EMAIL,
      subject: `${data.kind === "cancel" ? "Kündigung" : "Widerruf"} von ${data.email} (${automation.status})`,
      text: `${mail.text}\n\nStripe: ${JSON.stringify(automation)}\nKonto: ${account?.uid ?? "keins"}`,
      html: `${mail.html}<pre style="font-size:12px">Stripe: ${escapeHtml(JSON.stringify(automation))}\nKonto: ${escapeHtml(account?.uid ?? "keins")}</pre>`,
      replyTo: data.email,
    }),
  ]);
  await ref.update({ mail: { person: toPerson, caspar: toCaspar } });
  return NextResponse.json({ id: ref.id, receivedAt: now });
}
