"use client";

import type { SelbstauskunftPayload } from "../types";
import { getBank } from "../registry";
import {
  Band,
  Field,
  HouseholdPage,
  ObjectPage,
  Page,
  PersonalPage,
  useReportReady,
  WealthPage,
  ZusatzblattPages,
} from "../selbstauskunft/pages";

// The MBS-specific page: Vermittlungsauftrag/Vollmacht + Auskunftei-Hinweise.
function DeclarationPage({ bankLabel }: { bankLabel: string }) {
  return (
    <Page n={5}>
      <h1 className="sa-title">Erklärung der Darlehensnehmer, Einwilligungserklärungen</h1>
      <Band>I. Darlehensvermittlung und Anschlussbetreuung</Band>
      <div className="sa-legal">
        <p>
          1. Hiermit beauftrage/n ich/wir die <strong>{bankLabel}</strong> mit der
          Vermittlung eines Darlehens zur Immobilienfinanzierung sowie damit in
          Zusammenhang stehender Finanzdienstleistungen und Betreuung während der
          Auszahlung dieses Darlehens.
        </p>
        <p>
          2. Ich/Wir bevollmächtige/n die <strong>{bankLabel}</strong> alle hierfür
          erforderlichen Unterlagen (Darlehensantrag, Objekt- und Bonitätsunterlagen
          etc.) an einen zur Finanzierung vorgesehenen Darlehensgeber weiterzuleiten.
        </p>
        <p>
          3. Hiermit bevollmächtige/n ich/wir die <strong>{bankLabel}</strong> ein
          Darlehensvertragsangebot des finanzierenden Darlehensgebers zur Weiterleitung
          an mich/uns entgegenzunehmen.
        </p>
        <p>
          Ich/Wir versichere/versichern, alle vorstehenden Angaben nach bestem Wissen,
          vollständig und wahrheitsgemäß gemacht zu haben. Falsche Angaben können
          gegebenenfalls zu einer Vertragsaufhebung führen.
        </p>
      </div>
      <Band>II. Datenschutzrechtliche Hinweise bezüglich Auskunfteien</Band>
      <div className="sa-legal">
        <p className="sa-muted">
          Datenübermittlung an die SCHUFA und Befreiung vom Bankgeheimnis; Datenübermittlung
          an Creditreform für Freiberufler und Selbständige. Mit meiner/unserer Unterschrift
          stimme/n ich/wir den obigen Versicherungen zu. Die Datenschutzhinweise der
          Auskunfteien haben wir zur Kenntnis genommen.
        </p>
      </div>
      <div className="sa-grid2" style={{ marginTop: "16mm" }}>
        <Field caption="Ort, Datum" />
        <Field caption="Unterschrift" />
      </div>
    </Page>
  );
}

// ── document ─────────────────────────────────────────────────────────────────
export function MbsSelbstauskunftDocument({
  payload,
}: {
  payload: SelbstauskunftPayload;
}) {
  const { properties, investorName, bankId, profile, objekt } = payload;
  const bank = getBank(bankId);
  const bankLabel = bank ? `${bank.shortName} in ${bank.city}` : "MBS in Potsdam";
  const sd = profile?.stammdaten;
  const hh = profile?.haushalt;

  useReportReady();

  // Fixed pages are 1..5; the Zusatzblatt starts at page 6.
  const ZUSATZ_START = 6;

  return (
    <div className="sa-root">
      <PersonalPage investorName={investorName} sd={sd} hh={hh} n={1} />
      <HouseholdPage properties={properties} sd={sd} hh={hh} n={2} />
      <WealthPage properties={properties} sd={sd} hh={hh} n={3} />
      {/* The bank form keeps the object page even without an Objekt (blank,
          hand-fillable) — it is part of the MBS form structure. */}
      <ObjectPage data={objekt?.data} n={4} />
      <DeclarationPage bankLabel={bankLabel} />
      <ZusatzblattPages properties={properties} startPage={ZUSATZ_START} />
    </div>
  );
}
