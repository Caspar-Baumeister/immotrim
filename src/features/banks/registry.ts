// ─────────────────────────────────────────────────────────────────────────────
// BANK REGISTRY
//
// The "Banken" section renders one card per entry here (grouped by `kind`), and
// each bank can have its own Selbstauskunft form pre-filled from the user's
// portfolio (see documents.tsx — banks without a form still get the Anfrage
// flow). Adding a bank = add an entry here; a custom document component is
// optional. This module is import-safe from both server and client (pure data).
//
// Contact channels: many institutions publish NO inquiry email — only a contact
// form. `email` is set ONLY where a real address is published (never invented);
// otherwise `contactUrl` points at the official form/appointment page.
// ─────────────────────────────────────────────────────────────────────────────

import type { BankFinancingCriteria } from "@/features/financing/calculations";

export type BankKind = "bank" | "vermittler";

export type Bank = {
  /** URL-safe id; also the segment in /selbstauskunft/document/[bankId]/… */
  id: string;
  /** Direct/regional bank vs. Vermittler (broker comparing many banks). */
  kind: BankKind;
  /** Full legal name shown on the card. */
  name: string;
  /** Short label / abbreviation. */
  shortName: string;
  /** City, used on the form's Darlehensvermittlung section (e.g. "MBS in Potsdam"). */
  city: string;
  /** Optional logo path under /public. */
  logo?: string;
  /** Published contact address for inquiries — only if the institution publishes one. */
  email?: string;
  /** Official contact-form / financing-inquiry page (for form-first institutions). */
  contactUrl?: string;
  /** Public website. */
  website?: string;
  /** Lending criteria used for the fit score + displayed conditions. */
  conditions?: BankFinancingCriteria;
};

// Ids that have a bank-specific Selbstauskunft document component wired up in
// documents.tsx. Kept here (pure data) so client code can check availability
// without importing the print components.
export const BANK_IDS_WITH_DOCUMENT = ["mbs"] as const;

// Pseudo id for the bank-neutral "Private Selbstauskunft" Immotrim generates for
// the user (Dashboard/Checkliste). Not a bank: never in BANKS or
// BANK_IDS_WITH_DOCUMENT, but registered in documents.tsx and accepted by the
// /api/selbstauskunft route. Must never collide with a real bank id.
export const GENERIC_SELBSTAUSKUNFT_ID = "immotrim";

export function hasBankDocument(bankId: string): boolean {
  return (BANK_IDS_WITH_DOCUMENT as readonly string[]).includes(bankId);
}

// NOTE: conditions/email/contactUrl below are indicative values researched from
// the institutions' public pages (Stand 07/2026) — a starting point for contact,
// NOT verified offers. Verify current terms and the right recipient before
// relying on them.
export const BANKS: Bank[] = [
  // ── Banken (direkt/regional) ───────────────────────────────────────────────
  {
    id: "mbs",
    kind: "bank",
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
  {
    id: "berliner-sparkasse",
    kind: "bank",
    name: "Berliner Sparkasse",
    shortName: "Berliner Sparkasse",
    city: "Berlin",
    website: "https://www.berliner-sparkasse.de",
    // Kein veröffentlichtes Anfrage-Postfach — Kontakt über Terminanfrage/Formular.
    contactUrl: "https://www.berliner-sparkasse.de/de/home/toolbar/kontakt.html",
  },
  {
    id: "berliner-volksbank",
    kind: "bank",
    name: "Berliner Volksbank eG",
    shortName: "Berliner Volksbank",
    city: "Berlin",
    website: "https://www.berliner-volksbank.de",
    contactUrl:
      "https://www.berliner-volksbank.de/privatkunden/immobilien/baufinanzierung.html",
  },
  {
    id: "ing",
    kind: "bank",
    name: "ING-DiBa AG",
    shortName: "ING",
    city: "Frankfurt am Main",
    website: "https://www.ing.de",
    // Kapitalanlage-Finanzierungsanfrage (formularbasiert, kein E-Mail-Einstieg).
    contactUrl: "https://www.ing.de/baufinanzierung/kapitalanlage/",
  },
  {
    id: "dkb",
    kind: "bank",
    name: "Deutsche Kreditbank AG",
    shortName: "DKB",
    city: "Berlin",
    website: "https://www.dkb.de",
    contactUrl: "https://www.dkb.de/privatkunden/baufinanzierung",
  },
  // ── Vermittler (ein Antrag erreicht viele Banken) ──────────────────────────
  {
    id: "interhyp",
    kind: "vermittler",
    name: "Interhyp AG",
    shortName: "Interhyp",
    city: "München",
    email: "info@interhyp.de",
    website: "https://www.interhyp.de",
    contactUrl: "https://www.interhyp.de/termin-vereinbaren",
    conditions: {
      zinsAb: 3.75, // 10J eff., <70% Beleihung — indikativ 07/2026
    },
  },
  {
    id: "drklein",
    kind: "vermittler",
    name: "Dr. Klein Privatkunden AG",
    shortName: "Dr. Klein",
    city: "Lübeck",
    website: "https://www.drklein.de",
    contactUrl: "https://www.drklein.de/finanzierungsanfrage.html",
    conditions: {
      zinsAb: 3.71, // 10J eff., ~73% Beleihung — indikativ 07/2026
    },
  },
  {
    id: "huettig-rompf",
    kind: "vermittler",
    name: "Hüttig & Rompf AG",
    shortName: "Hüttig & Rompf",
    city: "Berlin",
    email: "info@huettig-rompf.de",
    website: "https://www.huettig-rompf.de",
    contactUrl: "https://www.huettig-rompf.de/baufinanzierung/filialen/berlin",
  },
  {
    id: "baufipool24",
    kind: "vermittler",
    name: "Baufinanzierungspool24 GmbH & Co. KG",
    shortName: "Baufipool24",
    city: "Karlsruhe",
    website: "https://baufinanzierungspool24.de",
    contactUrl: "https://baufinanzierungspool24.de/microappartments",
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
