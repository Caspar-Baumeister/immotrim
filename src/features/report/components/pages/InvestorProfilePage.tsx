"use client";

import type { ReportStrategie } from "../../report-types";
import { ReportPage, SectionTitle } from "../ReportLayout";
import { REPORT_COLORS } from "../../report-theme";

// The "Investment Credit Story" page: who the investor is and what they buy.
// This narrative deliberately lives in the brochure and NOT in the
// Selbstauskunft — the bank reads the numbers there and the story here.
export function InvestorProfilePage({
  strategie,
  investorName,
}: {
  strategie: ReportStrategie;
  investorName: string;
}) {
  const { ueberMich, strategieText, imageUrl } = strategie;

  return (
    <ReportPage section="Investorenprofil">
      <SectionTitle
        title="Investorenprofil"
        subtitle="Person und Anlagestrategie hinter dem Portfolio"
      />

      <div className="flex items-center gap-4 mb-5">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="w-[26mm] h-[26mm] object-cover rounded-lg"
            style={{ border: `1px solid ${REPORT_COLORS.cardBorder}` }}
          />
        )}
        <div>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: REPORT_COLORS.muted }}>
            Eigentümer / Investor
          </p>
          <p className="text-[16px] font-semibold mt-0.5" style={{ color: REPORT_COLORS.text }}>
            {investorName}
          </p>
        </div>
      </div>

      {ueberMich && (
        <div className="report-avoid-break mb-5">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: REPORT_COLORS.muted }}
          >
            Über mich
          </p>
          <p
            className="text-[11px] leading-relaxed whitespace-pre-wrap"
            style={{ color: REPORT_COLORS.text }}
          >
            {ueberMich}
          </p>
        </div>
      )}

      {strategieText && (
        <div className="report-avoid-break">
          <p
            className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
            style={{ color: REPORT_COLORS.muted }}
          >
            Investmentstrategie
          </p>
          <p
            className="text-[11px] leading-relaxed whitespace-pre-wrap"
            style={{ color: REPORT_COLORS.text }}
          >
            {strategieText}
          </p>
        </div>
      )}
    </ReportPage>
  );
}
