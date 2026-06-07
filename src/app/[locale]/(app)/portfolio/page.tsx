"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PlusCircle, Trash2, BarChart3, MapPin } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { MetricCard } from "@/components/shared/MetricCard";
import { Button } from "@/components/ui/button";
import { getAllProperties, deleteProperty } from "@/lib/property-service";
import { type Property } from "@/lib/supabase";
import { calculatePortfolio } from "@/features/portfolio/calculations";
import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateCapRate } from "@/features/cap-rate/calculations";
import { calculateMortgage } from "@/features/mortgage/calculations";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export default function PortfolioPage({ params }: Props) {
  const { locale } = use(params);
  const t = useTranslations();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadProperties = () => {
    getAllProperties().then((ps) => {
      setProperties(ps);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    setDeleting(id);
    try {
      await deleteProperty(id);
      setProperties((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const portfolio = calculatePortfolio(
    properties.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      inputs: p.inputs,
    }))
  );

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={t("portfolio.title")} locale={locale} />

      <div className="flex-1 p-6 flex flex-col gap-6 overflow-auto">
        {/* Summary KPIs */}
        {properties.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard
              label={t("portfolio.totalValue")}
              value={formatCurrency(portfolio.totalPortfolioValue, "de-DE", true)}
              accent="#3b82f6"
            />
            <MetricCard
              label={t("portfolio.totalInvested")}
              value={formatCurrency(portfolio.totalInvested, "de-DE", true)}
            />
            <MetricCard
              label={t("portfolio.totalDebt")}
              value={formatCurrency(portfolio.totalDebt, "de-DE", true)}
              accent="#6366f1"
            />
            <MetricCard
              label={t("portfolio.monthlyCashFlow")}
              value={formatCurrency(portfolio.monthlyCashFlow)}
              accent={portfolio.monthlyCashFlow >= 0 ? "#f59e0b" : "#ef4444"}
            />
            <MetricCard
              label={t("portfolio.avgCapRate")}
              value={formatPercent(portfolio.avgGrossYield)}
              accent="#10b981"
            />
          </div>
        )}

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
                onDelete={handleDelete}
                deleting={deleting === property.id}
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
  onDelete,
  deleting,
  t,
}: {
  property: Property;
  locale: string;
  onDelete: (id: string) => void;
  deleting: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const cashFlow = calculateCashFlow(property.inputs);
  const capRate = calculateCapRate(property.inputs);
  const mortgage = calculateMortgage(property.inputs);

  const cfPositive = cashFlow.monthlyCashFlow >= 0;

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
          <button
            onClick={() => onDelete(property.id)}
            disabled={deleting}
            className="text-muted-foreground hover:text-red-400 transition-colors p-1 rounded flex-shrink-0"
          >
            {deleting ? (
              <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="px-5 py-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Metric
          label={t("metrics.monthlyCashFlow")}
          value={formatCurrency(cashFlow.monthlyCashFlow)}
          valueClass={cfPositive ? "text-amber-400" : "text-red-400"}
        />
        <Metric
          label="Brutto-Rendite"
          value={formatPercent(capRate.bruttoMietrenditeY1)}
        />
        <Metric
          label={t("metrics.cashOnCash")}
          value={formatPercent(capRate.cashOnCashReturn)}
        />
        <Metric
          label={t("metrics.monthlyMortgage")}
          value={formatCurrency(mortgage.monthlyPayment)}
        />
        <Metric
          label={t("metrics.totalInvested")}
          value={formatCurrency(property.inputs.eigenanteil, "de-DE", true)}
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
