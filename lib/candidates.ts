// Transient palette candidates handed in via the URL (?p=set1&p=set2&…).
// Kept OUT of the persisted token store on purpose — they're a one-shot choice
// the user makes on the first screen, not part of the saved design system.

import { create } from "zustand";
import type { ColorToken } from "./store";

type CandidateState = {
  palettes: ColorToken[][];
  setPalettes: (palettes: ColorToken[][]) => void;
  clear: () => void;
};

export const useCandidates = create<CandidateState>((set) => ({
  palettes: [],
  setPalettes: (palettes) => set({ palettes }),
  clear: () => set({ palettes: [] }),
}));
