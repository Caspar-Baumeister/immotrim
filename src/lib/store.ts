"use client";

import { create } from "zustand";
import { type PropertyInputs, DEFAULT_INPUTS } from "./supabase";

type PropertyFormState = {
  name: string;
  address: string;
  inputs: PropertyInputs;
  setName: (name: string) => void;
  setAddress: (address: string) => void;
  setInput: <K extends keyof PropertyInputs>(key: K, value: PropertyInputs[K]) => void;
  setAllInputs: (inputs: PropertyInputs) => void;
  reset: () => void;
};

export const usePropertyFormStore = create<PropertyFormState>((set) => ({
  name: "",
  address: "",
  inputs: { ...DEFAULT_INPUTS },
  setName: (name) => set({ name }),
  setAddress: (address) => set({ address }),
  setInput: (key, value) =>
    set((state) => ({
      inputs: { ...state.inputs, [key]: value },
    })),
  setAllInputs: (inputs) => set({ inputs }),
  reset: () => set({ name: "", address: "", inputs: { ...DEFAULT_INPUTS } }),
}));
