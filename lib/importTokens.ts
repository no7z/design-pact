// Re-import of a design-system.md this app exports — the W3C tokens live in its
// ```json block (lib/export.ts designSystemMarkdown → w3cTokens). Lets a user
// resume work from a downloaded file on another device. A bare W3C JSON string
// still parses too (backward compatibility). Parsing is intentionally lenient:
// missing groups fall back to the current store defaults.

import type {
  ColorToken,
  Typography,
  Spacing,
  Radius,
  Shadow,
  ShadowToken,
  Motion,
  Border,
  Opacity,
  SemanticRole,
} from "./tokens-core";
import { EASING_PRESETS, type EasingPreset } from "./scales";

export type ImportedTokens = {
  colors: ColorToken[];
  typography?: Partial<Typography>;
  spacing?: Partial<Spacing>;
  radius?: Partial<Radius>;
  shadow?: Shadow;
  motion?: Partial<Motion>;
  border?: Partial<Border>;
  opacity?: Partial<Opacity>;
  /** Dark hex per colors[] index, when the export carried dark pairs. */
  darkHexes?: (string | undefined)[];
};

const ROLES = new Set<SemanticRole>([
  "primary",
  "accent",
  "background",
  "foreground",
  "muted",
  "border",
]);

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

type Node = Record<string, unknown> | undefined;

const asObj = (x: unknown): Node =>
  x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : undefined;

const value = (node: unknown): unknown => asObj(node)?.["$value"];

const num = (x: unknown): number | undefined => {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const m = /^(-?\d+(?:\.\d+)?)/.exec(x.trim());
    if (m) return parseFloat(m[1]);
  }
  return undefined;
};

/** Pull the W3C ```json block out of a design-system.md; null if there isn't one. */
function extractW3CJson(text: string): string | null {
  const m = text.match(/```json\s*\n([\s\S]*?)\n```/i);
  return m ? m[1] : null;
}

/**
 * Import from a design-system.md (extract its ```json W3C block) or, for
 * backward compatibility, a raw W3C design-tokens.json string.
 */
export function parseDesignSystemTokens(text: string): ImportedTokens {
  return parseW3CTokens(extractW3CJson(text) ?? text);
}

export function parseW3CTokens(jsonText: string): ImportedTokens {
  let root: Node;
  try {
    root = asObj(JSON.parse(jsonText));
  } catch {
    throw new Error("不是有效的 JSON 文件");
  }
  if (!root) throw new Error("不是有效的 JSON 文件");

  // ── colors ──
  const colorGroup = asObj(root.color);
  if (!colorGroup) throw new Error("缺少 color 分组——这不是本工具导出的 design-system.md？");
  const colors: ColorToken[] = [];
  const darkHexes: (string | undefined)[] = [];
  for (const [key, node] of Object.entries(colorGroup)) {
    const hex = value(node);
    if (typeof hex !== "string" || !HEX_RE.test(hex)) continue;
    const lower = hex.toLowerCase();
    colors.push({
      id: key,
      hex: lower,
      baseHex: lower,
      proportion: 1,
      role: ROLES.has(key as SemanticRole) ? (key as SemanticRole) : "unassigned",
      name: key,
    });
    const dark = asObj(asObj(asObj(node)?.["$extensions"])?.["ui-generator"])?.dark;
    darkHexes.push(typeof dark === "string" && HEX_RE.test(dark) ? dark.toLowerCase() : undefined);
  }
  if (colors.length === 0) throw new Error("color 分组里没有可识别的颜色");

  const out: ImportedTokens = { colors };
  if (darkHexes.some((d) => d !== undefined)) out.darkHexes = darkHexes;

  // ── typography ──
  const typo = asObj(root.typography);
  if (typo) {
    const t: Partial<Typography> = {};
    const ext = asObj(asObj(typo.$extensions)?.["ui-generator"]);
    const base = num(ext?.base);
    const ratio = num(ext?.ratio);
    if (base) t.base = base;
    if (ratio) t.ratio = ratio;
    const family = asObj(typo.fontFamily);
    const body = value(family?.body);
    const heading = value(family?.heading);
    if (typeof body === "string" && body) t.fontFamily = body;
    if (typeof heading === "string" && heading) t.headingFamily = heading;
    const weight = num(value(typo.fontWeight));
    if (weight) t.fontWeight = weight;
    const lineHeight = num(value(typo.lineHeight));
    if (lineHeight) t.lineHeight = lineHeight;
    const letterSpacing = num(value(typo.letterSpacing));
    if (letterSpacing !== undefined) t.letterSpacing = letterSpacing;
    if (Object.keys(t).length > 0) out.typography = t;
  }

  // ── scales: base = the step with multiplier 1 ──
  const spacingBase = num(value(asObj(root.spacing)?.xxs));
  if (spacingBase) out.spacing = { base: spacingBase };
  const radiusBase = num(value(asObj(root.borderRadius)?.md));
  if (radiusBase) out.radius = { base: radiusBase };
  const borderBase = num(value(asObj(root.borderWidth)?.default));
  if (borderBase) out.border = { base: borderBase };
  const opacityBase = num(value(asObj(root.opacity)?.hover));
  if (opacityBase) out.opacity = { base: opacityBase };

  // ── shadow: parse the serialized css back into per-level tokens ──
  const shadowGroup = asObj(root.shadow);
  if (shadowGroup) {
    const levels: Partial<Record<"sm" | "md" | "lg", ShadowToken>> = {};
    for (const level of ["sm", "md", "lg"] as const) {
      const css = value(shadowGroup[level]);
      if (typeof css !== "string") continue;
      const m = /^0\s+(-?[\d.]+)px\s+([\d.]+)px\s+0\s+rgba\(0,\s*0,\s*0,\s*([\d.]+)\)$/.exec(
        css.trim(),
      );
      if (!m) continue;
      levels[level] = { offsetY: parseFloat(m[1]), blur: parseFloat(m[2]), opacity: parseFloat(m[3]) };
    }
    if (levels.sm && levels.md && levels.lg) {
      out.shadow = { intensity: 0.5, advanced: true, sm: levels.sm, md: levels.md, lg: levels.lg };
    }
  }

  // ── motion ──
  const motionGroup = asObj(root.motion);
  if (motionGroup) {
    const m: Partial<Motion> = {};
    const baseMs = num(value(motionGroup["duration-normal"]));
    if (baseMs) m.base = baseMs;
    const easingVal = value(motionGroup.easing);
    if (typeof easingVal === "string") {
      const preset = (Object.keys(EASING_PRESETS) as EasingPreset[]).find(
        (k) => EASING_PRESETS[k] === easingVal.trim() || k === easingVal.trim(),
      );
      if (preset) m.easing = preset;
    }
    if (Object.keys(m).length > 0) out.motion = m;
  }

  // Status colors are pure-derived from the background on load, so the exported
  // `semantic` group is informational only — nothing to read back here.
  return out;
}
