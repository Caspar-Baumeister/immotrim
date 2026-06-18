"use client";

import type { PortfolioKpis } from "@/features/portfolio/calculations";
import { Wordmark } from "../ReportLayout";
import { REPORT_COLORS, eur, formatDateDE } from "../../report-theme";

const DISCLAIMER =
  "Dieser Bericht basiert auf den vom Nutzer eingegebenen Daten und den durch Immotrim berechneten Kennzahlen. Er dient als strukturierte Portfolioübersicht und ersetzt keine Originalunterlagen, formale Wertermittlung, Steuerberatung oder Rechtsberatung.";

function HeadlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-2" style={{ borderBottom: "1px solid #eef0f3" }}>
      <span className="text-[11px]" style={{ color: REPORT_COLORS.muted }}>
        {label}
      </span>
      <span className="text-[13px] font-semibold tabular-nums" style={{ color: REPORT_COLORS.text }}>
        {value}
      </span>
    </div>
  );
}

export function CoverPage({
  kpis,
  investorName,
  generatedAt,
  titleImageUrl,
}: {
  kpis: PortfolioKpis;
  investorName: string;
  generatedAt: string;
  titleImageUrl: string | null;
}) {
  return (
    <div className="report-page">
      <div className="flex items-center justify-between">
        <Wordmark />
        <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: REPORT_COLORS.muted }}>
          Vertraulich
        </span>
      </div>

      {titleImageUrl && (
        <div className="mt-8 rounded-xl overflow-hidden" style={{ border: `1px solid ${REPORT_COLORS.cardBorder}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={titleImageUrl} alt="" className="w-full h-[78mm] object-cover" />
        </div>
      )}

      <div className={titleImageUrl ? "mt-8" : "mt-[40mm]"}>
        <p className="text-[12px] uppercase tracking-[0.2em]" style={{ color: REPORT_COLORS.cashflow }}>
          Portfolio-Finanzierungsbericht
        </p>
        <h1 className="text-[34px] leading-[1.1] font-semibold mt-3" style={{ color: REPORT_COLORS.text }}>
          Immobilienportfolio
          <br />
          im Überblick
        </h1>
        <div className="flex gap-10 mt-6">
          <div>
            <p className="text-[9px] uppercase tracking-wide" style={{ color: REPORT_COLORS.muted }}>
              Eigentümer / Investor
            </p>
            <p className="text-[13px] font-medium mt-0.5" style={{ color: REPORT_COLORS.text }}>
              {investorName}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide" style={{ color: REPORT_COLORS.muted }}>
              Erstellungsdatum
            </p>
            <p className="text-[13px] font-medium mt-0.5" style={{ color: REPORT_COLORS.text }}>
              {formatDateDE(generatedAt.slice(0, 10))}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-9 max-w-[120mm]">
        <HeadlineStat label="Anzahl der Immobilien" value={String(kpis.propertyCount)} />
        <HeadlineStat
          label="Geschätzter Marktwert des Portfolios"
          value={eur(kpis.manualMarketValue ?? kpis.estimatedPortfolioValue)}
        />
        <HeadlineStat label="Gesamte Restschuld" value={eur(kpis.outstandingLoanBalance)} />
        <HeadlineStat label="Jährliche Nettokaltmiete" value={eur(kpis.annualColdRent)} />
        <HeadlineStat label="Nettovermögen / Eigenkapital im Portfolio" value={eur(kpis.netPropertyEquity)} />
      </div>

      <div className="flex-1" />

      <p className="text-[8.5px] leading-relaxed mt-8" style={{ color: REPORT_COLORS.muted }}>
        {DISCLAIMER}
      </p>
    </div>
  );
}
