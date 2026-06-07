// A single extracted value with provenance, shown in the review/diff panel.
export type ExtractedField<T> = {
  value: T;
  // Which document the value came from, e.g. "Exposé" / the file name.
  sourceDoc: string;
  // 0–1 model confidence; drives a chip in the review panel.
  confidence: number;
};

// The subset of an Objektanalyse candidate that can plausibly be read out of a
// sales exposé. Every field is optional — the model only returns what it found.
export type ExtractedWishlistFields = {
  name?: ExtractedField<string>;
  address?: ExtractedField<string>;
  kaufpreis?: ExtractedField<number>;
  wohnflaeche?: ExtractedField<number>;
  zimmer?: ExtractedField<number>;
  baujahr?: ExtractedField<number>;
  kaltmiete?: ExtractedField<number>;
};

export type WishlistFieldKey = keyof ExtractedWishlistFields;

export type WishlistExtractResponse = {
  fields: ExtractedWishlistFields;
};

// What the review panel hands back to the Add dialog when the user clicks Apply.
export type WishlistPatch = {
  name?: string;
  address?: string;
  kaufpreis?: number;
  wohnflaeche?: number;
  zimmer?: number;
  baujahr?: number;
  kaltmiete?: number;
};

// Snapshot of the dialog's current form values, used to diff old → new.
export type WishlistSnapshot = {
  name: string;
  address: string;
  kaufpreis: number | null;
  wohnflaeche: number | null;
  zimmer: number | null;
  baujahr: number | null;
  kaltmiete: number | null;
};
