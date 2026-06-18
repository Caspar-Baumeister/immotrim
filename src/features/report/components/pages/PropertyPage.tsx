"use client";

import type { PropertyReportMetrics } from "../../report-metrics";
import type { ReportConfig } from "../../report-types";
import { ReportPage, SectionTitle, FactList, type Fact } from "../ReportLayout";
import { REPORT_COLORS, eur, pct, formatDateDE } from "../../report-theme";

const OCCUPANCY_LABEL: Record<PropertyReportMetrics["occupancy"], string> = {
  vermietet: "Vermietet",
  "teilweise vermietet": "Teilweise vermietet",
  leerstehend: "Leerstehend",
};

function num(v: number | undefined, suffix = ""): string | undefined {
  if (v === undefined) return undefined;
  return `${v.toLocaleString("de-DE")}${suffix}`;
}

function riskHints(m: PropertyReportMetrics): string[] {
  const hints: string[] = [];
  if (m.ltv > 80) hints.push("Hoher Beleihungsauslauf");
  if (m.monthlyCashFlowBeforeTax < 0) hints.push("Negativer Cashflow vor Steuern");
  if (m.remainingFixedYears !== null && m.remainingFixedYears <= 2)
    hints.push("Anschlussfinanzierung steht an");
  if (m.leerstand > 0) hints.push(`Leerstand von ${pct(m.leerstand)} berücksichtigt`);
  return hints;
}

export function PropertyPage({
  m,
  config,
  imageUrls,
  index,
  total,
}: {
  m: PropertyReportMetrics;
  config: ReportConfig;
  imageUrls: string[];
  index: number;
  total: number;
}) {
  const showImages = config.includePropertyImages && imageUrls.length > 0;
  const hints = riskHints(m);

  const objektangaben: Fact[] = [
    { label: "Immobilientyp", value: m.objekttyp },
    { label: "Stadt / Bezirk", value: m.stadt },
    { label: "Wohnfläche", value: num(m.wohnflaeche, " m²") },
    { label: "Zimmer", value: num(m.zimmer) },
    { label: "Baujahr", value: m.baujahr ? String(m.baujahr) : undefined },
    { label: "Kaufdatum", value: m.kaufdatum ? formatDateDE(m.kaufdatum) : undefined },
  ];

  const wert: Fact[] = [
    { label: "Kaufpreis", value: eur(m.kaufpreis) },
    { label: "Kaufnebenkosten", value: eur(m.nebenkostenEur) },
    { label: "Gesamte Anschaffungskosten", value: eur(m.totalAcquisition) },
    { label: "Geschätzter Marktwert", value: eur(m.currentValue) },
    { label: "Beleihungsauslauf", value: pct(m.ltv) },
  ];

  const einnahmen: Fact[] = [
    { label: "Monatliche Nettokaltmiete", value: eur(m.monthlyColdRent) },
    { label: "Jährliche Nettokaltmiete", value: eur(m.annualColdRent) },
    { label: "Miete pro m²", value: m.rentPerSqm !== null ? `${eur(m.rentPerSqm)} /m²` : undefined },
    { label: "Hausgeld / WEG-Kosten", value: m.hausgeld !== undefined ? eur(m.hausgeld) : undefined },
    { label: "Nicht umlagefähige Kosten", value: eur(m.nichtUmlagefaehigMonthly) },
    { label: "Instandhaltungsrücklage", value: eur(m.ruecklagenMonthly) },
  ];

  const finanzierung: Fact[] = config.includeFinancing
    ? [
        { label: "Offene Darlehenssumme", value: eur(m.currentDebt), accent: REPORT_COLORS.debt },
        { label: "Monatlicher Kapitaldienst", value: eur(m.monthlyPayment) },
        { label: "Zinssatz", value: pct(m.zins) },
        { label: "Tilgungsrate", value: pct(m.tilgung) },
        {
          label: "Zinsbindung",
          value:
            m.remainingFixedYears !== null
              ? `${m.zinsbindung} Jahre (${m.remainingFixedYears.toFixed(0)} verbl.)`
              : `${m.zinsbindung} Jahre`,
        },
      ]
    : [];

  const rendite: Fact[] = [
    { label: "Bruttorendite", value: pct(m.grossYield) },
    { label: "Nettorendite", value: pct(m.netYield) },
    {
      label: "Monatl. Cashflow vor Steuern",
      value: eur(m.monthlyCashFlowBeforeTax),
      accent: m.monthlyCashFlowBeforeTax >= 0 ? REPORT_COLORS.equity : REPORT_COLORS.debt,
    },
    ...(config.includeTax && m.monthlyCashFlowAfterTax !== null
      ? [
          {
            label: "Monatl. Cashflow nach Steuern",
            value: eur(m.monthlyCashFlowAfterTax),
            accent:
              m.monthlyCashFlowAfterTax >= 0 ? REPORT_COLORS.equity : REPORT_COLORS.debt,
          } as Fact,
        ]
      : []),
  ];

  const bank: Fact[] = [
    { label: "Besicherungswert", value: eur(m.currentValue) },
    {
      label: "Darlehensexposition",
      value: `${eur(m.currentDebt)} (${m.debtShare.toFixed(0)} %)`,
    },
    { label: "Beitrag zu Mieteinnahmen", value: pct(m.rentShare) },
    {
      label: "Beitrag zum Cashflow (mtl.)",
      value: eur(m.monthlyCashFlowBeforeTax),
      accent: m.monthlyCashFlowBeforeTax >= 0 ? REPORT_COLORS.equity : REPORT_COLORS.debt,
    },
  ];

  return (
    <ReportPage section={`Einzelobjekt ${index} / ${total}`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <SectionTitle title={m.name} subtitle={m.address ?? m.stadt ?? undefined} />
        <span
          className="text-[9.5px] font-medium rounded-full px-2 py-0.5 mt-1 shrink-0"
          style={{
            background: m.occupancy === "leerstehend" ? "#fdeaea" : "#eaf7f0",
            color: m.occupancy === "leerstehend" ? REPORT_COLORS.debt : REPORT_COLORS.equity,
          }}
        >
          {OCCUPANCY_LABEL[m.occupancy]}
        </span>
      </div>

      {showImages && (
        <div className="flex gap-2.5 mb-3">
          {imageUrls.slice(0, 2).map((url, i) => (
            <div
              key={i}
              className="flex-1 rounded-lg overflow-hidden"
              style={{ border: `1px solid ${REPORT_COLORS.cardBorder}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-[42mm] object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <FactList title="Objektangaben" facts={objektangaben} />
        <FactList title="Kaufpreis & Wert" facts={wert} />
        <FactList title="Mieteinnahmen & Kosten" facts={einnahmen} />
        {config.includeFinancing && <FactList title="Finanzierung" facts={finanzierung} />}
        <FactList title="Rendite & Cashflow" facts={rendite} />
      </div>

      {config.includeNotes && m.notizen && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: REPORT_COLORS.muted }}>
            Notizen
          </p>
          <p
            className="text-[10.5px] leading-relaxed rounded-lg px-3 py-2 whitespace-pre-line"
            style={{ background: "#f7f8fa", color: REPORT_COLORS.text }}
          >
            {m.notizen}
          </p>
        </div>
      )}

      <div className="flex-1" />

      <div
        className="rounded-lg p-3 mt-4"
        style={{ background: "#f7f8fa", border: `1px solid ${REPORT_COLORS.cardBorder}` }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: REPORT_COLORS.muted }}>
          Bankperspektive
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
          <FactList facts={bank.slice(0, 2)} />
          <FactList facts={bank.slice(2)} />
        </div>
        <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${REPORT_COLORS.cardBorder}` }}>
          <span className="text-[9.5px]" style={{ color: REPORT_COLORS.muted }}>
            Risikohinweise:{" "}
          </span>
          <span className="text-[9.5px]" style={{ color: REPORT_COLORS.text }}>
            {hints.length > 0 ? hints.join(" · ") : "Keine besonderen Risikohinweise."}
          </span>
        </div>
      </div>
    </ReportPage>
  );
}
