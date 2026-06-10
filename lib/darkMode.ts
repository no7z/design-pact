// Dark-mode counterpart derivation.
//
// Each light token gets a dark pair derived in OKLCH: neutral roles flip
// lightness (clamped into role-appropriate bands), brand roles (primary /
// accent) keep hue+chroma and only lighten when too dark for a dark surface.
// Users can override any derived value per token (store.dark.overrides).
// Symmetric by design: an already-dark palette derives a light counterpart.

import { hexToOklch, oklchToHex } from "./color";
import { computedHex, type ColorToken, type Globals, type SemanticRole } from "./store";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function deriveDarkHex(hex: string, role: SemanticRole): string {
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

export function resolveDarkHex(
  token: ColorToken,
  globals: Globals,
  overrides: Record<string, string>,
): string {
  return overrides[token.id] ?? deriveDarkHex(computedHex(token, globals), token.role);
}

/** Full dark token set (hex + baseHex set to the dark value, globals pre-applied). */
export function darkTokens(
  colors: ColorToken[],
  globals: Globals,
  overrides: Record<string, string>,
): ColorToken[] {
  return colors.map((t) => {
    const hex = resolveDarkHex(t, globals, overrides);
    return { ...t, hex, baseHex: hex };
  });
}
