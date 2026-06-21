// Transient palette candidates handed in via the URL (?p=set1&p=set2&…).
// Kept OUT of the persisted token store on purpose — they're a one-shot choice
// the user makes on the first screen, not part of the saved design system.

import { create } from "zustand";
import type { ColorToken } from "./store";

// A candidate the agent proposes: the colors plus a human-readable name and
// description, so the user can tell the options apart at a glance.
export type Candidate = {
  palette: ColorToken[];
  name?: string;
  description?: string;
};

type CandidateState = {
  palettes: Candidate[];
  // Brand slugs of real products in the SAME category as the one being built,
  // picked by the agent and passed via ?m=… — shown as "同类真实产品". Empty
  // when the agent found no same-category match (then nothing is listed).
  matches: string[];
  setPalettes: (palettes: Candidate[]) => void;
  setMatches: (matches: string[]) => void;
  clear: () => void;
};

export const useCandidates = create<CandidateState>((set) => ({
  palettes: [],
  matches: [],
  setPalettes: (palettes) => set({ palettes }),
  setMatches: (matches) => set({ matches }),
  clear: () => set({ palettes: [], matches: [] }),
}));
