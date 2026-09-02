"use client";

import type { SelbstauskunftPayload } from "../types";
import {
  HouseholdPage,
  hasObjektData,
  ObjectPage,
  PersonalPage,
  useReportReady,
  WealthPage,
  ZusatzblattPages,
} from "./pages";

// ── document ─────────────────────────────────────────────────────────────────
// The generic "Private Selbstauskunft" Immotrim generates for the user — same
// form language as the bank variants, addressed to no particular bank. Sober
// and numbers-only by design: the investor story lives in the brochure, and the
// Finanzierungsobjekt page only exists when the request actually carries a
// target object (the object details otherwise travel separately with the
// Anfrage). No signature page — this is an information document, not a
// contract form.
export function ImmotrimSelbstauskunftDocument({
  payload,
}: {
  payload: SelbstauskunftPayload;
}) {
  const { properties, investorName, profile, objekt } = payload;
  const sd = profile?.stammdaten;
  const hh = profile?.haushalt;

  useReportReady();

  const showObjekt = hasObjektData(objekt?.data);

  return (
    <div className="sa-root">
      <PersonalPage investorName={investorName} sd={sd} hh={hh} n={1} />
      <HouseholdPage properties={properties} sd={sd} hh={hh} n={2} />
      <WealthPage properties={properties} sd={sd} hh={hh} n={3} />
      {showObjekt && <ObjectPage data={objekt?.data} n={4} />}
      <ZusatzblattPages properties={properties} startPage={showObjekt ? 5 : 4} />
    </div>
  );
}
