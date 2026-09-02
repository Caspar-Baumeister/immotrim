// Glue between the exposé AI extraction (mode "konzeptObjekt") and the concept
// object form: field catalog, diff values for the review panel, and the apply
// step routing keys into data (KonzeptObjekt) vs details (KonzeptObjektDetails).
// Mirrors wishlist-extraction-apply.ts; labels are hardcoded German like the
// rest of the konzepte feature.

import type { ExtractedBag } from "@/features/extraction/DocumentUploadCore";
import type { KonzeptObjekt, KonzeptObjektDetails } from "./types";

export type ObjektFieldKey =
  | keyof KonzeptObjekt
  | keyof KonzeptObjektDetails;

type FieldKind = "text" | "euro" | "area" | "number" | "bool";

const DATA_KEYS = new Set<ObjektFieldKey>([
  "adresse",
  "ort",
  "objekttyp",
  "wohnflaeche",
  "zimmer",
  "baujahr",
  "kaufpreis",
  "erwarteteMiete",
]);

export const OBJEKT_FIELD_KIND: Record<ObjektFieldKey, FieldKind> = {
  adresse: "text",
  ort: "text",
  objekttyp: "text",
  wohnflaeche: "area",
  zimmer: "number",
  baujahr: "number",
  kaufpreis: "euro",
  erwarteteMiete: "euro",
  hausgeld: "euro",
  etage: "number",
  etagenGesamt: "number",
  schlafzimmer: "number",
  badezimmer: "number",
  stellplaetze: "number",
  objektzustand: "text",
  ausstattung: "text",
  provisionsfrei: "bool",
  heizungsart: "text",
  energietraeger: "text",
  energieausweistyp: "text",
  energieKennwert: "number",
  energieKlasse: "text",
  maklerName: "text",
  maklerTelefon: "text",
  exposeUrl: "text",
};

export const OBJEKT_FIELD_ORDER = Object.keys(OBJEKT_FIELD_KIND) as ObjektFieldKey[];

export const OBJEKT_FIELD_LABELS: Record<ObjektFieldKey, string> = {
  adresse: "Straße, Hausnummer",
  ort: "PLZ, Ort",
  objekttyp: "Objektart",
  wohnflaeche: "Wohnfläche",
  zimmer: "Zimmer",
  baujahr: "Baujahr",
  kaufpreis: "Kaufpreis",
  erwarteteMiete: "Erwartete Kaltmiete",
  hausgeld: "Hausgeld",
  etage: "Etage",
  etagenGesamt: "Etagen gesamt",
  schlafzimmer: "Schlafzimmer",
  badezimmer: "Badezimmer",
  stellplaetze: "Stellplätze",
  objektzustand: "Objektzustand",
  ausstattung: "Ausstattung",
  provisionsfrei: "Provisionsfrei",
  heizungsart: "Heizungsart",
  energietraeger: "Energieträger",
  energieausweistyp: "Energieausweistyp",
  energieKennwert: "Energiekennwert",
  energieKlasse: "Energieklasse",
  maklerName: "Makler",
  maklerTelefon: "Makler-Telefon",
  exposeUrl: "Exposé-URL",
};

export type ObjektSnapshot = {
  data: KonzeptObjekt;
  details: KonzeptObjektDetails;
};

export function currentObjektValue(
  key: ObjektFieldKey,
  snap: ObjektSnapshot,
): string | number | undefined {
  if (key === "provisionsfrei") {
    return snap.details.provisionsfrei == null
      ? undefined
      : snap.details.provisionsfrei
        ? "true"
        : "false";
  }
  if (DATA_KEYS.has(key)) {
    return snap.data[key as keyof KonzeptObjekt];
  }
  const v = snap.details[key as Exclude<keyof KonzeptObjektDetails, "provisionsfrei">];
  return v ?? undefined;
}

export function formatObjektValue(
  key: ObjektFieldKey,
  value: string | number | boolean | undefined,
): string {
  if (value === undefined || value === "" || value === null) return "—";
  const kind = OBJEKT_FIELD_KIND[key];
  if (kind === "bool") {
    const truthy = value === true || value === "true";
    return truthy ? "Ja" : "Nein";
  }
  if (kind === "text") return String(value);
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  if (kind === "euro") return num.toLocaleString("de-DE") + " €";
  if (kind === "area") return num.toLocaleString("de-DE") + " m²";
  return num.toLocaleString("de-DE");
}

// Patch surface the apply step writes into (the object page's draft state).
export type ObjektApplyTarget = {
  patchData: (p: Partial<KonzeptObjekt>) => void;
  patchDetails: (p: Partial<KonzeptObjektDetails>) => void;
};

export function applyObjektExtraction(
  selectedKeys: string[],
  fields: ExtractedBag,
  target: ObjektApplyTarget,
) {
  const dataPatch: Partial<KonzeptObjekt> = {};
  const detailsPatch: Partial<KonzeptObjektDetails> = {};

  for (const k of selectedKeys) {
    const key = k as ObjektFieldKey;
    const field = fields[key];
    if (!field) continue;
    const v = field.value;

    if (key === "provisionsfrei") {
      detailsPatch.provisionsfrei = String(v) === "true";
      continue;
    }
    if (DATA_KEYS.has(key)) {
      const dataKey = key as keyof KonzeptObjekt;
      (dataPatch as Record<string, string | number>)[dataKey] =
        OBJEKT_FIELD_KIND[key] === "text" ? (v as string) : (v as number);
      continue;
    }
    const detailKey = key as Exclude<keyof KonzeptObjektDetails, "provisionsfrei">;
    (detailsPatch as Record<string, string | number>)[detailKey] =
      OBJEKT_FIELD_KIND[key] === "text" ? (v as string) : (v as number);
  }

  if (Object.keys(dataPatch).length > 0) target.patchData(dataPatch);
  if (Object.keys(detailsPatch).length > 0) target.patchDetails(detailsPatch);
}
