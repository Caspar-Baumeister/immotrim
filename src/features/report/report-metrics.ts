import type { PropertyInputs } from "@/lib/supabase";
import type { PortfolioProperty } from "@/features/portfolio/calculations";
import { calculateMortgage } from "@/features/mortgage/calculations";
import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateTax } from "@/features/tax/calculations";
import {
  CONCENTRATION_THRESHOLD,
  MAX_DETAIL_PROPERTIES,
  REPORT_DETAIL_FIELDS,
  REPORT_DETAIL_LABELS,
  type ReportDetailField,
} from "./report-types";

// ─── Per-property metrics (bank-relevant) ───────────────────────────────────

export type OccupancyStatus = "vermietet" | "teilweise vermietet" | "leerstehend";

export type PropertyReportMetrics = {
  id: string;
  name: string;
  address: string | null;

  // Descriptive (report-only, may be undefined)
  objekttyp?: string;
  stadt?: string;
  wohnflaeche?: number;
  zimmer?: number;
  baujahr?: number;
  kaufdatum?: string;
  hausgeld?: number;
  notizen?: string;

  // Acquisition & value
  kaufpreis: number;
  nebenkostenEur: number;
  totalAcquisition: number;
  currentValue: number;
  currentDebt: number;
  ltv: number; // Beleihungsauslauf %

  // Financing
  loanAmount: number;
  monthlyPayment: number; // Kapitaldienst
  zins: number;
  tilgung: number;
  zinsbindung: number;
  loanStartDate: string;
  remainingFixedYears: number | null; // verbleibende Zinsbindung in Jahren

  // Income
  monthlyColdRent: number;
  annualColdRent: number;
  rentPerSqm: number | null;
  nichtUmlagefaehigMonthly: number;
  ruecklagenMonthly: number;
  leerstand: number;
  occupancy: OccupancyStatus;

  // Returns & cash flow
  grossYield: number;
  netYield: number;
  monthlyCashFlowBeforeTax: number;
  monthlyCashFlowAfterTax: number | null;

  // Portfolio contribution shares (0–100), filled by computeReportMetrics
  debtShare: number;
  valueShare: number;
  rentShare: number;
};

function nebenkostenEurOf(inputs: PropertyInputs): number {
  const pct =
    inputs.nebenkosten.grunderwerbsteuerPct +
    inputs.nebenkosten.notarGrundbuchPct +
    inputs.nebenkosten.maklerprovisionPct +
    inputs.nebenkosten.sonstigePct;
  return inputs.kaufpreis * (pct / 100);
}

function startYearOf(inputs: PropertyInputs): number {
  return inputs.loanStartDate
    ? parseInt(inputs.loanStartDate.split("-")[0], 10)
    : new Date().getFullYear();
}

function occupancyOf(leerstand: number): OccupancyStatus {
  if (leerstand >= 100) return "leerstehend";
  if (leerstand > 0) return "teilweise vermietet";
  return "vermietet";
}

// Single-property metrics (shares are 0 here; computeReportMetrics fills them).
export function computePropertyMetrics(
  prop: PortfolioProperty
): PropertyReportMetrics {
  const inputs = prop.inputs;
  const mortgage = calculateMortgage(inputs);
  const cashFlow = calculateCashFlow(inputs);
  const tax = calculateTax(inputs);

  const currentYear = new Date().getFullYear();
  const elapsedYears = Math.max(0, currentYear - startYearOf(inputs));
  const currentValue =
    inputs.kaufpreis *
    Math.pow(1 + (inputs.wertentwicklung ?? 0) / 100, elapsedYears);
  const scheduleIdx = Math.min(elapsedYears, mortgage.schedule.length - 1);
  const currentDebt = mortgage.schedule[scheduleIdx]?.balance ?? mortgage.loanAmount;

  const nebenkostenEur = nebenkostenEurOf(inputs);
  const totalAcquisition = inputs.kaufpreis + nebenkostenEur;
  const annualColdRent = inputs.kaltmiete * 12;
  const noi = annualColdRent - inputs.nichtUmlagefaehig * 12;

  // Remaining Zinsbindung from today (loan start + zinsbindung − elapsed).
  const remainingFixedYears =
    inputs.zinsbindung > 0
      ? Math.max(0, inputs.zinsbindung - elapsedYears)
      : null;

  const report = inputs.report ?? {};

  return {
    id: prop.id,
    name: prop.name,
    address: prop.address,

    objekttyp: report.objekttyp,
    stadt: report.stadt,
    wohnflaeche: report.wohnflaeche,
    zimmer: report.zimmer,
    baujahr: report.baujahr,
    kaufdatum: report.kaufdatum,
    hausgeld: report.hausgeld,
    notizen: report.notizen,

    kaufpreis: inputs.kaufpreis,
    nebenkostenEur,
    totalAcquisition,
    currentValue,
    currentDebt,
    ltv: currentValue > 0 ? (currentDebt / currentValue) * 100 : 0,

    loanAmount: mortgage.loanAmount,
    monthlyPayment: mortgage.monthlyPayment,
    zins: inputs.zins,
    tilgung: inputs.tilgung,
    zinsbindung: inputs.zinsbindung,
    loanStartDate: inputs.loanStartDate,
    remainingFixedYears,

    monthlyColdRent: inputs.kaltmiete,
    annualColdRent,
    rentPerSqm:
      report.wohnflaeche && report.wohnflaeche > 0
        ? inputs.kaltmiete / report.wohnflaeche
        : null,
    nichtUmlagefaehigMonthly: inputs.nichtUmlagefaehig,
    ruecklagenMonthly: inputs.ruecklagen,
    leerstand: inputs.leerstand,
    occupancy: occupancyOf(inputs.leerstand),

    grossYield:
      inputs.kaufpreis > 0 ? (annualColdRent / inputs.kaufpreis) * 100 : 0,
    netYield: totalAcquisition > 0 ? (noi / totalAcquisition) * 100 : 0,
    monthlyCashFlowBeforeTax: cashFlow.monthlyCashFlow,
    monthlyCashFlowAfterTax: tax ? tax.cashflowNachSteuern / 12 : null,

    debtShare: 0,
    valueShare: 0,
    rentShare: 0,
  };
}

export type ReportMetrics = {
  perProperty: PropertyReportMetrics[]; // same order as input
  byId: Record<string, PropertyReportMetrics>;
  totalCurrentValue: number;
  totalCurrentDebt: number;
  totalAnnualColdRent: number;
};

// Metrics for every property + portfolio totals + contribution shares.
export function computeReportMetrics(
  properties: PortfolioProperty[]
): ReportMetrics {
  const perProperty = properties.map(computePropertyMetrics);
  const totalCurrentValue = perProperty.reduce((s, p) => s + p.currentValue, 0);
  const totalCurrentDebt = perProperty.reduce((s, p) => s + p.currentDebt, 0);
  const totalAnnualColdRent = perProperty.reduce((s, p) => s + p.annualColdRent, 0);

  for (const p of perProperty) {
    p.valueShare = totalCurrentValue > 0 ? (p.currentValue / totalCurrentValue) * 100 : 0;
    p.debtShare = totalCurrentDebt > 0 ? (p.currentDebt / totalCurrentDebt) * 100 : 0;
    p.rentShare =
      totalAnnualColdRent > 0 ? (p.annualColdRent / totalAnnualColdRent) * 100 : 0;
  }

  const byId: Record<string, PropertyReportMetrics> = {};
  for (const p of perProperty) byId[p.id] = p;

  return { perProperty, byId, totalCurrentValue, totalCurrentDebt, totalAnnualColdRent };
}

// ─── Bank-relevance ranking (auto-suggest top N detail pages) ────────────────
// Each property is scored by a blend of bank-relevant dimensions, each normalized
// to [0,1] against the portfolio max so no single absolute scale dominates:
//   loan exposure, current value, rent contribution, risk (high LTV, low cash flow).

export function rankPropertiesForReport(
  properties: PortfolioProperty[],
  limit = MAX_DETAIL_PROPERTIES
): string[] {
  const metrics = computeReportMetrics(properties).perProperty;
  if (metrics.length === 0) return [];

  const max = (sel: (m: PropertyReportMetrics) => number) =>
    Math.max(1, ...metrics.map((m) => Math.abs(sel(m))));
  const maxDebt = max((m) => m.currentDebt);
  const maxValue = max((m) => m.currentValue);
  const maxRent = max((m) => m.annualColdRent);
  // Worst (most negative) monthly cash flow magnitude, for the risk component.
  const worstCf = Math.min(0, ...metrics.map((m) => m.monthlyCashFlowBeforeTax));
  const cfRange = Math.max(1, Math.abs(worstCf));

  const scored = metrics.map((m) => {
    const exposure = m.currentDebt / maxDebt;
    const value = m.currentValue / maxValue;
    const rent = m.annualColdRent / maxRent;
    const ltvRisk = Math.min(1, m.ltv / 100);
    const cfRisk =
      m.monthlyCashFlowBeforeTax < 0
        ? Math.abs(m.monthlyCashFlowBeforeTax) / cfRange
        : 0;
    const score =
      exposure * 0.3 + value * 0.25 + rent * 0.2 + ltvRisk * 0.15 + cfRisk * 0.1;
    return { id: m.id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.id);
}

// ─── Completeness (missing descriptive fields) ───────────────────────────────

export function missingReportFields(inputs: PropertyInputs): ReportDetailField[] {
  const report = inputs.report ?? {};
  return REPORT_DETAIL_FIELDS.filter((f) => {
    const v = report[f];
    return v === undefined || v === null || v === "";
  });
}

export function missingReportFieldLabels(inputs: PropertyInputs): string[] {
  return missingReportFields(inputs).map((f) => REPORT_DETAIL_LABELS[f]);
}

// ─── Risk & financing summary ────────────────────────────────────────────────

export type RankedItem = { name: string; value: number };

export type ZinsbindungRow = {
  name: string;
  zinsbindung: number;
  loanStartDate: string;
  remainingFixedYears: number | null;
};

export type RiskSummary = {
  highestLtv: RankedItem | null;
  lowestCashflow: RankedItem | null;
  largestLoan: RankedItem | null;
  largestRentContribution: RankedItem | null;
  zinsbindungen: ZinsbindungRow[];
  concentrationFlags: string[];
};

function maxBy(
  items: PropertyReportMetrics[],
  sel: (m: PropertyReportMetrics) => number
): PropertyReportMetrics | null {
  if (items.length === 0) return null;
  return items.reduce((best, m) => (sel(m) > sel(best) ? m : best));
}

function minBy(
  items: PropertyReportMetrics[],
  sel: (m: PropertyReportMetrics) => number
): PropertyReportMetrics | null {
  if (items.length === 0) return null;
  return items.reduce((best, m) => (sel(m) < sel(best) ? m : best));
}

export function buildRiskSummary(properties: PortfolioProperty[]): RiskSummary {
  const { perProperty } = computeReportMetrics(properties);
  if (perProperty.length === 0) {
    return {
      highestLtv: null,
      lowestCashflow: null,
      largestLoan: null,
      largestRentContribution: null,
      zinsbindungen: [],
      concentrationFlags: [],
    };
  }

  const highLtv = maxBy(perProperty, (m) => m.ltv);
  const lowCf = minBy(perProperty, (m) => m.monthlyCashFlowBeforeTax);
  const bigLoan = maxBy(perProperty, (m) => m.currentDebt);
  const bigRent = maxBy(perProperty, (m) => m.rentShare);

  const concentrationFlags: string[] = [];
  if (perProperty.length > 1) {
    const topValue = maxBy(perProperty, (m) => m.valueShare);
    const topDebt = maxBy(perProperty, (m) => m.debtShare);
    const topRent = maxBy(perProperty, (m) => m.rentShare);
    const thr = CONCENTRATION_THRESHOLD * 100;
    if (topValue && topValue.valueShare >= thr)
      concentrationFlags.push(
        `„${topValue.name}" entspricht ${topValue.valueShare.toFixed(0)} % des geschätzten Portfoliowerts.`
      );
    if (topDebt && topDebt.debtShare >= thr)
      concentrationFlags.push(
        `„${topDebt.name}" entspricht ${topDebt.debtShare.toFixed(0)} % der gesamten Restschuld.`
      );
    if (topRent && topRent.rentShare >= thr)
      concentrationFlags.push(
        `„${topRent.name}" entspricht ${topRent.rentShare.toFixed(0)} % der gesamten Nettokaltmiete.`
      );
  }

  return {
    highestLtv: highLtv ? { name: highLtv.name, value: highLtv.ltv } : null,
    lowestCashflow: lowCf
      ? { name: lowCf.name, value: lowCf.monthlyCashFlowBeforeTax }
      : null,
    largestLoan: bigLoan ? { name: bigLoan.name, value: bigLoan.currentDebt } : null,
    largestRentContribution: bigRent
      ? { name: bigRent.name, value: bigRent.rentShare }
      : null,
    zinsbindungen: perProperty.map((m) => ({
      name: m.name,
      zinsbindung: m.zinsbindung,
      loanStartDate: m.loanStartDate,
      remainingFixedYears: m.remainingFixedYears,
    })),
    concentrationFlags,
  };
}
