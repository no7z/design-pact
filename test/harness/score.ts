// Deterministic conformance scorer — the core of the eval loop.
//
// Renders generated HTML with Playwright, reads computed styles off every
// element, and checks each value against the fixture's allowed token set
// (recomputed live from lib/scales + lib/typography). No model in the loop, so
// this runs in CI and can score any HTML you hand it.
//
// CLI:  tsx test/harness/score.ts [htmlPath] [fixtureName]
//       defaults to scoring test/landing1.html against the airbnb fixture,
//       which is the known-drift regression check for the scorer itself.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { differenceCiede2000, converter } from "culori";
import { cssVars } from "../../lib/export";
import { buildScale } from "../../lib/typography";
import {
  buildSpacing,
  buildRadius,
  buildBorderScale,
  buildOpacityScale,
  buildDurations,
  boldWeight,
} from "../../lib/scales";
import { loadFixture, fixtureArgs, type Fixture } from "./prompt";

const dE = differenceCiede2000();
const toOklch = converter("oklch");

// ── Raw computed-style collection (runs in the page) ────────────────────────

type Counts = Record<string, number>;
type Collected = {
  colors: Counts;
  fontSizes: Counts;
  fontFamilies: Counts;
  fontWeights: Counts;
  spacing: Counts;
  radius: Counts;
  shadow: Counts;
  border: Counts;
  opacity: Counts;
  duration: Counts;
};

// The collector runs inside the page. It is a raw string (not a tsx-compiled
// closure) so esbuild's __name helper never leaks into the browser context.
const COLLECTOR_SRC = `(() => {
  const out = { colors:{}, fontSizes:{}, fontFamilies:{}, fontWeights:{}, spacing:{}, radius:{}, shadow:{}, border:{}, opacity:{}, duration:{} };
  const bump = (o, k) => { if (k == null || k === "") return; o[k] = (o[k] || 0) + 1; };
  const num = (v) => parseFloat(v);
  for (const el of Array.from(document.querySelectorAll("*"))) {
    const cs = getComputedStyle(el);
    bump(out.colors, cs.color);
    bump(out.colors, cs.backgroundColor);
    for (const side of ["top","right","bottom","left"]) {
      const w = num(cs.getPropertyValue("border-" + side + "-width"));
      if (w > 0) { bump(out.border, String(w)); bump(out.colors, cs.getPropertyValue("border-" + side + "-color")); }
    }
    bump(out.fontSizes, cs.fontSize);
    bump(out.fontFamilies, cs.fontFamily);
    bump(out.fontWeights, cs.fontWeight);
    for (const p of ["margin-top","margin-right","margin-bottom","margin-left","padding-top","padding-right","padding-bottom","padding-left","row-gap","column-gap"]) {
      const v = num(cs.getPropertyValue(p));
      if (v > 0) bump(out.spacing, String(v));
    }
    for (const c of ["border-top-left-radius","border-top-right-radius","border-bottom-left-radius","border-bottom-right-radius"]) {
      const v = num(cs.getPropertyValue(c));
      if (v > 0) bump(out.radius, String(v));
    }
    const sh = cs.boxShadow;
    if (sh && sh !== "none") bump(out.shadow, sh);
    const op = num(cs.opacity);
    if (!isNaN(op) && op < 1) bump(out.opacity, String(op));
    const td = cs.transitionDuration;
    if (td && td !== "0s") {
      for (const part of td.split(",")) {
        const ms = num(part) * (part.indexOf("ms") >= 0 ? 1 : 1000);
        if (ms > 0) bump(out.duration, String(Math.round(ms)));
      }
    }
  }
  return out;
})()`;

async function collect(html: string): Promise<Collected> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    return (await page.evaluate(COLLECTOR_SRC)) as Collected;
  } finally {
    await browser.close();
  }
}

// ── Scoring helpers ─────────────────────────────────────────────────────────

export type CategoryScore = {
  score: number; // 0-100
  hits: number;
  total: number;
  misses: { value: string; count: number; note?: string }[];
};

export type ConformanceReport = {
  fixture: string;
  overall: number;
  categories: Record<string, CategoryScore>;
};

function scoreCounts(
  counts: Counts,
  predicate: (key: string) => { hit: boolean; note?: string },
): CategoryScore {
  let hits = 0;
  let total = 0;
  const misses: CategoryScore["misses"] = [];
  for (const [value, count] of Object.entries(counts)) {
    total += count;
    const r = predicate(value);
    if (r.hit) hits += count;
    else misses.push({ value, count, note: r.note });
  }
  misses.sort((a, b) => b.count - a.count);
  return { score: total === 0 ? 100 : Math.round((hits / total) * 100), hits, total, misses: misses.slice(0, 8) };
}

const transparent = (s: string) => /rgba?\([^)]*,\s*0\s*\)$/.test(s.replace(/\s+/g, ""));

function onScale(v: number, allowed: number[], absTol: number, relTol = 0): boolean {
  return allowed.some((a) => Math.abs(a - v) <= Math.max(absTol, a * relTol));
}

function colorPredicate(paletteHex: string[]) {
  const palOklch = paletteHex.map((h) => ({ hex: h, ok: toOklch(h) }));
  return (used: string) => {
    if (transparent(used)) return { hit: true };
    const uo = toOklch(used);
    if (!uo) return { hit: false, note: "unparsable" };
    let best = Infinity;
    let bestHex = paletteHex[0];
    for (const h of paletteHex) {
      const d = dE(used, h);
      if (d < best) { best = d; bestHex = h; }
    }
    if (best <= 5) return { hit: true };
    const np = palOklch.find((p) => p.hex === bestHex)!.ok!;
    const uchr = uo.c ?? 0;
    const nchr = np.c ?? 0;
    const uAchroma = uchr < 0.03;
    const nAchroma = nchr < 0.03;
    if (uAchroma && nAchroma) return { hit: true }; // neutral shade, allowed
    if (!uAchroma && !nAchroma) {
      let dh = Math.abs((uo.h ?? 0) - (np.h ?? 0));
      if (dh > 180) dh = 360 - dh;
      if (dh <= 10 && Math.abs(uchr - nchr) <= 0.05) return { hit: true }; // lightness shade
    }
    return { hit: false, note: `nearest ${bestHex} ΔE ${best.toFixed(1)}` };
  };
}

// Parse the first :root{} block into a Map of --name → value.
function parseRoot(css: string): Map<string, string> {
  const m = css.match(/:root\s*\{([^}]*)\}/);
  const out = new Map<string, string>();
  if (!m) return out;
  for (const decl of m[1].split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const name = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (name.startsWith("--")) out.set(name, val);
  }
  return out;
}

function valuesClose(expected: string, actual: string): boolean {
  const e = expected.trim().toLowerCase();
  const a = actual.trim().toLowerCase();
  if (e === a) return true;
  // color compare
  if (/^#|rgb|hsl|oklch/.test(e) && /^#|rgb|hsl|oklch/.test(a)) {
    try { return dE(e, a) <= 2; } catch { return false; }
  }
  // numeric compare (px/rem/ms/unitless)
  const en = parseFloat(e);
  const an = parseFloat(a);
  if (!isNaN(en) && !isNaN(an)) return Math.abs(en - an) <= Math.max(0.5, en * 0.02);
  return false;
}

function scoreRootMatch(html: string, fixture: Fixture): CategoryScore {
  const expected = parseRoot(cssVars(...fixtureArgs(fixture)));
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((x) => x[1]).join("\n");
  const actual = parseRoot(styleBlocks);
  let hits = 0;
  const misses: CategoryScore["misses"] = [];
  for (const [name, val] of expected) {
    const got = actual.get(name);
    if (got != null && valuesClose(val, got)) hits++;
    else misses.push({ value: name, count: 1, note: got == null ? "absent" : `got ${got}, want ${val}` });
  }
  const total = expected.size;
  return { score: total === 0 ? 0 : Math.round((hits / total) * 100), hits, total, misses: misses.slice(0, 10) };
}

// ── Main scorer ─────────────────────────────────────────────────────────────

export async function scoreHtml(html: string, fixture: Fixture): Promise<ConformanceReport> {
  const c = await collect(html);

  const paletteHex = fixture.colors.map((x) => x.displayHex);
  const sizes = buildScale(fixture.typography).map((s) => s.px);
  const spacings = [0, ...buildSpacing(fixture.spacing.base).map((s) => s.px)];
  const radii = [0, 9999, ...buildRadius(fixture.radius.base).map((r) => r.px)];
  const borders = [0, ...buildBorderScale(fixture.border.base).map((b) => b.px)];
  const opacities = [0, 1, ...buildOpacityScale(fixture.opacity.base).map((o) => o.value)];
  const durations = [0, ...buildDurations(fixture.motion.base).map((d) => d.ms)];

  const bodyFam = familyHead(fixture.typography.fontFamily);
  const headFam = familyHead(fixture.typography.headingFamily);
  const weights = new Set<number>([
    fixture.typography.fontWeight,
    boldWeight(fixture.typography.fontWeight),
  ]);

  const categories: Record<string, CategoryScore> = {
    rootMatch: scoreRootMatch(html, fixture),
    color: scoreCounts(c.colors, colorPredicate(paletteHex)),
    typeSize: scoreCounts(c.fontSizes, (v) => ({ hit: onScale(parseFloat(v), sizes, 1, 0.02) })),
    fontFamily: scoreCounts(c.fontFamilies, (v) => {
      const lv = v.toLowerCase();
      return { hit: lv.includes(bodyFam) || lv.includes(headFam), note: "off-token family" };
    }),
    fontWeight: scoreCounts(c.fontWeights, (v) => ({ hit: weights.has(normalizeWeight(v)) })),
    spacing: scoreCounts(c.spacing, (v) => ({ hit: onScale(parseFloat(v), spacings, 1, 0.04) })),
    radius: scoreCounts(c.radius, (v) => ({ hit: onScale(parseFloat(v), radii, 1) })),
    shadow: scoreCounts(c.shadow, (v) => ({ hit: shadowOnScale(v, fixture) })),
    border: scoreCounts(c.border, (v) => ({ hit: onScale(parseFloat(v), borders, 0.5) })),
    opacity: scoreCounts(c.opacity, (v) => ({ hit: onScale(parseFloat(v), opacities, 0.03) })),
    motion: scoreCounts(c.duration, (v) => ({ hit: onScale(parseFloat(v), durations, 16) })),
  };

  const weightsByCat: Record<string, number> = {
    rootMatch: 2, color: 2, typeSize: 1.5, spacing: 1.5, fontFamily: 1,
    fontWeight: 0.5, radius: 1, shadow: 0.75, border: 0.75, opacity: 0.5, motion: 0.5,
  };
  let wsum = 0;
  let acc = 0;
  for (const [k, s] of Object.entries(categories)) {
    const w = weightsByCat[k] ?? 1;
    wsum += w;
    acc += s.score * w;
  }
  return { fixture: fixture.name, overall: Math.round(acc / wsum), categories };
}

function familyHead(stack: string): string {
  return stack.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
}
function normalizeWeight(v: string): number {
  if (v === "normal") return 400;
  if (v === "bold") return 700;
  return parseInt(v, 10) || 400;
}
function shadowOnScale(boxShadow: string, fixture: Fixture): boolean {
  // computed box-shadow: "rgba(...) 0px 2.8px 8px 0px" — pull the numeric offsets.
  const nums = (boxShadow.match(/-?\d*\.?\d+px/g) || []).map((s) => parseFloat(s));
  if (nums.length < 3) return false;
  const [, offsetY, blur] = nums; // offsetX, offsetY, blur, [spread]
  for (const lvl of ["sm", "md", "lg"] as const) {
    const t = fixture.shadow[lvl];
    if (Math.abs(t.offsetY - offsetY) <= 1.5 && Math.abs(t.blur - blur) <= 3) return true;
  }
  return false;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

async function main() {
  const htmlPath = process.argv[2] || join(__dirname, "..", "landing1.html");
  const fixtureName = process.argv[3] || "airbnb";
  const html = readFileSync(htmlPath, "utf8");
  const fixture = loadFixture(fixtureName);
  const report = await scoreHtml(html, fixture);
  printReport(report, htmlPath);
}

export function printReport(r: ConformanceReport, label = "") {
  console.log(`\n━━ ${r.fixture}${label ? `  (${label})` : ""} ━━  overall ${r.overall}/100`);
  for (const [name, s] of Object.entries(r.categories)) {
    const bar = "█".repeat(Math.round(s.score / 10)).padEnd(10, "░");
    console.log(`  ${name.padEnd(11)} ${bar} ${String(s.score).padStart(3)}  (${s.hits}/${s.total})`);
    for (const m of s.misses.slice(0, 3)) {
      console.log(`      ✗ ${m.value}${m.note ? `  — ${m.note}` : ""}${m.count > 1 ? `  ×${m.count}` : ""}`);
    }
  }
}

// Run as CLI when invoked directly.
if (process.argv[1] && process.argv[1].endsWith("score.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
