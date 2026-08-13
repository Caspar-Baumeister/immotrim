"use client";

// Exposé upload + AI extraction for one concept object. Thin adapter over
// DocumentUploadCore: uploads land as documents with concept_id + object_id
// (so they reach the bank ZIP's Objektunterlagen), extraction runs in mode
// "konzeptObjekt" and applies into the object page's draft state — the fields
// stay editable, persisted on Speichern.

import {
  DocumentUploadCore,
  type ExtractionAdapter,
} from "@/features/extraction/DocumentUploadCore";
import {
  OBJEKT_FIELD_LABELS,
  OBJEKT_FIELD_ORDER,
  applyObjektExtraction,
  currentObjektValue,
  formatObjektValue,
  type ObjektFieldKey,
  type ObjektSnapshot,
} from "../objekt-extraction-apply";
import type { KonzeptObjekt, KonzeptObjektDetails } from "../types";

export function ObjektDocumentUpload({
  conceptId,
  objectId,
  snapshot,
  onPatchData,
  onPatchDetails,
}: {
  conceptId: string;
  objectId: string;
  snapshot: ObjektSnapshot;
  onPatchData: (patch: Partial<KonzeptObjekt>) => void;
  onPatchDetails: (patch: Partial<KonzeptObjektDetails>) => void;
}) {
  const adapter: ExtractionAdapter = {
    mode: "konzeptObjekt",
    fieldOrder: OBJEKT_FIELD_ORDER,
    isPresent: (fields, key) => fields[key] !== undefined,
    fieldFor: (fields, key) => fields[key]!,
    label: (key) => OBJEKT_FIELD_LABELS[key as ObjektFieldKey] ?? key,
    currentValue: (key) => currentObjektValue(key as ObjektFieldKey, snapshot),
    formatValue: (key, value) => formatObjektValue(key as ObjektFieldKey, value),
    apply: (selected, fields) =>
      applyObjektExtraction(selected, fields, {
        patchData: onPatchData,
        patchDetails: onPatchDetails,
      }),
  };

  return <DocumentUploadCore target={{ conceptId, objectId }} adapter={adapter} />;
}
