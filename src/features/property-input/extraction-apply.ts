import type { PropertyInputs, ReportDetails } from "@/lib/supabase";
import type {
  AppliedPatch,
  ExtractedFieldKey,
  ExtractedFields,
} from "./extraction-types";

export type FormSnapshot = {
  name: string;
  address: string;
  inputs: PropertyInputs;
};

type FieldKind = "text" | "euro" | "percent" | "number" | "area" | "year";

// Value formatting kind per field. Human-readable labels live in i18n
// (messages/*.json → documents.fields.<key>), resolved in the review panel.
export const FIELD_KIND: Record<ExtractedFieldKey, FieldKind> = {
  name: "text",
  address: "text",
  kaufpreis: "euro",
  grunderwerbsteuerPct: "percent",
  notarGrundbuchPct: "percent",
  maklerprovisionPct: "percent",
  sonstigePct: "percent",
  eigenanteil: "euro",
  zins: "percent",
  tilgung: "percent",
  zinsbindung: "number",
  loanStartDate: "text",
  kaltmiete: "euro",
  nichtUmlagefaehig: "euro",
  ruecklagen: "euro",
  // Report-only descriptive details.
  objekttyp: "text",
  stadt: "text",
  wohnflaeche: "area",
  zimmer: "number",
  baujahr: "year",
  kaufdatum: "text",
  hausgeld: "euro",
  marktwert: "euro",
};

export const FIELD_ORDER = Object.keys(FIELD_KIND) as ExtractedFieldKey[];

const NEBENKOSTEN_KEYS: ExtractedFieldKey[] = [
  "grunderwerbsteuerPct",
  "notarGrundbuchPct",
  "maklerprovisionPct",
  "sonstigePct",
];

// Report-only fields live under inputs.report (see ReportDetails).
const REPORT_KEYS = [
  "objekttyp",
  "stadt",
  "wohnflaeche",
  "zimmer",
  "baujahr",
  "kaufdatum",
  "hausgeld",
  "marktwert",
] as const satisfies readonly ExtractedFieldKey[];

type ReportKey = (typeof REPORT_KEYS)[number] & keyof ReportDetails;
function isReportKey(key: ExtractedFieldKey): key is ReportKey {
  return (REPORT_KEYS as readonly string[]).includes(key);
}

export function currentValueFor(
  key: ExtractedFieldKey,
  snap: FormSnapshot,
): string | number | undefined {
  switch (key) {
    case "name":
      return snap.name;
    case "address":
      return snap.address;
    case "kaufpreis":
      return snap.inputs.kaufpreis;
    case "eigenanteil":
      return snap.inputs.eigenanteil;
    case "zins":
      return snap.inputs.zins;
    case "tilgung":
      return snap.inputs.tilgung;
    case "zinsbindung":
      return snap.inputs.zinsbindung;
    case "loanStartDate":
      return snap.inputs.loanStartDate;
    case "kaltmiete":
      return snap.inputs.kaltmiete;
    case "nichtUmlagefaehig":
      return snap.inputs.nichtUmlagefaehig;
    case "ruecklagen":
      return snap.inputs.ruecklagen;
    case "grunderwerbsteuerPct":
    case "notarGrundbuchPct":
    case "maklerprovisionPct":
    case "sonstigePct":
      return snap.inputs.nebenkosten[key];
    default:
      if (isReportKey(key)) return snap.inputs.report?.[key];
      return undefined;
  }
}

export function formatFieldValue(
  key: ExtractedFieldKey,
  value: string | number | undefined,
): string {
  if (value === undefined || value === "" || value === null) return "—";
  const kind = FIELD_KIND[key];
  if (kind === "text") return String(value);
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  if (kind === "euro") return num.toLocaleString("de-DE") + " €";
  if (kind === "percent") return num.toLocaleString("de-DE") + " %";
  if (kind === "area") return num.toLocaleString("de-DE") + " m²";
  if (kind === "year") return String(num); // no thousands separator for a year
  return num.toLocaleString("de-DE");
}

// Build a patch from the selected extracted fields, merging nested nebenkosten.
export function buildPatch(
  selected: ExtractedFieldKey[],
  extracted: ExtractedFields,
  snap: FormSnapshot,
): AppliedPatch {
  const patch: AppliedPatch = {};
  const inputs: Partial<PropertyInputs> = {};
  let nebenkosten = { ...snap.inputs.nebenkosten };
  let nebenkostenTouched = false;
  let report: ReportDetails = { ...(snap.inputs.report ?? {}) };
  let reportTouched = false;

  for (const key of selected) {
    const field = extracted[key];
    if (!field) continue;
    const value = field.value;

    if (key === "name") patch.name = value as string;
    else if (key === "address") patch.address = value as string;
    else if (key === "kaufpreis") inputs.kaufpreis = value as number;
    else if (key === "eigenanteil") inputs.eigenanteil = value as number;
    else if (key === "zins") inputs.zins = value as number;
    else if (key === "tilgung") inputs.tilgung = value as number;
    else if (key === "zinsbindung") inputs.zinsbindung = value as number;
    else if (key === "loanStartDate") inputs.loanStartDate = value as string;
    else if (key === "kaltmiete") inputs.kaltmiete = value as number;
    else if (key === "nichtUmlagefaehig") inputs.nichtUmlagefaehig = value as number;
    else if (key === "ruecklagen") inputs.ruecklagen = value as number;
    else if (NEBENKOSTEN_KEYS.includes(key)) {
      nebenkosten = { ...nebenkosten, [key]: value as number };
      nebenkostenTouched = true;
    } else if (isReportKey(key)) {
      report = { ...report, [key]: value };
      reportTouched = true;
    }
  }

  if (nebenkostenTouched) inputs.nebenkosten = nebenkosten;
  if (reportTouched) inputs.report = report;
  if (Object.keys(inputs).length > 0) patch.inputs = inputs;
  return patch;
}
