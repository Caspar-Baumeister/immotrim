export type WishlistProperty = {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  exposeUrl: string | null;
  kaufpreis: number | null;
  wohnflaeche: number | null;
  zimmer: number | null;
  baujahr: number | null;
  kaltmiete: number | null;
  eigenanteil: number | null;
  nebenkostenPct: number;
  nichtUmlagefaehigPctOfMiete: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WishlistGlobalAssumptions = {
  zins: number;
  tilgung: number;
  leerstandPct: number;
  ruecklagenPctOfMiete: number;
  defaultEigenanteilPct: number;
};

export const DEFAULT_GLOBAL_ASSUMPTIONS: WishlistGlobalAssumptions = {
  zins: 3.5,
  tilgung: 2.0,
  leerstandPct: 2,
  ruecklagenPctOfMiete: 10,
  defaultEigenanteilPct: 20,
};

export type WishlistRowKpis = {
  pricePerSqm: number | null;
  bruttoMietrendite: number | null;
  monthlyCashFlow: number | null;
  ekRendite: number | null;
};

export type WishlistDraft = Omit<WishlistProperty, "id" | "userId" | "createdAt" | "updatedAt">;
