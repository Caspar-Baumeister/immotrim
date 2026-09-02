// ─────────────────────────────────────────────────────────────────────────────
// PER-BANK DOCUMENT REQUIREMENTS
//
// The two global knowledge bases (src/lib/checklist/requirements.ts for borrower
// docs, src/lib/selbstauskunft/requirements.ts for object docs) are the DEFAULT
// list every bank gets. This file layers per-bank overrides on top, keeping the
// same philosophy: a flat, readable structure a financing advisor can edit
// WITHOUT touching surrounding code.
//
// An override either re-levels an item (pflicht/empfohlen/optional) or switches
// it off with "aus" (the bank does not ask for it). `extraHints` are free-text
// bank specifics shown on the Anfrage screen.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CHECKLIST_REQUIREMENTS,
  type ChecklistDocType,
  type ChecklistLevel,
  type ChecklistRequirement,
} from "@/lib/checklist/requirements";
import {
  REQUIREMENTS as SA_REQUIREMENTS,
  type SaDocType,
  type SaRequirement,
} from "@/lib/selbstauskunft/requirements";
import {
  isRequirementPresent,
  type ChecklistOptions,
} from "@/lib/checklist/completeness";

type LevelOverride<T extends string> = Partial<Record<T, ChecklistLevel | "aus">>;

export type BankDocProfile = {
  borrower?: LevelOverride<ChecklistDocType>;
  object?: LevelOverride<SaDocType>;
  /** Free-text bank specifics ("indikativ — vor Versand prüfen"). */
  extraHints?: string[];
};

// Per-bank tweaks. An empty profile (or a missing entry) = the default lists.
// Hints researched 07–08/2026 from the institutions' public pages — indicative.
export const BANK_DOC_PROFILES: Record<string, BankDocProfile> = {
  mbs: {},
  ing: {
    extraHints: [
      "Mindestgröße vermieteter Objekte: 30 m² — relevant für Mikro-/1-Zimmer-Apartments (Stand 07/2026).",
      "Einstieg über die Online-Finanzierungsanfrage; Unterlagen werden nach dem Erstkontakt digital nachgereicht.",
    ],
  },
  "sparda-berlin": {
    extraHints: [
      "Arbeitet als Vermittlerin mit Vergleich von 400+ Darlehensgebern; Fokus Berlin/Ostdeutschland (Stand 08/2026).",
      "Kapitalanlage auf den Baufi-Seiten nicht explizit genannt — im Erstgespräch abklären.",
    ],
  },
  commerzbank: {
    extraHints: [
      "Aktionszins gilt nur bis 60% Beleihungswert; Kapitalanlage wird explizit finanziert, empfohlen 20–30% Eigenkapital (Stand 08/2026).",
      "Unterlagen-Upload über den digitalen Dokumentenmanager nach dem Erstkontakt.",
    ],
  },
  "deutsche-bank": {
    extraHints: [
      "Eigene Rubrik für vermietete Objekte/Kapitalanlage; finanzielle Reserven für Instandhaltung/Mietausfall werden erwartet (Stand 08/2026).",
    ],
  },
  postbank: {
    extraHints: [
      "Beratung läuft über selbständige Berater der Postbank Finanzberatung AG; Kapitalanlage-Finanzierung vorab abklären (Stand 08/2026).",
      "Mindestdarlehen laut Drittquellen ca. 50.000 € — unverifiziert.",
    ],
  },
  bbbank: {
    extraHints: [
      "Ehemalige PSD Bank Berlin-Brandenburg ist hier aufgegangen — Berliner Filiale: Berlin-Friedenau, Handjerystr. 33–36 (Standortgarantie bis 2035).",
      "Ob Kapitalanlage-Objekte finanziert werden, ist nicht publiziert — vor der Anfrage telefonisch klären (Stand 08/2026).",
      "Beispielkondition gilt bei 60% Beleihung; 0,10% Zinsvorteil für Mitglieder.",
    ],
  },
  "brandenburger-bank": {
    extraHints: [
      "Geschäftsgebiet Brandenburg an der Havel und Umland — für Berliner/Potsdamer Objekte vorab Zuständigkeit klären.",
      "Publizierte Unterlagenliste: letzte 3 Gehaltsabrechnungen, 3 Steuererklärungen, Ausgabenaufstellung; Objekt: Exposé, Fotos, Kaufvertrag, Baupläne, Teilungserklärung (Stand 08/2026).",
    ],
  },
  targobank: {
    extraHints: [
      "Reine Vermittlung — Darlehensgeber ist die Oldenburgische Landesbank (OLB); Kapitalanlage explizit möglich (Stand 08/2026).",
      "Verlangt: Einkommensnachweise, Eigenkapitalbelege, Kontoauszüge, Selbstauskunft, Exposé/Kaufvertrag.",
    ],
  },
  "1822direkt": {
    extraHints: [
      "Kapitalanlage explizit beworben, Eigenkapital-Empfehlung nur 10–15% des Kaufpreises; Darlehensgeber des Eigenprodukts ist die Frankfurter Sparkasse, daneben Vermittlung von ~400 Banken (Stand 08/2026).",
    ],
  },
};

function applyOverrides<
  T extends string,
  R extends { docType: T; level: ChecklistLevel },
>(defaults: R[], overrides: LevelOverride<T> | undefined): R[] {
  if (!overrides) return defaults;
  return defaults.flatMap((r) => {
    const o = overrides[r.docType];
    if (o === undefined) return [r];
    if (o === "aus") return [];
    return [{ ...r, level: o }];
  });
}

/** Borrower documents this bank asks for (defaults + overrides). */
export function bankBorrowerRequirements(bankId: string): ChecklistRequirement[] {
  return applyOverrides(CHECKLIST_REQUIREMENTS, BANK_DOC_PROFILES[bankId]?.borrower);
}

/** Object documents this bank asks for (defaults + overrides). */
export function bankObjectRequirements(bankId: string): SaRequirement[] {
  return applyOverrides(SA_REQUIREMENTS, BANK_DOC_PROFILES[bankId]?.object);
}

export type BankMissingItem = {
  label: string;
  level: ChecklistLevel;
  scope: "borrower" | "object";
};

export type BankCompletion = {
  /** 0–100: share of this bank's requirement types present (mirrors checklistCompletion). */
  pct: number;
  /** Missing requirements, ordered pflicht → empfohlen → optional. */
  missing: BankMissingItem[];
};

const LEVEL_ORDER: Record<ChecklistLevel, number> = {
  pflicht: 0,
  empfohlen: 1,
  optional: 2,
};

/**
 * Document completeness for one bank: which of ITS requirements (borrower +
 * object) are covered by the present doc types. `presentObject` comes from the
 * selected concept's uploads; without a concept pass an empty set — object
 * requirements then all count as missing. `opts` marks the app-generated
 * borrower docs (Selbstauskunft, Portfoliobericht) as present — same rules as
 * the Unterlagen-Checkliste, so the two views never disagree.
 */
export function bankCompletion(
  bankId: string,
  presentBorrower: Iterable<ChecklistDocType>,
  presentObject: Iterable<SaDocType>,
  opts: ChecklistOptions = { selbstauskunftReady: false, portfolioberichtReady: false },
): BankCompletion {
  const borrower = bankBorrowerRequirements(bankId);
  const object = bankObjectRequirements(bankId);
  const haveBorrower = new Set(presentBorrower);
  const haveObject = new Set(presentObject);

  const missing: BankMissingItem[] = [
    ...borrower
      .filter((r) => !isRequirementPresent(r, haveBorrower, opts))
      .map((r) => ({ label: r.label, level: r.level, scope: "borrower" as const })),
    ...object
      .filter((r) => !haveObject.has(r.docType))
      .map((r) => ({ label: r.label, level: r.level, scope: "object" as const })),
  ].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  const total = borrower.length + object.length;
  const pct = total === 0 ? 100 : Math.round(((total - missing.length) / total) * 100);

  return { pct, missing };
}
