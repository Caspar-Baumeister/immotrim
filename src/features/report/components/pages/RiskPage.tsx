"use client";

import type { RiskSummary } from "../../report-metrics";
import { ReportPage, SectionTitle, KpiGrid, KpiCard } from "../ReportLayout";
import { REPORT_COLORS, eur, pct } from "../../report-theme";

export function RiskPage({ risk }: { risk: RiskSummary }) {
  return (
    <ReportPage section="Risiko & Finanzierung">
      <SectionTitle
        title="Risiko- und Finanzierungsprofil"
        subtitle="Sachliche Übersicht der bankrelevanten Risikokennzahlen des Portfolios"
      />

      <KpiGrid cols={2}>
        <KpiCard
          label="Höchster Beleihungsauslauf"
          value={risk.highestLtv ? pct(risk.highestLtv.value) : "—"}
          sub={risk.highestLtv?.name}
        />
        <KpiCard
          label="Niedrigster Cashflow (mtl.)"
          value={risk.lowestCashflow ? eur(risk.lowestCashflow.value) : "—"}
          sub={risk.lowestCashflow?.name}
          accent={
            risk.lowestCashflow && risk.lowestCashflow.value < 0
              ? REPORT_COLORS.debt
              : undefined
          }
        />
        <KpiCard
          label="Größte Darlehensexposition"
          value={risk.largestLoan ? eur(risk.largestLoan.value) : "—"}
          sub={risk.largestLoan?.name}
        />
        <KpiCard
          label="Größter Mietbeitrag"
          value={risk.largestRentContribution ? pct(risk.largestRentContribution.value) : "—"}
          sub={risk.largestRentContribution?.name}
        />
      </KpiGrid>

      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 mt-6" style={{ color: REPORT_COLORS.muted }}>
        Übersicht der Zinsbindungen
      </p>
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${REPORT_COLORS.cardBorder}` }}>
        <div
          className="grid grid-cols-3 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide"
          style={{ background: "#f7f8fa", color: REPORT_COLORS.muted }}
        >
          <span>Objekt</span>
          <span className="text-right">Zinsbindung</span>
          <span className="text-right">Verbleibend</span>
        </div>
        {risk.zinsbindungen.map((z, i) => (
          <div
            key={i}
            className="grid grid-cols-3 px-3 py-1.5 text-[10.5px] tabular-nums"
            style={{ borderTop: `1px solid #f1f3f6`, color: REPORT_COLORS.text }}
          >
            <span className="truncate pr-2">{z.name}</span>
            <span className="text-right">{z.zinsbindung} Jahre</span>
            <span className="text-right">
              {z.remainingFixedYears === null
                ? "—"
                : `${z.remainingFixedYears.toFixed(0)} Jahre`}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 mt-6" style={{ color: REPORT_COLORS.muted }}>
        Konzentrationsrisiken
      </p>
      {risk.concentrationFlags.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {risk.concentrationFlags.map((flag, i) => (
            <li
              key={i}
              className="text-[10.5px] rounded-md px-3 py-2"
              style={{
                background: "#fff8ec",
                border: `1px solid #f3e2c0`,
                color: REPORT_COLORS.text,
              }}
            >
              {flag}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10.5px]" style={{ color: REPORT_COLORS.muted }}>
          Keine ausgeprägten Konzentrationsrisiken: Wert, Restschuld und Mieteinnahmen sind
          über die Objekte des Portfolios verteilt.
        </p>
      )}
    </ReportPage>
  );
}
