// Deterministic completeness for the Unterlagen-Checkliste.
//
// The AI classifies each borrower document into a ChecklistDocType (see the
// classify route); these pure functions then decide which checklist items are
// present, which are still missing, and the overall completion %. Kept separate
// from the Selbstauskunft engine so the two vocabularies stay independent.
import {
  CHECKLIST_REQUIREMENTS,
  CHECKLIST_REQUIREMENT_BY_TYPE,
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

/** Evaluate present vs. missing checklist items from the present doc types. */
export function evaluateChecklist(
  presentDocTypes: Iterable<ChecklistDocType>,
): ChecklistEvaluation {
  const present = new Set<ChecklistDocType>(presentDocTypes);

  const missing: ChecklistMissing[] = CHECKLIST_REQUIREMENTS.filter(
    (r) => !present.has(r.docType),
  )
    .map((r) => ({ docType: r.docType, level: r.level, label: r.label, hint: r.hint }))
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  const presentRequirements = [...present].filter(
    (t) => CHECKLIST_REQUIREMENT_BY_TYPE[t] !== undefined,
  );

  return { present: presentRequirements, missing };
}

/**
 * Completion % (0–100, rounded): the share of requirement doc types present.
 * `sonstiges` and any non-requirement type never count.
 */
export function checklistCompletion(
  presentDocTypes: Iterable<ChecklistDocType>,
): number {
  const present = new Set<ChecklistDocType>(presentDocTypes);
  const have = CHECKLIST_REQUIREMENTS.filter((r) => present.has(r.docType)).length;
  return Math.round((have / CHECKLIST_REQUIREMENTS.length) * 100);
}
