import type { PortfolioProperty } from "@/features/portfolio/calculations";

// Maximum number of properties that get a dedicated detail page. The portfolio
// overview and graphs always cover ALL properties; only detail pages are capped.
export const MAX_DETAIL_PROPERTIES = 10;

// A property counts as a concentration risk when it alone makes up this share of
// the portfolio's total value, debt or rental income.
export const CONCENTRATION_THRESHOLD = 0.4;

// What the user chose to include in the report.
export type ReportConfig = {
  includeTitleImage: boolean;
  includePropertyImages: boolean;
  includeCharts: boolean;
  includeFinancing: boolean; // financing-detail rows on property pages
  includeTax: boolean; // tax KPIs / after-tax cash flow
  includeNotes: boolean; // per-property notes
  // Up to MAX_DETAIL_PROPERTIES ids that get a detail page.
  selectedPropertyIds: string[];
};

export function defaultReportConfig(selectedPropertyIds: string[]): ReportConfig {
  return {
    includeTitleImage: false,
    includePropertyImages: true,
    includeCharts: true,
    includeFinancing: true,
    includeTax: true,
    includeNotes: true,
    selectedPropertyIds,
  };
}

// The serializable payload handed to the headless print page via report_jobs.
// It carries the RAW portfolio so the page can recompute every KPI/chart with the
// existing calculation functions — only image URLs are pre-resolved (signed),
// because the storage bucket is private and Chromium has no user session.
export type ReportPayload = {
  generatedAt: string; // ISO timestamp
  locale: string;
  investorName: string;
  config: ReportConfig;
  properties: PortfolioProperty[]; // ALL properties in the portfolio
  titleImageUrl: string | null;
  propertyImageUrls: Record<string, string[]>; // propertyId → signed image URLs
};

// Descriptive report-only fields, used by missingReportFields() + the completeness
// hint in the report dialog. Notizen is intentionally excluded (free text, optional).
export const REPORT_DETAIL_FIELDS = [
  "objekttyp",
  "stadt",
  "wohnflaeche",
  "zimmer",
  "baujahr",
  "kaufdatum",
] as const;

export type ReportDetailField = (typeof REPORT_DETAIL_FIELDS)[number];

export const REPORT_DETAIL_LABELS: Record<ReportDetailField, string> = {
  objekttyp: "Immobilientyp",
  stadt: "Stadt / Bezirk",
  wohnflaeche: "Wohnfläche",
  zimmer: "Zimmer",
  baujahr: "Baujahr",
  kaufdatum: "Kaufdatum",
};
