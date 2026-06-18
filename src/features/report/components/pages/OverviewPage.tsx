"use client";

import type { PortfolioKpis } from "@/features/portfolio/calculations";
import { ReportPage, SectionTitle, KpiGrid, KpiCard } from "../ReportLayout";
import { REPORT_COLORS, eur, pct } from "../../report-theme";

export function OverviewPage({
  kpis,
  includeTax,
  detailCount,
  totalCount,
}: {
  kpis: PortfolioKpis;
  includeTax: boolean;
  detailCount: number;
  totalCount: number;
}) {
  const showTax = includeTax && kpis.tax !== null;
  const ltv =
    kpis.estimatedPortfolioValue > 0
      ? (kpis.outstandingLoanBalance / kpis.estimatedPortfolioValue) * 100
      : 0;

  return (
    <ReportPage section="Portfolioübersicht">
      <SectionTitle
        title="Portfolioübersicht"
        subtitle="Zusammenfassung aller Immobilien im Gesamtportfolio"
      />

      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: REPORT_COLORS.muted }}>
        Portfolio & Eigenkapital
      </p>
      <KpiGrid cols={3}>
        <KpiCard label="Anzahl der Immobilien" value={String(kpis.propertyCount)} />
        <KpiCard label="Summe der Kaufpreise" value={eur(kpis.totalPurchasePrice)} />
        <KpiCard
          label="Geschätzter Marktwert"
          value={eur(kpis.manualMarketValue ?? kpis.estimatedPortfolioValue)}
        />
        <KpiCard label="Offene Darlehenssumme" value={eur(kpis.outstandingLoanBalance)} accent={REPORT_COLORS.debt} />
        <KpiCard label="Nettovermögen / Eigenkapital" value={eur(kpis.netPropertyEquity)} accent={REPORT_COLORS.equity} />
        <KpiCard label="Beleihungsauslauf (LTV)" value={pct(ltv)} />
      </KpiGrid>

      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 mt-5" style={{ color: REPORT_COLORS.muted }}>
        Finanzierung & Einnahmen
      </p>
      <KpiGrid cols={3}>
        <KpiCard label="Monatliche Nettokaltmiete" value={eur(kpis.annualColdRent / 12)} />
        <KpiCard label="Jährliche Nettokaltmiete" value={eur(kpis.annualColdRent)} />
        <KpiCard label="Monatlicher Kapitaldienst" value={eur(kpis.annualDebtService / 12)} />
        <KpiCard label="Jährliche Zinszahlungen" value={eur(kpis.annualInterest)} />
        <KpiCard label="Jährliche Tilgung" value={eur(kpis.annualPrincipal)} />
        <KpiCard label="Ø Zinssatz" value={pct(kpis.weightedInterestRate)} />
        <KpiCard label="Ø Tilgungsrate" value={pct(kpis.weightedRepaymentRate)} />
        <KpiCard label="Jährliche Instandhaltungsrücklage" value={eur(kpis.annualReserveContributions)} />
        <KpiCard label="Nicht umlagefähige Kosten p.a." value={eur(kpis.annualNonRecoverableCosts)} />
      </KpiGrid>

      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 mt-5" style={{ color: REPORT_COLORS.muted }}>
        Rendite & Cashflow
      </p>
      <KpiGrid cols={3}>
        <KpiCard label="Ø Bruttorendite" value={pct(kpis.grossRentalYield)} />
        <KpiCard label="Ø Nettorendite" value={pct(kpis.netRentalYield)} />
        <KpiCard
          label="Monatl. Cashflow vor Steuern"
          value={eur(kpis.monthlyCashFlowBeforeTax)}
          accent={kpis.monthlyCashFlowBeforeTax >= 0 ? REPORT_COLORS.equity : REPORT_COLORS.debt}
        />
        {showTax && kpis.tax && (
          <KpiCard
            label="Monatl. Cashflow nach Steuern"
            value={eur(kpis.tax.cashFlowAfterTax / 12)}
            accent={kpis.tax.cashFlowAfterTax >= 0 ? REPORT_COLORS.equity : REPORT_COLORS.debt}
          />
        )}
        <KpiCard label="Cash-on-Cash-Rendite" value={pct(kpis.cashOnCashReturn)} />
        <KpiCard label="EK-Rendite vor Steuern" value={pct(kpis.returnOnEquityBeforeTax)} />
      </KpiGrid>

      {showTax && kpis.tax && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 mt-5" style={{ color: REPORT_COLORS.muted }}>
            Steuerliche Kennzahlen
          </p>
          <KpiGrid cols={3}>
            <KpiCard
              label="Cashflow nach Steuern p.a."
              value={eur(kpis.tax.cashFlowAfterTax)}
              accent={kpis.tax.cashFlowAfterTax >= 0 ? REPORT_COLORS.equity : REPORT_COLORS.debt}
            />
            <KpiCard
              label="Steuereffekt p.a."
              value={eur(kpis.tax.taxImpact)}
              sub={kpis.tax.taxImpact >= 0 ? "Steuerersparnis" : "Steuerbelastung"}
              accent={kpis.tax.taxImpact >= 0 ? REPORT_COLORS.equity : REPORT_COLORS.debt}
            />
            <KpiCard label="Abschreibung (AfA) p.a." value={eur(kpis.tax.depreciation)} />
          </KpiGrid>
          {!kpis.tax.complete && (
            <p className="text-[9px] mt-2" style={{ color: REPORT_COLORS.muted }}>
              Hinweis: Steuerkennzahlen liegen für {kpis.tax.taxedCount} von {kpis.tax.totalCount}{" "}
              Objekten vor.
            </p>
          )}
        </>
      )}

      <div className="flex-1" />

      {detailCount < totalCount && (
        <p
          className="text-[9.5px] leading-relaxed mt-6 rounded-md px-3 py-2"
          style={{ background: "#f7f8fa", color: REPORT_COLORS.muted }}
        >
          Diese Übersicht und die Portfolio-Grafiken umfassen alle {totalCount} Objekte des
          Portfolios. Auf den folgenden Seiten werden {detailCount} ausgewählte Objekte im
          Detail dargestellt.
        </p>
      )}
    </ReportPage>
  );
}
