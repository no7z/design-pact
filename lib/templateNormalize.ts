// Brand-template palette normalization.
//
// DESIGN.md files follow no shared naming convention, so pure name-based role
// inference frequently assigns e.g. an "on-primary: #ffffff" button-label
// color to `foreground` on a white background — invisible text (audit
// 2026-06-12: 40/71 brands broken, 36 with fg/bg contrast 1.00:1).
//
// normalizePalette() re-selects roles from the brand's FULL parsed color pool
// under one standard contract, deriving a color from the brand's own palette
// only when no candidate qualifies:
//   - background  extreme lightness (a surface, not a brand color)
//   - foreground  contrast ≥ 4.5:1 on background
//   - primary     the most chromatic brand color, nudged visible if ≈ bg
//   - border      subtle: contrast 1.05–3.5 vs bg
//   - muted       readable-secondary: contrast 2–8 vs bg
//   - accent      optional, only if distinct from primary/bg

import { hexToOklch, oklchToHex, contrastRatio } from "./color";
import type { SemanticRole } from "./store";

export type RawColor = { hex: string; role: SemanticRole; name?: string };
export type NormalizedColor = { hex: string; role: SemanticRole; name?: string };

type Cand = RawColor & { l: number; c: number; h: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Lerp lightness from bg toward fg; keep things near-neutral. */
function mixTone(bgHex: string, fgHex: string, t: number): string {
  const bg = hexToOklch(bgHex);
  const fg = hexToOklch(fgHex);
  return oklchToHex({
    mode: "oklch",
    l: bg.l + (fg.l - bg.l) * t,
    c: Math.min(bg.c, 0.03),
    h: bg.h ?? 0,
  });
}

/** Walk t until contrast vs bg lands inside [lo, hi]. */
function deriveInBand(bgHex: string, fgHex: string, startT: number, lo: number, hi: number): string {
  let t = startT;
  for (let i = 0; i < 24; i++) {
    const hex = mixTone(bgHex, fgHex, t);
    const cr = contrastRatio(hex, bgHex);
    if (cr >= lo && cr <= hi) return hex;
    t = cr < lo ? t + 0.05 : t - 0.05;
    if (t <= 0.02 || t >= 0.98) break;
  }
  return mixTone(bgHex, fgHex, clamp(t, 0.02, 0.98));
}

export function normalizePalette(raw: RawColor[]): NormalizedColor[] {
  // Dedup by hex (keep first occurrence's role/name as hint).
  const seen = new Set<string>();
  const pool: Cand[] = [];
  for (const r of raw) {
    const hex = r.hex.toLowerCase();
    if (seen.has(hex)) continue;
    seen.add(hex);
    const o = hexToOklch(hex);
    pool.push({ ...r, hex, l: o.l, c: o.c, h: o.h ?? 0 });
  }
  if (pool.length === 0) return [];

  const out: NormalizedColor[] = [];
  const used = new Set<string>();
  const take = (c: { hex: string; name?: string }, role: SemanticRole) => {
    used.add(c.hex);
    out.push({ hex: c.hex, role, name: c.name });
  };

  // ── background: a surface — extreme lightness, low chroma preferred ──
  const surfaceScore = (c: Cand) => Math.abs(c.l - 0.5) - c.c * 1.5;
  const bgParsed = pool
    .filter((c) => c.role === "background" && (c.l >= 0.75 || c.l <= 0.35) && c.c < 0.12)
    .sort((a, b) => surfaceScore(b) - surfaceScore(a))[0];
  const bgAny = pool
    .filter((c) => (c.l >= 0.8 || c.l <= 0.3) && c.c < 0.08)
    .sort((a, b) => surfaceScore(b) - surfaceScore(a))[0];
  const bg = bgParsed ?? bgAny ?? { hex: "#ffffff", name: "auto-bg", l: 1, c: 0, h: 0 };
  take(bg, "background");

  // ── foreground: must clear 4.5:1 on bg ──
  const fgOk = (c: Cand) => contrastRatio(c.hex, bg.hex) >= 4.5 && !used.has(c.hex);
  const fgParsed = pool.filter((c) => c.role === "foreground" && fgOk(c) && c.c < 0.14)
    .sort((a, b) => contrastRatio(b.hex, bg.hex) - contrastRatio(a.hex, bg.hex))[0];
  const fgAny = pool.filter((c) => fgOk(c) && c.c < 0.14)
    .sort((a, b) => contrastRatio(b.hex, bg.hex) - contrastRatio(a.hex, bg.hex))[0];
  const fg =
    fgParsed ??
    fgAny ?? {
      hex: oklchToHex({
        mode: "oklch",
        l: bg.l >= 0.5 ? 0.18 : 0.94,
        c: Math.min(bg.c, 0.02),
        h: bg.h,
      }),
      name: "auto-fg",
    };
  take(fg, "foreground");

  // ── primary: most chromatic brand color, kept on-brand, nudged if ≈ bg ──
  const primaryParsed = pool.find((c) => c.role === "primary" && !used.has(c.hex) && c.c >= 0.03);
  const chromaticAny = pool
    .filter((c) => !used.has(c.hex) && c.c >= 0.05)
    .sort((a, b) => b.c - a.c)[0];
  let primary: { hex: string; name?: string } | undefined = primaryParsed ?? chromaticAny;
  if (!primary) {
    // Monochrome brand (vercel/uber style): primary = the fg tone.
    primary = { hex: fg.hex, name: "auto-primary" };
  }
  if (contrastRatio(primary.hex, bg.hex) < 1.3) {
    // e.g. yellow-on-white: keep hue/chroma, shift lightness until visible.
    const o = hexToOklch(primary.hex);
    let l = o.l;
    const dir = bg.l >= 0.5 ? -0.05 : 0.05;
    for (let i = 0; i < 12 && contrastRatio(oklchToHex({ ...o, l }), bg.hex) < 1.6; i++) {
      l = clamp(l + dir, 0.05, 0.97);
    }
    primary = { hex: oklchToHex({ ...o, l }), name: primary.name };
  }
  take(primary, "primary");

  // ── accent: optional, distinct chromatic color ──
  const accent = pool
    .filter((c) => !used.has(c.hex) && c.c >= 0.05 && contrastRatio(c.hex, bg.hex) >= 1.2)
    .sort((a, b) => (a.role === "accent" ? -1 : 1) - (b.role === "accent" ? -1 : 1) || b.c - a.c)[0];
  if (accent) take(accent, "accent");

  // ── border: subtle line on bg ──
  const borderOk = (c: Cand) => {
    const cr = contrastRatio(c.hex, bg.hex);
    return cr >= 1.05 && cr <= 3.5 && c.c < 0.1 && !used.has(c.hex);
  };
  const borderParsed = pool.find((c) => c.role === "border" && borderOk(c));
  const border = borderParsed ?? { hex: deriveInBand(bg.hex, fg.hex, 0.16, 1.2, 2.2), name: "auto-border" };
  take(border, "border");

  // ── muted: secondary text ──
  const mutedOk = (c: Cand) => {
    const cr = contrastRatio(c.hex, bg.hex);
    // 次要文字应当接近中性 — 饱和度高的颜色当 muted 会显得off-brand
    return cr >= 2 && cr <= 8 && c.c < 0.06 && !used.has(c.hex);
  };
  const mutedParsed = pool.find((c) => c.role === "muted" && mutedOk(c));
  const mutedAny = pool.find((c) => mutedOk(c));
  const muted = mutedParsed ?? mutedAny ?? { hex: deriveInBand(bg.hex, fg.hex, 0.55, 2.5, 6), name: "auto-muted" };
  take(muted, "muted");

  return out;
}
