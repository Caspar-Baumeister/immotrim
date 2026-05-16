import type { PropertyInputs } from "@/lib/supabase";
import { calculateMortgage } from "@/features/mortgage/calculations";

export type AppreciationYear = {
  year: number;
  calendarYear: number;
  immobilienwert: number;
  restschuld: number;
  eigenkapital: number;
};

export type AppreciationMonth = {
  monthIndex: number; // global 1-based month number
  month: number;      // 1–12
  year: number;
  calendarYear: number;
  immobilienwert: number;
  restschuld: number;
  eigenkapital: number;
};

export type AppreciationMetrics = {
  years: AppreciationYear[];
  monthlyYears: AppreciationMonth[];
  currentValue: number;
  currentEquity: number;
};

export function calculateAppreciation(
  inputs: PropertyInputs,
  options?: { wertentwicklungOverride?: number }
): AppreciationMetrics {
  const mortgage = calculateMortgage(inputs);
  const wertentwicklung =
    options?.wertentwicklungOverride ?? inputs.wertentwicklung;

  const startYear = inputs.loanStartDate
    ? parseInt(inputs.loanStartDate.split("-")[0], 10)
    : new Date().getFullYear();

  const years: AppreciationYear[] = [];
  const monthlyYears: AppreciationMonth[] = [];

  // Year 0 — purchase
  years.push({
    year: 0,
    calendarYear: startYear,
    immobilienwert: inputs.kaufpreis,
    restschuld: mortgage.loanAmount,
    eigenkapital: inputs.kaufpreis - mortgage.loanAmount,
  });

  for (let year = 1; year <= mortgage.totalYears; year++) {
    const immobilienwert =
      inputs.kaufpreis * Math.pow(1 + wertentwicklung / 100, year);
    const scheduleEntry = mortgage.schedule[year - 1];
    const restschuld = scheduleEntry ? scheduleEntry.balance : 0;
    const eigenkapital = immobilienwert - restschuld;

    years.push({
      year,
      calendarYear: startYear + year,
      immobilienwert,
      restschuld,
      eigenkapital,
    });

    // Expand to 12 monthly entries using actual monthly mortgage balance
    // and linearly interpolated property value between year boundaries
    const prevImmobilienwert =
      inputs.kaufpreis * Math.pow(1 + wertentwicklung / 100, year - 1);

    for (let month = 1; month <= 12; month++) {
      const globalMonthIndex = (year - 1) * 12 + month;
      const monthEntry = mortgage.monthlySchedule[globalMonthIndex - 1];
      const monthRestschuld = monthEntry ? monthEntry.balance : 0;

      // Linearly interpolate property value within the year
      const fraction = month / 12;
      const monthImmobilienwert =
        prevImmobilienwert +
        (immobilienwert - prevImmobilienwert) * fraction;

      monthlyYears.push({
        monthIndex: globalMonthIndex,
        month,
        year,
        calendarYear: startYear + year - 1,
        immobilienwert: monthImmobilienwert,
        restschuld: monthRestschuld,
        eigenkapital: monthImmobilienwert - monthRestschuld,
      });
    }
  }

  const last = years[years.length - 1];
  return {
    years,
    monthlyYears,
    currentValue: last?.immobilienwert ?? inputs.kaufpreis,
    currentEquity: last?.eigenkapital ?? 0,
  };
}
