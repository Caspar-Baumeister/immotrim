import type { Nebenkosten, PropertyInputs, ReportDetails, TaxInputs } from "@/lib/supabase/types";

// Fields the portfolio chat may change through the update_property_field tool.
// The names are what the model sees; the mapping below says where each one
// lives (column, inputs root, inputs.nebenkosten, inputs.report, inputs.tax).

export const CHAT_FIELDS = [
  "name",
  "address",
  "kaufpreis",
  "eigenanteil",
  "zins",
  "tilgung",
  "zinsbindung",
  "loanStartDate",
  "kaltmiete",
  "nichtUmlagefaehig",
  "leerstand",
  "ruecklagen",
  "mietentwicklung",
  "wertentwicklung",
  "objekttyp",
  "stadt",
  "wohnflaeche",
  "zimmer",
  "baujahr",
  "kaufdatum",
  "hausgeld",
  "marktwert",
  "notizen",
  "grunderwerbsteuerPct",
  "notarGrundbuchPct",
  "maklerprovisionPct",
  "sonstigePct",
  "tax.gebaeudeanteilPct",
  "tax.bemessungsgrundlage",
  "tax.afaPct",
  "tax.steuersatz",
] as const;

export type ChatField = (typeof CHAT_FIELDS)[number];

export function isChatField(v: unknown): v is ChatField {
  return typeof v === "string" && (CHAT_FIELDS as readonly string[]).includes(v);
}

type FieldKind = "text" | "number" | "month" | "date";

type FieldSpec = {
  kind: FieldKind;
  // Numeric bounds (inclusive) for a quick sanity check; text/date ignore them.
  min?: number;
  max?: number;
  integer?: boolean;
  // Unit / meaning shown to the model in the tool description.
  hint: string;
};

const FIELD_SPECS: Record<ChatField, FieldSpec> = {
  name: { kind: "text", hint: "short name of the property" },
  address: { kind: "text", hint: "full address" },
  kaufpreis: { kind: "number", min: 0, hint: "purchase price in EUR" },
  eigenanteil: { kind: "number", min: 0, hint: "equity in EUR" },
  zins: { kind: "number", min: 0, max: 30, hint: "interest rate % p.a." },
  tilgung: { kind: "number", min: 0, max: 100, hint: "initial repayment rate % p.a." },
  zinsbindung: { kind: "number", min: 0, max: 60, hint: "fixed interest period in years" },
  loanStartDate: { kind: "month", hint: "loan start, YYYY-MM" },
  kaltmiete: { kind: "number", min: 0, hint: "monthly cold rent in EUR" },
  nichtUmlagefaehig: { kind: "number", min: 0, hint: "monthly non-recoverable costs in EUR" },
  leerstand: { kind: "number", min: 0, max: 100, hint: "vacancy rate %" },
  ruecklagen: { kind: "number", min: 0, hint: "monthly maintenance reserve in EUR" },
  mietentwicklung: { kind: "number", min: -50, max: 50, hint: "rent growth % p.a." },
  wertentwicklung: { kind: "number", min: -50, max: 50, hint: "appreciation % p.a." },
  objekttyp: { kind: "text", hint: "property type, e.g. Eigentumswohnung" },
  stadt: { kind: "text", hint: "city / district" },
  wohnflaeche: { kind: "number", min: 0, hint: "living area in m2" },
  zimmer: { kind: "number", min: 0, hint: "number of rooms" },
  baujahr: { kind: "number", min: 1000, max: 2200, integer: true, hint: "year built" },
  kaufdatum: { kind: "date", hint: "purchase date, YYYY-MM-DD" },
  hausgeld: { kind: "number", min: 0, hint: "monthly Hausgeld in EUR" },
  marktwert: { kind: "number", min: 0, hint: "current market value in EUR" },
  notizen: { kind: "text", hint: "free-text notes" },
  grunderwerbsteuerPct: { kind: "number", min: 0, max: 100, hint: "real estate transfer tax % of price" },
  notarGrundbuchPct: { kind: "number", min: 0, max: 100, hint: "notary and land registry % of price" },
  maklerprovisionPct: { kind: "number", min: 0, max: 100, hint: "broker fee % of price" },
  sonstigePct: { kind: "number", min: 0, max: 100, hint: "other acquisition costs % of price" },
  "tax.gebaeudeanteilPct": { kind: "number", min: 0, max: 100, hint: "building share % of price" },
  "tax.bemessungsgrundlage": { kind: "number", min: 0, hint: "depreciation basis in EUR" },
  "tax.afaPct": { kind: "number", min: 0, max: 100, hint: "depreciation rate % p.a." },
  "tax.steuersatz": { kind: "number", min: 0, max: 100, hint: "marginal income tax rate %" },
};

const NEBENKOSTEN_FIELDS = new Set<ChatField>([
  "grunderwerbsteuerPct",
  "notarGrundbuchPct",
  "maklerprovisionPct",
  "sonstigePct",
]);

const REPORT_FIELDS = new Set<ChatField>([
  "objekttyp",
  "stadt",
  "wohnflaeche",
  "zimmer",
  "baujahr",
  "kaufdatum",
  "hausgeld",
  "marktwert",
  "notizen",
]);

const ROOT_NUMBER_FIELDS = new Set<ChatField>([
  "kaufpreis",
  "eigenanteil",
  "zins",
  "tilgung",
  "zinsbindung",
  "kaltmiete",
  "nichtUmlagefaehig",
  "leerstand",
  "ruecklagen",
  "mietentwicklung",
  "wertentwicklung",
]);

// One line per field for the tool description.
export function describeChatFields(): string {
  return CHAT_FIELDS.map((f) => `${f}: ${FIELD_SPECS[f].hint}`).join("; ");
}

// ─── Value parsing ───────────────────────────────────────────────────────────

// Accepts numbers or numeric strings in German or English notation:
// "339.000,50", "339000.5", "3,75 %", "1.900" (thousands), "81,13 m²".
export function parseNumberValue(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  let s = raw.trim().replace(/[\s€%]|m²|m2|euro|eur/gi, "");
  if (!s) return null;
  if (/,\d{1,2}$/.test(s)) {
    // Decimal comma: drop thousands dots, comma → dot.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // Thousands dots only.
    s = s.replace(/\./g, "");
  } else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) {
    // English thousands commas only.
    s = s.replace(/,/g, "");
  } else {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// "YYYY-MM", "YYYY-MM-DD", "MM/YYYY", "MM.YYYY" → "YYYY-MM".
export function parseMonthValue(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  let m = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(s);
  if (m) return monthString(m[1], m[2]);
  m = /^(\d{1,2})[./](\d{4})$/.exec(s);
  if (m) return monthString(m[2], m[1]);
  m = /^(\d{1,2})\.\d{1,2}\.(\d{4})$/.exec(s);
  if (m) return monthString(m[2], m[1]);
  return null;
}

function monthString(year: string, month: string): string | null {
  const mm = parseInt(month, 10);
  if (mm < 1 || mm > 12) return null;
  return `${year}-${String(mm).padStart(2, "0")}`;
}

// "YYYY-MM-DD" or "DD.MM.YYYY" → "YYYY-MM-DD".
export function parseDateValue(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return dateString(m[1], m[2], m[3]);
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (m) return dateString(m[3], m[2], m[1]);
  return null;
}

function dateString(year: string, month: string, day: string): string | null {
  const mm = parseInt(month, 10);
  const dd = parseInt(day, 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// ─── Applying an update ──────────────────────────────────────────────────────

export type PropertyRowShape = {
  name: string;
  address: string | null;
  inputs: PropertyInputs;
};

export type FieldPatch = {
  name?: string;
  address?: string | null;
  inputs?: PropertyInputs;
};

export type ApplyFieldResult =
  | { ok: true; patch: FieldPatch; value: string | number }
  | { ok: false; error: string };

// Tax defaults when the chat sets a single tax field on a property that had no
// tax block yet (mirrors PropertyForm.toggleTax).
function defaultTax(inputs: PropertyInputs): TaxInputs {
  return {
    gebaeudeanteilPct: 70,
    bemessungsgrundlage: inputs.kaufpreis,
    afaPct: 2,
    steuersatz: 42,
  };
}

function normalizeValue(
  field: ChatField,
  raw: unknown,
): { ok: true; value: string | number } | { ok: false; error: string } {
  const spec = FIELD_SPECS[field];
  if (spec.kind === "text") {
    const s = typeof raw === "string" ? raw.trim() : typeof raw === "number" ? String(raw) : "";
    if (!s && field !== "notizen" && field !== "address") {
      return { ok: false, error: `"${field}" needs a non-empty text value.` };
    }
    return { ok: true, value: s };
  }
  if (spec.kind === "number") {
    const n = parseNumberValue(raw);
    if (n === null) {
      return { ok: false, error: `"${field}" needs a numeric value (${spec.hint}).` };
    }
    if (spec.integer && !Number.isInteger(n)) {
      return { ok: false, error: `"${field}" must be a whole number.` };
    }
    if (spec.min !== undefined && n < spec.min) {
      return { ok: false, error: `"${field}" must be at least ${spec.min}.` };
    }
    if (spec.max !== undefined && n > spec.max) {
      return { ok: false, error: `"${field}" must be at most ${spec.max} (${spec.hint}).` };
    }
    return { ok: true, value: n };
  }
  if (spec.kind === "month") {
    const m = parseMonthValue(raw);
    if (!m) return { ok: false, error: `"${field}" needs a month in the format YYYY-MM.` };
    return { ok: true, value: m };
  }
  const d = parseDateValue(raw);
  if (!d) return { ok: false, error: `"${field}" needs a date in the format YYYY-MM-DD.` };
  return { ok: true, value: d };
}

// Computes the row patch for one field update. Pure: the caller reads the row,
// calls this, and writes the patch back through the RLS-scoped client.
export function applyFieldUpdate(
  row: PropertyRowShape,
  field: ChatField,
  raw: unknown,
): ApplyFieldResult {
  const normalized = normalizeValue(field, raw);
  if (!normalized.ok) return normalized;
  const value = normalized.value;

  if (field === "name") {
    return { ok: true, patch: { name: String(value) }, value };
  }
  if (field === "address") {
    const s = String(value);
    return { ok: true, patch: { address: s || null }, value: s };
  }

  const inputs: PropertyInputs = { ...row.inputs };

  if (ROOT_NUMBER_FIELDS.has(field)) {
    const key = field as
      | "kaufpreis"
      | "eigenanteil"
      | "zins"
      | "tilgung"
      | "zinsbindung"
      | "kaltmiete"
      | "nichtUmlagefaehig"
      | "leerstand"
      | "ruecklagen"
      | "mietentwicklung"
      | "wertentwicklung";
    inputs[key] = value as number;
    return { ok: true, patch: { inputs }, value };
  }

  if (field === "loanStartDate") {
    inputs.loanStartDate = String(value);
    return { ok: true, patch: { inputs }, value };
  }

  if (NEBENKOSTEN_FIELDS.has(field)) {
    const key = field as keyof Nebenkosten;
    inputs.nebenkosten = { ...inputs.nebenkosten, [key]: value as number };
    return { ok: true, patch: { inputs }, value };
  }

  if (REPORT_FIELDS.has(field)) {
    const key = field as keyof ReportDetails;
    const report: ReportDetails = { ...(inputs.report ?? {}) };
    switch (key) {
      case "objekttyp":
      case "stadt":
      case "notizen":
      case "kaufdatum":
        report[key] = String(value);
        break;
      case "wohnflaeche":
      case "zimmer":
      case "baujahr":
      case "hausgeld":
      case "marktwert":
        report[key] = value as number;
        break;
    }
    inputs.report = report;
    return { ok: true, patch: { inputs }, value };
  }

  if (field.startsWith("tax.")) {
    const key = field.slice(4) as keyof TaxInputs;
    const tax: TaxInputs = { ...(inputs.tax ?? defaultTax(inputs)) };
    tax[key] = value as number;
    inputs.tax = tax;
    return { ok: true, patch: { inputs }, value };
  }

  return { ok: false, error: `Unknown field "${field}".` };
}

// ─── Open fields ─────────────────────────────────────────────────────────────

// Fields the chat should ask about: descriptive report fields that are empty
// plus the calculation inputs that are still at zero / unset.
export function openChatFields(
  inputs: PropertyInputs,
  missingReport: readonly string[],
): ChatField[] {
  const open: ChatField[] = [];
  for (const f of missingReport) if (isChatField(f)) open.push(f);
  if (!inputs.nichtUmlagefaehig) open.push("nichtUmlagefaehig");
  if (!inputs.ruecklagen) open.push("ruecklagen");
  if (!inputs.zinsbindung) open.push("zinsbindung");
  if (inputs.report?.marktwert == null) open.push("marktwert");
  if (!inputs.tax) open.push("tax.steuersatz");
  return open;
}
