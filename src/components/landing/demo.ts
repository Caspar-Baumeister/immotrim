// The example portfolio of the landing page. The promo videos
// (~/Code/immotrim-promo) use exactly these numbers, keep both in sync.

export const DEMO_PROPERTIES = [
  { name: "ETW Leipzig-Gohlis", detail: "2 Zimmer, 68 m²", value: 248_000, debt: 171_300, rent: 13_200 },
  { name: "MFH Magdeburg", detail: "6 Einheiten", value: 712_000, debt: 455_900, rent: 35_400 },
  { name: "ETW Potsdam", detail: "3 Zimmer, 74 m²", value: 280_000, debt: 185_200, rent: 9_600 },
] as const;

export const DEMO_KPIS = {
  marketValue: 1_240_000,
  debt: 812_400,
  equity: 427_600,
  growth: 54_850,
  leveredReturnPct: 12.8,
  unleveredReturnPct: 4.1,
  ltvPct: 65.5,
  refinanceHeadroom: 179_600,
};

/** Vermögenszuwachs pro Jahr, split into the forces (sums to DEMO_KPIS.growth). */
export const DEMO_FORCES = [
  { key: "appreciation", label: "Wertsteigerung", value: 18_600, color: "#3b82f6" },
  { key: "inflation", label: "Inflation auf die Schulden", value: 16_250, color: "#a78bfa" },
  { key: "principal", label: "Schuldenabbau", value: 14_880, color: "#22c55e" },
  { key: "cashflow", label: "Cashflow", value: 3_960, color: "#f59e0b" },
  { key: "rent", label: "Mieterhöhung", value: 1_160, color: "#f97316" },
] as const;

const eurFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const eur = (v: number) => eurFormat.format(Math.round(v));
