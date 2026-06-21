// Framework-free design-token core.
//
// The design-token *shape* and the one pure derivation over it (computedHex)
// live here so both the Next app and the standalone CLI can import them
// without pulling in the "use client" zustand store. store.ts re-exports
// everything below, so existing `@/lib/store` imports keep working unchanged.

import { adjustHex } from "./color";
import { buildShadowsFromIntensity } from "./scales";
import type { EasingPreset } from "./scales";

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
  base: number; // ms, 80–500, default 200
  easing: EasingPreset;
};

export type Border = { base: number }; // px
export type Opacity = { base: number }; // interactive state base opacity

export type Globals = { dL: number; dC: number; dH: number };

/** A token's on-screen color after the global OKLCH adjustment is applied. */
export const computedHex = (token: ColorToken, g: Globals): string =>
  adjustHex(token.baseHex, g);

// Default token values — used as the store's initial state and as the base the
// CLI / importTokens merge parsed partials onto.
export const defaultTypography: Typography = {
  base: 16,
  ratio: 1.25,
  fontFamily: "Inter, system-ui, sans-serif",
  headingFamily: "Inter, system-ui, sans-serif",
  fontWeight: 400,
  lineHeight: 1.5,
  letterSpacing: 0,
};
export const defaultSpacing: Spacing = { base: 4 };
export const defaultRadius: Radius = { base: 8 };
export const defaultMotion: Motion = { base: 200, easing: "ease-out" };
export const defaultBorder: Border = { base: 1 };
export const defaultOpacity: Opacity = { base: 0.08 };
export const defaultShadow: Shadow = {
  intensity: 0.5,
  advanced: false,
  ...buildShadowsFromIntensity(0.5),
};
