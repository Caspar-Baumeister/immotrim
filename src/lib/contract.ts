/**
 * Cancellations (§ 312k BGB) and withdrawals (§ 356a BGB) sent through the
 * public pages /kuendigen and /widerrufen. The form, the route /api/vertrag
 * and the receipt mail all use these shapes and labels, so the receipt
 * repeats exactly what the person declared. Ported from Pairspace.
 */

export type ContractKind = "cancel" | "withdraw";
export type CancelType = "ordinary" | "extraordinary";
export type CancelWhen = "asap" | "date";

/** What the person declared. Only what the law lets us ask for. */
export interface ContractDeclaration {
  kind: ContractKind;
  name: string;
  email: string;
  /** Cancellations only. */
  cancelType?: CancelType;
  /** Extraordinary cancellations only, optional. */
  reason?: string;
  /** Cancellations only, "asap" is the next possible date. */
  when?: CancelWhen;
  /** YYYY-MM-DD when `when` is "date". */
  date?: string;
}

/** What the route did in Stripe right away. Withdrawals are never automated. */
export interface ContractAutomation {
  status: "done" | "already-ended" | "manual" | "failed";
  /** Why it was left to Caspar, for example "no-account" or "withdrawal". */
  reason?: string;
  subscriptionId?: string;
  /** When the subscription ends, milliseconds. */
  endsAt?: number;
  error?: string;
}

export const CONTRACT_LABEL = "Immotrim Plus, Abo für Immobilieninvestoren";
export const CONTACT_EMAIL = "caspar.baumeister.privat@gmail.com";
export const LIMITS = { name: 200, email: 200, reason: 2000, userAgent: 300 } as const;

const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** A real calendar day, so 2026-02-30 is rejected. */
export function isDay(value: string): boolean {
  if (!DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export type Validation = { ok: true; value: ContractDeclaration } | { ok: false; error: string };

/** Trims, caps and checks a declaration from the form. Unknown fields are dropped. */
export function validateDeclaration(input: unknown): Validation {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const kind = raw.kind;
  if (kind !== "cancel" && kind !== "withdraw") return { ok: false, error: "kind" };
  const name = text(raw.name, LIMITS.name);
  if (!name) return { ok: false, error: "name" };
  const email = text(raw.email, LIMITS.email).toLowerCase();
  if (!MAIL.test(email)) return { ok: false, error: "email" };
  const value: ContractDeclaration = { kind, name, email };
  if (kind === "withdraw") return { ok: true, value };

  const cancelType = raw.cancelType === "extraordinary" ? "extraordinary" : raw.cancelType === "ordinary" ? "ordinary" : null;
  if (!cancelType) return { ok: false, error: "cancelType" };
  value.cancelType = cancelType;
  if (cancelType === "extraordinary") {
    const reason = typeof raw.reason === "string" ? raw.reason.trim().slice(0, LIMITS.reason) : "";
    if (reason) value.reason = reason;
  }
  const when = raw.when === "date" ? "date" : raw.when === "asap" ? "asap" : null;
  if (!when) return { ok: false, error: "when" };
  value.when = when;
  if (when === "date") {
    const date = text(raw.date, 10);
    if (!isDay(date)) return { ok: false, error: "date" };
    value.date = date;
  }
  return { ok: true, value };
}

/** A calendar day such as 1. Dezember 2026. */
export function formatDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
}

/** Date and time of a moment in German time, for receipts. */
export function formatDateTime(ms: number): string {
  const time = new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Berlin" });
  return `${formatDate(ms)} um ${time} Uhr`;
}

/** The declaration as label and value pairs, for the success page and the receipt. */
export function declarationLines(d: ContractDeclaration): { label: string; value: string }[] {
  const out = [
    { label: "Erklärung", value: d.kind === "cancel" ? "Kündigung" : "Widerruf" },
    { label: "Vertrag", value: CONTRACT_LABEL },
    { label: "Name", value: d.name },
    { label: "E-Mail", value: d.email },
  ];
  if (d.kind === "cancel") {
    out.push({ label: "Art der Kündigung", value: d.cancelType === "extraordinary" ? "Außerordentlich" : "Ordentlich" });
    if (d.cancelType === "extraordinary") out.push({ label: "Grund", value: d.reason || "Keiner angegeben" });
    out.push({
      label: "Gewünschter Zeitpunkt",
      value: d.when === "date" && d.date ? formatDay(d.date) : "Nächstmöglicher Zeitpunkt",
    });
  }
  return out;
}
