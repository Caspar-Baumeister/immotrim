// Deterministic completeness engine for the Selbstauskunft funnel.
//
// Hybrid model: the AI classifies each uploaded document into a SaDocType (see
// the sort route); these pure functions then decide the traffic-light colour and
// the concrete "still missing" hints from the knowledge base in requirements.ts.
// Keeping this deterministic makes the per-property status predictable and easy
// for financing advisors to reason about.
import {
  REQUIREMENTS,
  REQUIREMENT_BY_TYPE,
  type SaDocType,
  type SaLevel,
} from "./requirements";

/** Traffic-light status for one property. */
export type SaStatus = "green" | "red" | "orange" | "yellow";

/** One missing requirement, surfaced under the tile. */
export type SaMissing = {
  docType: SaDocType;
  level: SaLevel;
  label: string;
  hint: string;
};

export type SaEvaluation = {
  status: SaStatus;
  /** Present requirement doc types (deduped, requirement types only). */
  present: SaDocType[];
  /** Missing requirements, ordered pflicht → empfohlen → optional. */
  missing: SaMissing[];
  /** True when every required (pflicht) document is present. */
  reportReady: boolean;
};

/**
 * Metadata persisted on `property.inputs.selbstauskunft`. Migration-free: the
 * inputs column is jsonb, so we attach the AI doc classification + a cached
 * evaluation here instead of adding a column to `documents`.
 */
export type SaMeta = {
  /** documentId → classified type. The source of truth for what's present. */
  docTypes: Record<string, SaDocType>;
  /** Requirement doc types the user marked as manually provided (no upload). */
  manual?: SaDocType[];
  /** ISO timestamp of the last sort/classification. */
  updatedAt: string;
};

const LEVEL_ORDER: Record<SaLevel, number> = {
  pflicht: 0,
  empfohlen: 1,
  optional: 2,
};

/**
 * Evaluate a property's completeness from the set of present document types.
 * Pass the deduped doc types currently attached to the property.
 */
export function evaluateCompleteness(
  presentDocTypes: Iterable<SaDocType>
): SaEvaluation {
  const present = new Set<SaDocType>(presentDocTypes);

  const missing: SaMissing[] = REQUIREMENTS.filter(
    (r) => !present.has(r.docType)
  )
    .map((r) => ({
      docType: r.docType,
      level: r.level,
      label: r.label,
      hint: r.hint,
    }))
    .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  const hasMissing = (level: SaLevel) => missing.some((m) => m.level === level);

  let status: SaStatus;
  if (hasMissing("pflicht")) status = "red";
  else if (hasMissing("empfohlen")) status = "orange";
  else if (hasMissing("optional")) status = "yellow";
  else status = "green";

  const presentRequirements = [...present].filter(
    (t) => REQUIREMENT_BY_TYPE[t] !== undefined
  );

  return {
    status,
    present: presentRequirements,
    missing,
    reportReady: !hasMissing("pflicht"),
  };
}

/** Distinct doc types from a SaMeta, restricted to the controlled vocabulary. */
export function docTypesFromMeta(meta: SaMeta | undefined | null): SaDocType[] {
  if (!meta?.docTypes) return [];
  return [...new Set(Object.values(meta.docTypes))];
}

/**
 * What counts as "present" for completeness: AI-classified uploaded docs PLUS
 * any requirements the user marked as manually provided.
 */
export function presentFromMeta(meta: SaMeta | undefined | null): SaDocType[] {
  if (!meta) return [];
  return [
    ...new Set([...Object.values(meta.docTypes ?? {}), ...(meta.manual ?? [])]),
  ];
}

/**
 * Build a short, specific German upload hint from the missing requirements.
 * Deterministic counterpart to the AI's classification — names exactly which
 * documents to add next, most important first.
 */
export function buildHint(evaluation: SaEvaluation): string | null {
  if (evaluation.missing.length === 0) return null;
  const pflicht = evaluation.missing.filter((m) => m.level === "pflicht");
  const empfohlen = evaluation.missing.filter((m) => m.level === "empfohlen");
  if (pflicht.length > 0) {
    return `Es fehlt noch: ${pflicht.map((m) => m.label).join(", ")}.`;
  }
  if (empfohlen.length > 0) {
    return `Empfohlen, aber noch nicht vorhanden: ${empfohlen
      .map((m) => m.label)
      .join(", ")}.`;
  }
  return `Optional ergänzen: ${evaluation.missing
    .map((m) => m.label)
    .join(", ")}.`;
}

/** Whether every property in the portfolio is report-ready (all pflicht present). */
export function allReportReady(evaluations: SaEvaluation[]): boolean {
  return evaluations.length > 0 && evaluations.every((e) => e.reportReady);
}
