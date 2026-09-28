"use client";

import type { BankKpis } from "../../report-metrics";
import { ReportPage, SectionTitle, KpiGrid, KpiCard } from "../ReportLayout";
import { REPORT_COLORS, eur, pct } from "../../report-theme";

// Coverage ratios are shown as a multiple, e.g. "1,32 x".
function ratio(v: number): string {
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)} x`;
}

function dscrAccent(v: number): string | undefined {
  if (v <= 0) return undefined;
  if (v < 1) return REPORT_COLORS.debt;
  if (v >= 1.2) return REPORT_COLORS.equity;
  return undefined;
}

// "Kapitaldienst und Sicherheiten": the page a bank reads first when it checks a
// portfolio for further lending. Part of the "portfolio" report variant only.
export function BankKpiPage({ bank }: { bank: BankKpis }) {
  const hasDebt = bank.monthlyDebtService > 0;

  return (
    <ReportPage section="Kapitaldienst und Sicherheiten">
      <SectionTitle
        title="Kapitaldienst und Sicherheiten"
        subtitle="Bankrelevante Kennzahlen zur Tragfähigkeit und Besicherung des Portfolios"
      />

      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: REPORT_COLORS.muted }}>
        Tragfähigkeit
      </p>
      <KpiGrid cols={3}>
        <KpiCard
          label="Kapitaldienstdeckung (DSCR)"
          value={hasDebt ? ratio(bank.dscr) : "k. A."}
          sub="Nettoertrag nach Rücklagen / Kapitaldienst"
          accent={dscrAccent(bank.dscr)}
        />
        <KpiCard
          label="Mietdeckung"
          value={hasDebt ? ratio(bank.rentCover) : "k. A."}
          sub="Kaltmiete / Kapitaldienst"
        />
        <KpiCard
          label="Monatlicher Kapitaldienst"
          value={eur(bank.monthlyDebtService)}
          accent={REPORT_COLORS.debtService}
        />
        <KpiCard label="Monatliche Nettokaltmiete" value={eur(bank.monthlyRent)} />
        <KpiCard
          label="Monatlicher Nettoertrag"
          value={eur(bank.monthlyNoi)}
          sub="Kaltmiete abzüglich Leerstand und nicht umlagefähiger Kosten"
        />
        <KpiCard
          label="Überschuss nach Kapitaldienst"
          value={eur(bank.monthlyNoi - bank.monthlyDebtService)}
          sub="monatlich, vor Rücklagen und Steuern"
          accent={
            bank.monthlyNoi - bank.monthlyDebtService >= 0
              ? REPORT_COLORS.equity
              : REPORT_COLORS.debt
          }
        />
      </KpiGrid>

      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 mt-5" style={{ color: REPORT_COLORS.muted }}>
        Besicherung und Konditionen
      </p>
      <KpiGrid cols={4}>
        <KpiCard label="Beleihungsauslauf (LTV)" value={pct(bank.ltv)} accent={REPORT_COLORS.ltv} />
        <KpiCard label="Eigenkapitalquote" value={pct(bank.equityRatio)} accent={REPORT_COLORS.equity} />
        <KpiCard label="Ø Zinssatz" value={pct(bank.weightedInterestRate)} sub="gewichtet nach Restschuld" />
        <KpiCard label="Ø Tilgungssatz" value={pct(bank.weightedRepaymentRate)} sub="gewichtet nach Restschuld" />
      </KpiGrid>

      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 mt-6" style={{ color: REPORT_COLORS.muted }}>
        Restlaufzeit der Zinsbindungen
      </p>
      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${REPORT_COLORS.cardBorder}` }}>
        <div
          className="grid grid-cols-3 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide"
          style={{ background: "#f7f8fa", color: REPORT_COLORS.muted }}
        >
          <span>Objekt</span>
          <span className="text-right">Ende der Zinsbindung</span>
          <span className="text-right">Verbleibend</span>
        </div>
        {bank.zinsbindungen.map((z, i) => (
          <div
            key={i}
            className="grid grid-cols-3 px-3 py-1.5 text-[10.5px] tabular-nums"
            style={{ borderTop: `1px solid #f1f3f6`, color: REPORT_COLORS.text }}
          >
            <span className="truncate pr-2">{z.name}</span>
            <span className="text-right">{z.endYear === null ? "k. A." : String(z.endYear)}</span>
            <span className="text-right">
              {z.remainingYears === null ? "k. A." : `${z.remainingYears.toFixed(0)} Jahre`}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <div
        className="rounded-md px-3 py-2.5 mt-6"
        style={{ background: "#f7f8fa", border: `1px solid ${REPORT_COLORS.cardBorder}` }}
      >
        <p className="text-[9.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: REPORT_COLORS.muted }}>
          Lesehilfe
        </p>
        <p className="text-[9.5px] leading-relaxed" style={{ color: REPORT_COLORS.text }}>
          Die Kapitaldienstdeckung setzt den laufenden Nettoertrag nach Leerstand, nicht
          umlagefähigen Kosten und Rücklagen ins Verhältnis zum gesamten Kapitaldienst. Werte
          über 1,0 bedeuten, dass die Objekte ihre Finanzierung aus den Mieten tragen.
        </p>
        <p className="text-[9.5px] leading-relaxed mt-1" style={{ color: REPORT_COLORS.text }}>
          Beleihungsauslauf und Eigenkapitalquote beziehen sich auf den geschätzten
          Marktwert des Portfolios. Wo der Eigentümer einen Marktwert angegeben hat, wird
          dieser verwendet, sonst der fortgeschriebene Kaufpreis.
        </p>
        <p className="text-[9.5px] leading-relaxed mt-1" style={{ color: REPORT_COLORS.text }}>
          Zins- und Tilgungssatz sind mit der aktuellen Restschuld gewichtet. Die Tabelle
          zeigt, wann für welches Objekt eine Anschlussfinanzierung ansteht.
        </p>
      </div>
    </ReportPage>
  );
}
