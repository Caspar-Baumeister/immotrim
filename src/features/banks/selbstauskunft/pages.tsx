"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SELBSTAUSKUNFT FORM PAGES
//
// The bank-neutral building blocks of the Selbstauskunft print documents
// (styled by mbs.css — the `sa-*` classes are generic A4 form styles). Bank
// documents (features/banks/mbs/…) and the generic Immotrim variant compose
// these pages and add their own bank-specific pages (e.g. the MBS Vollmacht).
//
// Editorial line: the Selbstauskunft answers "Kann diese Person den Kredit
// tragen?" — sober and numbers-driven. The investor story (Über mich,
// Strategie) deliberately lives in the Investorenbroschüre instead, so the bank
// never reads the same content twice. Structure by portfolio size:
//   0 Objekte  → blank object sections, Finanzbedarf trägt den Wunsch
//   1–2 Objekte → Zusatzblatt mit vollem Detailblock je Objekt
//   ab 3       → Portfolio-Zusammenfassung + kompakte einzeilige Objektliste
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { calculateMortgage } from "@/features/mortgage/calculations";
import type { PortfolioProperty } from "@/features/portfolio/calculations";
import type { SelbstauskunftKonzept } from "../types";
import type { Stammdaten, Haushalt } from "@/features/profile/types";

// ── formatting helpers ───────────────────────────────────────────────────────
const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const eur0 = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? "" : nf0.format(Math.round(v));

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// From how many properties on the Zusatzblatt switches from full detail blocks
// to the compact one-line-per-object list (the details then live in the
// Investorenbroschüre).
const DETAIL_PROPERTY_LIMIT = 2;

// Per-property loan figures, recomputed the same way the portfolio KPIs do it
// (balance from the amortization schedule at the elapsed year).
type LoanFigures = {
  loanAmount: number;
  restschuld: number;
  monthlyRate: number;
  zinsbindungBis: string;
};

function deriveLoan(p: PortfolioProperty): LoanFigures {
  const m = calculateMortgage(p.inputs);
  const startYear = p.inputs.loanStartDate
    ? parseInt(p.inputs.loanStartDate.split("-")[0], 10)
    : new Date().getFullYear();
  const elapsed = Math.max(0, new Date().getFullYear() - startYear);
  const idx = Math.min(elapsed, m.schedule.length - 1);
  const restschuld = m.schedule[idx]?.balance ?? m.loanAmount;
  const zb = p.inputs.zinsbindung
    ? String(startYear + p.inputs.zinsbindung)
    : "";
  return {
    loanAmount: m.loanAmount,
    restschuld,
    monthlyRate: m.monthlyPayment,
    zinsbindungBis: zb,
  };
}

function marketValue(p: PortfolioProperty): number {
  return p.inputs.report?.marktwert ?? p.inputs.kaufpreis;
}

function kaufjahr(p: PortfolioProperty): string {
  const iso = p.inputs.report?.kaufdatum ?? p.inputs.loanStartDate;
  return iso ? iso.slice(0, 4) : "";
}

// Bank-style monthly object cash flow, matching how a banker skims the numbers:
// Kaltmiete − Rate − nicht umlagefähige Kosten (no vacancy/reserve smoothing).
function objectCashflow(p: PortfolioProperty, loan: LoanFigures): number {
  return (p.inputs.kaltmiete ?? 0) - loan.monthlyRate - (p.inputs.nichtUmlagefaehig ?? 0);
}

// Portfolio sums for the summary band + derived household rows.
export type PortfolioTotals = {
  count: number;
  value: number;
  debt: number;
  equity: number;
  rent: number;
  rate: number;
  nichtUmlagefaehig: number;
  cashflow: number;
};

export function portfolioTotals(properties: PortfolioProperty[]): PortfolioTotals {
  const t: PortfolioTotals = {
    count: properties.length,
    value: 0,
    debt: 0,
    equity: 0,
    rent: 0,
    rate: 0,
    nichtUmlagefaehig: 0,
    cashflow: 0,
  };
  for (const p of properties) {
    const loan = deriveLoan(p);
    t.value += marketValue(p);
    t.debt += loan.restschuld;
    t.rent += p.inputs.kaltmiete ?? 0;
    t.rate += loan.monthlyRate;
    t.nichtUmlagefaehig += p.inputs.nichtUmlagefaehig ?? 0;
  }
  t.equity = t.value - t.debt;
  t.cashflow = t.rent - t.rate - t.nichtUmlagefaehig;
  return t;
}

// ── primitive form elements ──────────────────────────────────────────────────
export function Field({
  caption,
  value,
  eur,
}: {
  caption: string;
  value?: string | number | null;
  eur?: boolean;
}) {
  const text =
    value == null || value === "" ? " " : typeof value === "number" ? eur0(value) : value;
  return (
    <div className="sa-field">
      <span className={eur ? "sa-line sa-line--eur" : "sa-line"}>{text}</span>
      <span className="sa-cap">{caption}</span>
    </div>
  );
}

export function Check({ label, on }: { label: string; on?: boolean }) {
  return (
    <div className="sa-check">
      <span className={on ? "sa-box sa-box--on" : "sa-box"} />
      <span>{label}</span>
    </div>
  );
}

export function Band({ children }: { children: React.ReactNode }) {
  return <div className="sa-band">{children}</div>;
}

export function Page({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="sa-page">
      {children}
      <div className="sa-pagenum">{n}</div>
    </div>
  );
}

// ── readiness marker ─────────────────────────────────────────────────────────
// Signal the headless renderer once the DOM has painted. No charts here, so two
// rAFs after mount is ample (mirrors the report document's readiness marker).
export function useReportReady(): void {
  useEffect(() => {
    const mark = () => {
      const el = document.createElement("div");
      el.id = "report-ready";
      el.style.display = "none";
      document.body.appendChild(el);
    };
    const id = requestAnimationFrame(() => requestAnimationFrame(mark));
    return () => cancelAnimationFrame(id);
  }, []);
}

// ── pages ────────────────────────────────────────────────────────────────────
// Personal / income sections have no source data in the portfolio, so they render
// as an empty but structurally correct form the applicant completes by hand.

export function ApplicantColumn({
  n,
  sd,
  hh,
}: {
  n: 1 | 2;
  sd?: Stammdaten;
  hh?: Haushalt;
}) {
  return (
    <div>
      <div className="sa-subhead">Antragsteller {n}</div>
      <div className="sa-grid2">
        <Check label="Herr" on={sd?.anrede === "herr"} />
        <Check label="Frau" on={sd?.anrede === "frau"} />
      </div>
      <div className="sa-grid2" style={{ marginTop: 6 }}>
        <Field caption="Vorname" value={sd?.vorname} />
        <Field caption="Nachname" value={sd?.nachname} />
        <Field caption="Geburtsdatum" value={sd?.geburtsdatum} />
        <Field caption="Geburtsort" value={sd?.geburtsort} />
        <Field caption="Telefon" value={sd?.telefon} />
        <Field caption="E-Mail" value={sd?.email} />
      </div>
      <Field caption="Straße, Hausnummer" value={sd?.strasse} />
      <div className="sa-grid2">
        <Field caption="PLZ, Ort" value={sd?.plzOrt} />
        <Field caption="Dort wohnhaft seit" value={sd?.wohnhaftSeit} />
      </div>
      <div className="sa-subhead">Familienstand / Staatsangehörigkeit</div>
      <div className="sa-grid2">
        <div>
          <Check label="Ledig" on={sd?.familienstand === "ledig"} />
          <Check label="Verheiratet" on={sd?.familienstand === "verheiratet"} />
          <Check label="Geschieden" on={sd?.familienstand === "geschieden"} />
          <Check label="Verwitwet" on={sd?.familienstand === "verwitwet"} />
        </div>
        <div>
          <Field caption="Staatsangehörigkeit" value={sd?.staatsangehoerigkeit} />
          <Field caption="Steuer-ID" value={sd?.steuerId} />
        </div>
      </div>
      <div className="sa-subhead">Art der Beschäftigung</div>
      <div className="sa-grid2">
        <div>
          <Check label="Angestellter" on={sd?.beschaeftigung === "angestellter"} />
          <Check label="Beamter" on={sd?.beschaeftigung === "beamter"} />
          <Check label="Selbständiger" on={sd?.beschaeftigung === "selbstaendiger"} />
          <Check label="Rentner" on={sd?.beschaeftigung === "rentner"} />
        </div>
        <div>
          <Field caption="Einkommen Netto (monatlich)" value={hh?.nettoeinkommen} eur />
          <Field caption="Beschäftigt seit (Datum)" value={sd?.beschaeftigtSeit} />
          <Field caption="Anzahl der Gehälter (im Jahr)" value={hh?.anzahlGehaelter} />
        </div>
      </div>
      <div className="sa-grid2">
        <Field caption="Arbeitgeber" value={sd?.arbeitgeber} />
        <Field caption="Beruf" value={sd?.beruf} />
      </div>
    </div>
  );
}

export function PersonalPage({
  investorName,
  sd,
  hh,
}: {
  investorName: string;
  sd?: Stammdaten;
  hh?: Haushalt;
}) {
  return (
    <Page n={1}>
      <h1 className="sa-title">Ihre persönlichen Daten</h1>
      <p className="sa-cap" style={{ marginBottom: 8 }}>
        Antragsteller: {investorName}
      </p>
      <div className="sa-cols">
        <ApplicantColumn n={1} sd={sd} hh={hh} />
        <ApplicantColumn n={2} />
      </div>
    </Page>
  );
}

// Page 2 — the monthly budget: Kinder, Einnahmen, Ausgaben. Rent income from the
// portfolio is derived and shown split (Kaltmiete vs. nicht umlagefähig), so the
// bank can apply its own haircut to the anrechenbare Miete.
export function HouseholdPage({
  properties,
  sd,
  hh,
}: {
  properties: PortfolioProperty[];
  sd?: Stammdaten;
  hh?: Haushalt;
}) {
  const t = portfolioTotals(properties);
  const hasPortfolio = t.count > 0;
  return (
    <Page n={2}>
      <h1 className="sa-title">Ihre monatliche Haushaltsrechnung</h1>
      <Band>Kinder</Band>
      <div className="sa-grid3">
        <Field caption="Anzahl Ihrer Kinder" value={sd?.anzahlKinder} />
        <Field caption="Name Kind 1" />
        <Field caption="Name Kind 2" />
      </div>

      <Band>Monatliche Einnahmen (neben dem Erwerbseinkommen)</Band>
      <div className="sa-grid2">
        <Field caption="Kindergeld (monatlich)" value={hh?.kindergeld} eur />
        <Field caption="Weitere dauerhafte Einkünfte (monatlich)" value={hh?.weitereEinkuenfte} eur />
        <Field
          caption="Mieteinnahmen Bestand — Kaltmiete (Summe, monatlich)"
          value={hasPortfolio ? t.rent : undefined}
          eur
        />
        <Field
          caption="davon nicht umlagefähige Kosten (Summe, monatlich)"
          value={hasPortfolio ? t.nichtUmlagefaehig : undefined}
          eur
        />
      </div>
      {hasPortfolio && (
        <p className="sa-cap">
          Kaltmieten laut Immobilienbestand; nicht umlagefähige Kosten mindern den
          bankseitig anrechenbaren Anteil.
        </p>
      )}

      <Band>Monatliche Ausgaben</Band>
      <div className="sa-grid2">
        <Field caption="Eigene Miete / Wohnkosten (monatlich)" value={hh?.mietausgaben} eur />
        <Field caption="Lebenshaltungskosten (monatlich)" value={hh?.lebenshaltung} eur />
        <Field caption="Private Krankenversicherung (monatlich)" value={hh?.krankenversicherung} eur />
        <Field caption="Weitere Versicherungen (monatlich)" value={hh?.versicherungen} eur />
        <Field caption="Ratenkredite / Leasing (Rate monatlich)" value={hh?.ratenkredite} eur />
        <Field
          caption="Sonstige Ausgaben inkl. Unterhalt (monatlich)"
          value={hh?.sonstigeAusgaben}
          eur
        />
        <Field
          caption="Kapitaldienst Immobiliendarlehen (Summe, monatlich)"
          value={hasPortfolio ? t.rate : undefined}
          eur
        />
        <div />
      </div>
    </Page>
  );
}

// The Fall-C table from the spec: what the whole portfolio is worth, owes,
// earns and costs — the only property information the Selbstauskunft needs
// once the portfolio has more than a couple of objects.
function PortfolioSummaryBand({ t }: { t: PortfolioTotals }) {
  return (
    <>
      <Band>Immobilienvermögen im Überblick</Band>
      {t.count === 0 ? (
        <p className="sa-cap">Noch kein Immobilienbestand vorhanden.</p>
      ) : (
        <>
          <div className="sa-grid3">
            <Field caption="Anzahl Immobilien" value={String(t.count)} />
            <Field caption="Marktwert gesamt" value={t.value} eur />
            <Field caption="Restschuld gesamt" value={t.debt} eur />
            <Field caption="Eigenkapital im Bestand" value={t.equity} eur />
            <Field caption="Kaltmieten (monatlich)" value={t.rent} eur />
            <Field caption="Kreditraten (monatlich)" value={t.rate} eur />
            <Field
              caption="Nicht umlagefähige Kosten (monatlich)"
              value={t.nichtUmlagefaehig}
              eur
            />
            <Field caption="Cashflow vor Steuer (monatlich)" value={t.cashflow} eur />
            <div />
          </div>
          <p className="sa-cap">
            {t.count <= DETAIL_PROPERTY_LIMIT
              ? "Details je Objekt: siehe Zusatzblatt Immobilienvermögen."
              : "Objektliste: siehe Zusatzblatt. Kennzahlen und Grafiken je Objekt: Investorenbroschüre."}
          </p>
        </>
      )}
    </>
  );
}

// Page 3 — Bestand & Substanz: Vermögen, Verbindlichkeiten, Eigenkapital für den
// nächsten Erwerb (liquide Mittel vs. einsetzbar vs. Reserve) und die
// Portfolio-Zusammenfassung.
export function WealthPage({
  properties,
  sd,
  hh,
}: {
  properties: PortfolioProperty[];
  sd?: Stammdaten;
  hh?: Haushalt;
}) {
  const t = portfolioTotals(properties);
  const liquide =
    hh?.bankSparguthaben != null || hh?.wertpapiere != null
      ? (hh?.bankSparguthaben ?? 0) + (hh?.wertpapiere ?? 0)
      : undefined;
  const reserve =
    liquide != null && hh?.ekVerfuegbar != null
      ? Math.max(0, liquide - hh.ekVerfuegbar)
      : undefined;
  return (
    <Page n={3}>
      <h1 className="sa-title">Vermögen, Verbindlichkeiten und Eigenkapital</h1>
      <Band>Vermögen</Band>
      <div className="sa-grid2">
        <Field caption="Bank- und Sparguthaben" value={hh?.bankSparguthaben} eur />
        <Field caption="Wertpapiere / Aktien" value={hh?.wertpapiere} eur />
        <Field
          caption="Sonstiges Vermögen (Bauspar-, Versicherungsguthaben, Beteiligungen)"
          value={hh?.sonstigesVermoegen}
          eur
        />
        <Field
          caption="Immobilienvermögen (Marktwert, Summe)"
          value={t.count > 0 ? t.value : undefined}
          eur
        />
      </div>

      <Band>Verbindlichkeiten</Band>
      <div className="sa-grid2">
        <Field
          caption="Immobiliendarlehen (Restschuld, Summe)"
          value={t.count > 0 ? t.debt : undefined}
          eur
        />
        <Field
          caption="Sonstige Verbindlichkeiten (Gesamthöhe, ohne Immobilien)"
          value={hh?.sonstigeVerbindlichkeiten}
          eur
        />
      </div>

      <Band>Eigenkapital für den nächsten Erwerb</Band>
      <div className="sa-grid3">
        <Field caption="Liquide Mittel (Bank/Spar + Wertpapiere)" value={liquide} eur />
        <Field caption="Davon für den Erwerb einsetzbar" value={hh?.ekVerfuegbar} eur />
        <Field caption="Liquiditätsreserve nach Kauf" value={reserve} eur />
      </div>
      <p className="sa-cap">
        Die Reserve bleibt nach dem Kauf verfügbar — der Erwerb zieht die Liquidität
        nicht auf null.
      </p>

      <PortfolioSummaryBand t={t} />

      <Band>Kontoverbindung</Band>
      <div className="sa-grid2">
        <Field caption="Kontoinhaber" value={sd?.kontoinhaber} />
        <Field caption="Kreditinstitut" value={sd?.kreditinstitut} />
        <Field caption="IBAN" value={sd?.iban} />
        <Field caption="BIC" value={sd?.bic} />
      </div>
    </Page>
  );
}

// Page 4 — the TARGET object of the financing request. Only a concept describes
// a target; without one the page stays a blank form. Existing properties are
// deliberately NOT shown here — they are Bestand, not Finanzierungsobjekt, and
// live on the Zusatzblatt / in der Portfolio-Zusammenfassung.
export function ObjectPage({ konzept }: { konzept?: SelbstauskunftKonzept }) {
  const o = konzept?.objekt;
  const hasKonzeptObjekt = !!o && Object.values(o).some((v) => v != null && v !== "");
  const vermietet = hasKonzeptObjekt && (o.erwarteteMiete ?? 0) > 0;
  return (
    <Page n={4}>
      <h1 className="sa-title">Angaben zum Finanzierungsobjekt</h1>
      <Band>Basisangaben</Band>
      <div className="sa-grid2">
        <Field caption="Straße, Hausnummer" value={o?.adresse ?? ""} />
        <Field caption="PLZ, Ort" value={o?.ort ?? ""} />
        <Field caption="Art der Immobilie" value={o?.objekttyp ?? ""} />
        <Field caption="Gesamte Wohnfläche (m²)" value={o?.wohnflaeche ?? ""} />
        {/* Years are labels, not amounts — never run them through the number format. */}
        <Field caption="Baujahr" value={o?.baujahr != null ? String(o.baujahr) : ""} />
        <Field caption="Anzahl der Zimmer" value={o?.zimmer ?? ""} />
      </div>

      <Band>Zusätzliche Angaben</Band>
      <div className="sa-grid2">
        <div>
          <Check label="Vermietung geplant (auch Teilvermietung)" on={vermietet} />
        </div>
        <Field
          caption="Erwartete Mieteinnahmen (monatlich)"
          value={o?.erwarteteMiete ?? ""}
          eur
        />
      </div>

      <Band>Kaufpreis</Band>
      <div className="sa-grid2">
        <Field caption="Kaufpreis" value={o?.kaufpreis ?? ""} eur />
        <div />
      </div>
    </Page>
  );
}

export function FinanceNeedPage({ konzept }: { konzept?: SelbstauskunftKonzept }) {
  const fin = konzept?.finanzierung;
  return (
    <Page n={5}>
      <h1 className="sa-title">Ihr Finanzbedarf</h1>
      {konzept && (
        <div style={{ marginBottom: 6 }}>
          <div className="sa-subhead">
            Vorhaben: {konzept.titel}
            {konzept.typLabel ? ` (${konzept.typLabel})` : ""}
          </div>
          {konzept.beschreibung && <p className="sa-legal">{konzept.beschreibung}</p>}
        </div>
      )}
      <Band>Geplantes Vorhaben</Band>
      <div className="sa-grid2">
        <Check label="Neubau" on={fin?.zweck === "neubau"} />
        <Check label="Kauf" on={fin?.zweck === "kauf"} />
        <Check label="Anschlussfinanzierung" on={fin?.zweck === "anschlussfinanzierung"} />
        <Check label="Kapitalbeschaffung" on={fin?.zweck === "kapitalbeschaffung"} />
      </div>
      <Band>Haben Sie schon eine konkrete Vorstellung von Ihrer Finanzierung?</Band>
      <div className="sa-grid3">
        <Field caption="Gesamtdarlehensbetrag" value={fin?.darlehensbetrag ?? ""} eur />
        <Field
          caption="Zinsbindung"
          value={fin?.zinsbindungJahre ? `${fin.zinsbindungJahre} Jahre` : ""}
        />
        <Field
          caption="Anfängliche Tilgung (%)"
          value={
            fin?.tilgungPct != null ? fin.tilgungPct.toLocaleString("de-DE") : ""
          }
        />
      </div>
      <div className="sa-grid2">
        <Field caption="Eingebrachtes Eigenkapital" value={fin?.eigenkapital ?? ""} eur />
        <Field caption="Weitere Wünsche" value={fin?.wuensche ?? ""} />
      </div>
    </Page>
  );
}

// ── Zusatzblatt (variable — scales to the number of properties) ───────────────
// Full detail block per property — the Fall-B table from the spec: purchase,
// value, rent, running costs, loan and the resulting monthly cash flow.
export function PropertyBlock({ p }: { p: PortfolioProperty }) {
  const loan = deriveLoan(p);
  const r = p.inputs.report;
  const vermietet = (p.inputs.kaltmiete ?? 0) > 0;
  return (
    <div style={{ marginBottom: "6mm" }}>
      <Band>Immobilienvermögen</Band>
      <div className="sa-grid3">
        <Field
          caption="Bezeichnung zur Identifikation (z.B. Straße)"
          value={p.address ?? p.name}
        />
        <Field caption="Art der Immobilie" value={r?.objekttyp ?? ""} />
        <Field caption="Gesamte Wohnfläche (m²)" value={r?.wohnflaeche ?? ""} />
        <Field caption="Kaufjahr" value={kaufjahr(p)} />
        <Field caption="Damaliger Kaufpreis" value={p.inputs.kaufpreis} eur />
        <Field caption="Geschätzter Marktwert (heute)" value={marketValue(p)} eur />
      </div>
      <div className="sa-grid3">
        <Check label="Die Immobilie ist vermietet (auch Teilvermietung)" on={vermietet} />
        <Field caption="Kaltmiete (monatlich)" value={p.inputs.kaltmiete} eur />
        <Field
          caption="Nicht umlagefähige Kosten (monatlich)"
          value={p.inputs.nichtUmlagefaehig}
          eur
        />
      </div>
      <div className="sa-subhead">Bereits bestehende Darlehen</div>
      <div className="sa-grid3">
        <Field caption="Finanzierende Bank" value={""} />
        <Field caption="Rate (monatlich)" value={loan.monthlyRate} eur />
        <Field caption="Restschuld, aktuell offener Betrag" value={loan.restschuld} eur />
        <Field
          caption="Sollzins (%)"
          value={p.inputs.zins != null ? p.inputs.zins.toLocaleString("de-DE") : ""}
        />
        <Field caption="Zinsbindung bis" value={loan.zinsbindungBis} />
        <Field caption="Cashflow vor Steuer (monatlich)" value={objectCashflow(p, loan)} eur />
      </div>
    </div>
  );
}

// Compact one-line-per-object list for larger portfolios: the Selbstauskunft
// stays sendable on its own without ballooning to one block per object.
function CompactPortfolioPage({
  properties,
  n,
  pageIndex,
  pageCount,
}: {
  properties: PortfolioProperty[];
  n: number;
  pageIndex: number;
  pageCount: number;
}) {
  return (
    <Page n={n}>
      <h1 className="sa-title">
        Zusatzblatt: Objektliste{pageCount > 1 ? ` (${pageIndex + 1}/${pageCount})` : ""}
      </h1>
      <Band>Immobilienvermögen — kompakte Übersicht</Band>
      <div className="sa-table">
        <div className="sa-table-row sa-table-head">
          <span>Objekt</span>
          <span>Marktwert</span>
          <span>Restschuld</span>
          <span>Kaltmiete mtl.</span>
          <span>Rate mtl.</span>
          <span>Zinsbindung bis</span>
        </div>
        {properties.map((p) => {
          const loan = deriveLoan(p);
          return (
            <div key={p.id} className="sa-table-row">
              <span className="sa-table-name">{p.address ?? p.name}</span>
              <span>{eur0(marketValue(p))} €</span>
              <span>{eur0(loan.restschuld)} €</span>
              <span>{eur0(p.inputs.kaltmiete)} €</span>
              <span>{eur0(loan.monthlyRate)} €</span>
              <span>{loan.zinsbindungBis || "—"}</span>
            </div>
          );
        })}
      </div>
      <p className="sa-cap" style={{ marginTop: 6 }}>
        Kennzahlen, Grafiken und Details je Objekt: siehe Investorenbroschüre.
      </p>
    </Page>
  );
}

export function ZusatzblattPages({
  properties,
  startPage,
}: {
  properties: PortfolioProperty[];
  startPage: number;
}) {
  if (properties.length === 0) return null;

  // Small Bestand → full detail blocks (2 per page). Larger Bestand → the
  // compact list; the Portfolio-Zusammenfassung on page 3 carries the totals.
  if (properties.length <= DETAIL_PROPERTY_LIMIT) {
    const groups = chunk(properties, 2);
    return (
      <>
        {groups.map((group, gi) => (
          <Page key={gi} n={startPage + gi}>
            <h1 className="sa-title">Zusatzblatt: Immobilienvermögen</h1>
            {group.map((p) => (
              <PropertyBlock key={p.id} p={p} />
            ))}
          </Page>
        ))}
      </>
    );
  }

  const groups = chunk(properties, 18);
  return (
    <>
      {groups.map((group, gi) => (
        <CompactPortfolioPage
          key={gi}
          properties={group}
          n={startPage + gi}
          pageIndex={gi}
          pageCount={groups.length}
        />
      ))}
    </>
  );
}
