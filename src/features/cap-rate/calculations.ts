import type { PropertyInputs } from "@/lib/supabase";
import { calculateCashFlow } from "@/features/cash-flow/calculations";

export type MietrenditeYear = {
  year: number;
  bruttoMietrendite: number;
};

export type MietrenditeMonth = {
  monthIndex: number; // global 1-based month number
  month: number;      // 1–12
  year: number;
  calendarYear: number;
  bruttoMietrendite: number;
};

export type CapRateMetrics = {
  bruttoMietrenditeY1: number;
  cashOnCashReturn: number;
  ltv: number;
  years: MietrenditeYear[];
  monthlyYears: MietrenditeMonth[];
};

export function calculateCapRate(
  inputs: PropertyInputs,
  options?: { mietentwicklungOverride?: number }
): CapRateMetrics {
  const cashFlow = calculateCashFlow(inputs, options);
  const mietentwicklung =
    options?.mietentwicklungOverride ?? inputs.mietentwicklung;

  const grossAnnualRentY1 = inputs.kaltmiete * 12;
  const bruttoMietrenditeY1 =
    inputs.kaufpreis > 0 ? (grossAnnualRentY1 / inputs.kaufpreis) * 100 : 0;

  const cashOnCashReturn =
    inputs.eigenanteil > 0
      ? (cashFlow.annualCashFlow / inputs.eigenanteil) * 100
      : 0;

  const loanAmount = Math.max(0, inputs.kaufpreis - inputs.eigenanteil);
  const ltv =
    inputs.kaufpreis > 0 ? (loanAmount / inputs.kaufpreis) * 100 : 0;

  const years: MietrenditeYear[] = cashFlow.years.map((y, i) => ({
    year: y.year,
    bruttoMietrendite:
      inputs.kaufpreis > 0
        ? ((inputs.kaltmiete *
            12 *
            Math.pow(1 + mietentwicklung / 100, i)) /
            inputs.kaufpreis) *
          100
        : 0,
  }));

  // Expand to monthly — same bruttoMietrendite value repeated 12× per year
  const monthlyYears: MietrenditeMonth[] = [];
  cashFlow.monthlyYears.forEach((cfMonth) => {
    const annualEntry = years[cfMonth.year - 1];
    if (!annualEntry) return;
    monthlyYears.push({
      monthIndex: cfMonth.monthIndex,
      month: cfMonth.month,
      year: cfMonth.year,
      calendarYear: cfMonth.calendarYear,
      bruttoMietrendite: annualEntry.bruttoMietrendite,
    });
  });

  return { bruttoMietrenditeY1, cashOnCashReturn, ltv, years, monthlyYears };
}
