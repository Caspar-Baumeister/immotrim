// Domain types for properties and their documents. Stored in Firestore under
// users/{uid}/properties and users/{uid}/documents (see src/lib/data).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Nebenkosten = {
  grunderwerbsteuerPct: number; // 3.5–6.5% by Bundesland, default 6
  notarGrundbuchPct: number;    // ~1.5%
  maklerprovisionPct: number;   // ~3.57%, 0 if provisionsfrei
  sonstigePct: number;          // misc, default 0
};

export type TaxInputs = {
  gebaeudeanteilPct: number;    // building share % of purchase price (only building is depreciable)
  bemessungsgrundlage: number;  // assessment basis for AfA (usually = kaufpreis, can include Nebenkosten)
  afaPct: number;               // annual depreciation rate % (2% standard, 3% new builds ≥2023, 2.5% pre-1925)
  steuersatz: number;           // personal marginal income tax rate % (Grenzsteuersatz)
};

export type PropertyInputs = {
  // === Purchase ===
  kaufpreis: number;
  nebenkosten: Nebenkosten;
  eigenanteil: number;           // equity in €

  // === Mortgage (Annuitätendarlehen) ===
  zins: number;                  // annual interest rate %
  tilgung: number;               // initial annual repayment rate % — drives full payoff
  zinsbindung: number;           // Zinsbindungsdauer years — chart marker only
  loanStartDate: string;         // "YYYY-MM"

  // === Rent ===
  kaltmiete: number;             // monthly cold rent in €
  nichtUmlagefaehig: number;     // non-allocable monthly costs in €
  leerstand: number;             // vacancy rate %

  // === Reserves ===
  ruecklagen: number;            // monthly reserves in €

  // === Growth (optional per-property forecast; calculations fall back to 0%) ===
  mietentwicklung?: number;      // rent growth % p.a.
  wertentwicklung?: number;      // appreciation % p.a.

  // === Tax (optional — omitting hides tax-related display) ===
  tax?: TaxInputs;

  // === Report-only descriptive details (optional) ===
  // Used ONLY for the bank report (Objektangaben on detail pages). All calculation
  // functions ignore these fields entirely — they have no effect on any KPI/chart.
  report?: ReportDetails;

};

// Descriptive object details shown on the bank report's individual property pages.
// Every field is optional; missing fields are omitted from the report (no placeholder).
export type ReportDetails = {
  objekttyp?: string;    // Immobilientyp, e.g. "Eigentumswohnung", "Mehrfamilienhaus"
  // Owner's estimated current market value €. Display-only: surfaced in the report
  // as the portfolio's "Geschätzter Marktwert", but no KPI/chart calculation uses it.
  marktwert?: number;
  stadt?: string;        // Stadt / Bezirk
  wohnflaeche?: number;  // m²
  zimmer?: number;       // number of rooms
  baujahr?: number;      // year built
  kaufdatum?: string;    // "YYYY-MM-DD" — exact purchase date (loanStartDate is month-only)
  hausgeld?: number;     // Hausgeld / WEG-Kosten, monthly €
  notizen?: string;      // free-text notes / comments
};

export type Property = {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  inputs: PropertyInputs;
  created_at: string;
  updated_at: string;
};

// A file attached to a property. Uploaded straight from the browser to
// Firebase Storage at users/{uid}/documents/{id}/{fileName}; draft_id is set
// while the property is still being created and swapped for property_id on save.
export type PropertyDocument = {
  id: string;
  user_id: string;
  property_id: string | null;
  draft_id: string | null;
  doc_type: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const DEFAULT_INPUTS: PropertyInputs = {
  kaufpreis: 400_000,
  nebenkosten: {
    grunderwerbsteuerPct: 6,
    notarGrundbuchPct: 1.5,
    maklerprovisionPct: 3.57,
    sonstigePct: 0,
  },
  eigenanteil: 100_000,
  zins: 3.5,
  tilgung: 2.0,
  zinsbindung: 10,
  loanStartDate: getCurrentMonth(),
  kaltmiete: 1_400,
  nichtUmlagefaehig: 280,
  leerstand: 3,
  ruecklagen: 333,
  mietentwicklung: undefined,
  wertentwicklung: undefined,
  tax: undefined,
};
