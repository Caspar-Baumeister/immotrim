// ─────────────────────────────────────────────────────────────────────────────
// FINANZIERUNGSKONZEPT DOMAIN TYPES
//
// A "Konzept" is one financing case: what the user wants to buy and how they
// want to finance it (e.g. "Möbliertes 1-Zimmer-Apartment in Potsdam"). It is
// deliberately separate from the portfolio (owned properties) and the wishlist
// (Objektanalyse comparison table) — a concept may optionally be prefilled from
// a wishlist row. `objekt`/`finanzierung` live in jsonb columns, so every field
// here is optional and the catalog can grow without a migration.
// ─────────────────────────────────────────────────────────────────────────────

import type { WishlistProperty } from "@/features/wishlist/types";

export const KONZEPT_TYPES = [
  "moebliertes_apartment",
  "wg",
  "klassische_vermietung",
  "eigennutzung",
  "custom",
] as const;

export type KonzeptType = (typeof KONZEPT_TYPES)[number];

export const KONZEPT_TYPE_LABELS: Record<KonzeptType, string> = {
  moebliertes_apartment: "Möbliertes Apartment",
  wg: "WG- / Shared-Living-Konzept",
  klassische_vermietung: "Klassische Vermietung",
  eigennutzung: "Eigennutzung",
  custom: "Eigenes Konzept",
};

export const KONZEPT_ZWECKE = [
  "kauf",
  "neubau",
  "anschlussfinanzierung",
  "kapitalbeschaffung",
] as const;

export type KonzeptZweck = (typeof KONZEPT_ZWECKE)[number];

export const KONZEPT_ZWECK_LABELS: Record<KonzeptZweck, string> = {
  kauf: "Kauf",
  neubau: "Neubau",
  anschlussfinanzierung: "Anschlussfinanzierung",
  kapitalbeschaffung: "Kapitalbeschaffung",
};

/** The target object of the concept — inline data or prefilled from a wishlist row. */
export type KonzeptObjekt = {
  adresse?: string; // Straße, Hausnummer
  ort?: string; // PLZ, Ort / Stadtteil
  objekttyp?: string; // z.B. "Eigentumswohnung"
  wohnflaeche?: number; // m²
  zimmer?: number;
  baujahr?: number;
  kaufpreis?: number; // €
  erwarteteMiete?: number; // erwartete Kaltmiete €/Monat
};

/** The requested financing — feeds the "Ihr Finanzbedarf" page of the Selbstauskunft. */
export type KonzeptFinanzierung = {
  darlehensbetrag?: number; // gewünschter Gesamtdarlehensbetrag €
  eigenkapital?: number; // eingebrachtes Eigenkapital €
  zinsbindungJahre?: number;
  tilgungPct?: number; // anfängliche Tilgung % p.a.
  zweck?: KonzeptZweck;
  wuensche?: string; // weitere Wünsche (Sondertilgung, KfW, …)
};

export type Konzept = {
  id: string;
  userId: string;
  title: string;
  conceptType?: KonzeptType;
  description?: string;
  wishlistPropertyId?: string | null;
  objekt: KonzeptObjekt;
  finanzierung: KonzeptFinanzierung;
  createdAt: string;
  updatedAt: string;
};

export type KonzeptDraft = Omit<Konzept, "id" | "userId" | "createdAt" | "updatedAt">;

export const EMPTY_KONZEPT_DRAFT: KonzeptDraft = {
  title: "",
  objekt: {},
  finanzierung: {},
};

/** Narrow an arbitrary stored string to a known concept type. */
export function normaliseKonzeptType(raw: string | null | undefined): KonzeptType | undefined {
  return (KONZEPT_TYPES as readonly string[]).includes(raw ?? "")
    ? (raw as KonzeptType)
    : undefined;
}

/** Map an Objektanalyse (wishlist) row into concept object data ("Aus Objektanalyse übernehmen"). */
export function prefillFromWishlist(w: WishlistProperty): KonzeptObjekt {
  return {
    adresse: w.address ?? w.name,
    objekttyp: w.details.wohnungstyp ?? undefined,
    wohnflaeche: w.wohnflaeche ?? undefined,
    zimmer: w.zimmer ?? undefined,
    baujahr: w.baujahr ?? undefined,
    kaufpreis: w.kaufpreis ?? undefined,
    erwarteteMiete: w.sollMiete ?? w.istMiete ?? undefined,
  };
}
