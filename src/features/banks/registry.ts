// ─────────────────────────────────────────────────────────────────────────────
// BANK REGISTRY
//
// The dashboard "Banken" section renders one card per entry here, and each bank
// can print its own Selbstauskunft (self-report) form pre-filled from the user's
// portfolio. Adding a bank = add an entry here + a document component wired up in
// `documents.tsx`. This module is import-safe from both server and client (pure
// data — no React components).
// ─────────────────────────────────────────────────────────────────────────────

import type { BankFinancingCriteria } from "@/features/financing/calculations";

export type Bank = {
  /** URL-safe id; also the segment in /selbstauskunft/document/[bankId]/… */
  id: string;
  /** Full legal name shown on the card. */
  name: string;
  /** Short label / abbreviation. */
  shortName: string;
  /** City, used on the form's Darlehensvermittlung section (e.g. "MBS in Potsdam"). */
  city: string;
  /** Optional logo path under /public. */
  logo?: string;
  /** Contact address for the financing department. */
  email?: string;
  /** Public website. */
  website?: string;
  /** Lending criteria used for the fit score + displayed conditions. */
  conditions?: BankFinancingCriteria;
};

// NOTE: conditions/email below are indicative example values for the estimate and
// contact starting point — verify current terms with the bank before relying on them.
export const BANKS: Bank[] = [
  {
    id: "mbs",
    name: "Mittelbrandenburgische Sparkasse",
    shortName: "MBS",
    city: "Potsdam",
    email: "info@mbs.de",
    website: "https://www.mbs.de",
    conditions: {
      zinsAb: 3.6,
      maxLtv: 90,
      minEinkommenMonatlich: 1500,
    },
  },
];

const BANK_BY_ID: Record<string, Bank> = Object.fromEntries(
  BANKS.map((b) => [b.id, b])
);

export function getBank(id: string): Bank | undefined {
  return BANK_BY_ID[id];
}

export function isValidBankId(id: string): boolean {
  return id in BANK_BY_ID;
}
