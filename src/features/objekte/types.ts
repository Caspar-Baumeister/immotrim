// ─────────────────────────────────────────────────────────────────────────────
// FINANZIERUNGSKONZEPT DOMAIN TYPES
//
// A "Konzept" is one financing strategy: what the user wants to buy and how
// they want to finance it (e.g. "Möbliertes 1-Zimmer-Apartment in Potsdam").
// It is a container for MULTIPLE candidate objects (concept_objects rows) —
// whenever the user finds a fitting object they add it to the concept (manually
// or via exposé AI extraction) and pick one when sending a bank request.
// `finanzierung`/`data`/`details` live in jsonb columns, so every field here is
// optional and the catalog can grow without a migration.
// ─────────────────────────────────────────────────────────────────────────────

export const KONZEPT_TYPES = [
  "moebliertes_apartment",
  "wg",
  "klassische_vermietung",
  "eigennutzung",
  "custom",
] as const;

export type KonzeptType = (typeof KONZEPT_TYPES)[number];

export const KONZEPT_TYPE_LABELS: Record<KonzeptType, string> = {
  moebliertes_apartment: "Möbliertes Apartment",
  wg: "WG- / Shared-Living-Konzept",
  klassische_vermietung: "Klassische Vermietung",
  eigennutzung: "Eigennutzung",
  custom: "Eigenes Konzept",
};

export const KONZEPT_ZWECKE = [
  "kauf",
  "neubau",
  "anschlussfinanzierung",
  "kapitalbeschaffung",
] as const;

export type KonzeptZweck = (typeof KONZEPT_ZWECKE)[number];

export const KONZEPT_ZWECK_LABELS: Record<KonzeptZweck, string> = {
  kauf: "Kauf",
  neubau: "Neubau",
  anschlussfinanzierung: "Anschlussfinanzierung",
  kapitalbeschaffung: "Kapitalbeschaffung",
};

/** Core data of a concept object — feeds the anfrage email and Selbstauskunft. */
export type KonzeptObjekt = {
  adresse?: string; // Straße, Hausnummer
  ort?: string; // PLZ, Ort / Stadtteil
  objekttyp?: string; // z.B. "Eigentumswohnung"
  wohnflaeche?: number; // m²
  zimmer?: number;
  baujahr?: number;
  kaufpreis?: number; // €
  erwarteteMiete?: number; // erwartete Kaltmiete €/Monat
};

/** The requested financing — feeds the "Ihr Finanzbedarf" page of the Selbstauskunft. */
export type KonzeptFinanzierung = {
  darlehensbetrag?: number; // gewünschter Gesamtdarlehensbetrag €
  eigenkapital?: number; // eingebrachtes Eigenkapital €
  zinsbindungJahre?: number;
  tilgungPct?: number; // anfängliche Tilgung % p.a.
  zweck?: KonzeptZweck;
  wuensche?: string; // weitere Wünsche (Sondertilgung, KfW, …)
};

/** Extra object details from exposé extraction — not shown in the core form. */
export type KonzeptObjektDetails = {
  hausgeld?: number; // monatliches Hausgeld €
  etage?: number;
  etagenGesamt?: number;
  schlafzimmer?: number;
  badezimmer?: number;
  stellplaetze?: number;
  objektzustand?: string;
  ausstattung?: string;
  heizungsart?: string;
  energietraeger?: string;
  energieausweistyp?: string;
  energieKennwert?: number; // kWh/(m²·a)
  energieKlasse?: string;
  provisionsfrei?: boolean;
  maklerName?: string;
  maklerTelefon?: string;
  exposeUrl?: string;
};

/** One candidate object inside a concept (concept_objects row). */
export type ConceptObject = {
  id: string;
  conceptId: string;
  data: KonzeptObjekt;
  details: KonzeptObjektDetails;
  createdAt: string;
  updatedAt: string;
};

/** Display label of an object — address, else type, else a generic fallback. */
export function objektLabel(o: ConceptObject): string {
  return o.data.adresse?.trim() || o.data.objekttyp?.trim() || "Neues Objekt";
}

export type Konzept = {
  id: string;
  userId: string;
  title: string;
  conceptType?: KonzeptType;
  description?: string;
  finanzierung: KonzeptFinanzierung;
  createdAt: string;
  updatedAt: string;
};

export type KonzeptDraft = Omit<Konzept, "id" | "userId" | "createdAt" | "updatedAt">;

export const EMPTY_KONZEPT_DRAFT: KonzeptDraft = {
  title: "",
  finanzierung: {},
};

/** Narrow an arbitrary stored string to a known concept type. */
export function normaliseKonzeptType(raw: string | null | undefined): KonzeptType | undefined {
  return (KONZEPT_TYPES as readonly string[]).includes(raw ?? "")
    ? (raw as KonzeptType)
    : undefined;
}
