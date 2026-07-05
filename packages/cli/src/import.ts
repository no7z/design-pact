// design-pact import — derive a draft design.md from an existing codebase.
//
// Brownfield adoption path: most projects arrive with design decisions already
// scattered across tailwind configs, CSS custom properties, and hardcoded hex
// values. This scans those signals, maps them onto the 6 semantic roles, and
// emits a full design.md through the same designSystemMarkdown() the studio
// uses — so the draft round-trips, carries dark pairs + semantic colors, and
// can be tuned in the studio before being adopted as the contract.
//
// Deterministic, offline, no AI: the same codebase always derives the same
// draft. Static text extraction only — user configs are never executed.

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { collectFiles, normalizeHex } from "./check";
import { designSystemMarkdown, type ResolvedToken } from "../../../lib/export";
import { deriveOppositeHex } from "../../../lib/darkMode";
import { deriveSemantic } from "../../../lib/semantic";
import { hexToOklch, oklchToHex, contrastRatio } from "../../../lib/color";
import {
  defaultTypography,
  defaultSpacing,
  defaultRadius,
  defaultShadow,
  defaultMotion,
  defaultBorder,
  defaultOpacity,
  type SemanticRole,
  type Typography,
} from "../../../lib/tokens-core";

type Role = Exclude<SemanticRole, "unassigned">;
const ROLES: Role[] = ["background", "foreground", "primary", "accent", "muted", "border"];

// How a color earned its role — shown in the summary so the user knows what to
// double-check in the studio.
export type Provenance = "named" | "heuristic" | "derived";

export type ColorSignal = {
  hex: string;
  count: number;
  /** Roles suggested by variable/key names near the literal. */
  hints: Partial<Record<Role, number>>;
};

export type ImportDraft = {
  colors: { role: Role; hex: string; provenance: Provenance }[];
  radiusBase?: number;
  spacingBase?: number;
  fontFamily?: string;
  fontSizeBase?: number;
  filesScanned: number;
};

// ── signal collection ────────────────────────────────────────────────────────

const NAME_HINTS: [Role, RegExp][] = [
  ["background", /\b(?:background|bg|surface|canvas|page)\b/i],
  ["foreground", /\b(?:foreground|fg|text|ink|body)\b/i],
  ["primary", /\b(?:primary|brand|main|cta)\b/i],
  ["accent", /\b(?:accent|highlight|secondary)\b/i],
  ["muted", /\b(?:muted|gr[ae]y|neutral|subtle|placeholder)\b/i],
  ["border", /\b(?:border|divider|outline|stroke|input|ring)\b/i],
];

const COLOR_LITERAL =
  /(#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*[\d.]+\s*)?\))/g;

function literalToHex(raw: string): string | null {
  if (raw.startsWith("#")) return normalizeHex(raw);
  const m = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(raw);
  if (!m) return null;
  const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if ([r, g, b].some((v) => v > 255)) return null;
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** The identifier a color literal is assigned to on its line, if any. */
function lineName(line: string, literalIndex: number): string {
  // `--color-primary: #…` / `primary: "#…"` / `$brand: #…` — take the token
  // immediately before the ':' that precedes the literal.
  const before = line.slice(0, literalIndex);
  const m = /([$@\w-]+)\s*:\s*["']?$/.exec(before);
  return m ? m[1] : "";
}

// Plain CSS property names are usage evidence ("this color appears as a
// background somewhere"), not identity — a variable or config key literally
// NAMED background/primary/border is a far stronger claim. Weight accordingly.
const CSS_PROPERTIES = new Set([
  "background", "background-color", "color", "border", "border-color",
  "outline", "outline-color", "fill", "stroke", "caret-color", "accent-color",
]);

export function scanSignals(text: string, weight: number, into: Map<string, ColorSignal>): void {
  for (const line of text.split("\n")) {
    for (const m of line.matchAll(COLOR_LITERAL)) {
      const hex = literalToHex(m[0]);
      if (!hex) continue;
      const sig = into.get(hex) ?? { hex, count: 0, hints: {} };
      sig.count += weight;
      const name = lineName(line, m.index ?? 0);
      if (name) {
        // The RAW name decides strength — `border-color:` in CSS is usage,
        // while camelCase `borderColor:` is a JS config key (design intent).
        const hintWeight = CSS_PROPERTIES.has(name.toLowerCase()) ? 1 : weight * 2;
        // Hints match against the camelCase-split form so \b anchors work.
        const normalized = name.replace(/([a-z])([A-Z])/g, "$1-$2");
        for (const [role, re] of NAME_HINTS) {
          if (re.test(normalized)) sig.hints[role] = (sig.hints[role] ?? 0) + hintWeight;
        }
      }
      into.set(hex, sig);
    }
  }
}

const RADIUS_RE = /(?:border-radius|borderRadius|--radius[\w-]*)["']?\s*:\s*["']?(\d{1,2})px/g;
const SPACING_VAR_RE = /--spacing-[\w-]*\s*:\s*(\d{1,2}(?:\.\d+)?)px/g;
const FONT_FAMILY_RE = /font-family\s*:\s*([^;}"']{3,120})/i;
const FONT_SIZE_RE = /(?:html|body|:root)[^{]*\{[^}]*?font-size\s*:\s*(\d{2})px/;

// ── role assignment ──────────────────────────────────────────────────────────

const isTailwindConfig = (f: string) => /^tailwind\.config\.(js|cjs|mjs|ts)$/.test(basename(f));

function pick<T>(arr: T[], score: (t: T) => number): T | undefined {
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const t of arr) {
    const s = score(t);
    if (s > bestScore) {
      bestScore = s;
      best = t;
    }
  }
  return bestScore > 0 ? best : undefined;
}

const hueDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** OKLCH blend of a into b by t (0 = a, 1 = b), hue taken from a. */
function blend(aHex: string, bHex: string, t: number): string {
  const a = hexToOklch(aHex);
  const b = hexToOklch(bHex);
  return oklchToHex({
    mode: "oklch",
    l: a.l + (b.l - a.l) * t,
    c: a.c + (b.c - a.c) * t,
    h: a.h ?? b.h ?? 0,
  });
}

export function assignRoles(signals: ColorSignal[]): { role: Role; hex: string; provenance: Provenance }[] {
  const used = new Set<string>();
  const out = new Map<Role, { hex: string; provenance: Provenance }>();
  const take = (role: Role, hex: string, provenance: Provenance) => {
    out.set(role, { hex, provenance });
    used.add(hex);
  };
  const free = () => signals.filter((s) => !used.has(s.hex));

  // 1. Name hints win. Strongest hint score per role, ties broken by frequency.
  for (const role of ROLES) {
    const named = pick(free().filter((s) => (s.hints[role] ?? 0) > 0), (s) => (s.hints[role] ?? 0) * 1e6 + s.count);
    if (named) take(role, named.hex, "named");
  }

  // 2. Heuristics fill the gaps, most-load-bearing roles first.
  const ok = (s: ColorSignal) => hexToOklch(s.hex);
  if (!out.has("background")) {
    const bg = pick(free(), (s) => {
      const c = ok(s);
      return c.l >= 0.85 || c.l <= 0.2 ? s.count : 0;
    });
    if (bg) take("background", bg.hex, "heuristic");
    else take("background", "#ffffff", "derived");
  }
  const bgHex = out.get("background")!.hex;
  const bgDark = hexToOklch(bgHex).l < 0.5;

  if (!out.has("foreground")) {
    const fg = pick(free(), (s) => (contrastRatio(s.hex, bgHex) >= 4.5 ? s.count * (1 + contrastRatio(s.hex, bgHex) / 21) : 0));
    if (fg) take("foreground", fg.hex, "heuristic");
    else take("foreground", bgDark ? "#e6e8ec" : "#1a1a1a", "derived");
  }
  const fgHex = out.get("foreground")!.hex;

  if (!out.has("primary")) {
    const p = pick(free(), (s) => {
      const c = ok(s);
      return c.c >= 0.09 && contrastRatio(s.hex, bgHex) >= 2 ? s.count : 0;
    });
    if (p) take("primary", p.hex, "heuristic");
    else take("primary", "#2f6df6", "derived");
  }
  const primaryHue = hexToOklch(out.get("primary")!.hex).h ?? 0;

  if (!out.has("accent")) {
    const a = pick(free(), (s) => {
      const c = ok(s);
      return c.c >= 0.09 && hueDist(c.h ?? 0, primaryHue) >= 40 ? s.count : 0;
    });
    if (a) take("accent", a.hex, "heuristic");
    else {
      const p = hexToOklch(out.get("primary")!.hex);
      take("accent", oklchToHex({ ...p, h: ((p.h ?? 0) + 60) % 360 }), "derived");
    }
  }

  if (!out.has("muted")) {
    const m = pick(free(), (s) => {
      const c = ok(s);
      return c.c < 0.08 && c.l >= 0.3 && c.l <= 0.78 ? s.count : 0;
    });
    if (m) take("muted", m.hex, "heuristic");
    else take("muted", blend(bgHex, fgHex, 0.55), "derived");
  }

  if (!out.has("border")) {
    const bgL = hexToOklch(bgHex).l;
    const b = pick(free(), (s) => {
      const c = ok(s);
      return c.c < 0.08 && Math.abs(c.l - bgL) > 0.02 && Math.abs(c.l - bgL) < 0.25 ? s.count : 0;
    });
    if (b) take("border", b.hex, "heuristic");
    else take("border", blend(bgHex, fgHex, 0.12), "derived");
  }

  return ROLES.map((role) => ({ role, ...out.get(role)! }));
}

// ── the scan itself ──────────────────────────────────────────────────────────

const mode = <T>(values: T[]): T | undefined => {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return pick([...counts.keys()], (k) => counts.get(k)!);
};

export function scanProject(targets: string[]): ImportDraft {
  const signals = new Map<string, ColorSignal>();
  const radii: number[] = [];
  const spacings: number[] = [];
  let fontFamily: string | undefined;
  let fontSizeBase: number | undefined;
  let filesScanned = 0;

  for (const target of targets) {
    for (const file of collectFiles(resolve(target))) {
      let text: string;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      filesScanned++;
      const isCss = /\.(css|scss|sass|less)$/.test(file);
      // Design intent beats incidental usage: tailwind config and stylesheets
      // outweigh a hex that happens to sit in a .tsx prop.
      scanSignals(text, isTailwindConfig(file) ? 5 : isCss ? 3 : 1, signals);

      for (const m of text.matchAll(RADIUS_RE)) {
        const px = Number(m[1]);
        if (px > 0 && px <= 24) radii.push(px);
      }
      for (const m of text.matchAll(SPACING_VAR_RE)) {
        const px = Number(m[1]);
        if (px >= 2 && px <= 8) spacings.push(px);
      }
      if (!fontFamily && (isCss || isTailwindConfig(file))) {
        const m = FONT_FAMILY_RE.exec(text);
        if (m) fontFamily = m[1].trim().replace(/["']/g, "").replace(/\s+/g, " ");
      }
      if (!fontSizeBase) {
        const m = FONT_SIZE_RE.exec(text);
        if (m) {
          const px = Number(m[1]);
          if (px >= 12 && px <= 22) fontSizeBase = px;
        }
      }
    }
  }

  // Near-invisible one-offs are noise, but never drop name-hinted colors.
  const all = [...signals.values()].filter((s) => s.count >= 2 || Object.keys(s.hints).length > 0);
  all.sort((a, b) => b.count - a.count);

  return {
    colors: assignRoles(all.slice(0, 64)),
    radiusBase: mode(radii),
    spacingBase: spacings.length > 0 ? Math.min(...spacings) : undefined,
    fontFamily,
    fontSizeBase,
    filesScanned,
  };
}

// ── emit ─────────────────────────────────────────────────────────────────────

// Draft proportions: layout guidance only, same shape the studio produces.
const PROPORTION: Record<Role, number> = {
  background: 0.55,
  foreground: 0.2,
  primary: 0.1,
  accent: 0.06,
  muted: 0.05,
  border: 0.04,
};

export function draftToMarkdown(draft: ImportDraft): string {
  // If the detected background is dark, the detected palette IS the dark face:
  // emit the derived light face as :root and the real one as the @media(dark)
  // block, mirroring the studio's isDarkPalette behavior.
  const detectedDark = hexToOklch(draft.colors.find((c) => c.role === "background")!.hex).l < 0.5;

  const face = (colors: typeof draft.colors, flip: boolean): ResolvedToken[] =>
    colors.map(({ role, hex }, i) => {
      const display = flip ? deriveOppositeHex(hex, role) : hex;
      return {
        id: `c${i + 1}`,
        hex: display,
        baseHex: display,
        proportion: PROPORTION[role],
        role,
        displayHex: display,
      };
    });

  const base = face(draft.colors, detectedDark);
  const dark = face(draft.colors, !detectedDark);
  const bg = base.find((c) => c.role === "background")!.displayHex;
  const darkBg = dark.find((c) => c.role === "background")!.displayHex;

  const typography: Typography = {
    ...defaultTypography,
    ...(draft.fontSizeBase ? { base: draft.fontSizeBase } : {}),
    ...(draft.fontFamily ? { fontFamily: draft.fontFamily, headingFamily: draft.fontFamily } : {}),
  };

  return designSystemMarkdown(
    base,
    typography,
    draft.spacingBase ? { base: draft.spacingBase } : defaultSpacing,
    draft.radiusBase ? { base: draft.radiusBase } : defaultRadius,
    defaultShadow,
    defaultMotion,
    defaultBorder,
    defaultOpacity,
    dark,
    deriveSemantic(bg),
    deriveSemantic(darkBg),
  );
}

/** `?p=` payload for reviewing the draft visually in the studio. */
export function studioQuery(draft: ImportDraft): string {
  const hexes = draft.colors.map((c) => c.hex.slice(1)).join("-");
  return `p=${hexes}~${encodeURIComponent("Imported")}~${encodeURIComponent("Derived from your codebase")}`;
}
