"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, FileText, Landmark, Loader2, Plus, Upload } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/shared/MetricCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { CashFlowChart } from "@/features/cash-flow/components/CashFlowChart";
import { WertSchuldenChart } from "@/features/appreciation/components/WertSchuldenChart";
import { VermoegensaufbauChart } from "@/features/wealth/components/VermoegensaufbauChart";
import { WealthForces } from "@/features/portfolio/components/WealthForces";
import { getAllProperties } from "@/lib/property-service";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import { calculateWealthForces } from "@/features/portfolio/forces";
import {
  calculatePortfolioCashFlowSeries,
  calculatePortfolioAppreciationSeries,
  calculatePortfolioWealthSeries,
} from "@/features/portfolio/chart-calculations";
import type { Property } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

const eur = (v: number) => formatCurrency(v, "de-DE");

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProperties()
      .then(setProperties)
      .finally(() => setLoading(false));
  }, []);

  const portfolio = properties.map((p) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    inputs: p.inputs,
  }));
  const kpis = calculatePortfolioKpis(portfolio);
  const forces = calculateWealthForces(portfolio);
  const cashFlowSeries = calculatePortfolioCashFlowSeries(portfolio);
  const appreciationSeries = calculatePortfolioAppreciationSeries(portfolio);
  const wealthSeries = calculatePortfolioWealthSeries(portfolio);
  const ltv = kpis.estimatedPortfolioValue > 0
    ? (kpis.outstandingLoanBalance / kpis.estimatedPortfolioValue) * 100
    : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Übersicht" />
      <div className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[#6c5ce7]" />
          </div>
        ) : properties.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#6c5ce7]" />
                <h2 className="text-sm font-semibold text-foreground">Dein Portfolio heute</h2>
                <span className="text-xs text-muted-foreground">
                  {properties.length} {properties.length === 1 ? "Immobilie" : "Immobilien"}
                </span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <Link
                  href="/portfolio"
                  className="text-sm font-medium text-[#6c5ce7] hover:underline flex items-center gap-1"
                >
                  Alle Immobilien <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/bankuebersicht"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#6c5ce7] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#5b4bd6]"
                >
                  <Landmark className="h-4 w-4" />
                  Bankenübersicht
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard label="Portfolio-Wert" value={eur(kpis.estimatedPortfolioValue)} />
              <MetricCard label="Eigenkapital im Bestand" value={eur(kpis.netPropertyEquity)} accent="#6c5ce7" />
              <MetricCard label="Restschuld" value={eur(kpis.outstandingLoanBalance)} />
              <MetricCard label="Beleihungsauslauf" value={formatPercent(ltv, 1)} />
              <MetricCard
                label="Cashflow / Monat"
                value={eur(kpis.monthlyCashFlowBeforeTax)}
                accent={kpis.monthlyCashFlowBeforeTax >= 0 ? "#10b981" : "#ef4444"}
              />
              <MetricCard label="Brutto-Mietrendite" value={formatPercent(kpis.grossRentalYield, 1)} />
              <MetricCard label="Eigenkapitalrendite" value={formatPercent(kpis.returnOnEquityBeforeTax, 1)} />
              <MetricCard label="Ø Zinssatz" value={formatPercent(kpis.weightedInterestRate, 2)} />
            </div>

            <WealthForces forces={forces} />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <ChartCard
                title="Vermögensaufbau pro Jahr"
                subtitle="Tilgung, Cashflow und Wertwachstum aller Objekte"
                expandLabel="Diagramm vergrößern"
                modalContent={
                  <VermoegensaufbauChart data={wealthSeries.years} showWertwachstum={wealthSeries.hasWertwachstum} height="100%" />
                }
              >
                <VermoegensaufbauChart data={wealthSeries.years} showWertwachstum={wealthSeries.hasWertwachstum} height={160} />
              </ChartCard>
              <ChartCard
                title="Cashflow"
                subtitle="Jährlicher Netto-Cashflow aller Objekte"
                expandLabel="Diagramm vergrößern"
                modalContent={<CashFlowChart data={cashFlowSeries} monthly={false} height="100%" />}
              >
                <CashFlowChart data={cashFlowSeries} monthly={false} height={160} />
              </ChartCard>
              <ChartCard
                title="Immobilienwert und Schulden"
                subtitle="Wert, Restschuld und Nettovermögen über die Zeit"
                expandLabel="Diagramm vergrößern"
                className="md:col-span-2 xl:col-span-1"
                modalContent={<WertSchuldenChart data={appreciationSeries} monthly={false} height="100%" />}
              >
                <WertSchuldenChart data={appreciationSeries} monthly={false} height={160} />
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto w-full max-w-2xl bg-card border border-border rounded-2xl p-6 sm:p-10 flex flex-col gap-6 text-center">
      <div className="space-y-2">
        <h2 className="font-heading text-2xl font-bold tracking-tight">Lege deine erste Immobilie an</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kaufpreis, Miete und Kredit reichen. Danach siehst du Cashflow, Tilgung, Wertentwicklung,
          Hebel und Restschuld auf einen Blick, so übersichtlich wie ein Depot.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        <Hint icon={Upload} title="Unterlagen hochladen">
          Kaufvertrag, Darlehensvertrag oder Mietvertrag hochladen. Immotrim liest die Zahlen aus.
        </Hint>
        <Hint icon={FileText} title="Oder kurz eintippen">
          Schätzwerte reichen für den Anfang. Du kannst alles später anpassen.
        </Hint>
      </div>
      <Link
        href="/property/new"
        className="mx-auto inline-flex items-center gap-2 bg-[#6c5ce7] hover:bg-[#5b4bd6] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        <Plus className="h-4 w-4" />
        Immobilie anlegen
      </Link>
    </div>
  );
}

function Hint({ icon: Icon, title, children }: { icon: typeof Upload; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 flex gap-3">
      <Icon className="h-5 w-5 shrink-0 text-[#6c5ce7]" />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
