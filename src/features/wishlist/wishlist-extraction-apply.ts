import type { ExtractedBag } from "@/features/extraction/DocumentUploadCore";
import type { WishlistFieldKey } from "./extraction-types";
import type { WishlistDetails } from "./types";

type FieldKind = "text" | "euro" | "area" | "number" | "bool";

// Display kind per extracted field. Human labels live in i18n (wishlist.fields.*).
export const WISHLIST_FIELD_KIND: Record<WishlistFieldKey, FieldKind> = {
  name: "text",
  address: "text",
  exposeUrl: "text",
  kaufpreis: "euro",
  wohnflaeche: "area",
  zimmer: "number",
  schlafzimmer: "number",
  badezimmer: "number",
  etage: "number",
  etagenGesamt: "number",
  wohnungstyp: "text",
  baujahr: "number",
  objektzustand: "text",
  ausstattung: "text",
  istMiete: "euro",
  sollMiete: "euro",
  hausgeld: "euro",
  stellplaetze: "number",
  provisionsfrei: "bool",
  heizungsart: "text",
  energietraeger: "text",
  energieausweistyp: "text",
  energieKennwert: "number",
  energieKlasse: "text",
  maklerName: "text",
  maklerTelefon: "text",
};

export const WISHLIST_FIELD_ORDER = Object.keys(
  WISHLIST_FIELD_KIND
) as WishlistFieldKey[];

// Current form values needed to diff old → new in the review panel.
export type WishlistSnapshot = {
  name: string;
  address: string;
  exposeUrl: string;
  kaufpreis: number;
  wohnflaeche: number;
  zimmer: number;
  baujahr: number;
  istMiete: number;
  sollMiete: number;
  details: WishlistDetails;
};

export function currentWishlistValue(
  key: WishlistFieldKey,
  snap: WishlistSnapshot
): string | number | undefined {
  switch (key) {
    case "name":
      return snap.name;
    case "address":
      return snap.address;
    case "exposeUrl":
      return snap.exposeUrl;
    case "kaufpreis":
      return snap.kaufpreis;
    case "wohnflaeche":
      return snap.wohnflaeche;
    case "zimmer":
      return snap.zimmer;
    case "baujahr":
      return snap.baujahr;
    case "istMiete":
      return snap.istMiete;
    case "sollMiete":
      return snap.sollMiete;
    case "schlafzimmer":
      return snap.details.schlafzimmer ?? undefined;
    case "badezimmer":
      return snap.details.badezimmer ?? undefined;
    case "etage":
      return snap.details.etage ?? undefined;
    case "etagenGesamt":
      return snap.details.etagenGesamt ?? undefined;
    case "hausgeld":
      return snap.details.hausgeld ?? undefined;
    case "stellplaetze":
      return snap.details.stellplaetze ?? undefined;
    case "energieKennwert":
      return snap.details.energieKennwert ?? undefined;
    case "provisionsfrei":
      return snap.details.provisionsfrei == null
        ? undefined
        : snap.details.provisionsfrei
          ? "true"
          : "false";
    case "objektzustand":
      return snap.details.objektzustand ?? undefined;
    case "ausstattung":
      return snap.details.ausstattung ?? undefined;
    case "wohnungstyp":
      return snap.details.wohnungstyp ?? undefined;
    case "heizungsart":
      return snap.details.heizungsart ?? undefined;
    case "energietraeger":
      return snap.details.energietraeger ?? undefined;
    case "energieausweistyp":
      return snap.details.energieausweistyp ?? undefined;
    case "energieKlasse":
      return snap.details.energieKlasse ?? undefined;
    case "maklerName":
      return snap.details.maklerName ?? undefined;
    case "maklerTelefon":
      return snap.details.maklerTelefon ?? undefined;
  }
}

export function formatWishlistValue(
  key: WishlistFieldKey,
  value: string | number | boolean | undefined
): string {
  if (value === undefined || value === "" || value === null) return "—";
  const kind = WISHLIST_FIELD_KIND[key];
  if (kind === "bool") {
    const truthy = value === true || value === "true";
    return truthy ? "Ja" : "Nein";
  }
  if (kind === "text") return String(value);
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  if (kind === "euro") return num.toLocaleString("de-DE") + " €";
  if (kind === "area") return num.toLocaleString("de-DE") + " m²";
  return num.toLocaleString("de-DE");
}

// Patch surface the apply step writes into (the wishlist form store actions).
export type WishlistApplyTarget = {
  patch: (p: Partial<{ name: string; address: string; exposeUrl: string; kaufpreis: number; wohnflaeche: number; zimmer: number; baujahr: number; istMiete: number; sollMiete: number }>) => void;
  patchNebenkosten: (p: { maklerprovisionPct?: number }) => void;
  patchDetails: (p: Partial<WishlistDetails>) => void;
};

export function applyWishlistExtraction(
  selectedKeys: string[],
  fields: ExtractedBag,
  store: WishlistApplyTarget
) {
  const detailsPatch: Partial<WishlistDetails> = {};
  const topPatch: Record<string, string | number> = {};

  for (const k of selectedKeys) {
    const key = k as WishlistFieldKey;
    const field = fields[key];
    if (!field) continue;
    const v = field.value;

    switch (key) {
      case "name":
      case "address":
      case "exposeUrl":
        topPatch[key] = v as string;
        break;
      case "kaufpreis":
      case "wohnflaeche":
      case "zimmer":
      case "baujahr":
      case "istMiete":
      case "sollMiete":
        topPatch[key] = v as number;
        break;
      case "schlafzimmer":
      case "badezimmer":
      case "etage":
      case "etagenGesamt":
      case "hausgeld":
      case "stellplaetze":
      case "energieKennwert":
        detailsPatch[key] = v as number;
        break;
      case "objektzustand":
      case "ausstattung":
      case "wohnungstyp":
      case "heizungsart":
      case "energietraeger":
      case "energieausweistyp":
      case "energieKlasse":
      case "maklerName":
      case "maklerTelefon":
        detailsPatch[key] = v as string;
        break;
      case "provisionsfrei": {
        const truthy = String(v) === "true";
        detailsPatch.provisionsfrei = truthy;
        if (truthy) store.patchNebenkosten({ maklerprovisionPct: 0 });
        break;
      }
    }
  }

  if (Object.keys(topPatch).length > 0) store.patch(topPatch);
  if (Object.keys(detailsPatch).length > 0) store.patchDetails(detailsPatch);
}
