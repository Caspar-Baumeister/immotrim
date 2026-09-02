// ─────────────────────────────────────────────────────────────────────────────
// OBJEKT DOMAIN TYPES
//
// An "Objekt" is one candidate property the user wants to finance, including
// its own Finanzierungsbedarf. Objects are standalone (the former "Konzept"
// container was removed — the investor narrative lives in profiles.strategie)
// and are created manually or via exposé AI extraction. Bank requests, the
// anfrage email and the Selbstauskunft are all keyed by object.
// `data`/`details`/`finanzierung` live in jsonb columns (table concept_objects,
// name is historical), so every field here is optional and the catalog can
// grow without a migration.
// ─────────────────────────────────────────────────────────────────────────────

export const ZWECKE = [
  "kauf",
  "neubau",
  "anschlussfinanzierung",
  "kapitalbeschaffung",
] as const;

export type Zweck = (typeof ZWECKE)[number];

export const ZWECK_LABELS: Record<Zweck, string> = {
  kauf: "Kauf",
  neubau: "Neubau",
  anschlussfinanzierung: "Anschlussfinanzierung",
  kapitalbeschaffung: "Kapitalbeschaffung",
};

/** Core data of an object — feeds the anfrage email and Selbstauskunft. */
export type ObjektDaten = {
  adresse?: string; // Straße, Hausnummer
  ort?: string; // PLZ, Ort / Stadtteil
  objekttyp?: string; // z.B. "Eigentumswohnung"
  wohnflaeche?: number; // m²
  zimmer?: number;
  baujahr?: number;
  kaufpreis?: number; // €
  erwarteteMiete?: number; // erwartete Kaltmiete €/Monat
};

/** The requested financing for this object — feeds email + bank flow. */
export type ObjektFinanzierung = {
  darlehensbetrag?: number; // gewünschter Gesamtdarlehensbetrag €
  eigenkapital?: number; // eingebrachtes Eigenkapital €
  zinsbindungJahre?: number;
  tilgungPct?: number; // anfängliche Tilgung % p.a.
  zweck?: Zweck;
  wuensche?: string; // weitere Wünsche (Sondertilgung, KfW, …)
};

/** Extra object details from exposé extraction — not shown in the core form. */
export type ObjektDetails = {
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

/** One standalone object (concept_objects row). */
export type Objekt = {
  id: string;
  data: ObjektDaten;
  details: ObjektDetails;
  finanzierung: ObjektFinanzierung;
  createdAt: string;
  updatedAt: string;
};

/** Display label of an object — address, else type, else a generic fallback. */
export function objektLabel(o: Objekt): string {
  return o.data.adresse?.trim() || o.data.objekttyp?.trim() || "Neues Objekt";
}
