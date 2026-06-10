import type { PropertyInputs } from "@/lib/supabase";
import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateMortgage } from "@/features/mortgage/calculations";
import { calculateTax } from "@/features/tax/calculations";

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

// ─── Full portfolio KPI overview ─────────────────────────────────────────────
// Mirrors the single-property dense facts panel, but every figure is computed at
// portfolio level. Recurring monthly values are annualized (× 12); balance-sheet
// values (portfolio value, equity, debt) stay as current values. Estimated future
// appreciation and rent growth are deliberately excluded from the core KPIs.

export type PortfolioTaxKpis = {
  taxableRentalIncome: number;   // Σ tax-relevant net cold rent (year 1) €/yr
  depreciation: number;          // Σ annual AfA €/yr
  deductibleInterest: number;    // Σ deductible interest (year 1) €/yr
  taxableResult: number;         // Σ taxable result € (negative = loss)
  marginalTaxRate: number;       // income-weighted Grenzsteuersatz %
  taxImpact: number;             // Σ tax effect € (>0 = saving, <0 = burden)
  cashFlowAfterTax: number;      // portfolio cash flow before tax + tax impact €/yr
  wealthCreationAfterTax: number;// cash flow after tax + principal repayment €/yr
  taxedCount: number;            // properties with tax configured
  totalCount: number;            // total properties in the portfolio
  complete: boolean;             // true when every property has tax configured
};

export type PortfolioKpis = {
  propertyCount: number;

  // 1 — Portfolio & equity (current values, not annualized)
  investedEquity: number;
  totalPurchasePrice: number;
  totalAcquisitionCosts: number;
  totalInvestmentCost: number;
  estimatedPortfolioValue: number;
  outstandingLoanBalance: number;
  netPropertyEquity: number;

  // 2 — Financing & income (annualized)
  annualColdRent: number;
  annualNonRecoverableCosts: number;
  annualDebtService: number;
  annualInterest: number;
  annualPrincipal: number;
  annualReserveContributions: number;
  weightedInterestRate: number;
  weightedRepaymentRate: number;

  // 3 — Returns & cash flow
  grossRentalYield: number;
  netOperatingIncome: number;
  netRentalYield: number;
  cashFlowBeforeTax: number;
  monthlyCashFlowBeforeTax: number;
  directWealthCreationBeforeTax: number;
  cashOnCashReturn: number;
  returnOnEquityBeforeTax: number;

  // 4 — Taxes (null when no property has tax configured)
  tax: PortfolioTaxKpis | null;
};

export function calculatePortfolioKpis(
  properties: PortfolioProperty[]
): PortfolioKpis {
  const empty: PortfolioKpis = {
    propertyCount: 0,
    investedEquity: 0,
    totalPurchasePrice: 0,
    totalAcquisitionCosts: 0,
    totalInvestmentCost: 0,
    estimatedPortfolioValue: 0,
    outstandingLoanBalance: 0,
    netPropertyEquity: 0,
    annualColdRent: 0,
    annualNonRecoverableCosts: 0,
    annualDebtService: 0,
    annualInterest: 0,
    annualPrincipal: 0,
    annualReserveContributions: 0,
    weightedInterestRate: 0,
    weightedRepaymentRate: 0,
    grossRentalYield: 0,
    netOperatingIncome: 0,
    netRentalYield: 0,
    cashFlowBeforeTax: 0,
    monthlyCashFlowBeforeTax: 0,
    directWealthCreationBeforeTax: 0,
    cashOnCashReturn: 0,
    returnOnEquityBeforeTax: 0,
    tax: null,
  };

  if (properties.length === 0) return empty;

  let investedEquity = 0;
  let totalPurchasePrice = 0;
  let totalAcquisitionCosts = 0;
  let estimatedPortfolioValue = 0;
  let outstandingLoanBalance = 0;

  let annualColdRent = 0;
  let annualNonRecoverableCosts = 0;
  let annualDebtService = 0;
  let annualInterest = 0;
  let annualPrincipal = 0;
  let annualReserveContributions = 0;

  // Weighting accumulators (weighted by current outstanding balance)
  let weightedZinsSum = 0;
  let weightedTilgungSum = 0;

  // Tax accumulators (only properties with tax configured contribute)
  let taxedCount = 0;
  let taxableRentalIncome = 0;
  let depreciation = 0;
  let deductibleInterest = 0;
  let taxableResult = 0;
  let taxImpact = 0;
  let taxRateWeightedSum = 0;
  let taxRateWeightBase = 0;

  const currentYear = new Date().getFullYear();

  for (const prop of properties) {
    const inputs = prop.inputs;
    const mortgage = calculateMortgage(inputs);

    const nebenkostenPct =
      inputs.nebenkosten.grunderwerbsteuerPct +
      inputs.nebenkosten.notarGrundbuchPct +
      inputs.nebenkosten.maklerprovisionPct +
      inputs.nebenkosten.sonstigePct;
    const nebenkostenEur = inputs.kaufpreis * (nebenkostenPct / 100);

    // Elapsed years since loan start → current value / debt / debt-service split
    const startYear = inputs.loanStartDate
      ? parseInt(inputs.loanStartDate.split("-")[0], 10)
      : currentYear;
    const elapsedYears = Math.max(0, currentYear - startYear);
    const currentValue =
      inputs.kaufpreis * Math.pow(1 + inputs.wertentwicklung / 100, elapsedYears);
    const scheduleIdx = Math.min(elapsedYears, mortgage.schedule.length - 1);
    const currentDebt =
      mortgage.schedule[scheduleIdx]?.balance ?? mortgage.loanAmount;
    const currentInterest =
      mortgage.schedule[scheduleIdx]?.interest ?? 0;
    const currentPrincipal =
      mortgage.schedule[scheduleIdx]?.principal ?? 0;

    // 1 — Portfolio & equity
    investedEquity += inputs.eigenanteil + nebenkostenEur;
    totalPurchasePrice += inputs.kaufpreis;
    totalAcquisitionCosts += nebenkostenEur;
    estimatedPortfolioValue += currentValue;
    outstandingLoanBalance += currentDebt;

    // 2 — Financing & income (current monthly × 12)
    annualColdRent += inputs.kaltmiete * 12;
    annualNonRecoverableCosts += inputs.nichtUmlagefaehig * 12;
    annualDebtService += mortgage.monthlyPayment * 12;
    annualInterest += currentInterest;
    annualPrincipal += currentPrincipal;
    annualReserveContributions += inputs.ruecklagen * 12;

    weightedZinsSum += currentDebt * inputs.zins;
    weightedTilgungSum += currentDebt * inputs.tilgung;

    // 4 — Taxes
    const tax = calculateTax(inputs);
    if (tax) {
      taxedCount++;
      taxableRentalIncome += tax.nettoMieteY1;
      depreciation += tax.jaehrlicheAfa;
      deductibleInterest += tax.schuldzinsenY1;
      taxableResult += tax.steuerlichesErgebnis;
      taxImpact += tax.steuerEffekt;
      // Income-weighted marginal rate (weight by taxable income magnitude)
      const weight = Math.max(1, Math.abs(tax.nettoMieteY1));
      taxRateWeightedSum += tax.grenzsteuersatz * weight;
      taxRateWeightBase += weight;
    }
  }

  const totalInvestmentCost = totalPurchasePrice + totalAcquisitionCosts;
  const netPropertyEquity = estimatedPortfolioValue - outstandingLoanBalance;

  const weightedInterestRate =
    outstandingLoanBalance > 0 ? weightedZinsSum / outstandingLoanBalance : 0;
  const weightedRepaymentRate =
    outstandingLoanBalance > 0 ? weightedTilgungSum / outstandingLoanBalance : 0;

  // 3 — Returns & cash flow. Property management & maintenance are not modeled
  // separately, so NOI = cold rent − non-recoverable operating costs.
  const netOperatingIncome = annualColdRent - annualNonRecoverableCosts;
  const grossRentalYield =
    totalPurchasePrice > 0 ? (annualColdRent / totalPurchasePrice) * 100 : 0;
  const netRentalYield =
    totalInvestmentCost > 0
      ? (netOperatingIncome / totalInvestmentCost) * 100
      : 0;

  const cashFlowBeforeTax =
    annualColdRent -
    annualNonRecoverableCosts -
    annualReserveContributions -
    annualInterest -
    annualPrincipal;
  const directWealthCreationBeforeTax = cashFlowBeforeTax + annualPrincipal;
  const cashOnCashReturn =
    investedEquity > 0 ? (cashFlowBeforeTax / investedEquity) * 100 : 0;
  const returnOnEquityBeforeTax =
    investedEquity > 0
      ? (directWealthCreationBeforeTax / investedEquity) * 100
      : 0;

  const tax: PortfolioTaxKpis | null =
    taxedCount > 0
      ? {
          taxableRentalIncome,
          depreciation,
          deductibleInterest,
          taxableResult,
          marginalTaxRate:
            taxRateWeightBase > 0 ? taxRateWeightedSum / taxRateWeightBase : 0,
          taxImpact,
          cashFlowAfterTax: cashFlowBeforeTax + taxImpact,
          wealthCreationAfterTax: cashFlowBeforeTax + taxImpact + annualPrincipal,
          taxedCount,
          totalCount: properties.length,
          complete: taxedCount === properties.length,
        }
      : null;

  return {
    propertyCount: properties.length,
    investedEquity,
    totalPurchasePrice,
    totalAcquisitionCosts,
    totalInvestmentCost,
    estimatedPortfolioValue,
    outstandingLoanBalance,
    netPropertyEquity,
    annualColdRent,
    annualNonRecoverableCosts,
    annualDebtService,
    annualInterest,
    annualPrincipal,
    annualReserveContributions,
    weightedInterestRate,
    weightedRepaymentRate,
    grossRentalYield,
    netOperatingIncome,
    netRentalYield,
    cashFlowBeforeTax,
    monthlyCashFlowBeforeTax: cashFlowBeforeTax / 12,
    directWealthCreationBeforeTax,
    cashOnCashReturn,
    returnOnEquityBeforeTax,
    tax,
  };
}
