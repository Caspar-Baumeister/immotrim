"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Edit2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ChartCard } from "@/components/shared/ChartCard";
import { ChartSlider } from "@/components/shared/ChartSlider";
import { CashFlowChart } from "@/features/cash-flow/components/CashFlowChart";
import { AmortizationChart } from "@/features/mortgage/components/AmortizationChart";
import { WertSchuldenChart } from "@/features/appreciation/components/WertSchuldenChart";
import { EKRenditeChart } from "@/features/returns/components/EKRenditeChart";
import { MietrenditeChart } from "@/features/cap-rate/components/MietrenditeChart";
import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateCapRate } from "@/features/cap-rate/calculations";
import { calculateMortgage } from "@/features/mortgage/calculations";
import { calculateAppreciation } from "@/features/appreciation/calculations";
import { calculateReturns } from "@/features/returns/calculations";
import { getProperty } from "@/lib/property-service";
import { type Property } from "@/lib/supabase";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ locale: string; id: string }> };

export default function PropertyInsightsPage({ params }: Props) {
  const { locale, id } = use(params);
  const t = useTranslations();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  // Global scenario controls
  const [globalMiet, setGlobalMiet] = useState(2);
  const [globalWert, setGlobalWert] = useState(2);
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");

  // EK-Rendite chart toggles (chart-specific)
  const [ekTilgung, setEkTilgung] = useState(false);
  const [ekWertzuwachs, setEkWertzuwachs] = useState(false);

  useEffect(() => {
    getProperty(id).then((p) => {
      setProperty(p);
      if (p) {
        setGlobalMiet(p.inputs.mietentwicklung);
        setGlobalWert(p.inputs.wertentwicklung);
      }
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
        <p className="text-muted-foreground">Immobilie nicht gefunden.</p>
        <Link href={`/${locale}/portfolio`}>
          <Button variant="outline" size="sm">Zurück zum Portfolio</Button>
        </Link>
      </div>
    );
  }

  const inputs = property.inputs;

  // Base calculations (no overrides) for facts panel
  const cashFlow0 = calculateCashFlow(inputs);
  const capRate0 = calculateCapRate(inputs);
  const mortgage = calculateMortgage(inputs);
  const appreciation0 = calculateAppreciation(inputs);

  // Chart calculations with global scenario overrides
  const cashFlowData = calculateCashFlow(inputs, {
    mietentwicklungOverride: globalMiet,
  });
  const ekRenditeData = calculateReturns(inputs, {
    mietentwicklungOverride: globalMiet,
    wertentwicklungOverride: globalWert,
    includeTilgung: ekTilgung,
    includeWertzuwachs: ekWertzuwachs,
  });
  const wertSchuldenData = calculateAppreciation(inputs, {
    wertentwicklungOverride: globalWert,
  });
  const mietrenditeData = calculateCapRate(inputs, {
    mietentwicklungOverride: globalMiet,
  });

  const cfPositive = cashFlow0.monthlyCashFlow >= 0;

  // Derived facts
  const darlehensbetrag = mortgage.loanAmount;
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
  const finalAppreciation =
    appreciation0.years[appreciation0.years.length - 1];

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

      <div className="flex-1 p-6 flex flex-col gap-5 overflow-auto">
        {/* Top action row */}
        <div className="flex items-center justify-end">
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

        {/* ── Dense facts panel ─────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-border">
            <FactColumn
              title="Kauf & Finanzierung"
              facts={[
                {
                  label: "Kaufpreis",
                  value: formatCurrency(inputs.kaufpreis, "de-DE", true),
                },
                {
                  label: "Eigenanteil",
                  value: formatCurrency(inputs.eigenanteil, "de-DE", true),
                },
                {
                  label: "Darlehensbetrag",
                  value: formatCurrency(darlehensbetrag, "de-DE", true),
                },
                {
                  label: "Monatliche Rate",
                  value: formatCurrency(mortgage.monthlyPayment),
                  highlight: true,
                },
                {
                  label: "Nebenkosten",
                  value: `${formatPercent(totalNebenkostenPct, 2)} = ${formatCurrency(totalNebenkostenEur, "de-DE", true)}`,
                  muted: true,
                },
                {
                  label: "Gesamtkosten",
                  value: formatCurrency(
                    inputs.kaufpreis + totalNebenkostenEur,
                    "de-DE",
                    true
                  ),
                },
                {
                  label: "Investiertes Kapital",
                  value: formatCurrency(
                    inputs.eigenanteil + totalNebenkostenEur,
                    "de-DE",
                    true
                  ),
                },
              ]}
            />
            <FactColumn
              title="Einnahmen & Cashflow"
              facts={[
                {
                  label: "Kaltmiete",
                  value: formatCurrency(inputs.kaltmiete) + "/Monat",
                },
                {
                  label: "Leerstand",
                  value: `${formatPercent(inputs.leerstand, 1)} Rate`,
                  muted: true,
                },
                {
                  label: "Nicht umlagefähige NK",
                  value: formatCurrency(inputs.nichtUmlagefaehig) + "/Monat",
                  negative: true,
                },
                {
                  label: "Rücklagen",
                  value: formatCurrency(inputs.ruecklagen) + "/Monat",
                  negative: true,
                },
                {
                  label: "Jährl. Gesamtkosten",
                  value: formatCurrency(
                    mortgage.monthlyPayment * 12 +
                      inputs.ruecklagen * 12 +
                      inputs.nichtUmlagefaehig * 12,
                    "de-DE",
                    true
                  ),
                  negative: true,
                },
                {
                  label: "Monatl. Cashflow",
                  value: formatCurrency(cashFlow0.monthlyCashFlow),
                  highlight: true,
                  positive: cfPositive,
                },
                {
                  label: "Jährl. Cashflow",
                  value: formatCurrency(cashFlow0.annualCashFlow, "de-DE", true),
                  highlight: true,
                  positive: cashFlow0.annualCashFlow >= 0,
                },
              ]}
            />
            <FactColumn
              title="Rendite & Wachstum"
              facts={[
                {
                  label: "Brutto-Mietrendite",
                  value: formatPercent(capRate0.bruttoMietrenditeY1),
                  highlight: true,
                },
                {
                  label: "Cash-on-Cash",
                  value: formatPercent(capRate0.cashOnCashReturn),
                  highlight: true,
                  positive: capRate0.cashOnCashReturn >= 0,
                },
                {
                  label: "Volltilgung nach",
                  value: `~${mortgage.totalYears} Jahren`,
                },
                {
                  label: "Zinsbindung",
                  value: `${inputs.zinsbindung} Jahre`,
                  muted: true,
                },
                {
                  label: "Gesamtzinsen",
                  value: formatCurrency(mortgage.totalInterestPaid, "de-DE", true),
                  negative: true,
                },
                {
                  label: `Immo-Wert (${mortgage.totalYears}J, ${inputs.wertentwicklung}% p.a.)`,
                  value: formatCurrency(
                    finalAppreciation?.immobilienwert ?? inputs.kaufpreis,
                    "de-DE",
                    true
                  ),
                  positive: true,
                },
                {
                  label: `Eigenkapital (${mortgage.totalYears}J)`,
                  value: formatCurrency(
                    finalAppreciation?.eigenkapital ?? 0,
                    "de-DE",
                    true
                  ),
                  positive: true,
                  highlight: true,
                },
              ]}
            />
          </div>
        </div>

        {/* ── Global scenario controls ──────────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <ChartSlider
              label="Mietentwicklung"
              value={globalMiet}
              onChange={setGlobalMiet}
              min={0}
              max={8}
              step={0.1}
            />
            <ChartSlider
              label="Wertentwicklung"
              value={globalWert}
              onChange={setGlobalWert}
              min={-2}
              max={10}
              step={0.1}
            />
          </div>
          <div className="flex items-center gap-2 sm:pl-4 sm:border-l sm:border-border">
            <span className="text-[10px] text-muted-foreground shrink-0">Ansicht</span>
            <div className="flex items-center gap-1">
              <ToggleChip
                label="Monatlich"
                active={period === "monthly"}
                onClick={() => setPeriod("monthly")}
              />
              <ToggleChip
                label="Jährlich"
                active={period === "yearly"}
                onClick={() => setPeriod("yearly")}
              />
            </div>
          </div>
        </div>

        {/* ── Charts 3-column grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* 1 — Cashflow */}
          <ChartCard
            title="Cashflow"
            subtitle={period === "monthly" ? "Monatl. Netto-Cashflow nach Rate, Rücklagen & NK" : "Jährl. Netto-Cashflow nach Rate, Rücklagen & NK"}
            expandLabel={t("actions.expand")}
            modalStats={[
              {
                label: "Y1",
                value: formatCurrency((cashFlowData.years[0]?.cashFlow ?? 0) / (period === "monthly" ? 12 : 1)),
                positive: (cashFlowData.years[0]?.cashFlow ?? 0) >= 0,
              },
              {
                label: "Y10",
                value: formatCurrency((cashFlowData.years[9]?.cashFlow ?? 0) / (period === "monthly" ? 12 : 1)),
                positive: (cashFlowData.years[9]?.cashFlow ?? 0) >= 0,
              },
              {
                label: `Mietentw. ${globalMiet}%`,
                value: formatCurrency(
                  (cashFlowData.years[cashFlowData.years.length - 1]?.cashFlow ?? 0) / (period === "monthly" ? 12 : 1)
                ),
                positive:
                  (cashFlowData.years[cashFlowData.years.length - 1]
                    ?.cashFlow ?? 0) >= 0,
              },
            ]}
            modalContent={
              <CashFlowChart data={cashFlowData.years} monthlyData={cashFlowData.monthlyYears} monthly={period === "monthly"} height="100%" />
            }
          >
            <CashFlowChart data={cashFlowData.years} monthlyData={cashFlowData.monthlyYears} monthly={period === "monthly"} height={190} />
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
                monthly={period === "monthly"}
                height="100%"
              />
            }
          >
            <AmortizationChart
              data={mortgage.schedule}
              monthlyData={mortgage.monthlySchedule}
              zinsbindung={inputs.zinsbindung}
              monthly={period === "monthly"}
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
                    monthly={period === "monthly"}
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
                monthly={period === "monthly"}
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
                label: `Wert (${mortgage.totalYears}J, ${globalWert}%)`,
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
              <WertSchuldenChart data={wertSchuldenData.years} monthlyData={wertSchuldenData.monthlyYears} monthly={period === "monthly"} height="100%" />
            }
          >
            <WertSchuldenChart data={wertSchuldenData.years} monthlyData={wertSchuldenData.monthlyYears} monthly={period === "monthly"} height={190} />
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
                label: `Mietentw. ${globalMiet}%`,
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
                monthly={period === "monthly"}
                height="100%"
              />
            }
          >
            <MietrenditeChart
              data={mietrenditeData.years}
              monthlyData={mietrenditeData.monthlyYears}
              baselineY1={capRate0.bruttoMietrenditeY1}
              monthly={period === "monthly"}
              height={190}
            />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

// ── Dense fact column ────────────────────────────────────────────────────────

type Fact = {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
  muted?: boolean;
};

function FactColumn({ title, facts }: { title: string; facts: Fact[] }) {
  return (
    <div className="flex flex-col">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-border/50">
        {facts.map((fact, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-2"
          >
            <span className="text-xs text-muted-foreground">{fact.label}</span>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                fact.highlight && fact.positive === true && "text-emerald-400",
                fact.highlight && fact.positive === false && "text-red-400",
                fact.highlight && fact.positive === undefined && "text-amber-400",
                fact.negative && !fact.highlight && "text-red-400/80",
                fact.muted && "text-muted-foreground",
                !fact.highlight && !fact.negative && !fact.muted && "text-foreground"
              )}
            >
              {fact.value}
            </span>
          </div>
        ))}
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
