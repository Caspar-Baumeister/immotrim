"use client";

import { usePropertyFormStore } from "@/lib/store";
import { calculateCashFlow } from "@/features/cash-flow/calculations";
import { calculateCapRate } from "@/features/cap-rate/calculations";
import { calculateMortgage } from "@/features/mortgage/calculations";
import { calculateReturns } from "@/features/returns/calculations";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

type MetricRowProps = {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean | null;
};

function MetricRow({ label, value, highlight, positive }: MetricRowProps) {
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

export function LivePreview() {
  const { inputs } = usePropertyFormStore();

  const cashFlow = calculateCashFlow(inputs);
  const capRate = calculateCapRate(inputs);
  const mortgage = calculateMortgage(inputs);
  const returns = calculateReturns(inputs);

  const cfPositive =
    cashFlow.monthlyCashFlow > 0
      ? true
      : cashFlow.monthlyCashFlow < 0
      ? false
      : null;

  const darlehensbetrag = Math.max(0, inputs.kaufpreis - inputs.eigenanteil);
  const totalNebenkostenPct =
    inputs.nebenkosten.grunderwerbsteuerPct +
    inputs.nebenkosten.notarGrundbuchPct +
    inputs.nebenkosten.maklerprovisionPct +
    inputs.nebenkosten.sonstigePct;
  const nebenkostenAbsolut = inputs.kaufpreis * (totalNebenkostenPct / 100);
  const gesamtInvestiertes = inputs.eigenanteil + nebenkostenAbsolut;

  return (
    <div className="bg-card border border-border rounded-xl p-4 sticky top-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Live-Vorschau
      </p>

      <div className="flex flex-col">
        <MetricRow
          label="Monatlicher Cashflow"
          value={formatCurrency(cashFlow.monthlyCashFlow)}
          highlight
          positive={cfPositive}
        />
        <MetricRow
          label="Monatliche Rate"
          value={formatCurrency(mortgage.monthlyPayment)}
          highlight
          positive={null}
        />
        <MetricRow
          label="Brutto-Mietrendite"
          value={formatPercent(capRate.bruttoMietrenditeY1)}
        />
        <MetricRow
          label="Cash-on-Cash"
          value={formatPercent(capRate.cashOnCashReturn)}
        />
        <MetricRow
          label="EK-Rendite Y1"
          value={formatPercent(returns.ekRenditeY1 ?? 0)}
        />
        <MetricRow
          label="Darlehensbetrag"
          value={formatCurrency(darlehensbetrag, "de-DE", true)}
        />
        <MetricRow
          label="Gesamtkapital"
          value={formatCurrency(gesamtInvestiertes, "de-DE", true)}
        />
        <MetricRow
          label="Nebenkosten"
          value={`${formatPercent(totalNebenkostenPct, 2)}`}
        />
      </div>
    </div>
  );
}
