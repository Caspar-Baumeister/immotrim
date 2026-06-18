"use client";

import type { CashFlowYear } from "@/features/cash-flow/calculations";
import type { AmortizationYear } from "@/features/mortgage/calculations";
import type { AppreciationYear } from "@/features/appreciation/calculations";
import type { PropertyReportMetrics } from "../../report-metrics";
import { ReportPage, SectionTitle, ChartFrame } from "../ReportLayout";
import { ReportLineChart, ReportBarChart, ReportObjectBarChart } from "../ReportCharts";
import { REPORT_COLORS, eur, pct } from "../../report-theme";

// Keep per-object charts legible on a single page; for very large portfolios the
// chart shows the most relevant objects and notes the remainder.
const OBJECT_CHART_LIMIT = 14;

function shortName(name: string): string {
  return name.length > 22 ? name.slice(0, 21) + "…" : name;
}

const H = 150;

export function ChartsTimeSeriesPage({
  appreciation,
  amortization,
  cashFlow,
}: {
  appreciation: AppreciationYear[];
  amortization: AmortizationYear[];
  cashFlow: CashFlowYear[];
}) {
  const apprData = appreciation as unknown as Record<string, number>[];
  const amortData = amortization as unknown as Record<string, number>[];
  const cfData = cashFlow as unknown as Record<string, number>[];

  // Beleihungsauslauf (LTV) over time — Restschuld ÷ Immobilienwert. The single
  // most-watched collateral-safety metric for a financing bank; it falls as the
  // loan amortizes and the value appreciates.
  const ltvData = appreciation.map((r) => ({
    year: r.year,
    ltv: r.immobilienwert > 0 ? (r.restschuld / r.immobilienwert) * 100 : 0,
  })) as unknown as Record<string, number>[];

  return (
    <ReportPage section="Portfolio-Grafiken">
      <SectionTitle
        title="Entwicklung des Portfolios"
        subtitle="Projektion auf Basis der eingegebenen Finanzierungs- und Wachstumsannahmen; alle Objekte zusammengefasst"
      />
      <div className="grid grid-cols-2 gap-2.5">
        <ChartFrame
          title="Entwicklung von Immobilienwert und Restschuld"
          caption="Wie viel Sicherheit steckt im Portfolio?"
        >
          <ReportLineChart
            data={apprData}
            xKey="year"
            height={H}
            series={[
              { key: "immobilienwert", label: "Immobilienwert", color: REPORT_COLORS.value },
              { key: "restschuld", label: "Restschuld", color: REPORT_COLORS.debt },
              { key: "eigenkapital", label: "Nettovermögen", color: REPORT_COLORS.equity, area: true },
            ]}
          />
        </ChartFrame>

        <ChartFrame
          title="Entwicklung des Beleihungsauslaufs (LTV)"
          caption="Wie entwickelt sich das Verhältnis von Restschuld zu Objektwert?"
        >
          <ReportLineChart
            data={ltvData}
            xKey="year"
            height={H}
            valueFmt={pct}
            series={[{ key: "ltv", label: "Beleihungsauslauf (LTV)", color: REPORT_COLORS.ltv, area: true }]}
          />
        </ChartFrame>

        <ChartFrame title="Schuldenabbau über Zeit" caption="Wie viel Fremdkapital ist noch offen?">
          <ReportLineChart
            data={amortData}
            xKey="year"
            height={H}
            series={[{ key: "balance", label: "Restschuld", color: REPORT_COLORS.debt }]}
          />
        </ChartFrame>

        <ChartFrame
          title="Zinsanteil vs. Tilgungsanteil"
          caption="Wie verteilt sich der Kapitaldienst über die Zeit?"
        >
          <ReportBarChart
            data={amortData as unknown as Record<string, number>[]}
            xKey="year"
            stacked
            height={H}
            series={[
              { key: "principal", label: "Tilgung", color: REPORT_COLORS.principal },
              { key: "interest", label: "Zinsen", color: REPORT_COLORS.interest },
            ]}
          />
        </ChartFrame>

        <ChartFrame title="Cashflow-Entwicklung des Portfolios" caption="Ist der Cashflow stabil?">
          <ReportBarChart
            data={cfData}
            xKey="year"
            height={H}
            withZeroLine
            series={[{ key: "cashFlow", label: "Cashflow", color: REPORT_COLORS.cashflow }]}
          />
        </ChartFrame>

        <ChartFrame
          title="Mieteinnahmen im Verhältnis zum Kapitaldienst"
          caption="Wird der Kapitaldienst durch Mieteinnahmen gedeckt?"
        >
          <ReportLineChart
            data={cfData}
            xKey="year"
            height={H}
            series={[
              { key: "netRent", label: "Nettomiete", color: REPORT_COLORS.rent },
              { key: "mortgage", label: "Kapitaldienst", color: REPORT_COLORS.debtService },
            ]}
          />
        </ChartFrame>
      </div>
    </ReportPage>
  );
}

export function ChartsPerObjectPage({ metrics }: { metrics: PropertyReportMetrics[] }) {
  const capped = metrics.slice(0, OBJECT_CHART_LIMIT);
  const remainder = metrics.length - capped.length;
  const names = (sel: (m: PropertyReportMetrics) => number) =>
    capped.map((m) => ({ name: shortName(m.name), value: sel(m) }));

  const objH = Math.max(90, capped.length * 22 + 24);

  return (
    <ReportPage section="Portfolio-Grafiken">
      <SectionTitle
        title="Objektvergleich"
        subtitle={
          remainder > 0
            ? `Kennzahlen je Immobilie — dargestellt sind ${capped.length} von ${metrics.length} Objekten`
            : "Kennzahlen je Immobilie im direkten Vergleich"
        }
      />
      <div className="grid grid-cols-2 gap-2.5">
        <ChartFrame title="Immobilienwert je Objekt" caption="Welche Immobilie trägt am meisten zum Wert bei?">
          <ReportObjectBarChart data={names((m) => m.currentValue)} height={objH} color={REPORT_COLORS.value} />
        </ChartFrame>
        <ChartFrame title="Restschuld je Objekt" caption="Welche Immobilie trägt das größte Fremdkapital?">
          <ReportObjectBarChart data={names((m) => m.currentDebt)} height={objH} color={REPORT_COLORS.debt} />
        </ChartFrame>
        <ChartFrame title="Beleihungsauslauf je Objekt" caption="Welche Immobilie trägt das größte Risiko?">
          <ReportObjectBarChart
            data={names((m) => m.ltv)}
            height={objH}
            color={REPORT_COLORS.ltv}
            valueFmt={pct}
          />
        </ChartFrame>
        <ChartFrame title="Cashflow je Objekt (mtl.)" caption="Welche Immobilie belastet den Cashflow?">
          <ReportObjectBarChart
            data={names((m) => m.monthlyCashFlowBeforeTax)}
            height={objH}
            valueFmt={eur}
            signed
          />
        </ChartFrame>
        <ChartFrame title="Nettorendite je Objekt" caption="Welche Immobilie rentiert am besten?">
          <ReportObjectBarChart
            data={names((m) => m.netYield)}
            height={objH}
            color={REPORT_COLORS.yield}
            valueFmt={pct}
          />
        </ChartFrame>
      </div>
      {remainder > 0 && (
        <p className="text-[9px] mt-2" style={{ color: REPORT_COLORS.muted }}>
          Hinweis: Zur besseren Lesbarkeit sind die {capped.length} relevantesten Objekte
          dargestellt; {remainder} weitere Objekte sind in der Portfolioübersicht enthalten.
        </p>
      )}
    </ReportPage>
  );
}
