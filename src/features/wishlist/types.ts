export const LAGE_OPTIONS = ["A++", "A+", "A", "B+", "B", "B-", "C+", "C", "D"] as const;
export type Lage = (typeof LAGE_OPTIONS)[number];

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
  kaltmiete: number | null;
  eigenanteil: number | null;
  nebenkostenPct: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type YieldMode = "brutto" | "netto";

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

export type WishlistDraft = Omit<WishlistProperty, "id" | "userId" | "createdAt" | "updatedAt">;
