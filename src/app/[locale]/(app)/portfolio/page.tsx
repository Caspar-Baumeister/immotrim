"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PlusCircle, Edit2, BarChart3, MapPin } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PortfolioKpiPanel } from "@/features/portfolio/components/PortfolioKpiPanel";
import { ChartCard } from "@/components/shared/ChartCard";
import { CashFlowChart } from "@/features/cash-flow/components/CashFlowChart";
import { AmortizationChart } from "@/features/mortgage/components/AmortizationChart";
import { WertSchuldenChart } from "@/features/appreciation/components/WertSchuldenChart";
import { EKRenditeChart } from "@/features/returns/components/EKRenditeChart";
import { MietrenditeChart } from "@/features/cap-rate/components/MietrenditeChart";
import { VermoegensaufbauChart } from "@/features/wealth/components/VermoegensaufbauChart";
import { Button } from "@/components/ui/button";
import { getAllProperties } from "@/lib/property-service";
import { type Property } from "@/lib/supabase";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import {
  calculatePortfolioCashFlowSeries,
  calculatePortfolioAmortizationSeries,
  calculatePortfolioEKRenditeSeries,
  calculatePortfolioAppreciationSeries,
  calculatePortfolioMietrenditeSeries,
  calculatePortfolioWealthSeries,
} from "@/features/portfolio/chart-calculations";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export default function PortfolioPage({ params }: Props) {
  const { locale } = use(params);
  const t = useTranslations();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // EK-Rendite chart toggles — mirror the single-property page.
  const [ekTilgung, setEkTilgung] = useState(false);
  const [ekWertzuwachs, setEkWertzuwachs] = useState(false);

  const loadProperties = () => {
    getAllProperties().then((ps) => {
      setProperties(ps);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const portfolioInputs = properties.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    inputs: p.inputs,
  }));
  const kpis = calculatePortfolioKpis(portfolioInputs);

  // Portfolio-level chart series: each property's own series combined by calendar
  // year (absolutes summed, percentages value-weighted). Empty until loaded.
  const cashFlowSeries = calculatePortfolioCashFlowSeries(portfolioInputs);
  const amortizationSeries = calculatePortfolioAmortizationSeries(portfolioInputs);
  const ekRenditeSeries = calculatePortfolioEKRenditeSeries(portfolioInputs, {
    includeTilgung: ekTilgung,
    includeWertzuwachs: ekWertzuwachs,
  });
  const appreciationSeries = calculatePortfolioAppreciationSeries(portfolioInputs);
  const mietrenditeSeries = calculatePortfolioMietrenditeSeries(portfolioInputs);
  const wealthSeries = calculatePortfolioWealthSeries(portfolioInputs);

  // Stat helpers: pick the first/last/10th-year rows of a combined series.
  const cfLast = cashFlowSeries[cashFlowSeries.length - 1];
  const apprLast = appreciationSeries[appreciationSeries.length - 1];
  const wealthLast = wealthSeries.years[wealthSeries.years.length - 1];

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={t("portfolio.title")} locale={locale} />

      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto">
        {/* Dense portfolio KPI panel — mirrors the single-property facts layout */}
        {properties.length > 0 && <PortfolioKpiPanel kpis={kpis} />}

        {/* ── Portfolio charts ──────────────────────────────────────────────
            Same six charts as a single property, but every series is the sum
            (or value-weighted average, for %) of all properties by calendar year. */}
        {properties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* 1 — Cashflow */}
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

            {/* 2 — Tilgungsplan */}
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

            {/* 3 — Eigenkapitalrendite */}
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

            {/* 4 — Immobilienwert vs. Schulden */}
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

            {/* 5 — Brutto-Mietrendite */}
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

            {/* 6 — Vermögensaufbau pro Jahr */}
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
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {properties.length} {t("portfolio.properties")}
          </h2>
          <Link href={`/${locale}/property/new`}>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              {t("nav.newProperty")}
            </Button>
          </Link>
        </div>

        {/* Empty state */}
        {!loading && properties.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-16 sm:py-24 px-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <BarChart3 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {t("portfolio.empty")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("portfolio.emptyDesc")}
              </p>
            </div>
            <Link href={`/${locale}/property/new`}>
              <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                {t("portfolio.addFirst")}
              </Button>
            </Link>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Property cards */}
        {!loading && properties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyCard({
  property,
  locale,
  t,
}: {
  property: Property;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  // Reuse the exact portfolio KPI definitions for this single property so the
  // card and the dashboard panel above always agree.
  const k = calculatePortfolioKpis([
    {
      id: property.id,
      name: property.name,
      address: property.address,
      inputs: property.inputs,
    },
  ]);
  const eur = (v: number) => formatCurrency(v, "de-DE");

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/15 transition-colors">
      {/* Card header */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {property.name}
            </h3>
            {property.address && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {property.address}
                </span>
              </div>
            )}
          </div>
          <Link
            href={`/${locale}/property/${property.id}/edit`}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded flex-shrink-0"
            aria-label={t("actions.edit")}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric label="Gesamtkosten" value={eur(k.totalInvestmentCost)} />
        <Metric label="Investiertes EK" value={eur(k.investedEquity)} />
        <Metric
          label="Cashflow mtl./jährl."
          value={`${formatCurrency(k.monthlyCashFlowBeforeTax)} / ${eur(k.cashFlowBeforeTax)}`}
        />
        <Metric
          label="Brutto/Netto-Rendite"
          value={`${formatPercent(k.grossRentalYield)} / ${formatPercent(k.netRentalYield)}`}
        />
        <Metric
          label="EK-Rendite v. St."
          value={formatPercent(k.returnOnEquityBeforeTax)}
        />
        <Metric
          label="Steuereffekt"
          value={k.tax ? eur(k.tax.taxImpact) : "—"}
        />
      </div>

      {/* Footer action */}
      <div className="px-5 pb-4">
        <Link href={`/${locale}/property/${property.id}`} className="block">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-border hover:bg-muted/50 text-xs gap-1.5"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {t("actions.viewInsights")}
          </Button>
        </Link>
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

// Toggle chip for the portfolio EK-Rendite card (mirrors the single-property page).
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

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", valueClass ?? "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
