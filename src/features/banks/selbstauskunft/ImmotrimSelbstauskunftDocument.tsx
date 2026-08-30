"use client";

import type { SelbstauskunftPayload } from "../types";
import {
  Band,
  Field,
  FinanceNeedPage,
  HouseholdPage,
  ObjectPage,
  Page,
  PersonalPage,
  useReportReady,
  WealthPage,
  ZusatzblattPages,
} from "./pages";

// Bank-neutral closing page: only the truthfulness declaration + signature —
// no Vermittlungsauftrag, no Auskunftei consent, no bank name.
function SignaturePage() {
  return (
    <Page n={6}>
      <h1 className="sa-title">Erklärung</h1>
      <Band>Versicherung der Richtigkeit</Band>
      <div className="sa-legal">
        <p>
          Ich/Wir versichere/versichern, alle vorstehenden Angaben nach bestem Wissen,
          vollständig und wahrheitsgemäß gemacht zu haben.
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
// The generic "Private Selbstauskunft" Immotrim generates for the user — same
// form as the bank variants, addressed to no particular bank. Valid with an
// empty portfolio (the property sections then render as a blank form). Sober
// and numbers-only by design: the investor story lives in the brochure.
export function ImmotrimSelbstauskunftDocument({
  payload,
}: {
  payload: SelbstauskunftPayload;
}) {
  const { properties, investorName, profile, konzept } = payload;
  const sd = profile?.stammdaten;
  const hh = profile?.haushalt;

  useReportReady();

  // Fixed pages are 1..6; the Zusatzblatt starts at page 7 (same as the bank forms).
  const ZUSATZ_START = 7;

  return (
    <div className="sa-root">
      <PersonalPage investorName={investorName} sd={sd} hh={hh} />
      <HouseholdPage properties={properties} sd={sd} hh={hh} />
      <WealthPage properties={properties} sd={sd} hh={hh} />
      <ObjectPage konzept={konzept} />
      <FinanceNeedPage konzept={konzept} />
      <SignaturePage />
      <ZusatzblattPages properties={properties} startPage={ZUSATZ_START} />
    </div>
  );
}
