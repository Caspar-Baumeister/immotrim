"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PortfolioKpiPanel } from "@/features/portfolio/components/PortfolioKpiPanel";
import { ChartCard } from "@/components/shared/ChartCard";
import { CashFlowChart } from "@/features/cash-flow/components/CashFlowChart";
import { AmortizationChart } from "@/features/mortgage/components/AmortizationChart";
import { WertSchuldenChart } from "@/features/appreciation/components/WertSchuldenChart";
import { EKRenditeChart } from "@/features/returns/components/EKRenditeChart";
import { MietrenditeChart } from "@/features/cap-rate/components/MietrenditeChart";
import { VermoegensaufbauChart } from "@/features/wealth/components/VermoegensaufbauChart";
import { calculatePortfolioKpis, type PortfolioProperty } from "@/features/portfolio/calculations";
import {
  calculatePortfolioCashFlowSeries,
  calculatePortfolioAmortizationSeries,
  calculatePortfolioEKRenditeSeries,
  calculatePortfolioAppreciationSeries,
  calculatePortfolioMietrenditeSeries,
  calculatePortfolioWealthSeries,
} from "@/features/portfolio/chart-calculations";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

// The aggregate portfolio dashboard: the dense KPI panel plus the six portfolio
// charts. Every series is the sum (or value-weighted average, for %) of all
// properties by calendar year. Shared between the logged-in portfolio dashboard
// and the public share page — both just pass a `PortfolioProperty[]`.
export function PortfolioAnalytics({
  portfolioInputs,
}: {
  portfolioInputs: PortfolioProperty[];
}) {
  const t = useTranslations();

  // EK-Rendite chart toggles — mirror the single-property page.
  const [ekTilgung, setEkTilgung] = useState(false);
  const [ekWertzuwachs, setEkWertzuwachs] = useState(false);

  const kpis = calculatePortfolioKpis(portfolioInputs);

  const cashFlowSeries = calculatePortfolioCashFlowSeries(portfolioInputs);
  const amortizationSeries = calculatePortfolioAmortizationSeries(portfolioInputs);
  const ekRenditeSeries = calculatePortfolioEKRenditeSeries(portfolioInputs, {
    includeTilgung: ekTilgung,
    includeWertzuwachs: ekWertzuwachs,
  });
  const appreciationSeries = calculatePortfolioAppreciationSeries(portfolioInputs);
  const mietrenditeSeries = calculatePortfolioMietrenditeSeries(portfolioInputs);
  const wealthSeries = calculatePortfolioWealthSeries(portfolioInputs);

  // Stat helpers: pick the first/last rows of a combined series.
  const cfLast = cashFlowSeries[cashFlowSeries.length - 1];
  const apprLast = appreciationSeries[appreciationSeries.length - 1];
  const wealthLast = wealthSeries.years[wealthSeries.years.length - 1];

  if (portfolioInputs.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Dense portfolio KPI panel — mirrors the single-property facts layout */}
      <PortfolioKpiPanel kpis={kpis} />

      {/* ── Portfolio charts ──────────────────────────────────────────────
          Same six charts as a single property, but every series is the sum
          (or value-weighted average, for %) of all properties by calendar year. */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* 1 — Vermögensaufbau pro Jahr */}
        <ChartCard
          title="Vermögensaufbau pro Jahr"
          subtitle="Σ Tilgung + Cashflow + Wertwachstum aller Objekte (jährl.)"
          info={chartTip(
            "Vermögenszuwachs pro Jahr (nicht kumuliert), aufgeteilt in Tilgung (grün), Cashflow (gelb) und Wertwachstum (blau) — je Immobilie berechnet und summiert. Der Cashflow-Anteil ist identisch mit dem Cashflow-Diagramm.",
            "Σ Tilgung + Σ Cashflow + Σ Wertwachstum je Immobilie",
            "Wertwachstum = Wertzuwachs des Jahres. Nach Volltilgung entfällt der Tilgungs-Anteil, der Cashflow-Anteil steigt entsprechend."
          )}
          expandLabel={t("actions.expand")}
          modalStats={[
            {
              label: String(wealthSeries.years[0]?.year ?? ""),
              value: formatCurrency(wealthSeries.years[0]?.total ?? 0),
              positive: (wealthSeries.years[0]?.total ?? 0) >= 0,
            },
            {
              label: String(wealthLast?.year ?? ""),
              value: formatCurrency(wealthLast?.total ?? 0),
              positive: (wealthLast?.total ?? 0) >= 0,
            },
          ]}
          modalContent={
            <VermoegensaufbauChart
              data={wealthSeries.years}
              showWertwachstum={wealthSeries.hasWertwachstum}
              height="100%"
            />
          }
        >
          <VermoegensaufbauChart
            data={wealthSeries.years}
            showWertwachstum={wealthSeries.hasWertwachstum}
            height={160}
          />
        </ChartCard>

        {/* 2 — Cashflow */}
        <ChartCard
          title="Cashflow"
          subtitle="Summe des jährl. Netto-Cashflows aller Objekte"
          info={chartTip(
            "Jährlicher Netto-Cashflow vor Steuern, je Immobilie berechnet und summiert. Projektion ab heute; die erste Säule entspricht dem KPI „Cashflow v. St.“. Die Miete wächst ab heute mit der Mietentwicklung; sobald ein Darlehen getilgt ist, entfällt dessen Rate und der Cashflow steigt.",
            "Σ (Kaltmiete − Leerstand − nicht uml. Kosten − Rücklagen − Bankrate) je Immobilie",
            "Erstes Jahr = heutiges Jahr. Bankrate = Zinsen + Tilgung, 0 nach Volltilgung."
          )}
          expandLabel={t("actions.expand")}
          modalStats={[
            {
              label: String(cashFlowSeries[0]?.year ?? ""),
              value: formatCurrency(cashFlowSeries[0]?.cashFlow ?? 0),
              positive: (cashFlowSeries[0]?.cashFlow ?? 0) >= 0,
            },
            {
              label: String(cfLast?.year ?? ""),
              value: formatCurrency(cfLast?.cashFlow ?? 0),
              positive: (cfLast?.cashFlow ?? 0) >= 0,
            },
          ]}
          modalContent={
            <CashFlowChart data={cashFlowSeries} monthly={false} height="100%" />
          }
        >
          <CashFlowChart data={cashFlowSeries} monthly={false} height={190} />
        </ChartCard>

        {/* 3 — Tilgungsplan */}
        <ChartCard
          title="Tilgungsplan"
          subtitle="Summe von Tilgung, Zinsen & Restschuld aller Objekte"
          info={chartTip(
            "Aufteilung der jährlichen Bankrate in Tilgung (grün) und Zinsen (blau) sowie die verbleibende Restschuld (Linie) — je Immobilie aus deren Tilgungsplan, summiert ab heute. Die erste Restschuld entspricht dem KPI „Offene Restschuld“.",
            "Σ Tilgungsanteil · Σ Zinsanteil · Σ Restschuld je Immobilie",
            "Jede Immobilie startet am heutigen Punkt ihres Tilgungsplans; getilgte Darlehen tragen 0 bei."
          )}
          expandLabel={t("actions.expand")}
          modalStats={[
            {
              label: "Restschuld heute",
              value: formatCurrency(kpis.outstandingLoanBalance, "de-DE", true),
              positive: false,
            },
            {
              label: "Tilgung/Jahr",
              value: formatCurrency(kpis.annualPrincipal, "de-DE", true),
            },
            {
              label: "Zinsen/Jahr",
              value: formatCurrency(kpis.annualInterest, "de-DE", true),
              positive: false,
            },
          ]}
          modalContent={
            <AmortizationChart data={amortizationSeries} monthly={false} height="100%" />
          }
        >
          <AmortizationChart data={amortizationSeries} monthly={false} height={190} />
        </ChartCard>

        {/* 4 — Eigenkapitalrendite */}
        <ChartCard
          title="Eigenkapitalrendite"
          subtitle="Σ Rendite ÷ noch gebundenes Eigenkapital des Portfolios"
          info={chartTip(
            "Jährliche Rendite auf das noch gebundene Eigenkapital des Portfolios. Das gesamte eingesetzte Eigenkapital (gestrichelte Linie) wird über die Zeit durch den Cashflow zurückgezahlt und sinkt entsprechend. Der hier verwendete Cashflow ist identisch mit dem Cashflow-Diagramm. Die Kurve endet, wenn das gesamte Eigenkapital zurückgeflossen ist.",
            "(Σ Cashflow [+ Tilgung] [+ Wertzuwachs]) ÷ noch gebundenes Eigenkapital × 100",
            "Gebundenes Eigenkapital = Σ (Eigenanteil + Kaufnebenkosten) − bereits zurückgeflossener Cashflow."
          )}
          expandLabel={t("actions.expand")}
          modalStats={[
            {
              label: String(ekRenditeSeries[0]?.year ?? ""),
              value: formatPercent(ekRenditeSeries[0]?.ekRendite ?? 0),
              positive: (ekRenditeSeries[0]?.ekRendite ?? 0) >= 0,
            },
            {
              label:
                ekTilgung && ekWertzuwachs
                  ? "inkl. Tilg.+Wert"
                  : ekTilgung
                  ? "inkl. Tilgung"
                  : ekWertzuwachs
                  ? "inkl. Wert"
                  : "Cashflow only",
              value: "",
            },
          ]}
          modalContent={
            <div className="flex flex-col gap-2 h-full">
              <div className="flex items-center gap-3 px-0.5">
                <ToggleChip
                  label="inkl. Tilgung"
                  active={ekTilgung}
                  onClick={() => setEkTilgung((v) => !v)}
                />
                <ToggleChip
                  label="inkl. Wertzuwachs"
                  active={ekWertzuwachs}
                  onClick={() => setEkWertzuwachs((v) => !v)}
                />
              </div>
              <div className="flex-1 min-h-0">
                <EKRenditeChart
                  data={ekRenditeSeries}
                  includeTilgung={ekTilgung}
                  includeWertzuwachs={ekWertzuwachs}
                  monthly={false}
                  height="100%"
                />
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-0.5">
              <ToggleChip
                label="inkl. Tilgung"
                active={ekTilgung}
                onClick={() => setEkTilgung((v) => !v)}
              />
              <ToggleChip
                label="inkl. Wertzuwachs"
                active={ekWertzuwachs}
                onClick={() => setEkWertzuwachs((v) => !v)}
              />
            </div>
            <EKRenditeChart
              data={ekRenditeSeries}
              includeTilgung={ekTilgung}
              includeWertzuwachs={ekWertzuwachs}
              monthly={false}
              height={160}
            />
          </div>
        </ChartCard>

        {/* 5 — Immobilienwert vs. Schulden */}
        <ChartCard
          title="Immobilienwert vs. Schulden"
          subtitle="Summe von Wert, Restschuld & Nettovermögen aller Objekte"
          info={chartTip(
            "Portfolio-Wert (blau) gegen Restschuld (rot); die Fläche dazwischen ist das Nettovermögen. Je Immobilie berechnet und summiert. Der erste Wert entspricht den KPIs „geschätzter Portfoliowert“ bzw. „Offene Restschuld“.",
            "Σ Immobilienwert · Σ Restschuld · Σ (Wert − Restschuld) je Immobilie",
            "Wert = Kaufpreis × (1 + Wertentwicklung)^Jahre seit Kauf. Getilgte Objekte behalten ihren Wert bei Restschuld 0."
          )}
          expandLabel={t("actions.expand")}
          modalStats={[
            {
              label: "Wert heute",
              value: formatCurrency(kpis.estimatedPortfolioValue, "de-DE", true),
              positive: true,
            },
            {
              label: `Wert (${apprLast?.year ?? ""})`,
              value: formatCurrency(apprLast?.immobilienwert ?? 0, "de-DE", true),
              positive: true,
            },
            {
              label: `Nettoverm. (${apprLast?.year ?? ""})`,
              value: formatCurrency(apprLast?.eigenkapital ?? 0, "de-DE", true),
              positive: true,
            },
          ]}
          modalContent={
            <WertSchuldenChart data={appreciationSeries} monthly={false} height="100%" />
          }
        >
          <WertSchuldenChart data={appreciationSeries} monthly={false} height={190} />
        </ChartCard>

        {/* 6 — Brutto-Mietrendite */}
        <ChartCard
          title="Brutto-Mietrendite"
          subtitle="Σ Kaltmiete ÷ Σ Kaufpreis (kaufpreisgewichtet)"
          info={chartTip(
            "Portfolio-Bruttomietrendite über die Zeit: gesamte Jahres-Kaltmiete im Verhältnis zum gesamten Kaufpreis. Die erste Jahres-Zahl entspricht dem KPI „Bruttomietrendite“; sie steigt, weil die Miete ab heute mit der Mietentwicklung wächst, der Kaufpreis aber fest bleibt.",
            "Σ Jahres-Kaltmiete ÷ Σ Kaufpreis × 100",
            "Ohne Nebenkosten, Betriebskosten, Finanzierung, Steuern und Leerstand."
          )}
          expandLabel={t("actions.expand")}
          modalStats={[
            {
              label: String(mietrenditeSeries[0]?.year ?? ""),
              value: formatPercent(mietrenditeSeries[0]?.bruttoMietrendite ?? 0),
            },
            {
              label: String(
                mietrenditeSeries[mietrenditeSeries.length - 1]?.year ?? ""
              ),
              value: formatPercent(
                mietrenditeSeries[mietrenditeSeries.length - 1]
                  ?.bruttoMietrendite ?? 0
              ),
            },
          ]}
          modalContent={
            <MietrenditeChart
              data={mietrenditeSeries}
              baselineY1={mietrenditeSeries[0]?.bruttoMietrendite}
              monthly={false}
              height="100%"
            />
          }
        >
          <MietrenditeChart
            data={mietrenditeSeries}
            baselineY1={mietrenditeSeries[0]?.bruttoMietrendite}
            monthly={false}
            height={190}
          />
        </ChartCard>
      </div>
    </div>
  );
}

// Two-part chart info tooltip: what is plotted, then the exact formula — same
// look as the KPI panel tooltips so both surfaces read consistently.
function chartTip(what: string, formula: React.ReactNode, note?: React.ReactNode) {
  return (
    <div className="flex flex-col gap-2 py-0.5">
      <p>{what}</p>
      <div className="border-t border-background/25 pt-2 font-medium">{formula}</div>
      {note && <p className="border-t border-background/25 pt-2 italic">{note}</p>}
    </div>
  );
}

// Toggle chip for the EK-Rendite card (mirrors the single-property page).
function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
        active
          ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
          : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/40"
      )}
    >
      {label}
    </button>
  );
}
