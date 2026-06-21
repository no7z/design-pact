import { computedHex, type ColorToken, type SemanticRole } from "./tokens-core";
import { relativeLuminance, adjustHex } from "./color";

type Globals = { dL: number; dC: number; dH: number };

export type MockupPalette = {
  bg: string;
  surface: string;
  primary: string;
  fg: string;
  accent: string;
  muted: string;
  border: string;
};

export function resolvePalette(colors: ColorToken[], globals: Globals): MockupPalette {
  const computed = colors.map((c) => ({ ...c, hex: computedHex(c, globals) }));
  const byRole = (role: SemanticRole): string | undefined =>
    computed.find((c) => c.role === role)?.hex;
  const sorted = [...computed].sort((a, b) => b.proportion - a.proportion);
  const at = (i: number) => sorted[Math.min(i, sorted.length - 1)]?.hex ?? "#888888";

  const bg = byRole("background") ?? at(0);
  const primary = byRole("primary") ?? at(1);
  const fg = byRole("foreground") ?? at(2);
  const accent = byRole("accent") ?? at(3);
  const muted = byRole("muted") ?? at(4);
  const border = byRole("border") ?? muted;

  const lum = relativeLuminance(bg);
  const surface = adjustHex(bg, { dL: lum < 0.4 ? 0.05 : -0.03, dC: 0, dH: 0 });

  return { bg, surface, primary, fg, accent, muted, border };
}

export function hexA(hex: string, alpha: number): string {
  const raw = hex.startsWith("#") ? hex.slice(1) : hex;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
