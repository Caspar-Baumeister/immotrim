"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_GLOBAL_ASSUMPTIONS,
  type CashflowSettings,
  type EkReturnSettings,
  type WishlistGlobalAssumptions,
  type YieldMode,
} from "./types";

type State = WishlistGlobalAssumptions & {
  setScalar: <K extends keyof WishlistGlobalAssumptions>(
    key: K,
    value: WishlistGlobalAssumptions[K]
  ) => void;
  setYieldMode: (mode: YieldMode) => void;
  patchCashflow: (patch: Partial<CashflowSettings>) => void;
  patchEkReturn: (patch: Partial<EkReturnSettings>) => void;
  reset: () => void;
};

export const useGlobalAssumptions = create<State>()(
  persist(
    (set) => ({
      ...DEFAULT_GLOBAL_ASSUMPTIONS,
      setScalar: (key, value) => set({ [key]: value } as Partial<State>),
      setYieldMode: (mode) => set({ yieldMode: mode }),
      patchCashflow: (patch) =>
        set((s) => ({ cashflowSettings: { ...s.cashflowSettings, ...patch } })),
      patchEkReturn: (patch) =>
        set((s) => ({ ekReturnSettings: { ...s.ekReturnSettings, ...patch } })),
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
        nichtUmlagefaehigPctOfMiete: s.nichtUmlagefaehigPctOfMiete,
        defaultEigenanteilPct: s.defaultEigenanteilPct,
        yieldMode: s.yieldMode,
        rentBasis: s.rentBasis,
        cashflowSettings: s.cashflowSettings,
        ekReturnSettings: s.ekReturnSettings,
      }),
    }
  )
);
