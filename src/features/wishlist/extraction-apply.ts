import type {
  ExtractedWishlistFields,
  WishlistFieldKey,
  WishlistPatch,
  WishlistSnapshot,
} from "./extraction-types";

type FieldKind = "text" | "euro" | "area" | "rooms" | "year";

// Value formatting kind per field. Human-readable labels live in i18n
// (messages/*.json → wishlist.expose.fields.<key>), resolved in the dialog.
export const FIELD_KIND: Record<WishlistFieldKey, FieldKind> = {
  name: "text",
  address: "text",
  kaufpreis: "euro",
  wohnflaeche: "area",
  zimmer: "rooms",
  baujahr: "year",
  kaltmiete: "euro",
};

export const FIELD_ORDER = Object.keys(FIELD_KIND) as WishlistFieldKey[];

export function currentValueFor(
  key: WishlistFieldKey,
  snap: WishlistSnapshot,
): string | number | undefined {
  const value = snap[key];
  return value === null ? undefined : value;
}

export function formatFieldValue(
  key: WishlistFieldKey,
  value: string | number | undefined,
): string {
  if (value === undefined || value === "" || value === null) return "—";
  const kind = FIELD_KIND[key];
  if (kind === "text") return String(value);
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  if (kind === "euro") return num.toLocaleString("de-DE") + " €";
  if (kind === "area") return num.toLocaleString("de-DE") + " m²";
  if (kind === "year") return String(num); // no thousands separator for years
  return num.toLocaleString("de-DE");
}

// Build a typed patch from the selected extracted fields.
export function buildPatch(
  selected: WishlistFieldKey[],
  extracted: ExtractedWishlistFields,
): WishlistPatch {
  const patch: WishlistPatch = {};
  for (const key of selected) {
    const field = extracted[key];
    if (!field) continue;
    if (key === "name") patch.name = field.value as string;
    else if (key === "address") patch.address = field.value as string;
    else if (key === "kaufpreis") patch.kaufpreis = field.value as number;
    else if (key === "wohnflaeche") patch.wohnflaeche = field.value as number;
    else if (key === "zimmer") patch.zimmer = field.value as number;
    else if (key === "baujahr") patch.baujahr = field.value as number;
    else if (key === "kaltmiete") patch.kaltmiete = field.value as number;
  }
  return patch;
}
