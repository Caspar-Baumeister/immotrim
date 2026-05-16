import type { PropertyInputs } from "@/lib/supabase";
import { calculateMortgage } from "@/features/mortgage/calculations";

export type CashFlowYear = {
  year: number;
  kaltmiete: number;
  leerstandVerlust: number;
  netRent: number;
  mortgage: number;
  ruecklagen: number;
  nichtUmlagefaehig: number;
  cashFlow: number;
};

export type CashFlowMonth = {
  monthIndex: number; // global 1-based month number
  month: number;      // 1–12
  year: number;
  calendarYear: number;
  kaltmiete: number;
  leerstandVerlust: number;
  netRent: number;
  mortgage: number;
  ruecklagen: number;
  nichtUmlagefaehig: number;
  cashFlow: number;
};

export type CashFlowMetrics = {
  monthlyCashFlow: number;
  annualCashFlow: number;
  years: CashFlowYear[];
  monthlyYears: CashFlowMonth[];
};

export function calculateCashFlow(
  inputs: PropertyInputs,
  options?: { mietentwicklungOverride?: number }
): CashFlowMetrics {
  const mortgage = calculateMortgage(inputs);
  const mietentwicklung =
    options?.mietentwicklungOverride ?? inputs.mietentwicklung;

  const baseKaltmiete = inputs.kaltmiete * 12;
  const leerstandRate = inputs.leerstand / 100;

  const leerstandVerlust = baseKaltmiete * leerstandRate;
  const netRent = baseKaltmiete - leerstandVerlust;

  const annualMortgage = mortgage.monthlyPayment * 12;
  const annualRuecklagen = inputs.ruecklagen * 12;
  const annualNichtUmlagefaehig = inputs.nichtUmlagefaehig * 12;

  const annualCashFlow =
    netRent - annualMortgage - annualRuecklagen - annualNichtUmlagefaehig;
  const monthlyCashFlow = annualCashFlow / 12;

  const startYear = inputs.loanStartDate
    ? parseInt(inputs.loanStartDate.split("-")[0], 10)
    : new Date().getFullYear();

  const years: CashFlowYear[] = [];
  const monthlyYears: CashFlowMonth[] = [];
  let monthIndex = 0;

  for (let year = 1; year <= mortgage.totalYears; year++) {
    const growthFactor = Math.pow(1 + mietentwicklung / 100, year - 1);
    const yearKaltmiete = baseKaltmiete * growthFactor;
    const yearLeerstand = yearKaltmiete * leerstandRate;
    const yearNetRent = yearKaltmiete - yearLeerstand;
    const yearCashFlow =
      yearNetRent - annualMortgage - annualRuecklagen - annualNichtUmlagefaehig;

    years.push({
      year,
      kaltmiete: yearKaltmiete,
      leerstandVerlust: yearLeerstand,
      netRent: yearNetRent,
      mortgage: annualMortgage,
      ruecklagen: annualRuecklagen,
      nichtUmlagefaehig: annualNichtUmlagefaehig,
      cashFlow: yearCashFlow,
    });

    // Expand to 12 monthly entries (annual ÷ 12 since rent grows per year)
    for (let month = 1; month <= 12; month++) {
      monthIndex++;
      monthlyYears.push({
        monthIndex,
        month,
        year,
        calendarYear: startYear + year - 1,
        kaltmiete: yearKaltmiete / 12,
        leerstandVerlust: yearLeerstand / 12,
        netRent: yearNetRent / 12,
        mortgage: mortgage.monthlyPayment,
        ruecklagen: inputs.ruecklagen,
        nichtUmlagefaehig: inputs.nichtUmlagefaehig,
        cashFlow: yearCashFlow / 12,
      });
    }
  }

  return { monthlyCashFlow, annualCashFlow, years, monthlyYears };
}
