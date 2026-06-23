// The single source of truth for which property fields the AI assistant may
// propose changes to. Used in three places — keep them in sync via THIS module:
//   1. the chat route, to constrain the model's `field` enum and validate calls,
//   2. the apply server action, to re-validate before writing,
//   3. the client proposal card, to label + format the change.
//
// The model only ever sees/returns a field `id` (never a JSON path), so it can
// neither invent paths nor reach non-whitelisted data. The server maps `id` →
// `path` and applies a typed, range-checked, immutable deep-set.

import type { PropertyInputs } from "@/lib/supabase/types";

export type FieldUnit = "percent" | "euro" | "years" | "number";

export type FieldDef = {
  // Stable identifier the model selects (the tool enum value) and the i18n key
  // under the `portfolioChat.fields` namespace.
  id: string;
  // Dot path into PropertyInputs where the value lives.
  path: string;
  unit: FieldUnit;
  min: number;
  max: number;
  // Short English description fed to the model so it can map intent → field.
  description: string;
};

export const FIELD_DEFS: FieldDef[] = [
  // Tax
  { id: "afaPct", path: "tax.afaPct", unit: "percent", min: 0, max: 10, description: "Annual depreciation rate (AfA) in %" },
  { id: "steuersatz", path: "tax.steuersatz", unit: "percent", min: 0, max: 50, description: "Personal marginal income tax rate (Grenzsteuersatz) in %" },
  { id: "gebaeudeanteilPct", path: "tax.gebaeudeanteilPct", unit: "percent", min: 0, max: 100, description: "Building share of the purchase price in % (depreciable portion)" },
  { id: "bemessungsgrundlage", path: "tax.bemessungsgrundlage", unit: "euro", min: 0, max: 100_000_000, description: "Assessment basis for AfA in euros" },
  // Mortgage
  { id: "zins", path: "zins", unit: "percent", min: 0, max: 20, description: "Annual mortgage interest rate (Sollzins) in %" },
  { id: "tilgung", path: "tilgung", unit: "percent", min: 0, max: 20, description: "Initial annual repayment rate (Tilgung) in %" },
  { id: "zinsbindung", path: "zinsbindung", unit: "years", min: 0, max: 40, description: "Fixed-interest period (Zinsbindung) in years" },
  // Purchase
  { id: "kaufpreis", path: "kaufpreis", unit: "euro", min: 0, max: 100_000_000, description: "Purchase price in euros" },
  { id: "eigenanteil", path: "eigenanteil", unit: "euro", min: 0, max: 100_000_000, description: "Equity contributed in euros" },
  // Rent & running costs
  { id: "kaltmiete", path: "kaltmiete", unit: "euro", min: 0, max: 1_000_000, description: "Monthly cold rent (Kaltmiete) in euros" },
  { id: "nichtUmlagefaehig", path: "nichtUmlagefaehig", unit: "euro", min: 0, max: 1_000_000, description: "Monthly non-allocable costs in euros" },
  { id: "ruecklagen", path: "ruecklagen", unit: "euro", min: 0, max: 1_000_000, description: "Monthly reserves (Rücklagen) in euros" },
  { id: "leerstand", path: "leerstand", unit: "percent", min: 0, max: 100, description: "Vacancy rate (Leerstand) in %" },
  // Growth assumptions
  { id: "mietentwicklung", path: "mietentwicklung", unit: "percent", min: -20, max: 20, description: "Annual rent growth assumption in %" },
  { id: "wertentwicklung", path: "wertentwicklung", unit: "percent", min: -20, max: 20, description: "Annual value appreciation assumption in %" },
];

export const FIELD_IDS = FIELD_DEFS.map((f) => f.id);

export function getFieldDef(id: string): FieldDef | undefined {
  return FIELD_DEFS.find((f) => f.id === id);
}

// Validates an AI-proposed value against a field's unit/range. Returns the
// coerced number or null when the value isn't a finite number in range.
export function validateFieldValue(def: FieldDef, raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < def.min || n > def.max) return null;
  return n;
}

// Reads the current value at a field's path, or undefined if unset.
export function readFieldValue(
  inputs: PropertyInputs,
  def: FieldDef,
): number | undefined {
  const segments = def.path.split(".");
  let cur: unknown = inputs;
  for (const seg of segments) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return typeof cur === "number" ? cur : undefined;
}

// Default TaxInputs used when a tax.* field is set on a property that has no tax
// block yet. Mirrors PropertyForm's toggleTax defaults so behaviour is identical
// whether the user enables tax via the form or via the assistant.
function defaultTax(inputs: PropertyInputs) {
  return {
    gebaeudeanteilPct: 70,
    bemessungsgrundlage: inputs.kaufpreis,
    afaPct: 2,
    steuersatz: 42,
  };
}

// Returns a NEW PropertyInputs with only the whitelisted field path set to
// `value`. Never mutates the input. For tax.* paths, lazily materialises a
// default tax block so the result stays a valid TaxInputs.
export function applyFieldChange(
  inputs: PropertyInputs,
  def: FieldDef,
  value: number,
): PropertyInputs {
  const segments = def.path.split(".");
  if (segments.length === 1) {
    return { ...inputs, [segments[0]]: value };
  }
  // Two-level path, currently only "tax.<field>".
  const [head, leaf] = segments;
  if (head === "tax") {
    const base = inputs.tax ?? defaultTax(inputs);
    return { ...inputs, tax: { ...base, [leaf]: value } };
  }
  // Defensive: unknown nested head — return unchanged rather than guess.
  return inputs;
}
