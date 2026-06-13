import type { PropertyInputs } from "@/lib/supabase";
import { calculateMortgage, type MortgageMetrics, type AmortizationYear } from "@/features/mortgage/calculations";
import type { CashFlowYear } from "@/features/cash-flow/calculations";
import type { AppreciationYear } from "@/features/appreciation/calculations";
import type { EKRenditeYear } from "@/features/returns/calculations";
import type { MietrenditeYear } from "@/features/cap-rate/calculations";
import type { WealthYear } from "@/features/wealth/calculations";
import type { PortfolioProperty } from "./calculations";

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio chart series — forward projection on a single calendar timeline
//
// Every chart is a combination of each property's own series. The combination
// happens on a real calendar axis, which is the only sound way to add properties
// bought at different times and running for different loan terms.
//
// Three things make this projection differ from a single property's chart, all of
// them deliberate:
//
//   1. The timeline starts at the CURRENT year (today). Properties bought in the
//      past are shown from where they are now; properties bought in the future
//      simply join the sums once their purchase year arrives.
//
//   2. A property keeps contributing AFTER its loan is paid off. Once the loan is
//      gone there is no more Rate, so its cash flow jumps UP and stays — the
//      portfolio total therefore steps up (never drops) when a loan finishes.
//      Principal/interest/debt go to 0 from that point; rent and value continue.
//
//   3. Combination rules: absolute € values are SUMMED; percentages (EK-Rendite,
//      gross yield) are recomputed from summed numerator ÷ summed denominator
//      (a true value-weighted average, never an average of percentages).
//
// To reuse the existing chart components unchanged, every row carries both `year`
// and `calendarYear` set to the calendar year, so charts keyed on either field
// share one calendar x-axis.
// ─────────────────────────────────────────────────────────────────────────────

// Years to keep showing past the last loan payoff, so the final "Rate is gone →
// cash flow jumps up" step is actually visible rather than landing on the edge.
const POST_PAYOFF_TAIL = 5;

function startYearOf(inputs: PropertyInputs): number {
  return inputs.loanStartDate
    ? parseInt(inputs.loanStartDate.split("-")[0], 10)
    : new Date().getFullYear();
}

function nebenkostenEurOf(inputs: PropertyInputs): number {
  const pct =
    inputs.nebenkosten.grunderwerbsteuerPct +
    inputs.nebenkosten.notarGrundbuchPct +
    inputs.nebenkosten.maklerprovisionPct +
    inputs.nebenkosten.sonstigePct;
  return inputs.kaufpreis * (pct / 100);
}

/** One projected calendar year for a single property. */
type PropertyYear = {
  calendarYear: number;
  // cash flow
  kaltmiete: number;
  leerstandVerlust: number;
  netRent: number;
  mortgage: number; // annual Rate — 0 once the loan is paid off
  ruecklagen: number;
  nichtUmlagefaehig: number;
  cashFlow: number;
  // amortization
  principal: number;
  interest: number;
  balance: number;
  // appreciation / net worth
  immobilienwert: number;
  restschuld: number;
  eigenkapital: number;
  // wealth buildup
  tilgung: number;
  wertwachstum: number;
  wealthTotal: number;
  // gross yield inputs
  annualColdRent: number;
  kaufpreis: number;
  // EK-Rendite input — this property's effective equity still tied up (invested
  // equity minus the cash flow it has paid back so far). Summed across the
  // portfolio it forms the equity pool the EK-Rendite is measured against.
  effectiveEigenkapital: number;
};

/**
 * Project a single property year-by-year across [fromYear, toYear] on the
 * calendar axis.
 *
 * Anchoring rules so the first shown column lines up with reality:
 *   • Rent is anchored at TODAY — `kaltmiete` is the current rent, so today's
 *     column uses it as-is (growth factor 1) and only grows going forward.
 *   • Value & debt are anchored at PURCHASE — value compounds over the years
 *     actually elapsed since purchase and debt is read from the current point in
 *     the amortization schedule.
 *   • Effective equity (for EK-Rendite) accumulates from the PURCHASE year so
 *     that, by today, it already reflects the cash flow paid back in past years —
 *     summed across the portfolio the pool keeps declining and the EK series
 *     ends once it hits 0.
 */
function projectProperty(
  inputs: PropertyInputs,
  mortgage: MortgageMetrics,
  currentYear: number,
  fromYear: number,
  toYear: number
): PropertyYear[] {
  const startYear = startYearOf(inputs);
  const totalYears = mortgage.totalYears;
  const mietentwicklung = inputs.mietentwicklung ?? 0;
  const wertentwicklung = inputs.wertentwicklung ?? 0;

  const baseColdRent = inputs.kaltmiete * 12;
  const vacancyRate = inputs.leerstand / 100;
  const annualRate = mortgage.monthlyPayment * 12;
  const annualRuecklagen = inputs.ruecklagen * 12;
  const annualNicht = inputs.nichtUmlagefaehig * 12;
  const investedEquity = inputs.eigenanteil + nebenkostenEurOf(inputs);

  // Rent counts as "current" from the later of today / purchase: an already-owned
  // property's `kaltmiete` is today's rent; a future purchase's is its rent then.
  const rentAnchorYear = Math.max(startYear, currentYear);

  // Effective equity still tied up — recouped by cash flow over time (see above).
  let runningCapital = investedEquity > 0 ? investedEquity : 1;

  const rows: PropertyYear[] = [];
  const lastRelativeYear = toYear - startYear + 1;

  for (let ry = 1; ry <= lastRelativeYear; ry++) {
    const elapsed = ry - 1; // full years owned at the start of this year
    const calendarYear = startYear + elapsed;

    // Rent grows forward from today (factor 1 in the first shown year).
    const rentGrowth = Math.pow(
      1 + mietentwicklung / 100,
      Math.max(0, calendarYear - rentAnchorYear)
    );
    const yearColdRent = baseColdRent * rentGrowth;
    const yearVacancy = yearColdRent * vacancyRate;
    const yearNetRent = yearColdRent - yearVacancy;

    // Loan: the Rate is only paid while the loan runs. Afterwards it is 0.
    const paidOff = ry > totalYears;
    const yearRate = paidOff ? 0 : annualRate;
    const sched = paidOff ? undefined : mortgage.schedule[elapsed];
    const principal = sched?.principal ?? 0;
    const balance = sched?.balance ?? 0;

    const cashFlow = yearNetRent - yearRate - annualRuecklagen - annualNicht;

    // Value: today's value = purchase price compounded over elapsed years
    // (same basis as the portfolio KPI panel). Restschuld pairs with it.
    const immobilienwert =
      inputs.kaufpreis * Math.pow(1 + wertentwicklung / 100, elapsed);
    const wertwachstum =
      inputs.kaufpreis *
      (Math.pow(1 + wertentwicklung / 100, ry) -
        Math.pow(1 + wertentwicklung / 100, ry - 1));

    // Only the calendar window [fromYear, toYear] is plotted, but the recoup
    // below is accumulated every year so past pay-backs already count by today.
    if (calendarYear >= fromYear && calendarYear <= toYear) {
      rows.push({
        calendarYear,
        kaltmiete: yearColdRent,
        leerstandVerlust: yearVacancy,
        netRent: yearNetRent,
        mortgage: yearRate,
        ruecklagen: annualRuecklagen,
        nichtUmlagefaehig: annualNicht,
        cashFlow,
        principal,
        interest: sched?.interest ?? 0,
        balance,
        immobilienwert,
        restschuld: balance,
        eigenkapital: immobilienwert - balance,
        tilgung: principal,
        wertwachstum,
        wealthTotal: principal + cashFlow + wertwachstum,
        annualColdRent: yearColdRent,
        kaufpreis: inputs.kaufpreis,
        effectiveEigenkapital: runningCapital,
      });
    }

    // Positive cash flow hands money back → less equity tied up.
    runningCapital -= cashFlow;
  }

  return rows;
}

type Projection = { fromYear: number; toYear: number; rows: PropertyYear[][] };

/** Compute the shared calendar window and project every property onto it. */
function projectPortfolio(properties: PortfolioProperty[]): Projection {
  if (properties.length === 0) return { fromYear: 0, toYear: -1, rows: [] };

  const fromYear = new Date().getFullYear();

  const mortgages = properties.map((p) => calculateMortgage(p.inputs));
  const lastPayoffYear = Math.max(
    ...properties.map((p, i) => startYearOf(p.inputs) + mortgages[i].totalYears - 1)
  );
  const toYear = Math.max(fromYear, lastPayoffYear + POST_PAYOFF_TAIL);

  const rows = properties.map((p, i) =>
    projectProperty(p.inputs, mortgages[i], fromYear, fromYear, toYear)
  );

  return { fromYear, toYear, rows };
}

/** Sorted ascending list of map values, keyed by calendar year. */
function sortedByYear<T>(map: Map<number, T>): T[] {
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

// ─── 1. Cash flow (sum) ────────────────────────────────────────────────────────

export function calculatePortfolioCashFlowSeries(
  properties: PortfolioProperty[]
): CashFlowYear[] {
  const { rows } = projectPortfolio(properties);
  const byYear = new Map<number, CashFlowYear>();

  for (const propRows of rows) {
    for (const r of propRows) {
      const acc = byYear.get(r.calendarYear) ?? {
        year: r.calendarYear,
        kaltmiete: 0,
        leerstandVerlust: 0,
        netRent: 0,
        mortgage: 0,
        ruecklagen: 0,
        nichtUmlagefaehig: 0,
        cashFlow: 0,
      };
      acc.kaltmiete += r.kaltmiete;
      acc.leerstandVerlust += r.leerstandVerlust;
      acc.netRent += r.netRent;
      acc.mortgage += r.mortgage;
      acc.ruecklagen += r.ruecklagen;
      acc.nichtUmlagefaehig += r.nichtUmlagefaehig;
      acc.cashFlow += r.cashFlow;
      byYear.set(r.calendarYear, acc);
    }
  }

  return sortedByYear(byYear);
}

// ─── 2. Amortization (sum) ─────────────────────────────────────────────────────

export function calculatePortfolioAmortizationSeries(
  properties: PortfolioProperty[]
): AmortizationYear[] {
  const { rows } = projectPortfolio(properties);
  const byYear = new Map<number, AmortizationYear>();

  for (const propRows of rows) {
    for (const r of propRows) {
      const acc = byYear.get(r.calendarYear) ?? {
        year: r.calendarYear,
        calendarYear: r.calendarYear,
        principal: 0,
        interest: 0,
        balance: 0,
        totalPaid: 0,
      };
      acc.principal += r.principal;
      acc.interest += r.interest;
      acc.balance += r.balance;
      byYear.set(r.calendarYear, acc);
    }
  }

  // Drop trailing years where every loan is already paid off — no point showing
  // a run of empty bars after the last property finishes amortizing.
  const series = sortedByYear(byYear);
  while (
    series.length > 1 &&
    series[series.length - 1].principal === 0 &&
    series[series.length - 1].interest === 0 &&
    series[series.length - 1].balance === 0
  ) {
    series.pop();
  }
  return series;
}

// ─── 3. EK-Rendite (effective-equity recoup model, one portfolio pool) ─────────
//
// The portfolio's invested equity is treated as a single pool that the cash flow
// pays back over time, so the "effective" equity (dashed line) declines. Both the
// numerator's cash flow and the denominator's equity sum over ALL properties —
// so the Cashflow shown here is identical to the Cashflow chart. The series ends
// once the pool reaches 0 (the whole invested equity has flowed back).
//   • toggles off       → components = Cashflow
//   • inkl. Tilgung      → + Tilgung
//   • inkl. Wertzuwachs  → + Wertzuwachs (the year's appreciation gain)

export function calculatePortfolioEKRenditeSeries(
  properties: PortfolioProperty[],
  options?: { includeTilgung?: boolean; includeWertzuwachs?: boolean }
): EKRenditeYear[] {
  const includeTilgung = options?.includeTilgung ?? false;
  const includeWertzuwachs = options?.includeWertzuwachs ?? false;

  const { rows } = projectPortfolio(properties);
  const acc = new Map<number, EKRenditeYear>();
  const sumComponents = new Map<number, number>();

  for (const propRows of rows) {
    for (const r of propRows) {
      const components =
        r.cashFlow +
        (includeTilgung ? r.tilgung : 0) +
        (includeWertzuwachs ? r.wertwachstum : 0);

      const row = acc.get(r.calendarYear) ?? {
        year: r.calendarYear,
        cashFlow: 0,
        tilgungsanteil: 0,
        wertzuwachs: 0,
        ekRendite: null,
        effectiveEigenkapital: 0, // Σ effective equity still tied up = the pool
      };
      row.cashFlow += r.cashFlow;
      row.tilgungsanteil += r.tilgung;
      row.wertzuwachs += r.wertwachstum;
      row.effectiveEigenkapital += r.effectiveEigenkapital;
      acc.set(r.calendarYear, row);

      sumComponents.set(
        r.calendarYear,
        (sumComponents.get(r.calendarYear) ?? 0) + components
      );
    }
  }

  for (const [calendarYear, row] of acc) {
    row.ekRendite =
      row.effectiveEigenkapital > 0
        ? ((sumComponents.get(calendarYear) ?? 0) / row.effectiveEigenkapital) * 100
        : null;
  }

  // End the series once the equity pool is fully recouped (≤ 0): keep the years
  // up to the first non-positive pool, mirroring the single-property chart.
  const series = sortedByYear(acc);
  const recoupedAt = series.findIndex((r) => r.effectiveEigenkapital <= 0);
  return recoupedAt === -1 ? series : series.slice(0, recoupedAt);
}

// ─── 4. Property value vs. debt (sum) ──────────────────────────────────────────

export function calculatePortfolioAppreciationSeries(
  properties: PortfolioProperty[]
): AppreciationYear[] {
  const { rows } = projectPortfolio(properties);
  const byYear = new Map<number, AppreciationYear>();

  for (const propRows of rows) {
    for (const r of propRows) {
      const acc = byYear.get(r.calendarYear) ?? {
        year: r.calendarYear,
        calendarYear: r.calendarYear,
        immobilienwert: 0,
        restschuld: 0,
        eigenkapital: 0,
      };
      acc.immobilienwert += r.immobilienwert;
      acc.restschuld += r.restschuld;
      acc.eigenkapital += r.eigenkapital;
      byYear.set(r.calendarYear, acc);
    }
  }

  return sortedByYear(byYear);
}

// ─── 5. Gross rental yield (purchase-price-weighted average %) ──────────────────

export function calculatePortfolioMietrenditeSeries(
  properties: PortfolioProperty[]
): MietrenditeYear[] {
  const { rows } = projectPortfolio(properties);
  const sumRent = new Map<number, number>();
  const sumKaufpreis = new Map<number, number>();

  for (const propRows of rows) {
    for (const r of propRows) {
      sumRent.set(r.calendarYear, (sumRent.get(r.calendarYear) ?? 0) + r.annualColdRent);
      sumKaufpreis.set(
        r.calendarYear,
        (sumKaufpreis.get(r.calendarYear) ?? 0) + r.kaufpreis
      );
    }
  }

  const byYear = new Map<number, MietrenditeYear>();
  for (const [calendarYear, rent] of sumRent) {
    const kp = sumKaufpreis.get(calendarYear) ?? 0;
    byYear.set(calendarYear, {
      year: calendarYear,
      bruttoMietrendite: kp > 0 ? (rent / kp) * 100 : 0,
    });
  }

  return sortedByYear(byYear);
}

// ─── 6. Wealth buildup (sum) ───────────────────────────────────────────────────

export function calculatePortfolioWealthSeries(properties: PortfolioProperty[]): {
  years: WealthYear[];
  hasWertwachstum: boolean;
} {
  const { rows } = projectPortfolio(properties);
  const byYear = new Map<number, WealthYear>();
  const hasWertwachstum = properties.some((p) => (p.inputs.wertentwicklung ?? 0) > 0);

  for (const propRows of rows) {
    for (const r of propRows) {
      const acc = byYear.get(r.calendarYear) ?? {
        year: r.calendarYear,
        calendarYear: r.calendarYear,
        tilgung: 0,
        cashFlow: 0,
        wertwachstum: 0,
        total: 0,
      };
      acc.tilgung += r.tilgung;
      acc.cashFlow += r.cashFlow;
      acc.wertwachstum += r.wertwachstum;
      acc.total += r.wealthTotal;
      byYear.set(r.calendarYear, acc);
    }
  }

  return { years: sortedByYear(byYear), hasWertwachstum };
}
