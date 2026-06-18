import { formatCurrency, formatPercent } from "@/lib/utils";

// Light-mode palette for the bank report. Mirrors the app's semantic chart colors
// (globals.css), but every value is chosen to read cleanly on a WHITE background —
// the app's dark-mode chart components are not reused directly (e.g. the EK-Rendite
// line is white there and would be invisible here).
export const REPORT_COLORS = {
  value: "#3b82f6", // Immobilienwert (blue / equity)
  debt: "#ef4444", // Restschuld (red / expenses)
  equity: "#10b981", // Nettovermögen (emerald)
  cashflow: "#f59e0b", // Cashflow (amber)
  cashflowNeg: "#ef4444",
  principal: "#22c55e", // Tilgung (green)
  interest: "#6366f1", // Zinsen (indigo)
  rent: "#f97316", // Mieteinnahmen (orange)
  debtService: "#6366f1", // Kapitaldienst (indigo)
  yield: "#8b5cf6", // Rendite (violet)
  ltv: "#0ea5e9", // Beleihungsauslauf (sky)
  // Neutrals
  axis: "#6b7280",
  grid: "#e5e7eb",
  text: "#0f1115",
  muted: "#6b7280",
  border: "#e5e7eb",
  cardBorder: "#e9ecf1",
  pageBg: "#ffffff",
} as const;

export const eur = (v: number) => formatCurrency(v, "de-DE");
export const eurCompact = (v: number) => formatCurrency(v, "de-DE", true);
export const pct = (v: number) => formatPercent(v);

export function formatDateDE(iso?: string | null): string {
  if (!iso) return "—";
  // Accept "YYYY-MM-DD" or "YYYY-MM".
  const parts = iso.split("-");
  if (parts.length >= 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  return iso;
}
