// Derive semantic / status colors (success / warning / error / info) for any
// palette. Brand palettes carry no status colors, so every design system gets a
// consistent set derived purely from its background — no template overrides.
// With light/dark pairing, each face derives its own set from its background.
//
// Each color uses a fixed status hue (green / amber / red / blue) at a vivid but
// not neon chroma, with lightness nudged so it stays legible on the background.

import { hexToOklch, oklchToHex, contrastRatio } from "./color";
import { SEMANTIC_KINDS, type Semantic, type SemanticKind } from "./tokens-core";

const HUE: Record<SemanticKind, number> = {
  success: 150,
  warning: 75,
  error: 27,
  info: 255,
};

const CHROMA: Record<SemanticKind, number> = {
  success: 0.15,
  warning: 0.16,
  error: 0.19,
  info: 0.16,
};

export function deriveSemantic(bgHex: string): Semantic {
  const bg = hexToOklch(bgHex);
  const darkBg = bg.l < 0.5;
  const out = {} as Semantic;
  for (const kind of SEMANTIC_KINDS) {
    const h = HUE[kind];
    const c = CHROMA[kind];
    // Start mid-toned, then push lightness away from the bg until the color is
    // clearly legible on it (contrast ≥ ~3.2, the usual floor for UI accents).
    let l = darkBg ? 0.72 : 0.58;
    let hex = oklchToHex({ mode: "oklch", l, c, h });
    for (let i = 0; i < 16 && contrastRatio(hex, bgHex) < 3.2; i++) {
      l = darkBg ? Math.min(0.92, l + 0.03) : Math.max(0.38, l - 0.03);
      hex = oklchToHex({ mode: "oklch", l, c, h });
    }
    out[kind] = hex;
  }
  return out;
}
