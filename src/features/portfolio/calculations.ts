import type { PropertyInputs } from "@/lib/supabase";
import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateCapRate } from "@/features/cap-rate/calculations";
import { calculateMortgage } from "@/features/mortgage/calculations";

export type PortfolioProperty = {
  id: string;
  name: string;
  address: string | null;
  inputs: PropertyInputs;
};

export type PortfolioMetrics = {
  totalPortfolioValue: number;
  totalInvested: number;
  totalDebt: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  avgGrossYield: number;
  propertyCount: number;
};

export function calculatePortfolio(
  properties: PortfolioProperty[]
): PortfolioMetrics {
  if (properties.length === 0) {
    return {
      totalPortfolioValue: 0,
      totalInvested: 0,
      totalDebt: 0,
      monthlyCashFlow: 0,
      annualCashFlow: 0,
      avgGrossYield: 0,
      propertyCount: 0,
    };
  }

  let totalPortfolioValue = 0;
  let totalInvested = 0;
  let totalDebt = 0;
  let totalMonthlyCashFlow = 0;
  let totalAnnualCashFlow = 0;
  let totalGrossRent = 0;
  let totalKaufpreis = 0;

  for (const prop of properties) {
    const cashFlow = calculateCashFlow(prop.inputs);
    const mortgage = calculateMortgage(prop.inputs);

    // Estimate current portfolio value with appreciation since loanStartDate
    const startYear = prop.inputs.loanStartDate
      ? parseInt(prop.inputs.loanStartDate.split("-")[0], 10)
      : new Date().getFullYear();
    const elapsedYears = Math.max(0, new Date().getFullYear() - startYear);
    const currentValue =
      prop.inputs.kaufpreis *
      Math.pow(1 + prop.inputs.wertentwicklung / 100, elapsedYears);

    // Current debt: balance from schedule at elapsed year
    const scheduleIdx = Math.min(elapsedYears, mortgage.schedule.length - 1);
    const currentDebt =
      mortgage.schedule[scheduleIdx]?.balance ?? mortgage.loanAmount;

    totalPortfolioValue += currentValue;
    totalInvested += prop.inputs.eigenanteil;
    totalDebt += currentDebt;
    totalMonthlyCashFlow += cashFlow.monthlyCashFlow;
    totalAnnualCashFlow += cashFlow.annualCashFlow;
    totalGrossRent += prop.inputs.kaltmiete * 12;
    totalKaufpreis += prop.inputs.kaufpreis;
  }

  const avgGrossYield =
    totalKaufpreis > 0 ? (totalGrossRent / totalKaufpreis) * 100 : 0;

  return {
    totalPortfolioValue,
    totalInvested,
    totalDebt,
    monthlyCashFlow: totalMonthlyCashFlow,
    annualCashFlow: totalAnnualCashFlow,
    avgGrossYield,
    propertyCount: properties.length,
  };
}
