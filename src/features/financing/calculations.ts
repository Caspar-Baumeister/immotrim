// ─────────────────────────────────────────────────────────────────────────────
// FINANCING ESTIMATE (regelbasiert)
//
// A transparent, rule-based estimate of the user's monthly savings rate
// (Sparrate) and an affordable financing volume, plus a per-bank fit score.
// This is explicitly a *Schätzung*, not a Bonitätsprüfung — every consumer must
// label it as such. Pure functions, tested like the other calculations.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Haushalt } from "@/features/profile/types";

// Assumed conditions for inverting an affordable annuity into a loan amount when
// the user has not chosen a concrete bank offer yet.
const ASSUMED_ZINS_PCT = 3.8;
const ASSUMED_TILGUNG_PCT = 2.0;
const ANNUITY_FACTOR = (ASSUMED_ZINS_PCT + ASSUMED_TILGUNG_PCT) / 100; // 0.058
// Conservative haircut on securities counted as usable equity.
const SECURITIES_HAIRCUT = 0.6;

export type FinancingEstimate = {
  /** Household monthly income (Netto + weitere Einkünfte). */
  haushaltEinnahmen: number;
  /** Household monthly expenses (excl. property loans). */
  haushaltAusgaben: number;
  /** Household surplus = income − expenses (can be negative). */
  haushaltSparrate: number;
  /** Portfolio cash flow (monthly, before tax) that adds to / drains the rate. */
  immobilienCashflow: number;
  /** Total monthly savings rate = household surplus + property cash flow. */
  sparrate: number;
  /** Liquid equity: cash + a haircut on securities. */
  verfuegbaresEigenkapital: number;
  /** Rough loan amount an annuity of `sparrate` could service. */
  finanzierbaresDarlehen: number;
  /** Estimated purchasing power = affordable loan + liquid equity. */
  finanzierungsvolumen: number;
};

function sum(...vals: (number | undefined)[]): number {
  return vals.reduce<number>((s, v) => s + (Number.isFinite(v) ? (v as number) : 0), 0);
}

/**
 * Combine the household budget with the property portfolio cash flow into a
 * savings rate and an affordable financing volume.
 *
 * @param haushalt          the household budget section
 * @param monthlyCashFlow   portfolio monthly cash flow before tax (from
 *                          calculatePortfolioKpis().monthlyCashFlowBeforeTax)
 */
export function estimateFinancing(
  haushalt: Haushalt,
  monthlyCashFlow: number,
): FinancingEstimate {
  const haushaltEinnahmen = sum(
    haushalt.nettoeinkommen,
    haushalt.kindergeld,
    haushalt.weitereEinkuenfte,
  );
  const haushaltAusgaben = sum(
    haushalt.mietausgaben,
    haushalt.lebenshaltung,
    haushalt.krankenversicherung,
    haushalt.versicherungen,
    haushalt.ratenkredite,
    haushalt.sonstigeAusgaben,
  );
  const haushaltSparrate = haushaltEinnahmen - haushaltAusgaben;
  const immobilienCashflow = Number.isFinite(monthlyCashFlow) ? monthlyCashFlow : 0;
  const sparrate = haushaltSparrate + immobilienCashflow;

  const verfuegbaresEigenkapital = sum(
    haushalt.bankSparguthaben,
    (haushalt.wertpapiere ?? 0) * SECURITIES_HAIRCUT,
  );

  const affordableMonthly = Math.max(0, sparrate);
  const finanzierbaresDarlehen = (affordableMonthly * 12) / ANNUITY_FACTOR;
  const finanzierungsvolumen = finanzierbaresDarlehen + verfuegbaresEigenkapital;

  return {
    haushaltEinnahmen,
    haushaltAusgaben,
    haushaltSparrate,
    immobilienCashflow,
    sparrate,
    verfuegbaresEigenkapital,
    finanzierbaresDarlehen,
    finanzierungsvolumen,
  };
}

/** A bank's lending criteria used to score fit. All fields optional. */
export type BankFinancingCriteria = {
  /** Advertised interest from … (% p.a.). Display only. */
  zinsAb?: number;
  /** Maximum loan-to-value the bank will finance (%). */
  maxLtv?: number;
  /** Minimum net household income the bank expects (€/month). */
  minEinkommenMonatlich?: number;
};

/**
 * Rule-based fit score 0–100 for one bank, from the financing estimate. Starts
 * at a neutral baseline and rewards a healthy savings rate, sufficient income
 * and available equity. Deliberately simple and explainable.
 */
export function bankFinancingScore(
  est: FinancingEstimate,
  criteria: BankFinancingCriteria,
  netMonthlyIncome: number,
): number {
  let score = 50;

  // Savings rate is the strongest signal.
  if (est.sparrate >= 1000) score += 25;
  else if (est.sparrate >= 500) score += 15;
  else if (est.sparrate > 0) score += 5;
  else score -= 30;

  // Minimum income threshold.
  if (criteria.minEinkommenMonatlich != null) {
    score += netMonthlyIncome >= criteria.minEinkommenMonatlich ? 15 : -20;
  }

  // Liquid equity relative to the affordable volume (a proxy for a good LTV).
  if (est.finanzierungsvolumen > 0) {
    const equityRatio = est.verfuegbaresEigenkapital / est.finanzierungsvolumen;
    if (equityRatio >= 0.2) score += 10;
    else if (equityRatio >= 0.1) score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
