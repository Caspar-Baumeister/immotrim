"use client";

import { useEffect } from "react";
import { calculatePortfolioKpis } from "@/features/portfolio/calculations";
import {
  calculatePortfolioAppreciationSeries,
  calculatePortfolioAmortizationSeries,
  calculatePortfolioCashFlowSeries,
} from "@/features/portfolio/chart-calculations";
import { computeReportMetrics, buildRiskSummary } from "../report-metrics";
import type { ReportPayload } from "../report-types";
import { CoverPage } from "./pages/CoverPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ChartsTimeSeriesPage, ChartsPerObjectPage } from "./pages/ChartsPages";
import { RiskPage } from "./pages/RiskPage";
import { PropertyPage } from "./pages/PropertyPage";

declare global {
  interface Window {
    __REPORT_READY__?: boolean;
  }
}

export function ReportDocument({ payload }: { payload: ReportPayload }) {
  const { properties, config, investorName, generatedAt, titleImageUrl, propertyImageUrls } =
    payload;

  const kpis = calculatePortfolioKpis(properties);
  const metrics = computeReportMetrics(properties);
  const risk = buildRiskSummary(properties);
  const appreciation = calculatePortfolioAppreciationSeries(properties);
  const amortization = calculatePortfolioAmortizationSeries(properties);
  const cashFlow = calculatePortfolioCashFlowSeries(properties);

  // Selected detail properties, in the user's chosen order.
  const selected = config.selectedPropertyIds
    .map((id) => metrics.byId[id])
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  // Signal the headless renderer once charts have had time to paint. Recharts
  // renders synchronously after mount; two rAFs + a small delay is ample.
  useEffect(() => {
    const mark = () => {
      window.__REPORT_READY__ = true;
      const el = document.createElement("div");
      el.id = "report-ready";
      el.style.display = "none";
      document.body.appendChild(el);
    };
    const id = window.setTimeout(
      () => requestAnimationFrame(() => requestAnimationFrame(mark)),
      500
    );
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="report-root">
      <CoverPage
        kpis={kpis}
        investorName={investorName}
        generatedAt={generatedAt}
        titleImageUrl={config.includeTitleImage ? titleImageUrl : null}
      />

      <OverviewPage
        kpis={kpis}
        includeTax={config.includeTax}
        detailCount={selected.length}
        totalCount={properties.length}
      />

      {config.includeCharts && properties.length > 0 && (
        <>
          <ChartsTimeSeriesPage
            appreciation={appreciation}
            amortization={amortization}
            cashFlow={cashFlow}
          />
          <ChartsPerObjectPage metrics={metrics.perProperty} />
        </>
      )}

      <RiskPage risk={risk} />

      {selected.map((m, i) => (
        <PropertyPage
          key={m.id}
          m={m}
          config={config}
          imageUrls={propertyImageUrls[m.id] ?? []}
          index={i + 1}
          total={selected.length}
        />
      ))}
    </div>
  );
}
