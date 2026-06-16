"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Edit2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PortfolioKpiPanel } from "@/features/portfolio/components/PortfolioKpiPanel";
import { ChartCard } from "@/components/shared/ChartCard";
import { CashFlowChart } from "@/features/cash-flow/components/CashFlowChart";
import { AmortizationChart } from "@/features/mortgage/components/AmortizationChart";
import { WertSchuldenChart } from "@/features/appreciation/components/WertSchuldenChart";
import { EKRenditeChart } from "@/features/returns/components/EKRenditeChart";
import { MietrenditeChart } from "@/features/cap-rate/components/MietrenditeChart";
import { VermoegensaufbauChart } from "@/features/wealth/components/VermoegensaufbauChart";
import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateWealthBuildup } from "@/features/wealth/calculations";
import { calculateCapRate } from "@/features/cap-rate/calculations";
import { calculateMortgage } from "@/features/mortgage/calculations";
import { calculateAppreciation } from "@/features/appreciation/calculations";
import { calculateReturns } from "@/features/returns/calculations";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import { getProperty, updateProperty } from "@/lib/property-service";
import { type Property } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DocumentUpload } from "@/features/property-input/components/DocumentUpload";
import type { AppliedPatch } from "@/features/property-input/extraction-types";
import { FileText } from "lucide-react";

type Props = { params: Promise<{ locale: string; id: string }> };

export default function PropertyInsightsPage({ params }: Props) {
  const { locale, id } = use(params);
  const t = useTranslations();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  // EK-Rendite chart toggles (chart-specific)
  const [ekTilgung, setEkTilgung] = useState(false);
  const [ekWertzuwachs, setEkWertzuwachs] = useState(false);

  // Documents drawer (add docs later → re-extract → recalculate)
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    getProperty(id).then((p) => {
      setProperty(p);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 h-screen">
        <p className="text-muted-foreground">{t("property.notFound")}</p>
        <Link href={`/${locale}/portfolio`}>
          <Button variant="outline" size="sm">{t("property.backToPortfolio")}</Button>
        </Link>
      </div>
    );
  }

  const inputs = property.inputs;

  // Apply reviewed extraction values to the saved property and persist.
  // Charts/metrics recompute automatically once `property` state updates.
  const applyPatch = async (patch: AppliedPatch) => {
    const newName = patch.name ?? property.name;
    const newAddress = patch.address ?? property.address ?? "";
    const newInputs = { ...property.inputs, ...(patch.inputs ?? {}) };
    await updateProperty(id, newName, newAddress, newInputs);
    setProperty({
      ...property,
      name: newName,
      address: newAddress || null,
      inputs: newInputs,
    });
  };

  // Per-property growth forecast (saved in property settings; 0% when unset)
  const mietentwicklung = inputs.mietentwicklung ?? 0;
  const wertentwicklung = inputs.wertentwicklung ?? 0;

  // Base calculations for the TopBar stats
  const cashFlow0 = calculateCashFlow(inputs);
  const capRate0 = calculateCapRate(inputs);
  const mortgage = calculateMortgage(inputs);

  // Chart calculations use the property's saved growth forecast
  const cashFlowData = calculateCashFlow(inputs);
  const ekRenditeData = calculateReturns(inputs, {
    includeTilgung: ekTilgung,
    includeWertzuwachs: ekWertzuwachs,
  });
  const wertSchuldenData = calculateAppreciation(inputs);
  const mietrenditeData = calculateCapRate(inputs);
  const wealthData = calculateWealthBuildup(inputs);

  const cfPositive = cashFlow0.monthlyCashFlow >= 0;

  // Derived TopBar stat: return on invested capital (cashflow + tilgung ÷ EK)
  const totalNebenkostenPct =
    inputs.nebenkosten.grunderwerbsteuerPct +
    inputs.nebenkosten.notarGrundbuchPct +
    inputs.nebenkosten.maklerprovisionPct +
    inputs.nebenkosten.sonstigePct;
  const totalNebenkostenEur = (inputs.kaufpreis * totalNebenkostenPct) / 100;
  const totalInvestedCapital = inputs.eigenanteil + totalNebenkostenEur;
  const year1Tilgung = mortgage.schedule[0]?.principal ?? 0;
  const roic =
    totalInvestedCapital > 0
      ? ((cashFlow0.monthlyCashFlow * 12 + year1Tilgung) / totalInvestedCapital) * 100
      : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title={property.name}
        subtitle={property.address ?? undefined}
        locale={locale}
        stats={[
          {
            label: "Cashflow/Monat",
            value: formatCurrency(cashFlow0.monthlyCashFlow),
            positive: cfPositive,
          },
          {
            label: "Brutto-Rendite",
            value: formatPercent(capRate0.bruttoMietrenditeY1),
          },
          {
            label: "Kapitalrendite",
            value: formatPercent(roic, 1),
            tooltip:
              "Cashflow (Jahr 1) + Tilgung (Jahr 1) geteilt durch investiertes Kapital (Eigenanteil + Nebenkosten)",
          },
        ]}
      />

      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-5 overflow-auto">
        {/* Top action row */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocs((v) => !v)}
            className="gap-1.5 text-xs border-border hover:bg-muted/50"
          >
            <FileText className="h-3 w-3" />
            {t("documents.navButton")}
          </Button>
          <Link href={`/${locale}/property/${id}/edit`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-border hover:bg-muted/50"
            >
              <Edit2 className="h-3 w-3" />
              {t("actions.edit")}
            </Button>
          </Link>
        </div>

        {/* Documents drawer — upload, extract, review diff, recalculate in place */}
        {showDocs && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="mb-2">
              <span className="text-sm font-semibold text-foreground">
                {t("documents.sectionTitle")}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {t("documents.sectionHint")}
              </p>
            </div>
            <DocumentUpload
              target={{ propertyId: id }}
              current={{ name: property.name, address: property.address ?? "", inputs }}
              onApply={applyPatch}
            />
          </div>
        )}

        {/* ── Dense KPI panel ───────────────────────────────────────────── */}
        {/* Same KPIs/rows/colors/explanations as the portfolio dashboard —
            a single property is just a portfolio of one. */}
        <PortfolioKpiPanel
          kpis={calculatePortfolioKpis([
            {
              id: property.id,
              name: property.name,
              address: property.address,
              inputs,
            },
          ])}
        />

        {/* ── Charts 3-column grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* 1 — Cashflow */}
          <ChartCard
            title="Cashflow"
            subtitle="Jährl. Netto-Cashflow nach Rate, Rücklagen & NK"
            expandLabel={t("actions.expand")}
            modalStats={[
              {
                label: "Y1",
                value: formatCurrency(cashFlowData.years[0]?.cashFlow ?? 0),
                positive: (cashFlowData.years[0]?.cashFlow ?? 0) >= 0,
              },
              {
                label: "Y10",
                value: formatCurrency(cashFlowData.years[9]?.cashFlow ?? 0),
                positive: (cashFlowData.years[9]?.cashFlow ?? 0) >= 0,
              },
              {
                label: `Mietentw. ${mietentwicklung}%`,
                value: formatCurrency(
                  cashFlowData.years[cashFlowData.years.length - 1]?.cashFlow ?? 0
                ),
                positive:
                  (cashFlowData.years[cashFlowData.years.length - 1]
                    ?.cashFlow ?? 0) >= 0,
              },
            ]}
            modalContent={
              <CashFlowChart data={cashFlowData.years} monthlyData={cashFlowData.monthlyYears} monthly={false} height="100%" />
            }
          >
            <CashFlowChart data={cashFlowData.years} monthlyData={cashFlowData.monthlyYears} monthly={false} height={190} />
          </ChartCard>

          {/* 2 — Tilgungsplan */}
          <ChartCard
            title="Tilgungsplan"
            subtitle="Tilgung, Zinsen & Restschuld bis zur Volltilgung"
            expandLabel={t("actions.expand")}
            modalStats={[
              {
                label: "Darlehensbetrag",
                value: formatCurrency(mortgage.loanAmount, "de-DE", true),
              },
              {
                label: "Rate/Monat",
                value: formatCurrency(mortgage.monthlyPayment),
              },
              {
                label: "Gesamtzinsen",
                value: formatCurrency(mortgage.totalInterestPaid, "de-DE", true),
                positive: false,
              },
            ]}
            modalContent={
              <AmortizationChart
                data={mortgage.schedule}
                monthlyData={mortgage.monthlySchedule}
                zinsbindung={inputs.zinsbindung}
                monthly={false}
                height="100%"
              />
            }
          >
            <AmortizationChart
              data={mortgage.schedule}
              monthlyData={mortgage.monthlySchedule}
              zinsbindung={inputs.zinsbindung}
              monthly={false}
              height={190}
            />
          </ChartCard>

          {/* 3 — Eigenkapitalrendite */}
          <ChartCard
            title="Eigenkapitalrendite"
            subtitle="Cashflow ÷ investiertes Kapital (EK + Nebenkosten, jährl. angepasst)"
            expandLabel={t("actions.expand")}
            modalStats={[
              {
                label: "Y1",
                value: formatPercent(ekRenditeData.years[0]?.ekRendite ?? 0),
                positive: (ekRenditeData.years[0]?.ekRendite ?? 0) >= 0,
              },
              {
                label: "Y10",
                value: formatPercent(ekRenditeData.years[9]?.ekRendite ?? 0),
                positive: (ekRenditeData.years[9]?.ekRendite ?? 0) >= 0,
              },
              {
                label: ekTilgung && ekWertzuwachs ? "inkl. Tilg.+Wert" : ekTilgung ? "inkl. Tilgung" : ekWertzuwachs ? "inkl. Wert" : "Cashflow only",
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
                    data={ekRenditeData.years}
                    monthlyData={ekRenditeData.monthlyYears}
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
                data={ekRenditeData.years}
                monthlyData={ekRenditeData.monthlyYears}
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
            subtitle="Wertentwicklung und Restschuld über die Laufzeit"
            expandLabel={t("actions.expand")}
            modalStats={[
              {
                label: "Kaufpreis",
                value: formatCurrency(inputs.kaufpreis, "de-DE", true),
              },
              {
                label: `Wert (${mortgage.totalYears}J, ${wertentwicklung}%)`,
                value: formatCurrency(
                  wertSchuldenData.years[wertSchuldenData.years.length - 1]
                    ?.immobilienwert ?? inputs.kaufpreis,
                  "de-DE",
                  true
                ),
                positive: true,
              },
              {
                label: `EK (${mortgage.totalYears}J)`,
                value: formatCurrency(
                  wertSchuldenData.years[wertSchuldenData.years.length - 1]
                    ?.eigenkapital ?? 0,
                  "de-DE",
                  true
                ),
                positive: true,
              },
            ]}
            modalContent={
              <WertSchuldenChart data={wertSchuldenData.years} monthlyData={wertSchuldenData.monthlyYears} monthly={false} height="100%" />
            }
          >
            <WertSchuldenChart data={wertSchuldenData.years} monthlyData={wertSchuldenData.monthlyYears} monthly={false} height={190} />
          </ChartCard>

          {/* 5 — Brutto-Mietrendite */}
          <ChartCard
            title="Brutto-Mietrendite"
            subtitle="Kaltmiete / Kaufpreis mit Mietentwicklung"
            expandLabel={t("actions.expand")}
            modalStats={[
              {
                label: "Y1",
                value: formatPercent(
                  mietrenditeData.years[0]?.bruttoMietrendite ?? 0
                ),
              },
              {
                label: "Y10",
                value: formatPercent(
                  mietrenditeData.years[9]?.bruttoMietrendite ?? 0
                ),
              },
              {
                label: `Mietentw. ${mietentwicklung}%`,
                value: formatPercent(
                  mietrenditeData.years[mietrenditeData.years.length - 1]
                    ?.bruttoMietrendite ?? 0
                ),
              },
            ]}
            modalContent={
              <MietrenditeChart
                data={mietrenditeData.years}
                monthlyData={mietrenditeData.monthlyYears}
                baselineY1={capRate0.bruttoMietrenditeY1}
                monthly={false}
                height="100%"
              />
            }
          >
            <MietrenditeChart
              data={mietrenditeData.years}
              monthlyData={mietrenditeData.monthlyYears}
              baselineY1={capRate0.bruttoMietrenditeY1}
              monthly={false}
              height={190}
            />
          </ChartCard>

          {/* 6 — Vermögensaufbau pro Jahr */}
          <ChartCard
            title="Vermögensaufbau pro Jahr"
            subtitle="Tilgung + Cashflow + Wertwachstum, jährlich (nicht kumuliert)"
            expandLabel={t("actions.expand")}
            modalStats={[
              {
                label: "Y1",
                value: formatCurrency(wealthData.years[0]?.total ?? 0),
                positive: (wealthData.years[0]?.total ?? 0) >= 0,
              },
              {
                label: "Y10",
                value: formatCurrency(wealthData.years[9]?.total ?? 0),
                positive: (wealthData.years[9]?.total ?? 0) >= 0,
              },
              {
                label: `Wertentw. ${wertentwicklung}%`,
                value: formatCurrency(
                  wealthData.years[wealthData.years.length - 1]?.total ?? 0
                ),
                positive:
                  (wealthData.years[wealthData.years.length - 1]?.total ?? 0) >=
                  0,
              },
            ]}
            modalContent={
              <VermoegensaufbauChart
                data={wealthData.years}
                showWertwachstum={wealthData.hasWertwachstum}
                height="100%"
              />
            }
          >
            <VermoegensaufbauChart
              data={wealthData.years}
              showWertwachstum={wealthData.hasWertwachstum}
              height={160}
            />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

// ── Toggle chip for EK-Rendite ───────────────────────────────────────────────

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
