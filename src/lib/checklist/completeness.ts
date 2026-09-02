// Deterministic completeness for the Unterlagen-Checkliste.
//
// The AI classifies each borrower document into a ChecklistDocType (see the
// classify route); these pure functions then decide which checklist items are
// present, which are still missing, and the overall completion %. Kept separate
// from the Selbstauskunft engine so the two vocabularies stay independent.
import {
  CHECKLIST_REQUIREMENTS,
  type ChecklistDocType,
  type ChecklistLevel,
} from "./requirements";

/** One missing requirement, surfaced as an empty tile. */
export type ChecklistMissing = {
  docType: ChecklistDocType;
  level: ChecklistLevel;
  label: string;
  hint: string;
};

export type ChecklistEvaluation = {
  /** Present requirement doc types (deduped, requirement types only). */
  present: ChecklistDocType[];
  /** Missing requirements, ordered pflicht → empfohlen → optional. */
  missing: ChecklistMissing[];
};

const LEVEL_ORDER: Record<ChecklistLevel, number> = {
  pflicht: 0,
  empfohlen: 1,
  optional: 2,
};

export type ChecklistOptions = {
  /**
   * Whether the app-generated Selbstauskunft is ready, i.e. Stammdaten and
   * Haushalt are both complete. The `source: "app"` requirement counts as
   * present when this is true (or when the user uploaded a matching doc anyway).
   */
  selbstauskunftReady: boolean;
  /**
   * Whether the app-generated Portfoliobericht is ready, i.e. the user has at
   * least one property to report on.
   */
  portfolioberichtReady: boolean;
};

/**
 * Whether a single requirement counts as present. Exported so per-bank
 * completeness (features/banks/requirements.ts) applies the same app-generated
 * rules instead of treating Selbstauskunft/Portfoliobericht as uploads.
 */
export function isRequirementPresent(
  r: (typeof CHECKLIST_REQUIREMENTS)[number],
  present: Set<ChecklistDocType>,
  opts: ChecklistOptions,
): boolean {
  if (present.has(r.docType)) return true;
  if (r.source !== "app") return false;
  return r.docType === "portfoliobericht"
    ? opts.portfolioberichtReady
    : opts.selbstauskunftReady;
}

/** Evaluate present vs. missing checklist items from the present doc types. */
export function evaluateChecklist(
  presentDocTypes: Iterable<ChecklistDocType>,
  opts: ChecklistOptions,
): ChecklistEvaluation {
  const present = new Set<ChecklistDocType>(presentDocTypes);

  const missing: ChecklistMissing[] = CHECKLIST_REQUIREMENTS.filter(
    (r) => !isRequirementPresent(r, present, opts),
  )
    .map((r) => ({ docType: r.docType, level: r.level, label: r.label, hint: r.hint }))
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  const presentRequirements = CHECKLIST_REQUIREMENTS.filter((r) =>
    isRequirementPresent(r, present, opts),
  ).map((r) => r.docType);

  return { present: presentRequirements, missing };
}

/**
 * Completion % (0–100, rounded): the share of requirements present.
 * `sonstiges` and any non-requirement type never count.
 */
export function checklistCompletion(
  presentDocTypes: Iterable<ChecklistDocType>,
  opts: ChecklistOptions,
): number {
  const present = new Set<ChecklistDocType>(presentDocTypes);
  const have = CHECKLIST_REQUIREMENTS.filter((r) => isRequirementPresent(r, present, opts)).length;
  return Math.round((have / CHECKLIST_REQUIREMENTS.length) * 100);
}
