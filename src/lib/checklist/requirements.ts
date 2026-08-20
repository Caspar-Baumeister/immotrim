// ─────────────────────────────────────────────────────────────────────────────
// UNTERLAGEN-CHECKLISTE KNOWLEDGE BASE
//
// Defines the commonly-needed BORROWER/personal documents a bank asks for up
// front (see the Deutsche Bank "Unterlagen-Checkliste"): Legitimation, income,
// assets & liabilities. Object/property documents are NOT here — those live in
// the per-property Selbstauskunft flow (src/lib/selbstauskunft/requirements.ts).
//
// Like that file, this is a flat, readable list so a financing advisor can
// review and edit it WITHOUT touching surrounding code. To add or change an
// item, edit CHECKLIST_REQUIREMENTS below.
//
// Levels (mirror the Selbstauskunft ones):
//   pflicht   → required.     Missing weighs most on the completion %.
//   empfohlen → recommended.
//   optional  → nice to have.
// ─────────────────────────────────────────────────────────────────────────────

/** Controlled vocabulary of checklist doc types the AI classifies uploads into. */
export const CHECKLIST_DOC_TYPES = [
  "personalausweis",
  "gehaltsabrechnung",
  "kontoauszug",
  "steuerbescheid",
  "selbstauskunft",
  "portfoliobericht",
  "schufa",
  "einkommensteuererklaerung",
  "arbeitsvertrag",
  "darlehensvertrag",
  "depotauszug",
  "rentenbescheid",
  "lebensversicherung",
  "bausparvertrag",
  "sonstiges",
] as const;

export type ChecklistDocType = (typeof CHECKLIST_DOC_TYPES)[number];

export type ChecklistLevel = "pflicht" | "empfohlen" | "optional";

export type ChecklistRequirement = {
  docType: ChecklistDocType;
  level: ChecklistLevel;
  /** Human label shown on the tile (German). */
  label: string;
  /** Short reason / what the document proves — used as the tile hint. */
  hint: string;
  /**
   * Where the document comes from. "upload" (default): the user uploads it.
   * "app": Immotrim generates it from the profile data — the tile shows a
   * create action instead of an upload prompt, and completeness counts it once
   * the underlying profile sections are filled (see checklist/completeness.ts).
   */
  source?: "upload" | "app";
};

// The checklist. Order = display order. `sonstiges` is deliberately NOT a
// requirement (it only catches unclassifiable uploads).
export const CHECKLIST_REQUIREMENTS: ChecklistRequirement[] = [
  {
    docType: "personalausweis",
    level: "pflicht",
    label: "Personalausweis / Reisepass",
    hint: "Legitimation — Vorder- und Rückseite bzw. Datenseite.",
  },
  {
    docType: "gehaltsabrechnung",
    level: "pflicht",
    label: "Gehaltsabrechnungen",
    hint: "Letzte 2 Monate sowie die Dezemberabrechnung des Vorjahres.",
  },
  {
    docType: "kontoauszug",
    level: "pflicht",
    label: "Kontoauszüge",
    hint: "Aktuelle Kontoauszüge — Nachweis über Einnahmen und Guthaben.",
  },
  {
    docType: "steuerbescheid",
    level: "pflicht",
    label: "Einkommensteuerbescheid",
    hint: "Letzter Einkommensteuerbescheid vom Finanzamt.",
  },
  {
    docType: "selbstauskunft",
    level: "pflicht",
    label: "Private Selbstauskunft",
    hint: "Musst du nicht hochladen — Immotrim erstellt sie aus deinen Stammdaten und deiner Haushaltsrechnung.",
    source: "app",
  },
  {
    docType: "portfoliobericht",
    level: "empfohlen",
    label: "Investorenbroschüre (Portfoliobericht)",
    hint: "Musst du nicht hochladen — Immotrim erstellt sie aus deinem Immobilienportfolio, mit Kennzahlen und Grafiken.",
    source: "app",
  },
  {
    docType: "schufa",
    level: "pflicht",
    label: "SCHUFA-Auskunft",
    hint: "Aktuelle Bonitäts-/SCHUFA-Auskunft.",
  },
  {
    docType: "einkommensteuererklaerung",
    level: "empfohlen",
    label: "Einkommensteuererklärung",
    hint: "Zusätzlich nötig, wenn der Steuerbescheid älter als 2 Jahre ist.",
  },
  {
    docType: "arbeitsvertrag",
    level: "empfohlen",
    label: "Arbeitsvertrag",
    hint: "Belegt Beschäftigungsverhältnis, Position und Befristung.",
  },
  {
    docType: "darlehensvertrag",
    level: "empfohlen",
    label: "Bestehende Darlehensverträge",
    hint: "Verträge & letzte Jahreskontoauszüge laufender Ratenkredite.",
  },
  {
    docType: "depotauszug",
    level: "optional",
    label: "Depotauszüge",
    hint: "Wert von Wertpapieren, Aktien und Fonds.",
  },
  {
    docType: "rentenbescheid",
    level: "optional",
    label: "Rentenbescheid",
    hint: "Bei Rentnern/Pensionären: letzter Rentenbescheid.",
  },
  {
    docType: "lebensversicherung",
    level: "optional",
    label: "Lebensversicherung",
    hint: "Rückkaufswerte bestehender Lebensversicherungen.",
  },
  {
    docType: "bausparvertrag",
    level: "optional",
    label: "Bausparvertrag",
    hint: "Bausparguthaben als Eigenkapitalnachweis.",
  },
];

/** Quick lookup: docType → requirement (undefined for `sonstiges`). */
export const CHECKLIST_REQUIREMENT_BY_TYPE: Partial<
  Record<ChecklistDocType, ChecklistRequirement>
> = Object.fromEntries(CHECKLIST_REQUIREMENTS.map((r) => [r.docType, r]));

/** Human labels for every doc type (incl. `sonstiges`), for UI chips. */
export const CHECKLIST_DOC_TYPE_LABELS: Record<ChecklistDocType, string> = {
  personalausweis: "Personalausweis / Reisepass",
  gehaltsabrechnung: "Gehaltsabrechnungen",
  kontoauszug: "Kontoauszüge",
  steuerbescheid: "Einkommensteuerbescheid",
  selbstauskunft: "Private Selbstauskunft",
  portfoliobericht: "Investorenbroschüre (Portfoliobericht)",
  schufa: "SCHUFA-Auskunft",
  einkommensteuererklaerung: "Einkommensteuererklärung",
  arbeitsvertrag: "Arbeitsvertrag",
  darlehensvertrag: "Bestehende Darlehensverträge",
  depotauszug: "Depotauszüge",
  rentenbescheid: "Rentenbescheid",
  lebensversicherung: "Lebensversicherung",
  bausparvertrag: "Bausparvertrag",
  sonstiges: "Sonstiges",
};

/** Narrow an arbitrary string to a known checklist doc type (fallback: sonstiges). */
export function normaliseChecklistDocType(raw: string | null | undefined): ChecklistDocType {
  const v = (raw ?? "").trim().toLowerCase() as ChecklistDocType;
  return (CHECKLIST_DOC_TYPES as readonly string[]).includes(v) ? v : "sonstiges";
}
