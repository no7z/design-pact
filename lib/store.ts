"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { adjustHex } from "./color";
import { buildShadowsFromIntensity } from "./scales";
import type { EasingPreset } from "./scales";
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
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number; // em units
};

export type Spacing = { base: number };
export type Radius = { base: number };
export type ShadowToken = { blur: number; offsetY: number; opacity: number };
export type Shadow = {
  intensity: number; // 0..1, drives sm/md/lg in simple mode
  advanced: boolean; // when true, sm/md/lg are user-edited and intensity is ignored
  sm: ShadowToken;
  md: ShadowToken;
  lg: ShadowToken;
};

export type Motion = {
  base: number;       // ms, 80–500, default 200
  easing: EasingPreset;
};

export type Border = { base: number }; // px
export type Opacity = { base: number }; // interactive state base opacity

export type Globals = { dL: number; dC: number; dH: number };

type State = {
  colors: ColorToken[];
  typography: Typography;
  globals: Globals;
  description: string;
  recommendations: string[];
  activeBrand: string | null;
  spacing: Spacing;
  radius: Radius;
  shadow: Shadow;
  motion: Motion;
  border: Border;
  opacity: Opacity;
  setColors: (palette: ExtractedColor[]) => void;
  loadTokens: (tokens: ColorToken[], brand?: string | null) => void;
  updateColor: (id: string, patch: Partial<ColorToken>) => void;
  setRole: (id: string, role: SemanticRole) => void;
  setGlobal: (g: Partial<Globals>) => void;
  bakeGlobals: () => void;
  resetGlobals: () => void;
  setTypography: (t: Partial<Typography>) => void;
  setDescription: (s: string) => void;
  setRecommendations: (r: string[]) => void;
  setSpacing: (s: Partial<Spacing>) => void;
  setRadius: (r: Partial<Radius>) => void;
  setShadowIntensity: (intensity: number) => void;
  setShadowAdvanced: (advanced: boolean) => void;
  setShadowLevel: (level: "sm" | "md" | "lg", t: Partial<ShadowToken>) => void;
  setMotion: (m: Partial<Motion>) => void;
  setBorder: (b: Partial<Border>) => void;
  setOpacity: (o: Partial<Opacity>) => void;
  reset: () => void;
};

const defaultTypography: Typography = {
  base: 16,
  ratio: 1.25,
  fontFamily: "Inter, system-ui, sans-serif",
  headingFamily: "Inter, system-ui, sans-serif",
  fontWeight: 400,
  lineHeight: 1.5,
  letterSpacing: 0,
};

const defaultSpacing: Spacing = { base: 4 };
const defaultRadius: Radius = { base: 8 };
const defaultMotion: Motion = { base: 200, easing: "ease-out" };
const defaultBorder: Border = { base: 1 };
const defaultOpacity: Opacity = { base: 0.08 };
const defaultShadow: Shadow = {
  intensity: 0.5,
  advanced: false,
  ...buildShadowsFromIntensity(0.5),
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
    (set): State => ({
      colors: [],
      typography: defaultTypography,
      globals: { dL: 0, dC: 0, dH: 0 },
      description: "",
      recommendations: [],
      activeBrand: null,
      spacing: defaultSpacing,
      radius: defaultRadius,
      shadow: defaultShadow,
      motion: defaultMotion,
      border: defaultBorder,
      opacity: defaultOpacity,
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
          activeBrand: null,
        })),
      loadTokens: (tokens, brand = null) =>
        set(() => ({
          colors: tokens.map((t, i) => ({ ...t, id: `c${i}` })),
          globals: { dL: 0, dC: 0, dH: 0 },
          activeBrand: brand,
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
      setDescription: (s) => set(() => ({ description: s })),
      setRecommendations: (r) => set(() => ({ recommendations: r })),
      setSpacing: (s) => set((cur) => ({ spacing: { ...cur.spacing, ...s } })),
      setRadius: (r) => set((cur) => ({ radius: { ...cur.radius, ...r } })),
      setShadowIntensity: (intensity) =>
        set((cur) => ({
          shadow: {
            ...cur.shadow,
            intensity,
            advanced: false,
            ...buildShadowsFromIntensity(intensity),
          },
        })),
      setShadowAdvanced: (advanced) =>
        set((cur) => ({ shadow: { ...cur.shadow, advanced } })),
      setShadowLevel: (level, t) =>
        set((cur) => ({
          shadow: {
            ...cur.shadow,
            advanced: true,
            [level]: { ...cur.shadow[level], ...t },
          },
        })),
      setMotion: (m) => set((cur) => ({ motion: { ...cur.motion, ...m } })),
      setBorder: (b) => set((cur) => ({ border: { ...cur.border, ...b } })),
      setOpacity: (o) => set((cur) => ({ opacity: { ...cur.opacity, ...o } })),
      reset: () =>
        set(() => ({
          colors: [],
          typography: defaultTypography,
          globals: { dL: 0, dC: 0, dH: 0 },
          activeBrand: null,
        })),
    }),
    { name: "ui-generator-tokens", skipHydration: true },
  ),
);
