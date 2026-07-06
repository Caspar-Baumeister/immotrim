// Example portfolio data for the landing-page chart showcase.
//
// These are NOT real numbers — they're a single coherent ~36-year scenario
// (one annuity loan + rent/value growth) derived once so every chart tells the
// same story. The shapes match the real dashboard chart prop types, so the
// landing reuses the exact same chart components with this mock input.
import type { WealthYear } from "@/features/wealth/calculations";
import type { CashFlowYear } from "@/features/cash-flow/calculations";
import type { AmortizationYear } from "@/features/mortgage/calculations";
import type { EKRenditeYear } from "@/features/returns/calculations";
import type { AppreciationYear } from "@/features/appreciation/calculations";
import type { MietrenditeYear } from "@/features/cap-rate/calculations";

const START_YEAR = 2026;
const YEARS = 36;

// Scenario assumptions (portfolio-level, illustrative).
const KAUFPREIS = 600_000;
const IMMOBILIENWERT_0 = 600_000;
const BALANCE_0 = 600_000;
const ZINS = 0.034; // 3.4 % p.a.
const ANNUITY = 34_000; // yearly rate (Zins + Tilgung)
const KALTMIETE_0 = 43_000; // yearly cold rent
const RENT_GROWTH = 0.02; // 2 % p.a.
const LEERSTAND = 0.03; // 3 %
const RUECKLAGEN = 3_600; // yearly
const NICHT_UMLAGEFAEHIG = 2_400; // yearly
const WERTENTWICKLUNG = 0.025; // 2.5 % p.a.
// Tuned so the equity is fully recouped late in the horizon — the EK-return line
// then spans most of the chart and ENDS (goes null), like the real dashboard.
const INVESTED_EQUITY = 350_000;

export type ChartShowcaseData = {
  wealth: WealthYear[];
  cashFlow: CashFlowYear[];
  amortization: AmortizationYear[];
  ekRendite: EKRenditeYear[];
  appreciation: AppreciationYear[];
  mietrendite: MietrenditeYear[];
  /** Year-1 gross yield, used as the baseline reference line. */
  mietrenditeBaseline: number;
};

function buildShowcaseData(): ChartShowcaseData {
  const wealth: WealthYear[] = [];
  const cashFlow: CashFlowYear[] = [];
  const amortization: AmortizationYear[] = [];
  const ekRendite: EKRenditeYear[] = [];
  const appreciation: AppreciationYear[] = [];
  const mietrendite: MietrenditeYear[] = [];

  let balance = BALANCE_0;
  let prevValue = IMMOBILIENWERT_0;
  let totalPaid = 0;
  let cumulativeCashFlow = 0;

  for (let y = 1; y <= YEARS; y++) {
    const calendarYear = START_YEAR + (y - 1);

    // ── Annuity loan ────────────────────────────────────────────────────────
    const interest = balance > 0 ? balance * ZINS : 0;
    let principal = balance > 0 ? Math.min(ANNUITY - interest, balance) : 0;
    if (principal < 0) principal = 0;
    balance = Math.max(0, balance - principal);
    const mortgage = principal + interest; // 0 once the loan is paid off
    totalPaid += mortgage;

    amortization.push({
      year: y,
      calendarYear,
      principal: Math.round(principal),
      interest: Math.round(interest),
      balance: Math.round(balance),
      totalPaid: Math.round(totalPaid),
    });

    // ── Rent & cash flow ─────────────────────────────────────────────────────
    const kaltmiete = KALTMIETE_0 * Math.pow(1 + RENT_GROWTH, y - 1);
    const leerstandVerlust = kaltmiete * LEERSTAND;
    const netRent = kaltmiete - leerstandVerlust;
    const cf = netRent - mortgage - RUECKLAGEN - NICHT_UMLAGEFAEHIG;
    cumulativeCashFlow += cf;

    cashFlow.push({
      year: calendarYear,
      kaltmiete: Math.round(kaltmiete),
      leerstandVerlust: Math.round(leerstandVerlust),
      netRent: Math.round(netRent),
      mortgage: Math.round(mortgage),
      ruecklagen: RUECKLAGEN,
      nichtUmlagefaehig: NICHT_UMLAGEFAEHIG,
      cashFlow: Math.round(cf),
    });

    // ── Property value & appreciation ───────────────────────────────────────
    const immobilienwert = IMMOBILIENWERT_0 * Math.pow(1 + WERTENTWICKLUNG, y);
    const wertwachstum = immobilienwert - prevValue;
    prevValue = immobilienwert;

    appreciation.push({
      year: y,
      calendarYear,
      immobilienwert: Math.round(immobilienwert),
      restschuld: Math.round(balance),
      eigenkapital: Math.round(immobilienwert - balance),
    });

    // ── Wealth build-up (Tilgung + Cashflow + Wertwachstum) ─────────────────
    wealth.push({
      year: y,
      calendarYear,
      tilgung: Math.round(principal),
      cashFlow: Math.round(cf),
      wertwachstum: Math.round(wertwachstum),
      total: Math.round(principal + cf + wertwachstum),
    });

    // ── Equity return ────────────────────────────────────────────────────────
    // Effective equity shrinks as cumulative cash flow recoups the initial outlay.
    // Once it's fully recouped (≤ 0) the return is undefined, so the line ENDS —
    // exactly like the real dashboard chart (no artificial floor / blow-up).
    const effectiveRaw = INVESTED_EQUITY - cumulativeCashFlow;
    const annualReturn = cf + principal + wertwachstum;
    ekRendite.push({
      year: calendarYear,
      cashFlow: Math.round(cf),
      tilgungsanteil: Math.round(principal),
      wertzuwachs: Math.round(wertwachstum),
      ekRendite: effectiveRaw > 0 ? (annualReturn / effectiveRaw) * 100 : null,
      effectiveEigenkapital: Math.round(Math.max(0, effectiveRaw)),
    });

    // ── Gross rent yield ─────────────────────────────────────────────────────
    mietrendite.push({
      year: calendarYear,
      bruttoMietrendite: (kaltmiete / KAUFPREIS) * 100,
    });
  }

  return {
    wealth,
    cashFlow,
    amortization,
    ekRendite,
    appreciation,
    mietrendite,
    mietrenditeBaseline: mietrendite[0].bruttoMietrendite,
  };
}

export const CHART_SHOWCASE_DATA: ChartShowcaseData = buildShowcaseData();
