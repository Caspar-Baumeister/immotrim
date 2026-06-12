import type { PropertyInputs } from "@/lib/supabase";
import { calculateMortgage } from "@/features/mortgage/calculations";
import { calculateCashFlow } from "@/features/cash-flow/calculations";

export type WealthYear = {
  year: number;
  calendarYear: number;
  /** Principal paid down that year. Rises year over year (Annuitätendarlehen). */
  tilgung: number;
  /** Net cashflow that year. Rises with Mietentwicklung; may be negative. */
  cashFlow: number;
  /** Property value gained that year. Zero when wertentwicklung is 0%. */
  wertwachstum: number;
  /** Sum of the three components — total wealth built in that single year. */
  total: number;
};

export type WealthMetrics = {
  years: WealthYear[];
  /** False when wertentwicklung is 0% → the Wertwachstum segment is dropped. */
  hasWertwachstum: boolean;
};

/**
 * Yearly (NOT cumulative) wealth buildup, split into its three drivers:
 * Tilgung, Cashflow and Wertwachstum. Each row answers "how much wealth did
 * this property build in year N?", so the bars are meant to be stacked.
 */
export function calculateWealthBuildup(inputs: PropertyInputs): WealthMetrics {
  const mortgage = calculateMortgage(inputs);
  const cashFlow = calculateCashFlow(inputs);
  const wertentwicklung = inputs.wertentwicklung ?? 0;

  const startYear = inputs.loanStartDate
    ? parseInt(inputs.loanStartDate.split("-")[0], 10)
    : new Date().getFullYear();

  const years: WealthYear[] = [];

  for (let i = 0; i < mortgage.schedule.length; i++) {
    const year = i + 1;
    const tilgung = mortgage.schedule[i].principal;
    const cf = cashFlow.years[i]?.cashFlow ?? 0;

    // Appreciation gained in *this* year only: end-of-year value minus
    // start-of-year value (compounded on the purchase price).
    const prevWert =
      inputs.kaufpreis * Math.pow(1 + wertentwicklung / 100, year - 1);
    const currWert =
      inputs.kaufpreis * Math.pow(1 + wertentwicklung / 100, year);
    const wertwachstum = currWert - prevWert;

    years.push({
      year,
      calendarYear: startYear + year - 1,
      tilgung,
      cashFlow: cf,
      wertwachstum,
      total: tilgung + cf + wertwachstum,
    });
  }

  return { years, hasWertwachstum: wertentwicklung > 0 };
}
