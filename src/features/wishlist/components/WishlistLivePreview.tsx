"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useWishlistFormStore } from "../wishlist-form-store";
import { useGlobalAssumptions } from "../global-assumptions-store";
import {
  calculateWishlistRowKpis,
  wishlistToPropertyInputs,
} from "../calculations";
import { totalNebenkostenPct, type WishlistProperty } from "../types";
import { calculateMortgage } from "@/features/mortgage/calculations";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

function MetricRow({
  label,
  value,
  highlight,
  positive,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean | null;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          highlight && positive === true && "text-emerald-400",
          highlight && positive === false && "text-red-400",
          highlight && positive === null && "text-amber-400",
          !highlight && "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function WishlistLivePreview() {
  const t = useTranslations("wishlist");
  const s = useWishlistFormStore();
  const g = useGlobalAssumptions();

  const { kpis, inputs } = useMemo(() => {
    const row: WishlistProperty = {
      id: "",
      userId: "",
      createdAt: "",
      updatedAt: "",
      name: s.name,
      address: s.address || null,
      exposeUrl: s.exposeUrl || null,
      lage: s.lage || null,
      kaufpreis: s.kaufpreis,
      wohnflaeche: s.wohnflaeche,
      zimmer: s.zimmer,
      baujahr: s.baujahr,
      istMiete: s.istMiete || null,
      sollMiete: s.sollMiete || null,
      eigenanteil: s.eigenanteil,
      extras: s.extras,
      details: s.details,
      notes: s.notes || null,
    };
    return {
      kpis: calculateWishlistRowKpis(row, g),
      inputs: wishlistToPropertyInputs(row, g),
    };
  }, [s, g]);

  const mortgage = calculateMortgage(inputs);
  const darlehensbetrag = Math.max(0, inputs.kaufpreis - inputs.eigenanteil);
  const nkPct = totalNebenkostenPct(inputs.nebenkosten);
  const gesamtkapital = inputs.eigenanteil + inputs.kaufpreis * (nkPct / 100);

  const cf = kpis.monthlyCashFlow;
  const cfPositive = cf == null ? null : cf >= 0;

  return (
    <div className="bg-card border border-border rounded-xl p-4 sticky top-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {t("livePreview")}
      </p>
      <div className="flex flex-col">
        <MetricRow
          label={t("columns.cashflow")}
          value={fmtCur(cf)}
          highlight
          positive={cfPositive}
        />
        <MetricRow
          label={t("fields.monthlyRate")}
          value={formatCurrency(mortgage.monthlyPayment)}
          highlight
          positive={null}
        />
        <MetricRow
          label={
            g.yieldMode === "netto" ? t("columns.netYield") : t("columns.grossYield")
          }
          value={fmtPct(kpis.mietrendite)}
        />
        <MetricRow label={t("columns.ekReturn")} value={fmtPct(kpis.ekRendite)} />
        <MetricRow label={t("columns.pricePerSqm")} value={fmtCur(kpis.pricePerSqm)} />
        <MetricRow
          label={t("fields.darlehensbetrag")}
          value={formatCurrency(darlehensbetrag, "de-DE", true)}
        />
        <MetricRow
          label={t("fields.gesamtkapital")}
          value={formatCurrency(gesamtkapital, "de-DE", true)}
        />
        <MetricRow label={t("sections.nebenkosten")} value={formatPercent(nkPct, 2)} />
      </div>
    </div>
  );
}

function fmtCur(v: number | null | undefined): string {
  if (v == null) return "—";
  return formatCurrency(v, "de-DE", Math.abs(v) >= 10_000);
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  return formatPercent(v);
}
