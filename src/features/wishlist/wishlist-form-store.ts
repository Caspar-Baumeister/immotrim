"use client";

import { create } from "zustand";
import type { Nebenkosten } from "@/lib/supabase";
import {
  DEFAULT_WISHLIST_EXTRAS,
  type WishlistDetails,
  type WishlistDraft,
  type WishlistExtras,
  type WishlistProperty,
} from "./types";

// Flat, always-numeric form values (sliders/inputs need concrete numbers).
export type WishlistFormValues = {
  name: string;
  address: string;
  exposeUrl: string;
  lage: string;
  notes: string;
  kaufpreis: number;
  wohnflaeche: number;
  zimmer: number;
  baujahr: number;
  istMiete: number;
  sollMiete: number;
  eigenanteil: number;
  extras: WishlistExtras;
  details: WishlistDetails;
};

const EMPTY: WishlistFormValues = {
  name: "",
  address: "",
  exposeUrl: "",
  lage: "",
  notes: "",
  kaufpreis: 300_000,
  wohnflaeche: 60,
  zimmer: 2,
  baujahr: 1990,
  istMiete: 0,
  sollMiete: 0,
  eigenanteil: 60_000,
  extras: { ...DEFAULT_WISHLIST_EXTRAS, nebenkosten: { ...DEFAULT_WISHLIST_EXTRAS.nebenkosten } },
  details: {},
};

type WishlistFormState = WishlistFormValues & {
  patch: (p: Partial<WishlistFormValues>) => void;
  patchExtras: (p: Partial<WishlistExtras>) => void;
  patchNebenkosten: (p: Partial<Nebenkosten>) => void;
  patchDetails: (p: Partial<WishlistDetails>) => void;
  hydrate: (row: WishlistProperty) => void;
  reset: () => void;
  toDraft: () => WishlistDraft;
};

export const useWishlistFormStore = create<WishlistFormState>((set, get) => ({
  ...EMPTY,

  patch: (p) => set(p),
  patchExtras: (p) => set((s) => ({ extras: { ...s.extras, ...p } })),
  patchNebenkosten: (p) =>
    set((s) => ({ extras: { ...s.extras, nebenkosten: { ...s.extras.nebenkosten, ...p } } })),
  patchDetails: (p) => set((s) => ({ details: { ...s.details, ...p } })),

  hydrate: (row) =>
    set({
      name: row.name,
      address: row.address ?? "",
      exposeUrl: row.exposeUrl ?? "",
      lage: row.lage ?? "",
      notes: row.notes ?? "",
      kaufpreis: row.kaufpreis ?? EMPTY.kaufpreis,
      wohnflaeche: row.wohnflaeche ?? EMPTY.wohnflaeche,
      zimmer: row.zimmer ?? EMPTY.zimmer,
      baujahr: row.baujahr ?? EMPTY.baujahr,
      istMiete: row.istMiete ?? 0,
      sollMiete: row.sollMiete ?? 0,
      eigenanteil: row.eigenanteil ?? EMPTY.eigenanteil,
      extras: {
        ...DEFAULT_WISHLIST_EXTRAS,
        ...row.extras,
        nebenkosten: { ...DEFAULT_WISHLIST_EXTRAS.nebenkosten, ...row.extras.nebenkosten },
      },
      details: { ...row.details },
    }),

  reset: () =>
    set({
      ...EMPTY,
      extras: { ...DEFAULT_WISHLIST_EXTRAS, nebenkosten: { ...DEFAULT_WISHLIST_EXTRAS.nebenkosten } },
      details: {},
    }),

  toDraft: () => {
    const s = get();
    return {
      name: s.name.trim(),
      address: s.address.trim() || null,
      exposeUrl: s.exposeUrl.trim() || null,
      lage: s.lage || null,
      kaufpreis: s.kaufpreis,
      wohnflaeche: s.wohnflaeche,
      zimmer: s.zimmer,
      baujahr: s.baujahr,
      istMiete: s.istMiete || null,
      sollMiete: s.sollMiete || null,
      eigenanteil: s.eigenanteil,
      extras: s.extras,
      details: s.details,
      notes: s.notes.trim() || null,
    };
  },
}));
