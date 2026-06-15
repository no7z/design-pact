// Light/dark paired faces.
//
// A palette has two faces: the one the user edits ("base", = store.colors with
// globals applied) and a derived "opposite" (lightness-flipped in OKLCH, role
// aware). Crucially, light/dark is decided by the background's actual
// lightness — NOT by which face is the base. So a dark-themed brand
// (background already dark) keeps its dark face as the dark scheme and the
// derived light face becomes the light scheme. This keeps preview labels and
// the exported :root / @media(dark) blocks correct for both light- and
// dark-based templates.
//
// Per-token overrides (store.dark.overrides, keyed by token id) override the
// OPPOSITE face — i.e. "the other side" of whatever the user is editing.

import { hexToOklch, oklchToHex } from "./color";
import { computedHex, type ColorToken, type Globals, type SemanticRole } from "./store";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Derive the opposite-lightness counterpart of a color, role-aware (OKLCH). */
export function deriveOppositeHex(hex: string, role: SemanticRole): string {
  const c = hexToOklch(hex);
  const flipped = 1 - c.l;
  let l: number;
  let chroma = c.c;

  switch (role) {
    case "background":
      // 0.14 起步：纯白翻转落在典型暗面（≈#101418）而不是近纯黑
      l = c.l >= 0.5 ? clamp(flipped, 0.14, 0.24) : clamp(flipped, 0.92, 0.985);
      chroma = Math.min(c.c, 0.04);
      break;
    case "foreground":
      l = c.l < 0.5 ? clamp(flipped, 0.85, 0.97) : clamp(flipped, 0.12, 0.3);
      break;
    case "border":
      l = c.l >= 0.5 ? clamp(flipped, 0.25, 0.38) : clamp(flipped, 0.7, 0.85);
      chroma = Math.min(c.c, 0.04);
      break;
    case "muted":
      l = clamp(flipped, 0.55, 0.75);
      break;
    case "primary":
    case "accent":
      // 品牌色保持色相与饱和度，仅在过深时提亮，保证暗底上的对比
      l = c.l < 0.55 ? clamp(c.l + 0.18, 0.55, 0.8) : c.l;
      break;
    default:
      l = clamp(flipped, 0.2, 0.9);
  }
  return oklchToHex({ mode: "oklch", l, c: chroma, h: c.h ?? 0 });
}

/** Is the base palette itself dark (by its background lightness)? */
export function isDarkPalette(colors: ColorToken[], globals: Globals): boolean {
  const bg = colors.find((c) => c.role === "background") ?? colors[0];
  if (!bg) return false;
  return hexToOklch(computedHex(bg, globals)).l < 0.5;
}

/** The opposite-face hex for one token: user override, else derived. */
export function resolveOppositeHex(
  token: ColorToken,
  globals: Globals,
  overrides: Record<string, string>,
): string {
  return overrides[token.id] ?? deriveOppositeHex(computedHex(token, globals), token.role);
}

function baseFace(colors: ColorToken[], globals: Globals): ColorToken[] {
  return colors.map((t) => {
    const hex = computedHex(t, globals);
    return { ...t, hex, baseHex: hex };
  });
}

function oppositeFace(
  colors: ColorToken[],
  globals: Globals,
  overrides: Record<string, string>,
): ColorToken[] {
  return colors.map((t) => {
    const hex = resolveOppositeHex(t, globals, overrides);
    return { ...t, hex, baseHex: hex };
  });
}

/**
 * The scheme's two faces assigned to light / dark slots by background
 * lightness — so `light` is always the brighter set and `dark` the darker,
 * regardless of which one the user is editing.
 */
export function lightDarkFaces(
  colors: ColorToken[],
  globals: Globals,
  overrides: Record<string, string>,
): { light: ColorToken[]; dark: ColorToken[] } {
  const base = baseFace(colors, globals);
  const opposite = oppositeFace(colors, globals, overrides);
  return isDarkPalette(colors, globals)
    ? { light: opposite, dark: base }
    : { light: base, dark: opposite };
}
