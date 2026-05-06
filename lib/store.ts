"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { adjustHex } from "./color";
import type { ExtractedColor } from "./extract";

export type SemanticRole =
  | "primary"
  | "accent"
  | "background"
  | "foreground"
  | "muted"
  | "border"
  | "unassigned";

export type ColorToken = {
  id: string;
  hex: string;
  baseHex: string;
  proportion: number;
  role: SemanticRole;
  name?: string;
};

export type Typography = {
  base: number;
  ratio: number;
  fontFamily: string;
  headingFamily: string;
};

export type Globals = { dL: number; dC: number; dH: number };

export type Variant = {
  id: string;
  name: string;
  createdAt: number;
  colors: ColorToken[];
  typography: Typography;
  globals: Globals;
};

type State = {
  colors: ColorToken[];
  typography: Typography;
  globals: Globals;
  variants: Variant[];
  activeVariantId: string | null;
  setColors: (palette: ExtractedColor[]) => void;
  updateColor: (id: string, patch: Partial<ColorToken>) => void;
  setRole: (id: string, role: SemanticRole) => void;
  setGlobal: (g: Partial<Globals>) => void;
  bakeGlobals: () => void;
  resetGlobals: () => void;
  setTypography: (t: Partial<Typography>) => void;
  reset: () => void;
  saveAsVariant: (name: string) => string;
  updateActiveVariant: () => void;
  loadVariant: (id: string) => void;
  renameVariant: (id: string, name: string) => void;
  deleteVariant: (id: string) => void;
};

const defaultTypography: Typography = {
  base: 16,
  ratio: 1.25,
  fontFamily: "Inter, system-ui, sans-serif",
  headingFamily: "Inter, system-ui, sans-serif",
};

export const computedHex = (token: ColorToken, g: Globals): string =>
  adjustHex(token.baseHex, g);

const inferRole = (idx: number, total: number): SemanticRole => {
  if (idx === 0) return "background";
  if (idx === 1) return "primary";
  if (idx === 2) return "foreground";
  if (idx === 3) return "accent";
  if (idx >= total - 1) return "muted";
  return "unassigned";
};

export const useTokens = create<State>()(
  persist(
    (set, get): State => ({
      colors: [],
      typography: defaultTypography,
      globals: { dL: 0, dC: 0, dH: 0 },
      variants: [],
      activeVariantId: null,
      setColors: (palette) =>
        set(() => ({
          colors: palette.map((c, i) => ({
            id: `c${i}`,
            hex: c.hex,
            baseHex: c.hex,
            proportion: c.proportion,
            role: inferRole(i, palette.length),
          })),
          globals: { dL: 0, dC: 0, dH: 0 },
        })),
      updateColor: (id, patch) =>
        set((s) => ({
          colors: s.colors.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...patch,
                  baseHex: patch.hex ?? c.baseHex,
                }
              : c,
          ),
        })),
      setRole: (id, role) =>
        set((s) => ({ colors: s.colors.map((c) => (c.id === id ? { ...c, role } : c)) })),
      setGlobal: (g) => set((s) => ({ globals: { ...s.globals, ...g } })),
      bakeGlobals: () =>
        set((s) => ({
          colors: s.colors.map((c) => ({ ...c, baseHex: computedHex(c, s.globals), hex: computedHex(c, s.globals) })),
          globals: { dL: 0, dC: 0, dH: 0 },
        })),
      resetGlobals: () => set(() => ({ globals: { dL: 0, dC: 0, dH: 0 } })),
      setTypography: (t) => set((s) => ({ typography: { ...s.typography, ...t } })),
      reset: () =>
        set(() => ({
          colors: [],
          typography: defaultTypography,
          globals: { dL: 0, dC: 0, dH: 0 },
          activeVariantId: null,
        })),
      saveAsVariant: (name) => {
        const id = `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const s = get();
        const snapshot: Variant = {
          id,
          name: name.trim() || `变体 ${s.variants.length + 1}`,
          createdAt: Date.now(),
          colors: s.colors.map((c) => ({ ...c })),
          typography: { ...s.typography },
          globals: { ...s.globals },
        };
        set((cur) => ({
          variants: [...cur.variants, snapshot],
          activeVariantId: id,
        }));
        return id;
      },
      updateActiveVariant: () => {
        const s = get();
        if (!s.activeVariantId) return;
        set((cur) => ({
          variants: cur.variants.map((v) =>
            v.id === cur.activeVariantId
              ? {
                  ...v,
                  colors: cur.colors.map((c) => ({ ...c })),
                  typography: { ...cur.typography },
                  globals: { ...cur.globals },
                }
              : v,
          ),
        }));
      },
      loadVariant: (id) => {
        const v = get().variants.find((x) => x.id === id);
        if (!v) return;
        set(() => ({
          colors: v.colors.map((c) => ({ ...c })),
          typography: { ...v.typography },
          globals: { ...v.globals },
          activeVariantId: id,
        }));
      },
      renameVariant: (id, name) =>
        set((s) => ({
          variants: s.variants.map((v) => (v.id === id ? { ...v, name: name.trim() || v.name } : v)),
        })),
      deleteVariant: (id) =>
        set((s) => ({
          variants: s.variants.filter((v) => v.id !== id),
          activeVariantId: s.activeVariantId === id ? null : s.activeVariantId,
        })),
    }),
    { name: "ui-generator-tokens", skipHydration: true },
  ),
);
