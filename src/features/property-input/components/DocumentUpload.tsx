"use client";

import { useTranslations } from "next-intl";
import {
  DocumentUploadCore,
  type ExtractedBag,
  type ExtractionAdapter,
} from "@/features/extraction/DocumentUploadCore";
import type {
  AppliedPatch,
  ExtractedFieldKey,
  ExtractedFields,
} from "../extraction-types";
import {
  FIELD_ORDER,
  buildPatch,
  currentValueFor,
  formatFieldValue,
  type FormSnapshot,
} from "../extraction-apply";

type Target = { draftId: string } | { propertyId: string };

type Props = {
  target: Target;
  current: FormSnapshot;
  onApply: (patch: AppliedPatch) => void;
};

export function DocumentUpload({ target, current, onApply }: Props) {
  const t = useTranslations("documents");

  const adapter: ExtractionAdapter = {
    mode: "property",
    fieldOrder: FIELD_ORDER,
    isPresent: (fields, key) => fields[key] !== undefined,
    fieldFor: (fields, key) => fields[key]!,
    label: (key) => t(`fields.${key}`),
    currentValue: (key) => currentValueFor(key as ExtractedFieldKey, current),
    formatValue: (key, value) => formatFieldValue(key as ExtractedFieldKey, value),
    apply: (selected, fields: ExtractedBag) =>
      onApply(
        buildPatch(selected as ExtractedFieldKey[], fields as ExtractedFields, current)
      ),
  };

  return <DocumentUploadCore target={target} adapter={adapter} />;
}
