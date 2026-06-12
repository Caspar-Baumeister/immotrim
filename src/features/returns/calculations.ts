import type { PropertyInputs } from "@/lib/supabase";
import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateMortgage } from "@/features/mortgage/calculations";

export type EKRenditeYear = {
  year: number;
  cashFlow: number;
  tilgungsanteil: number;
  wertzuwachs: number;
  ekRendite: number | null; // null when effective capital ≤ 0 (fully recouped)
  effectiveEigenkapital: number; // eigenanteil + nebenkosten, adjusted by cumulative cashflow
};

export type EKRenditeMonth = {
  monthIndex: number; // global 1-based month number
  month: number;      // 1–12
  year: number;
  calendarYear: number;
  cashFlow: number;
  tilgungsanteil: number;
  wertzuwachs: number;
  ekRendite: number | null;
  effectiveEigenkapital: number;
};

export type ReturnsMetrics = {
  ekRenditeY1: number | null;
  years: EKRenditeYear[];
  monthlyYears: EKRenditeMonth[];
};

export function calculateReturns(
  inputs: PropertyInputs,
  options?: {
    includeTilgung?: boolean;
    includeWertzuwachs?: boolean;
  }
): ReturnsMetrics {
  const cashFlowMetrics = calculateCashFlow(inputs);
  const mortgage = calculateMortgage(inputs);
  const wertentwicklung = inputs.wertentwicklung ?? 0;
  const includeTilgung = options?.includeTilgung ?? false;
  const includeWertzuwachs = options?.includeWertzuwachs ?? false;

  const totalNebenkostenPct =
    inputs.nebenkosten.grunderwerbsteuerPct +
    inputs.nebenkosten.notarGrundbuchPct +
    inputs.nebenkosten.maklerprovisionPct +
    inputs.nebenkosten.sonstigePct;
  const nebenkostenAbsolut = inputs.kaufpreis * (totalNebenkostenPct / 100);
  const gesamtInvestiertes =
    inputs.eigenanteil + nebenkostenAbsolut > 0
      ? inputs.eigenanteil + nebenkostenAbsolut
      : 1;

  // The EK-Rendite series runs only as long as equity is still tied up in the
  // property, and never beyond 30 years.
  const MAX_YEARS = 30;
  const years: EKRenditeYear[] = [];
  let runningCapital = gesamtInvestiertes;

  for (let i = 0; i < cashFlowMetrics.years.length && i < MAX_YEARS; i++) {
    // Once cumulative cashflow has fully recouped the invested equity there is
    // no capital left to earn a return on — stop the series here.
    if (runningCapital <= 0) break;

    const cfYear = cashFlowMetrics.years[i];
    const year = cfYear.year;

    const prevBalance =
      i === 0
        ? mortgage.loanAmount
        : (mortgage.schedule[i - 1]?.balance ?? 0);
    const currBalance = mortgage.schedule[i]?.balance ?? 0;
    const tilgungsanteil = prevBalance - currBalance;

    const prevWert =
      inputs.kaufpreis * Math.pow(1 + wertentwicklung / 100, year - 1);
    const currWert =
      inputs.kaufpreis * Math.pow(1 + wertentwicklung / 100, year);
    const wertzuwachs = currWert - prevWert;

    const components =
      cfYear.cashFlow +
      (includeTilgung ? tilgungsanteil : 0) +
      (includeWertzuwachs ? wertzuwachs : 0);

    // When effective capital hits zero or goes negative the investor has fully
    // recouped their investment — the % concept breaks down, so we emit null.
    const ekRendite =
      runningCapital > 0 ? (components / runningCapital) * 100 : null;

    years.push({
      year,
      cashFlow: cfYear.cashFlow,
      tilgungsanteil,
      wertzuwachs,
      ekRendite,
      effectiveEigenkapital: runningCapital,
    });

    // Positive cashflow returns money to the investor → less capital "stuck" in the flat
    runningCapital -= cfYear.cashFlow;
  }

  // Expand to monthly — divide annual flow values by 12, ekRendite is annualized %
  const monthlyYears: EKRenditeMonth[] = [];
  for (let i = 0; i < years.length; i++) {
    const annualEntry = years[i];
    const cfMonthlyBase = cashFlowMetrics.monthlyYears[i * 12]; // first month of this year
    for (let month = 1; month <= 12; month++) {
      const monthIndex = i * 12 + month;
      const cfMonthEntry = cashFlowMetrics.monthlyYears[monthIndex - 1];
      const calendarYear = cfMonthEntry?.calendarYear ?? cfMonthlyBase?.calendarYear ?? annualEntry.year;

      // Interpolate effectiveEigenkapital linearly within the year
      const prevCapital = i === 0 ? gesamtInvestiertes : years[i - 1].effectiveEigenkapital - years[i - 1].cashFlow;
      const fraction = month / 12;
      const monthCapital =
        prevCapital + (annualEntry.effectiveEigenkapital - prevCapital) * fraction;

      monthlyYears.push({
        monthIndex,
        month,
        year: annualEntry.year,
        calendarYear,
        cashFlow: annualEntry.cashFlow / 12,
        tilgungsanteil: annualEntry.tilgungsanteil / 12,
        wertzuwachs: annualEntry.wertzuwachs / 12,
        ekRendite: annualEntry.ekRendite, // annualized %, unchanged
        effectiveEigenkapital: monthCapital,
      });
    }
  }

  return {
    ekRenditeY1: years[0]?.ekRendite ?? 0,
    years,
    monthlyYears,
  };
}
