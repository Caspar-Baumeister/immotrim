"use client";

import { type ReactNode } from "react";
import { FactColumn } from "@/components/shared/FactColumn";
import {
  type PortfolioKpis,
  type PortfolioTaxKpis,
} from "@/features/portfolio/calculations";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

// ── Tooltip building blocks ──────────────────────────────────────────────────

// Inline stacked fraction: numerator over a dividing line over denominator.
// `border-current` picks up the tooltip text colour so the line stays visible.
function Frac({ over, under }: { over: ReactNode; under: ReactNode }) {
  return (
    <span className="inline-flex flex-col items-center text-center align-middle mx-1 leading-tight">
      <span className="px-1 pb-0.5">{over}</span>
      <span className="w-full border-t border-current" />
      <span className="px-1 pt-0.5">{under}</span>
    </span>
  );
}

// Two-paragraph tooltip: what the KPI shows, then how it is calculated.
// Optional `note` adds an emphasized third line (e.g. a missing-data warning).
function tip(what: string, formula: ReactNode, note?: ReactNode) {
  return (
    <div className="flex flex-col gap-2 py-0.5">
      <p>{what}</p>
      <div className="flex flex-wrap items-center gap-x-1 border-t border-background/25 pt-2">
        {formula}
      </div>
      {note && (
        <p className="border-t border-background/25 pt-2 italic">{note}</p>
      )}
    </div>
  );
}

// ── Dense KPI panel ──────────────────────────────────────────────────────────
// Shared between the portfolio dashboard and the single-property insights page.
// Every figure is calculated via `calculatePortfolioKpis` (a single-property
// array is just a portfolio of one). Recurring monthly values are annualized
// (× 12); balance-sheet values stay current. Estimated future appreciation and
// rent growth are excluded from the core KPIs.

export function PortfolioKpiPanel({ kpis }: { kpis: PortfolioKpis }) {
  const eur = (v: number) => formatCurrency(v, "de-DE");
  const cf = kpis.cashFlowBeforeTax;
  const tax = kpis.tax;
  const hebel =
    kpis.investedEquity > 0
      ? kpis.totalInvestmentCost / kpis.investedEquity
      : 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className={cn(
          "grid divide-x divide-border",
          tax ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-3"
        )}
      >
        {/* 1 — Portfolio & Eigenkapital (current values, not annualized) */}
        <FactColumn
          title="Portfolio & Eigenkapital"
          facts={[
            {
              label: "Investiertes Eigenkapital",
              value: eur(kpis.investedEquity),
              tooltip: tip(
                "Eingesetztes Eigenkapital im gesamten Portfolio. Fremdfinanzierte Beträge zählen nicht dazu.",
                "Eigenanteile + Kaufnebenkosten (aus EK)"
              ),
            },
            {
              label: "Gesamtkaufpreis",
              value: eur(kpis.totalPurchasePrice),
              tooltip: tip(
                "Summe aller vertraglichen Kaufpreise. Ohne Nebenkosten, Finanzierung, Renovierung und Möblierung.",
                "Σ aller Kaufpreise"
              ),
            },
            {
              label: "Gesamte Kaufnebenkosten",
              value: eur(kpis.totalAcquisitionCosts),
              tooltip: tip(
                "Erwerbsbezogene Kosten über das gesamte Portfolio.",
                "Grunderwerbst. + Notar/Grundbuch + Makler + Sonstige"
              ),
            },
            {
              label: "Gesamtinvestition",
              value: eur(kpis.totalInvestmentCost),
              tooltip: tip(
                "Gesamter Kapitaleinsatz für Erwerb. Laufende Instandhaltung/Reparaturen sind nicht enthalten.",
                "Gesamtkaufpreis + Kaufnebenkosten"
              ),
            },
            {
              label: "Offene Restschuld",
              value: eur(kpis.outstandingLoanBalance),
              tooltip: tip(
                "Aktuelle Restschuld aller Darlehen. Künftige Zinsen und Vorfälligkeitsentschädigungen sind nicht enthalten.",
                "Σ aktuelle Restschuld aller Darlehen"
              ),
            },
            {
              label: "Hebel",
              value: `${hebel.toFixed(1).replace(".", ",")}×`,
              tooltip: tip(
                "Wie viel Immobilienvermögen jeder Euro Eigenkapital steuert.",
                <>
                  <Frac over="Gesamtinvestition" under="investiertes Eigenkapital" />
                </>
              ),
            },
          ]}
        />

        {/* 2 — Finanzierung & Einnahmen (annualized) */}
        <FactColumn
          title="Finanzierung & Einnahmen"
          facts={[
            {
              label: "Jährl. Kaltmieteinnahmen",
              value: eur(kpis.annualColdRent),
              tooltip: tip(
                "Annualisierte Kaltmiete des Portfolios. Ohne Neben-, Heiz-, Strom- und sonstige Betriebskosten.",
                "akt. monatl. Kaltmiete × 12"
              ),
            },
            {
              label: "Jährl. nicht uml. Kosten",
              value: eur(kpis.annualNonRecoverableCosts),
              tooltip: tip(
                "Nicht auf Mieter umlegbare Kosten. Darlehensraten, Rücklagen, AfA und Steuern zählen nicht dazu.",
                "akt. monatl. nicht uml. Kosten × 12"
              ),
            },
            {
              label: "Jährl. Bankrate",
              value: eur(kpis.annualDebtService),
              tooltip: tip(
                "Gesamte jährliche Zahlung an die Banken auf Basis der aktuellen Darlehensraten.",
                "akt. monatl. Rate × 12  (= Zinsen + Tilgung)"
              ),
            },
            {
              label: "Jährl. Zinszahlungen",
              value: eur(kpis.annualInterest),
              tooltip: tip(
                "Zinsanteil der aktuellen Raten. Zinsen sind eine Finanzierungsaufwendung; die Tilgung zählt nicht dazu.",
                "akt. monatl. Zinsanteil × 12"
              ),
            },
            {
              label: "Jährl. Tilgung",
              value: eur(kpis.annualPrincipal),
              tooltip: tip(
                "Betrag, um den die Restschuld im Jahr sinkt. Mindert den Cashflow, erhöht aber das Eigenkapital.",
                "akt. monatl. Tilgung × 12"
              ),
            },
            {
              label: "Jährl. Rücklagen & Leerstand",
              value: eur(kpis.annualReserveContributions + kpis.annualVacancyLoss),
              tooltip: tip(
                "Zuführung zu Instandhaltungs-/Reparaturrücklagen plus der kalkulierte Mietausfall durch Leerstand. Beide mindern den Cashflow.",
                "akt. monatl. Rücklage × 12 + Kaltmiete × 12 × Leerstand%"
              ),
            },
            {
              label: "Ø Zins / Tilgung",
              value: `${formatPercent(kpis.weightedInterestRate, 2)} / ${formatPercent(kpis.weightedRepaymentRate, 2)}`,
              tooltip: tip(
                "Mit der aktuellen Restschuld gewichteter durchschnittlicher Zins- und Tilgungssatz über alle Darlehen.",
                <>
                  <Frac over="Σ Restschuld × Satz" under="Σ Restschuld" />
                </>
              ),
            },
          ]}
        />

        {/* 3 — Rendite & Cashflow */}
        <FactColumn
          title="Rendite & Cashflow"
          facts={[
            {
              label: "Bruttomietrendite",
              value: formatPercent(kpis.grossRentalYield),
              tooltip: tip(
                "Jährliche Kaltmiete im Verhältnis zum Gesamtkaufpreis. Ohne Nebenkosten, Betriebskosten, Finanzierung, Steuern und Leerstand.",
                <>
                  <Frac over="Jährl. Kaltmiete" under="Gesamtkaufpreis" />
                  <span>× 100</span>
                </>
              ),
            },
            {
              label: "Nettomietrendite",
              value: formatPercent(kpis.netRentalYield),
              tooltip: tip(
                "Operatives Ergebnis vor Finanzierung im Verhältnis zur Gesamtinvestition. Zinsen, Tilgung, AfA, Steuern und Wertzuwachs sind ausgeschlossen.",
                <>
                  <Frac
                    over="Kaltmiete − nicht uml. Kosten"
                    under="Gesamtinvestition"
                  />
                  <span>× 100</span>
                </>
              ),
            },
            {
              label: "Cashflow v. St. (mtl./jährl.)",
              value: `${formatCurrency(kpis.monthlyCashFlowBeforeTax)} / ${eur(cf)}`,
              tooltip: tip(
                "Cash-Überschuss bzw. -Defizit nach allen laufenden Kosten und Darlehensraten, vor Steuern. Positiv = Überschuss, negativ = zusätzlicher Kapitalbedarf.",
                "Kaltmiete − Leerstand − nicht uml. Kosten − Rücklagen − Zinsen − Tilgung  (jährl.; mtl. = ÷ 12)"
              ),
            },
            {
              label: "Direkter Vermögensaufbau",
              value: eur(kpis.directWealthCreationBeforeTax),
              tooltip: tip(
                "Vermögenszuwachs aus Cashflow und Schuldenabbau. Die Tilgung wird zurückgerechnet, weil sie den Cashflow mindert, aber die Schulden reduziert. Ohne Wertzuwachs.",
                "Cashflow v. St. + Tilgung"
              ),
            },
            {
              label: "Cash-on-Cash",
              value: formatPercent(kpis.cashOnCashReturn),
              tooltip: tip(
                "Jährlicher Cashflow im Verhältnis zum eingesetzten Eigenkapital. Ohne Tilgung und Wertzuwachs.",
                <>
                  <Frac
                    over="Cashflow v. St."
                    under="investiertes Eigenkapital"
                  />
                  <span>× 100</span>
                </>
              ),
            },
            {
              label: "EK-Rendite v. St.",
              value: formatPercent(kpis.returnOnEquityBeforeTax),
              tooltip: tip(
                "Direkter Vermögensaufbau im Verhältnis zum eingesetzten Eigenkapital. Ohne Wertzuwachs.",
                <>
                  <Frac
                    over="Cashflow v. St. + Tilgung"
                    under="investiertes Eigenkapital"
                  />
                  <span>× 100</span>
                </>
              ),
            },
          ]}
        />

        {/* 4 — Steuern (only when at least one property has tax configured;
            values are shown only when every property has tax data) */}
        {tax && <TaxColumn tax={tax} eur={eur} />}
      </div>
    </div>
  );
}

// ── Tax column ───────────────────────────────────────────────────────────────
// Tax KPIs aggregate every property's individual figure. They are only
// meaningful when *all* properties have tax data; otherwise each value shows
// "—" and the tooltip explains for how many properties the data is missing.
function TaxColumn({
  tax,
  eur,
}: {
  tax: PortfolioTaxKpis;
  eur: (v: number) => string;
}) {
  const complete = tax.complete;
  const missing = tax.totalCount - tax.taxedCount;
  const tv = (v: number) => (complete ? eur(v) : "—");
  const missingNote = complete
    ? undefined
    : `Nicht verfügbar — für ${missing} von ${tax.totalCount} Immobilien fehlen Steuerangaben (Gebäudeanteil, AfA-Satz, Steuersatz). Erst wenn alle Immobilien Steuerdaten haben, wird der Portfoliowert berechnet.`;

  return (
    <FactColumn
      title="Steuern"
      facts={[
        {
          label: "Steuerpfl. Mieteinnahmen",
          value: tv(tax.taxableRentalIncome),
          tooltip: tip(
            "Steuerlich relevante Jahres-Kaltmiete des Portfolios: die Netto-Kaltmiete nach Abzug des kalkulierten Leerstands, je Immobilie ermittelt und summiert. Sie weicht von der angezeigten Brutto-Kaltmiete ab, weil hier der Leerstand abgezogen ist; Neben- und Betriebskosten bleiben außen vor.",
            "Σ (Kaltmiete × 12 − Leerstand) je Immobilie",
            missingNote
          ),
        },
        {
          label: "Jährliche AfA",
          value: tv(tax.depreciation),
          tooltip: tip(
            "Summe der jährlichen Gebäudeabschreibung (AfA) aller Immobilien. Je Immobilie aus deren abschreibungsfähigem Gebäudewert (Bemessungsgrundlage × Gebäudeanteil) und individuellem AfA-Satz berechnet und addiert. Grund und Boden ist nicht abschreibbar.",
            "Σ (Bemessungsgrundlage × Gebäudeanteil × AfA-Satz) je Immobilie",
            missingNote
          ),
        },
        {
          label: "Absetzbare Zinsen",
          value: tv(tax.deductibleInterest),
          tooltip: tip(
            "Steuerlich absetzbarer Zinsanteil der Darlehen: der Zinsanteil der Rate im ersten Darlehensjahr, je Immobilie aus dem Tilgungsplan ermittelt und summiert. Nur Zinsen sind absetzbar — die Tilgung nicht.",
            "Σ Zinsanteil (1. Jahr) je Immobilie",
            missingNote
          ),
        },
        {
          label: "Steuerliches Ergebnis",
          value: tv(tax.taxableResult),
          tooltip: tip(
            "Vereinfachter steuerlicher Gewinn/Verlust des Portfolios. Positiv = steuerpflichtiger Gewinn, negativ = steuerlicher Verlust.",
            "steuerpfl. Mieteinnahmen − nicht uml. Kosten − AfA − absetzbare Zinsen",
            missingNote
          ),
        },
        {
          label: complete
            ? tax.taxImpact >= 0
              ? "Steuerersparnis"
              : "Steuerbelastung"
            : "Steuereffekt",
          value: tv(tax.taxImpact),
          tooltip: tip(
            "Geschätzter Steuereffekt des steuerlichen Ergebnisses. Verlust → Ersparnis, Gewinn → Belastung. Nur eine Schätzung.",
            "steuerliches Ergebnis × Grenzsteuersatz",
            missingNote
          ),
        },
        {
          label: "Cashflow n. St.",
          value: tv(tax.cashFlowAfterTax),
          tooltip: tip(
            "Jährlicher Cashflow nach Berücksichtigung des geschätzten Steuereffekts.",
            "Cashflow v. St. + Steuereffekt",
            missingNote
          ),
        },
        {
          label: "Vermögensaufbau n. St.",
          value: tv(tax.wealthCreationAfterTax),
          tooltip: tip(
            "Jährlicher Vermögenszuwachs nach Steuern. Geschätzter Wertzuwachs ist nicht enthalten.",
            "Cashflow n. St. + Tilgung",
            missingNote
          ),
        },
      ]}
    />
  );
}
