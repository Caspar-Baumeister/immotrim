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
  exposeUrl?: ExtractedField<string>;
  kaufpreis?: ExtractedField<number>;
  wohnflaeche?: ExtractedField<number>;
  zimmer?: ExtractedField<number>;
  schlafzimmer?: ExtractedField<number>;
  badezimmer?: ExtractedField<number>;
  etage?: ExtractedField<number>;
  etagenGesamt?: ExtractedField<number>;
  wohnungstyp?: ExtractedField<string>;
  baujahr?: ExtractedField<number>;
  objektzustand?: ExtractedField<string>;
  ausstattung?: ExtractedField<string>;
  istMiete?: ExtractedField<number>;
  sollMiete?: ExtractedField<number>;
  hausgeld?: ExtractedField<number>;
  stellplaetze?: ExtractedField<number>;
  provisionsfrei?: ExtractedField<boolean>;
  heizungsart?: ExtractedField<string>;
  energietraeger?: ExtractedField<string>;
  energieausweistyp?: ExtractedField<string>;
  energieKennwert?: ExtractedField<number>;
  energieKlasse?: ExtractedField<string>;
  maklerName?: ExtractedField<string>;
  maklerTelefon?: ExtractedField<string>;
};

export type WishlistFieldKey = keyof ExtractedWishlistFields;

export type WishlistExtractResponse = {
  fields: ExtractedWishlistFields;
};
