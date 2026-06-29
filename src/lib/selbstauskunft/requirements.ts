// ─────────────────────────────────────────────────────────────────────────────
// Selbstauskunft KNOWLEDGE BASE
//
// This file defines which documents a clean, bank-ready Selbstauskunft needs per
// property, and how important each one is. It drives the per-property traffic
// light (red/orange/yellow/green) and the "you probably still need X" hints.
//
// It is intentionally a flat, readable list so that financing advisors /
// Bankberater can review and improve it later WITHOUT touching the surrounding
// code. To add or change a requirement, edit the REQUIREMENTS array below.
//
// Levels:
//   pflicht   → required. Missing one makes the property RED (blocks the report).
//   empfohlen → recommended ("would be good"). Missing makes it ORANGE.
//   optional  → nice to have. Missing makes it YELLOW (minor).
// ─────────────────────────────────────────────────────────────────────────────

/** Controlled vocabulary of document types the AI classifies uploads into. */
export const SA_DOC_TYPES = [
  "kaufvertrag",
  "mietvertrag",
  "finanzierungsvertrag",
  "grundbuchauszug",
  "wohngeldabrechnung",
  "energieausweis",
  "wertgutachten",
  "teilungserklaerung",
  "sonstiges",
] as const;

export type SaDocType = (typeof SA_DOC_TYPES)[number];

export type SaLevel = "pflicht" | "empfohlen" | "optional";

export type SaRequirement = {
  docType: SaDocType;
  level: SaLevel;
  /** Human label shown in the UI (German). */
  label: string;
  /** Short reason / what the document proves — also used as the upload hint. */
  hint: string;
};

// The checklist. Order = display order. `sonstiges` is deliberately NOT a
// requirement (it only catches unclassifiable uploads).
export const REQUIREMENTS: SaRequirement[] = [
  {
    docType: "kaufvertrag",
    level: "pflicht",
    label: "Kaufvertrag",
    hint: "Belegt Kaufpreis, Kaufdatum und Eigentum am Objekt.",
  },
  {
    docType: "finanzierungsvertrag",
    level: "pflicht",
    label: "Darlehens-/Finanzierungsvertrag",
    hint: "Zeigt Darlehenssumme, Zins, Tilgung und Restschuld.",
  },
  {
    docType: "mietvertrag",
    level: "pflicht",
    label: "Mietvertrag",
    hint: "Weist die aktuellen Mieteinnahmen nach.",
  },
  {
    docType: "grundbuchauszug",
    level: "empfohlen",
    label: "Grundbuchauszug",
    hint: "Aktueller Nachweis von Eigentum und eingetragenen Lasten.",
  },
  {
    docType: "wohngeldabrechnung",
    level: "empfohlen",
    label: "Wohngeld-/Hausgeldabrechnung",
    hint: "Belegt laufende Kosten, nicht umlagefähige Kosten und Rücklagen.",
  },
  {
    docType: "energieausweis",
    level: "optional",
    label: "Energieausweis",
    hint: "Hilfreich für die Objekt- und Wertbeurteilung.",
  },
  {
    docType: "wertgutachten",
    level: "optional",
    label: "Wertgutachten",
    hint: "Untermauert den aktuellen Marktwert des Objekts.",
  },
  {
    docType: "teilungserklaerung",
    level: "optional",
    label: "Teilungserklärung",
    hint: "Bei Eigentumswohnungen relevant (Aufteilung & Sondereigentum).",
  },
];

/** Quick lookup: docType → requirement (undefined for `sonstiges`). */
export const REQUIREMENT_BY_TYPE: Partial<Record<SaDocType, SaRequirement>> =
  Object.fromEntries(REQUIREMENTS.map((r) => [r.docType, r]));

/** Human labels for every doc type (incl. `sonstiges`), for UI chips. */
export const DOC_TYPE_LABELS: Record<SaDocType, string> = {
  kaufvertrag: "Kaufvertrag",
  mietvertrag: "Mietvertrag",
  finanzierungsvertrag: "Finanzierungsvertrag",
  grundbuchauszug: "Grundbuchauszug",
  wohngeldabrechnung: "Wohngeldabrechnung",
  energieausweis: "Energieausweis",
  wertgutachten: "Wertgutachten",
  teilungserklaerung: "Teilungserklärung",
  sonstiges: "Sonstiges",
};
