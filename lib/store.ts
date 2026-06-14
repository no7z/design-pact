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

export type DarkMode = {
  enabled: boolean;
  overrides: Record<string, string>; // ColorToken.id -> dark hex (else auto-derived)
};

// Full snapshot of every token field — saving/loading a scheme restores the
// complete design system, not just colors.
export type Scheme = {
  id: string;
  name: string;
  createdAt: number;
  colors: ColorToken[];
  typography: Typography;
  globals: Globals;
  spacing: Spacing;
  radius: Radius;
  shadow: Shadow;
  motion: Motion;
  border: Border;
  opacity: Opacity;
  dark: DarkMode;
  activeBrand: string | null;
};

const MAX_SCHEMES = 8;

type State = {
  colors: ColorToken[];
  typography: Typography;
  globals: Globals;
  dark: DarkMode;
  schemes: Scheme[];
  activeSchemeId: string | null;
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
  setDarkEnabled: (enabled: boolean) => void;
  setDarkOverride: (id: string, hex: string | null) => void;
  saveScheme: (name: string) => string;
  loadScheme: (id: string) => void;
  deleteScheme: (id: string) => void;
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
const defaultDark: DarkMode = { enabled: false, overrides: {} };

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
      dark: defaultDark,
      schemes: [],
      activeSchemeId: null,
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
        set((s) => ({
          colors: palette.map((c, i) => ({
            id: `c${i}`,
            hex: c.hex,
            baseHex: c.hex,
            proportion: c.proportion,
            role: inferRole(i, palette.length),
          })),
          globals: { dL: 0, dC: 0, dH: 0 },
          activeBrand: null,
          activeSchemeId: null,
          // 新色板 → 旧的暗色微调不再适用
          dark: { enabled: s.dark.enabled, overrides: {} },
        })),
      loadTokens: (tokens, brand = null) =>
        set((s) => ({
          colors: tokens.map((t, i) => ({ ...t, id: `c${i}` })),
          globals: { dL: 0, dC: 0, dH: 0 },
          activeBrand: brand,
          activeSchemeId: null,
          dark: { enabled: s.dark.enabled, overrides: {} },
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
      saveScheme: (name) => {
        const s = get();
        const id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const scheme: Scheme = {
          id,
          name: name.trim() || `方案 ${s.schemes.length + 1}`,
          createdAt: Date.now(),
          colors: s.colors.map((c) => ({ ...c })),
          typography: { ...s.typography },
          globals: { ...s.globals },
          spacing: { ...s.spacing },
          radius: { ...s.radius },
          shadow: { ...s.shadow, sm: { ...s.shadow.sm }, md: { ...s.shadow.md }, lg: { ...s.shadow.lg } },
          motion: { ...s.motion },
          border: { ...s.border },
          opacity: { ...s.opacity },
          dark: { enabled: s.dark.enabled, overrides: { ...s.dark.overrides } },
          activeBrand: s.activeBrand,
        };
        set((cur) => ({
          schemes: [...cur.schemes, scheme].slice(-MAX_SCHEMES),
          activeSchemeId: id,
        }));
        return id;
      },
      loadScheme: (id) => {
        const scheme = get().schemes.find((x) => x.id === id);
        if (!scheme) return;
        set(() => ({
          colors: scheme.colors.map((c) => ({ ...c })),
          typography: { ...scheme.typography },
          globals: { ...scheme.globals },
          spacing: { ...scheme.spacing },
          radius: { ...scheme.radius },
          shadow: { ...scheme.shadow, sm: { ...scheme.shadow.sm }, md: { ...scheme.shadow.md }, lg: { ...scheme.shadow.lg } },
          motion: { ...scheme.motion },
          border: { ...scheme.border },
          opacity: { ...scheme.opacity },
          dark: { enabled: scheme.dark.enabled, overrides: { ...scheme.dark.overrides } },
          activeBrand: scheme.activeBrand,
          activeSchemeId: id,
        }));
      },
      deleteScheme: (id) =>
        set((cur) => ({
          schemes: cur.schemes.filter((x) => x.id !== id),
          activeSchemeId: cur.activeSchemeId === id ? null : cur.activeSchemeId,
        })),
      setDarkEnabled: (enabled) => set((cur) => ({ dark: { ...cur.dark, enabled } })),
      setDarkOverride: (id, hex) =>
        set((cur) => {
          const overrides = { ...cur.dark.overrides };
          if (hex === null) delete overrides[id];
          else overrides[id] = hex;
          return { dark: { ...cur.dark, overrides } };
        }),
      reset: () =>
        set(() => ({
          colors: [],
          typography: defaultTypography,
          globals: { dL: 0, dC: 0, dH: 0 },
          dark: defaultDark,
          activeBrand: null,
          activeSchemeId: null,
        })),
    }),
    { name: "ui-generator-tokens", skipHydration: true },
  ),
);
