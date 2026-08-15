"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SELBSTAUSKUNFT FORM PAGES
//
// The bank-neutral building blocks of the Selbstauskunft print documents
// (styled by mbs.css — the `sa-*` classes are generic A4 form styles). Bank
// documents (features/banks/mbs/…) and the generic Immotrim variant compose
// these pages and add their own bank-specific pages (e.g. the MBS Vollmacht).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { calculateMortgage } from "@/features/mortgage/calculations";
import type { PortfolioProperty } from "@/features/portfolio/calculations";
import type { SelbstauskunftKonzept } from "../types";
import type { Stammdaten, Haushalt, Strategie } from "@/features/profile/types";

// ── formatting helpers ───────────────────────────────────────────────────────
const nf0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const eur0 = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? "" : nf0.format(Math.round(v));

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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
  strategie,
  hh,
  imageDataUrl,
}: {
  investorName: string;
  sd?: Stammdaten;
  hh?: Haushalt;
  strategie?: Strategie;
  imageDataUrl?: string;
}) {
  const hasStrategy = !!(strategie?.strategieText || strategie?.ueberMich);
  return (
    <Page n={1}>
      <h1 className="sa-title">Ihre persönlichen Daten</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
        {imageDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageDataUrl}
            alt=""
            style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }}
          />
        )}
        <p className="sa-cap">Antragsteller: {investorName}</p>
      </div>
      {hasStrategy && (
        <div style={{ marginBottom: 8 }}>
          {strategie?.ueberMich && (
            <>
              <div className="sa-subhead">Über mich</div>
              <p className="sa-legal">{strategie.ueberMich}</p>
            </>
          )}
          {strategie?.strategieText && (
            <>
              <div className="sa-subhead">Investmentstrategie</div>
              <p className="sa-legal">{strategie.strategieText}</p>
            </>
          )}
        </div>
      )}
      <div className="sa-cols">
        <ApplicantColumn n={1} sd={sd} hh={hh} />
        <ApplicantColumn n={2} />
      </div>
    </Page>
  );
}

export function FinancesPage({
  properties,
  sd,
  hh,
}: {
  properties: PortfolioProperty[];
  sd?: Stammdaten;
  hh?: Haushalt;
}) {
  const count = properties.length;
  const totalValue = properties.reduce((s, p) => s + marketValue(p), 0);
  const totalDebt = properties.reduce((s, p) => s + deriveLoan(p).restschuld, 0);
  return (
    <Page n={2}>
      <Band>Kinder</Band>
      <div className="sa-grid3">
        <Field caption="Anzahl Ihrer Kinder" value={sd?.anzahlKinder} />
        <Field caption="Name Kind 1" />
        <Field caption="Name Kind 2" />
      </div>

      <h2 className="sa-title" style={{ fontSize: 10, margin: "8mm 0 4mm" }}>
        Ihre finanzielle Situation
      </h2>
      <Band>Vermögen, Einnahmen, Ausgaben, Verbindlichkeiten</Band>
      <div className="sa-grid2">
        <Field caption="Bank- und Sparguthaben" value={hh?.bankSparguthaben} eur />
        <Field caption="Mietausgaben (monatlich)" value={hh?.mietausgaben} eur />
        <Field caption="Wertpapiere / Aktien" value={hh?.wertpapiere} eur />
        <Field caption="Private Krankenversicherung (monatlich)" value={hh?.krankenversicherung} eur />
        <Field caption="Lebens- / Rentenversicherung" value={hh?.versicherungen} eur />
        <Field caption="Ratenkredit (Rate mtl.)" value={hh?.ratenkredite} eur />
        <Field caption="Sonstiges Vermögen" value={hh?.sonstigesVermoegen} eur />
        <Field caption="Sonstige Verbindlichkeiten (Gesamthöhe)" value={hh?.sonstigeVerbindlichkeiten} eur />
      </div>

      <Band>Weiteres Immobilienvermögen</Band>
      <div className="sa-grid3">
        <Field caption="Anzahl der Immobilien" value={String(count)} />
        <Field caption="Geschätzter Wert aller Immobilien" value={totalValue} eur />
        <Field
          caption="Gesamthöhe ausstehender Darlehen"
          value={totalDebt}
          eur
        />
      </div>
      <p className="sa-cap">Siehe Zusatzblatt für Immobilienvermögen.</p>

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

// With a concept, the page describes the TARGET object of the financing request;
// without one it falls back to the first portfolio property (legacy behavior).
export function ObjectPage({
  p,
  konzept,
}: {
  p: PortfolioProperty | undefined;
  konzept?: SelbstauskunftKonzept;
}) {
  const o = konzept?.objekt;
  const hasKonzeptObjekt = !!o && Object.values(o).some((v) => v != null && v !== "");
  if (hasKonzeptObjekt) {
    const vermietet = (o.erwarteteMiete ?? 0) > 0;
    return (
      <Page n={3}>
        <h1 className="sa-title">Angaben zum Finanzierungsobjekt</h1>
        <Band>Basisangaben</Band>
        <div className="sa-grid2">
          <Field caption="Straße, Hausnummer" value={o.adresse ?? ""} />
          <Field caption="PLZ, Ort" value={o.ort ?? ""} />
          <Field caption="Art der Immobilie" value={o.objekttyp ?? ""} />
          <Field caption="Gesamte Wohnfläche (m²)" value={o.wohnflaeche ?? ""} />
          <Field caption="Baujahr" value={o.baujahr ?? ""} />
          <Field caption="Anzahl der Zimmer" value={o.zimmer ?? ""} />
        </div>

        <Band>Zusätzliche Angaben</Band>
        <div className="sa-grid2">
          <div>
            <Check label="Vermietung geplant (auch Teilvermietung)" on={vermietet} />
          </div>
          <Field
            caption="Erwartete Mieteinnahmen (monatlich)"
            value={o.erwarteteMiete ?? ""}
            eur
          />
        </div>

        <Band>Kaufpreis</Band>
        <div className="sa-grid2">
          <Field caption="Kaufpreis" value={o.kaufpreis ?? ""} eur />
          <div />
        </div>
      </Page>
    );
  }

  const r = p?.inputs.report;
  const loan = p ? deriveLoan(p) : null;
  const vermietet = (p?.inputs.kaltmiete ?? 0) > 0;
  return (
    <Page n={3}>
      <h1 className="sa-title">Angaben zum Finanzierungsobjekt</h1>
      <Band>Basisangaben</Band>
      <div className="sa-grid2">
        <Field caption="Straße, Hausnummer" value={p?.address ?? p?.name ?? ""} />
        <Field caption="PLZ, Ort" value={r?.stadt ?? ""} />
        <Field caption="Art der Immobilie" value={r?.objekttyp ?? ""} />
        <Field caption="Gesamte Wohnfläche (m²)" value={r?.wohnflaeche ?? ""} />
        <Field caption="Baujahr" value={r?.baujahr ?? ""} />
        <Field caption="Anzahl der Wohneinheiten" value={r?.zimmer ?? ""} />
      </div>

      <Band>Zusätzliche Angaben</Band>
      <div className="sa-grid2">
        <div>
          <Check label="Die Immobilie ist vermietet (auch Teilvermietung)" on={vermietet} />
        </div>
        <Field
          caption="Mieteinnahmen (monatlich)"
          value={p ? p.inputs.kaltmiete : ""}
          eur
        />
      </div>

      <Band>Marktwert / Bereits bestehende Darlehen</Band>
      <div className="sa-grid2">
        <Field caption="Marktwert" value={p ? marketValue(p) : ""} eur />
        <div />
      </div>
      <div className="sa-subhead">Immobiliendarlehen</div>
      <div className="sa-grid3">
        <Field caption="Rate (mtl.)" value={loan?.monthlyRate ?? ""} eur />
        <Field caption="Restschuld, aktuell offener Betrag" value={loan?.restschuld ?? ""} eur />
        <Field caption="Zinsbindung bis" value={loan?.zinsbindungBis ?? ""} />
      </div>
    </Page>
  );
}

export function FinanceNeedPage({ konzept }: { konzept?: SelbstauskunftKonzept }) {
  const fin = konzept?.finanzierung;
  return (
    <Page n={4}>
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
export function PropertyBlock({ p }: { p: PortfolioProperty }) {
  const loan = deriveLoan(p);
  const vermietet = (p.inputs.kaltmiete ?? 0) > 0;
  return (
    <div style={{ marginBottom: "6mm" }}>
      <Band>Immobilienvermögen</Band>
      <div className="sa-grid3">
        <Field
          caption="Bezeichnung zur Identifikation (z.B. Straße)"
          value={p.address ?? p.name}
        />
        <Field caption="Wert der Immobilie" value={marketValue(p)} eur />
        <Field
          caption="Gesamte Wohnfläche (m²)"
          value={p.inputs.report?.wohnflaeche ?? ""}
        />
      </div>
      <div className="sa-grid2">
        <Check label="Die Immobilie ist vermietet (auch Teilvermietung)" on={vermietet} />
        <Field caption="Mieteinnahmen (monatlich)" value={p.inputs.kaltmiete} eur />
      </div>
      <div className="sa-subhead">Bereits bestehende Darlehen</div>
      <div className="sa-grid3">
        <Field caption="Grundschuld / Rate (mtl.)" value={loan.monthlyRate} eur />
        <Field caption="Restschuld, aktuell offener Betrag" value={loan.restschuld} eur />
        <Field caption="Zinsbindung bis" value={loan.zinsbindungBis} />
      </div>
    </div>
  );
}

export function ZusatzblattPages({
  properties,
  startPage,
}: {
  properties: PortfolioProperty[];
  startPage: number;
}) {
  const groups = chunk(properties, 3);
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
