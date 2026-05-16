"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_GLOBAL_ASSUMPTIONS, type WishlistGlobalAssumptions } from "./types";

type State = WishlistGlobalAssumptions & {
  set: <K extends keyof WishlistGlobalAssumptions>(
    key: K,
    value: WishlistGlobalAssumptions[K]
  ) => void;
  reset: () => void;
};

export const useGlobalAssumptions = create<State>()(
  persist(
    (set) => ({
      ...DEFAULT_GLOBAL_ASSUMPTIONS,
      set: (key, value) => set({ [key]: value } as Partial<State>),
      reset: () => set({ ...DEFAULT_GLOBAL_ASSUMPTIONS }),
    }),
    {
      name: "immotrim_wishlist_assumptions",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        zins: s.zins,
        tilgung: s.tilgung,
        leerstandPct: s.leerstandPct,
        ruecklagenPctOfMiete: s.ruecklagenPctOfMiete,
        defaultEigenanteilPct: s.defaultEigenanteilPct,
      }),
    }
  )
);
