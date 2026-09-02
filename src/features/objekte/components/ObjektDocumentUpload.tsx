"use client";

// Exposé upload + AI extraction for one object. Thin adapter over
// DocumentUploadCore: uploads land as documents with object_id (so they reach
// the bank ZIP's Objektunterlagen), extraction runs in mode "konzeptObjekt"
// (mode id is a kept API contract with /api/extract) and applies into the
// object page's draft state — the fields stay editable, persisted on Speichern.

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
import type { ObjektDaten, ObjektDetails } from "../types";

export function ObjektDocumentUpload({
  objectId,
  snapshot,
  onPatchData,
  onPatchDetails,
}: {
  objectId: string;
  snapshot: ObjektSnapshot;
  onPatchData: (patch: Partial<ObjektDaten>) => void;
  onPatchDetails: (patch: Partial<ObjektDetails>) => void;
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

  return <DocumentUploadCore target={{ objectId }} adapter={adapter} />;
}
