import type { PropertyInputs } from "@/lib/supabase";

// A single extracted value with provenance, shown in the review/diff panel.
export type ExtractedField<T> = {
  value: T;
  // Which document the value came from, e.g. "Kaufvertrag" / the file name.
  sourceDoc: string;
  // 0–1 model confidence; drives a chip in the review panel.
  confidence: number;
};

// The subset of PropertyInputs that can plausibly be read out of
// Kaufvertrag / Mietvertrag / Wohngeldabrechnung / Grundbuch / Energieausweis.
// Every field is optional — the model only returns what it actually found.
export type ExtractedFields = {
  name?: ExtractedField<string>;
  address?: ExtractedField<string>;
  kaufpreis?: ExtractedField<number>;
  grunderwerbsteuerPct?: ExtractedField<number>;
  notarGrundbuchPct?: ExtractedField<number>;
  maklerprovisionPct?: ExtractedField<number>;
  sonstigePct?: ExtractedField<number>;
  kaltmiete?: ExtractedField<number>;
  nichtUmlagefaehig?: ExtractedField<number>;
  ruecklagen?: ExtractedField<number>;
};

// Identifies a single applyable field for the review panel + apply logic.
export type ExtractedFieldKey = keyof ExtractedFields;

export type ExtractResponse = {
  fields: ExtractedFields;
};

// What the review panel hands back to its caller when the user clicks Apply.
// Resolves nested PropertyInputs paths (e.g. nebenkosten.*) to flat patches.
export type AppliedPatch = {
  name?: string;
  address?: string;
  inputs?: Partial<PropertyInputs>;
};
