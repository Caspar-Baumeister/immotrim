"use client";

import { useTranslations } from "next-intl";
import {
  DocumentUploadCore,
  type ExtractionAdapter,
} from "@/features/extraction/DocumentUploadCore";
import { useWishlistFormStore } from "../wishlist-form-store";
import {
  WISHLIST_FIELD_ORDER,
  applyWishlistExtraction,
  currentWishlistValue,
  formatWishlistValue,
  type WishlistSnapshot,
} from "../wishlist-extraction-apply";
import type { WishlistFieldKey } from "../extraction-types";

type Target = { draftId: string } | { propertyId: string };

export function WishlistDocumentUpload({ target }: { target: Target }) {
  const t = useTranslations("wishlist");
  const store = useWishlistFormStore();

  const snap: WishlistSnapshot = {
    name: store.name,
    address: store.address,
    exposeUrl: store.exposeUrl,
    kaufpreis: store.kaufpreis,
    wohnflaeche: store.wohnflaeche,
    zimmer: store.zimmer,
    baujahr: store.baujahr,
    istMiete: store.istMiete,
    sollMiete: store.sollMiete,
    details: store.details,
  };

  const adapter: ExtractionAdapter = {
    mode: "wishlist",
    fieldOrder: WISHLIST_FIELD_ORDER,
    isPresent: (fields, key) => fields[key] !== undefined,
    fieldFor: (fields, key) => fields[key]!,
    label: (key) => t(`fields.${key}`),
    currentValue: (key) => currentWishlistValue(key as WishlistFieldKey, snap),
    formatValue: (key, value) => formatWishlistValue(key as WishlistFieldKey, value),
    apply: (selected, fields) =>
      applyWishlistExtraction(selected, fields, {
        patch: store.patch,
        patchNebenkosten: store.patchNebenkosten,
        patchDetails: store.patchDetails,
      }),
  };

  return <DocumentUploadCore target={target} adapter={adapter} />;
}
