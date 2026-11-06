import { calculateMortgage, currentLoanState } from "@/features/mortgage/calculations";
import type { PortfolioProperty } from "./calculations";

// The forces that move a rental portfolio's wealth at the same time. A back-of-
// the-envelope view (rent minus rate) only sees cash flow; these put a euro
// figure on each of them for the current year.

// Assumed inflation for the real value of the debt (ECB target).
export const ASSUMED_INFLATION_PCT = 2;
// Bank lending limit used for the refinancing headroom.
export const REFINANCE_LTV_PCT = 80;

export type WealthForces = {
  /** Loan paid down this year (Tilgung), €/yr. */
  principal: number;
  /** Cash flow before tax, €/yr (can be negative). */
  cashFlow: number;
  /** Value growth at each property's expected appreciation, €/yr. */
  appreciation: number;
  /** Extra cold rent next year at each property's expected rent growth, €/yr. */
  rentIncrease: number;
  /** Real value the debt loses to inflation, €/yr. */
  inflationOnDebt: number;
  /** Sum of the wealth-building forces above, €/yr. */
  total: number;
  /** Return on invested equity with the loan, %. */
  leveredReturnPct: number;
  /** The same return if everything had been paid in cash, %. */
  unleveredReturnPct: number;
  /** Extra loan a bank could give against today's value up to REFINANCE_LTV_PCT, €. */
  refinanceHeadroom: number;
  /** Today's value used for the figures above (owner's estimate where set), €. */
  currentValue: number;
  currentDebt: number;
};

export function calculateWealthForces(properties: PortfolioProperty[]): WealthForces {
  const year = new Date().getFullYear();
  let principal = 0;
  let cashFlow = 0;
  let appreciation = 0;
  let rentIncrease = 0;
  let currentValue = 0;
  let currentDebt = 0;
  let investedEquity = 0;
  let totalCost = 0;
  let noi = 0;

  for (const { inputs } of properties) {
    const mortgage = calculateMortgage(inputs);
    const start = inputs.loanStartDate ? parseInt(inputs.loanStartDate.split("-")[0], 10) : year;
    const elapsed = Math.max(0, year - start);
    const loan = currentLoanState(inputs, mortgage);
    const debt = loan.balance;
    const value = inputs.report?.marktwert
      ?? inputs.kaufpreis * Math.pow(1 + (inputs.wertentwicklung ?? 0) / 100, elapsed);

    const n = inputs.nebenkosten;
    const closing = inputs.kaufpreis * ((n.grunderwerbsteuerPct + n.notarGrundbuchPct + n.maklerprovisionPct + n.sonstigePct) / 100);
    const rent = inputs.kaltmiete * 12;
    const operating = rent - rent * (inputs.leerstand / 100) - inputs.nichtUmlagefaehig * 12 - inputs.ruecklagen * 12;

    principal += loan.principalNext12;
    cashFlow += operating - loan.interestNext12 - loan.principalNext12;
    appreciation += value * ((inputs.wertentwicklung ?? 0) / 100);
    rentIncrease += rent * ((inputs.mietentwicklung ?? 0) / 100);
    currentValue += value;
    currentDebt += debt;
    investedEquity += inputs.eigenanteil + closing;
    totalCost += inputs.kaufpreis + closing;
    noi += operating;
  }

  const inflationOnDebt = currentDebt * (ASSUMED_INFLATION_PCT / 100);
  const total = principal + cashFlow + appreciation + inflationOnDebt;
  // Same yardstick for both: what the year adds (cash flow, principal, value
  // growth) relative to the money put in. Unlevered = all cash, no interest.
  const leveredReturnPct = investedEquity > 0 ? ((cashFlow + principal + appreciation) / investedEquity) * 100 : 0;
  const unleveredReturnPct = totalCost > 0 ? ((noi + appreciation) / totalCost) * 100 : 0;
  const refinanceHeadroom = Math.max(0, currentValue * (REFINANCE_LTV_PCT / 100) - currentDebt);

  return {
    principal,
    cashFlow,
    appreciation,
    rentIncrease,
    inflationOnDebt,
    total,
    leveredReturnPct,
    unleveredReturnPct,
    refinanceHeadroom,
    currentValue,
    currentDebt,
  };
}
