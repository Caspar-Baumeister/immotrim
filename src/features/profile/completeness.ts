// ─────────────────────────────────────────────────────────────────────────────
// PROFILE COMPLETENESS
//
// Turns the profile sections (+ the property portfolio) into 0–100 completion
// percentages that drive the sidebar bars and section headers. Deterministic and
// pure so the same number renders server-side (sidebar) and client-side (page).
// ─────────────────────────────────────────────────────────────────────────────

import type { Stammdaten, Haushalt, Strategie } from "./types";
import {
  STAMMDATEN_FIELDS,
  HAUSHALT_FIELDS,
  STRATEGIE_FIELDS,
  isFilled,
  type FieldReq,
} from "./requirements";
import { REQUIREMENTS } from "@/lib/selbstauskunft/requirements";
import { presentFromMeta, type SaMeta } from "@/lib/selbstauskunft/completeness";
import { checklistCompletion } from "@/lib/checklist/completeness";
import {
  normaliseChecklistDocType,
  type ChecklistDocType,
} from "@/lib/checklist/requirements";

/** Completion % (0–100, rounded) of a section from its weighted filled fields. */
function fieldCompletion<T>(data: T, fields: FieldReq<T>[]): number {
  const total = fields.reduce((s, f) => s + (f.weight ?? 1), 0);
  if (total === 0) return 0;
  const filled = fields.reduce(
    (s, f) => s + (isFilled(data[f.key]) ? f.weight ?? 1 : 0),
    0,
  );
  return Math.round((filled / total) * 100);
}

export function stammdatenCompletion(data: Stammdaten): number {
  return fieldCompletion(data, STAMMDATEN_FIELDS);
}

export function haushaltCompletion(data: Haushalt): number {
  return fieldCompletion(data, HAUSHALT_FIELDS);
}

export function strategieCompletion(data: Strategie): number {
  return fieldCompletion(data, STRATEGIE_FIELDS);
}

/**
 * Every document type that counts toward a property being complete — all
 * requirements (pflicht + empfohlen + optional), i.e. exactly the documents the
 * property tile lists as present or still missing. `sonstiges` is not a
 * requirement, so it never counts.
 */
const REQUIREMENT_DOC_TYPES = REQUIREMENTS.map((r) => r.docType);

/**
 * Completeness (0–100) of a single property: the share of required documents
 * present. Counts the same documents the tile shows as missing, so the bar and
 * the document list can never disagree.
 */
export function propertyCompletion(meta: SaMeta | undefined | null): number {
  const present = new Set(presentFromMeta(meta));
  const have = REQUIREMENT_DOC_TYPES.filter((t) => present.has(t)).length;
  return Math.round((have / REQUIREMENT_DOC_TYPES.length) * 100);
}

/**
 * How "bank-ready" the property portfolio is: the per-property completions
 * averaged across the portfolio — a summary of the individual bars. Returns 0
 * with no properties; callers that render a bar should hide it entirely in that
 * case rather than show an (empty) 0% one.
 */
export function immobilienCompletion(
  properties: { selbstauskunft?: SaMeta }[],
): number {
  if (properties.length === 0) return 0;
  const avg =
    properties.reduce((s, p) => s + propertyCompletion(p.selbstauskunft), 0) /
    properties.length;
  return Math.round(avg);
}

/** Completion for each Unterlagen section — feeds the sidebar bars. */
export type ProfileCompletion = {
  haushalt: number;
  stammdaten: number;
  immobilien: number;
  strategie: number;
  checklist: number;
};

export function profileCompletion(input: {
  stammdaten: Stammdaten;
  haushalt: Haushalt;
  strategie: Strategie;
  properties: { selbstauskunft?: SaMeta }[];
  /** doc_type of every borrower/personal document (raw; null/unknown ignored). */
  checklistDocTypes: (string | null)[];
}): ProfileCompletion {
  const checklistTypes = input.checklistDocTypes
    .filter((t): t is string => !!t)
    .map(normaliseChecklistDocType) as ChecklistDocType[];
  return {
    haushalt: haushaltCompletion(input.haushalt),
    stammdaten: stammdatenCompletion(input.stammdaten),
    immobilien: immobilienCompletion(input.properties),
    strategie: strategieCompletion(input.strategie),
    checklist: checklistCompletion(checklistTypes),
  };
}
