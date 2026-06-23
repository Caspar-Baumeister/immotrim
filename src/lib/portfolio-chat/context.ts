import type { Property, PropertyInputs } from "@/lib/supabase/types";
import { calculatePortfolioKpis, type PortfolioProperty } from "@/features/portfolio/calculations";
import { calculateWealthBuildup } from "@/features/wealth/calculations";
import { calculatePortfolioWealthSeries } from "@/features/portfolio/chart-calculations";

// Rounds to whole euros / one-decimal percents so the model sees clean,
// stable numbers (and we don't leak float noise into the prompt).
function r0(n: number): number {
  return Math.round(n);
}
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

// The PRECOMPUTED headline metrics for one property — derived with the exact
// same functions the app's KPI panel and charts use, so the assistant reports
// numbers identical to what the user sees on screen (no model-side math).
// Loan-to-value (Beleihungsauslauf) as a %, 0 when value is unknown.
function ltv(remainingDebt: number, currentValue: number): number {
  return currentValue > 0 ? r1((remainingDebt / currentValue) * 100) : 0;
}

function propertyMetrics(p: PortfolioProperty) {
  const kpis = calculatePortfolioKpis([p]);
  const wealthY1 = calculateWealthBuildup(p.inputs).years[0];

  const metrics: Record<string, unknown> = {
    // Balance sheet
    currentValue: r0(kpis.estimatedPortfolioValue),
    remainingDebt: r0(kpis.outstandingLoanBalance),
    equity: r0(kpis.netPropertyEquity),
    ltvPct: ltv(kpis.outstandingLoanBalance, kpis.estimatedPortfolioValue),
    investedEquity: r0(kpis.investedEquity),
    totalInvestment: r0(kpis.totalInvestmentCost),
    // Income & financing (annual)
    annualColdRent: r0(kpis.annualColdRent),
    annualDebtService: r0(kpis.annualDebtService),
    annualInterest: r0(kpis.annualInterest),
    annualPrincipal: r0(kpis.annualPrincipal),
    // Cash flow & returns
    monthlyCashFlow: r0(kpis.monthlyCashFlowBeforeTax),
    annualCashFlow: r0(kpis.cashFlowBeforeTax),
    cashOnCashPct: r1(kpis.cashOnCashReturn),
    equityReturnPct: r1(kpis.returnOnEquityBeforeTax),
    grossYieldPct: r1(kpis.grossRentalYield),
    netYieldPct: r1(kpis.netRentalYield),
    // Vermögensaufbau (year 1): principal paydown + net cash flow + appreciation.
    wealthBuildupPerYear: wealthY1
      ? {
          total: r0(wealthY1.total),
          tilgung: r0(wealthY1.tilgung),
          cashFlow: r0(wealthY1.cashFlow),
          wertzuwachs: r0(wealthY1.wertwachstum),
        }
      : null,
  };
  if (kpis.tax) metrics.taxImpactPerYear = r0(kpis.tax.taxImpact);
  return metrics;
}

function toPortfolioProperty(p: Property): PortfolioProperty {
  return { id: p.id, name: p.name, address: p.address, inputs: p.inputs as PropertyInputs };
}

// Builds the model-facing portfolio context injected into the system prompt on
// every turn: each property's raw `inputs` (still needed for write proposals and
// input-level questions) PLUS a precomputed `metrics` block, followed by a
// portfolio-wide aggregate block. All figures are deterministic.
export function buildPortfolioSummary(properties: Property[]): string {
  if (properties.length === 0) {
    return "The user has no properties in their portfolio yet.";
  }

  const portfolioProps = properties.map(toPortfolioProperty);

  const lines = portfolioProps.map((p) => {
    const i = p.inputs;
    const inputs: Record<string, unknown> = {
      kaufpreis: i.kaufpreis,
      eigenanteil: i.eigenanteil,
      zins: i.zins,
      tilgung: i.tilgung,
      zinsbindung: i.zinsbindung,
      loanStartDate: i.loanStartDate,
      kaltmiete: i.kaltmiete,
      nichtUmlagefaehig: i.nichtUmlagefaehig,
      leerstand: i.leerstand,
      ruecklagen: i.ruecklagen,
    };
    if (i.mietentwicklung != null) inputs.mietentwicklung = i.mietentwicklung;
    if (i.wertentwicklung != null) inputs.wertentwicklung = i.wertentwicklung;
    if (i.tax) {
      inputs.tax = {
        afaPct: i.tax.afaPct,
        steuersatz: i.tax.steuersatz,
        gebaeudeanteilPct: i.tax.gebaeudeanteilPct,
        bemessungsgrundlage: i.tax.bemessungsgrundlage,
      };
    }
    const header = `- id=${p.id} | name=${JSON.stringify(p.name)}${p.address ? ` | address=${JSON.stringify(p.address)}` : ""}`;
    return `${header}\n  inputs=${JSON.stringify(inputs)}\n  metrics=${JSON.stringify(propertyMetrics(p))}`;
  });

  // Portfolio-wide aggregates (same calc the portfolio page uses).
  const total = calculatePortfolioKpis(portfolioProps);
  const portfolioWealthY1 = calculatePortfolioWealthSeries(portfolioProps).years[0];
  const portfolioMetrics: Record<string, unknown> = {
    propertyCount: total.propertyCount,
    currentValue: r0(total.estimatedPortfolioValue),
    remainingDebt: r0(total.outstandingLoanBalance),
    equity: r0(total.netPropertyEquity),
    ltvPct: ltv(total.outstandingLoanBalance, total.estimatedPortfolioValue),
    investedEquity: r0(total.investedEquity),
    totalInvestment: r0(total.totalInvestmentCost),
    annualColdRent: r0(total.annualColdRent),
    annualDebtService: r0(total.annualDebtService),
    annualInterest: r0(total.annualInterest),
    annualPrincipal: r0(total.annualPrincipal),
    monthlyCashFlow: r0(total.monthlyCashFlowBeforeTax),
    annualCashFlow: r0(total.cashFlowBeforeTax),
    cashOnCashPct: r1(total.cashOnCashReturn),
    equityReturnPct: r1(total.returnOnEquityBeforeTax),
    grossYieldPct: r1(total.grossRentalYield),
    netYieldPct: r1(total.netRentalYield),
    weightedInterestRatePct: r1(total.weightedInterestRate),
    weightedRepaymentRatePct: r1(total.weightedRepaymentRate),
    wealthBuildupPerYear: portfolioWealthY1 ? r0(portfolioWealthY1.total) : null,
  };
  if (total.tax) portfolioMetrics.taxImpactPerYear = r0(total.tax.taxImpact);

  return `The user owns ${properties.length} propert${properties.length === 1 ? "y" : "ies"}:\n${lines.join(
    "\n",
  )}\n\nPortfolio totals:\n  metrics=${JSON.stringify(portfolioMetrics)}`;
}
