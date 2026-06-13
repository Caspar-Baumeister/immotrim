import type { Nebenkosten, TaxInputs } from "@/lib/supabase";

export const LAGE_OPTIONS = ["A++", "A+", "A", "B+", "B", "B-", "C+", "C", "D"] as const;
export type Lage = (typeof LAGE_OPTIONS)[number];

// Rich financial-only inputs, mirroring the portfolio PropertyInputs but without
// the fields that already live in flat columns (kaufpreis, eigenanteil) or are
// global (zins, tilgung). Stored in the `extras` jsonb column.
export type WishlistExtras = {
  nebenkosten: Nebenkosten;
  ruecklagen: number; // monthly €
  leerstand: number; // %
  nichtUmlagefaehig: number; // monthly €
  mietentwicklung?: number; // % p.a.
  wertentwicklung?: number; // % p.a.
  tax?: TaxInputs;
};

// Descriptive expose metadata (no effect on KPIs). Stored in `details` jsonb.
export type WishlistDetails = {
  etage?: number | null;
  etagenGesamt?: number | null;
  schlafzimmer?: number | null;
  badezimmer?: number | null;
  hausgeld?: number | null; // monthly €
  stellplaetze?: number | null;
  objektzustand?: string | null;
  ausstattung?: string | null;
  wohnungstyp?: string | null;
  heizungsart?: string | null;
  energietraeger?: string | null;
  energieausweistyp?: string | null;
  energieKennwert?: number | null; // kWh/(m²·a)
  energieKlasse?: string | null;
  provisionsfrei?: boolean | null;
  maklerName?: string | null;
  maklerTelefon?: string | null;
};

export const DEFAULT_WISHLIST_EXTRAS: WishlistExtras = {
  nebenkosten: {
    grunderwerbsteuerPct: 6,
    notarGrundbuchPct: 1.5,
    maklerprovisionPct: 3.57,
    sonstigePct: 0,
  },
  ruecklagen: 0,
  leerstand: 0,
  nichtUmlagefaehig: 0,
};

export function totalNebenkostenPct(nk: Nebenkosten): number {
  return (
    nk.grunderwerbsteuerPct +
    nk.notarGrundbuchPct +
    nk.maklerprovisionPct +
    nk.sonstigePct
  );
}

export type WishlistProperty = {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  exposeUrl: string | null;
  lage: string | null;
  kaufpreis: number | null;
  wohnflaeche: number | null;
  zimmer: number | null;
  baujahr: number | null;
  istMiete: number | null;
  sollMiete: number | null;
  eigenanteil: number | null;
  extras: WishlistExtras;
  details: WishlistDetails;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type YieldMode = "brutto" | "netto";
export type RentBasis = "ist" | "soll";

export type CashflowSettings = {
  subtractReserves: boolean;
  subtractNonAllocable: boolean;
  subtractVacancy: boolean;
};

export type EkReturnSettings = {
  includeTilgung: boolean;
};

export type WishlistGlobalAssumptions = {
  zins: number;
  tilgung: number;
  leerstandPct: number;
  ruecklagenPctOfMiete: number;
  nichtUmlagefaehigPctOfMiete: number;
  defaultEigenanteilPct: number;
  yieldMode: YieldMode;
  rentBasis: RentBasis;
  cashflowSettings: CashflowSettings;
  ekReturnSettings: EkReturnSettings;
};

export const DEFAULT_GLOBAL_ASSUMPTIONS: WishlistGlobalAssumptions = {
  zins: 3.5,
  tilgung: 2.0,
  leerstandPct: 2,
  ruecklagenPctOfMiete: 10,
  nichtUmlagefaehigPctOfMiete: 5,
  defaultEigenanteilPct: 20,
  yieldMode: "brutto",
  rentBasis: "soll",
  cashflowSettings: {
    subtractReserves: true,
    subtractNonAllocable: true,
    subtractVacancy: true,
  },
  ekReturnSettings: {
    includeTilgung: false,
  },
};

export type WishlistRowKpis = {
  pricePerSqm: number | null;
  mietrendite: number | null;
  monthlyCashFlow: number | null;
  ekRendite: number | null;
};

export type WishlistDraft = Omit<
  WishlistProperty,
  "id" | "userId" | "createdAt" | "updatedAt"
>;
