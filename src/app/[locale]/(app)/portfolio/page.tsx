"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PlusCircle, Edit2, BarChart3, MapPin } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PortfolioKpiPanel } from "@/features/portfolio/components/PortfolioKpiPanel";
import { Button } from "@/components/ui/button";
import { getAllProperties } from "@/lib/property-service";
import { type Property } from "@/lib/supabase";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export default function PortfolioPage({ params }: Props) {
  const { locale } = use(params);
  const t = useTranslations();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={t("portfolio.title")} locale={locale} />

      <div className="flex-1 p-6 flex flex-col gap-6 overflow-auto">
        {/* Dense portfolio KPI panel — mirrors the single-property facts layout */}
        {properties.length > 0 && <PortfolioKpiPanel kpis={kpis} />}

        {/* Header row */}
        <div className="flex items-center justify-between">
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
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
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
