// Prompt builders for the eval harness.
//
// - buildPromptFixed() calls the production aiPrompt() (which now embeds the
//   :root copy-verbatim contract — hypothesis 1).
// - buildPromptBaseline() reproduces the OLD prose-only output, i.e. exactly
//   what produced test/design.md, so a single run measures the lift.
//
// Imports are relative (not "@/…") so tsx runs this without alias config.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { aiPrompt, type ResolvedToken } from "../../lib/export";
import { buildScale, SCALE_STEPS } from "../../lib/typography";
import {
  buildSpacing,
  buildRadius,
  shadowToCss,
  buildDurations,
  buildBorderScale,
  buildOpacityScale,
  EASING_PRESETS,
} from "../../lib/scales";
import type {
  Typography,
  Spacing,
  Radius,
  Shadow,
  Motion,
  Border,
  Opacity,
} from "../../lib/store";

export type Fixture = {
  name: string;
  colors: ResolvedToken[];
  typography: Typography;
  spacing: Spacing;
  radius: Radius;
  shadow: Shadow;
  motion: Motion;
  border: Border;
  opacity: Opacity;
};

const FIXTURE_DIR = join(__dirname, "..", "fixtures");

export function loadFixture(name: string): Fixture {
  const file = join(FIXTURE_DIR, name.endsWith(".json") ? name : `${name}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as Fixture;
}

export function loadAllFixtures(): Fixture[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => loadFixture(f));
}

/** The 8-tuple every export function takes, in order. */
export function fixtureArgs(f: Fixture) {
  return [f.colors, f.typography, f.spacing, f.radius, f.shadow, f.motion, f.border, f.opacity] as const;
}

export function buildPromptFixed(f: Fixture): string {
  return aiPrompt(...fixtureArgs(f));
}

/** Prose-only prompt — the original aiPrompt() output (pre-fix). */
export function buildPromptBaseline(f: Fixture): string {
  const { colors, typography, spacing, radius, shadow, motion, border, opacity } = f;
  const sorted = [...colors].sort((a, b) => b.proportion - a.proportion);
  const palette = sorted
    .map(
      (c) =>
        `- ${c.role === "unassigned" ? c.id : c.role}: ${c.displayHex} (${(c.proportion * 100).toFixed(1)}% of source image)`,
    )
    .join("\n");
  const scale = buildScale(typography)
    .map((s) => `- ${s.name}: ${s.rem}rem (${s.px}px)`)
    .join("\n");
  const dominant = sorted[0];
  const accent = sorted.find((c) => c.role === "accent") ?? sorted[1];

  return `# Design system

When generating UI from this token set, respect the following proportions and roles. The percentages reflect how much of the source design each color occupies — use them as a guide for surface area in the output.

## Color palette
${palette}

The dominant background should occupy roughly ${(dominant.proportion * 100).toFixed(0)}% of the layout. The accent color (${accent.displayHex}) should be reserved for emphasis — buttons, links, key highlights — typically ${Math.min(15, Math.round(accent.proportion * 100))}% or less of any given screen.

## Typography
Base size ${typography.base}px, modular scale ratio ${typography.ratio}.

${scale}

Body family: ${typography.fontFamily}
Heading family: ${typography.headingFamily}
Font weight: ${typography.fontWeight}, line-height: ${typography.lineHeight}, letter-spacing: ${typography.letterSpacing}em.

## Spacing
Base unit ${spacing.base}px. Use this 8-step scale for padding/margin/gap:

${buildSpacing(spacing.base).map((s) => `- ${s.name}: ${s.px}px`).join("\n")}

## Border radius
Base ${radius.base}px. Use:

${buildRadius(radius.base).map((r) => `- ${r.name}: ${r.name === "full" ? "9999px (pill)" : `${r.px}px`}`).join("\n")}

## Shadow / elevation
${shadow.advanced ? "Per-level custom values" : `Intensity ${shadow.intensity.toFixed(2)}`}.

${(["sm", "md", "lg"] as const).map((level) => `- ${level}: ${shadowToCss(shadow[level])}`).join("\n")}

## Border width
${buildBorderScale(border.base).map((b) => `- ${b.name}: ${b.px}px`).join("\n")}

## Opacity / transparency
${buildOpacityScale(opacity.base).map((o) => `- ${o.name}: ${(o.value * 100).toFixed(1)}%`).join("\n")}

## Motion / Animation
Base duration ${motion.base}ms, easing: ${motion.easing} (${EASING_PRESETS[motion.easing]}).

${buildDurations(motion.base).map((d) => `- ${d.name}: ${d.ms}ms`).join("\n")}

Use \`--duration-normal\` as the default transition. Prefer \`--duration-fast\` for hover states and micro-interactions. Reserve \`--duration-page\` for route/page-level transitions.

## Output guidance
- Maintain the proportional relationships above when laying out a page.
- Do not introduce new hues. If you need additional shades, derive them by adjusting OKLCH lightness only, keeping hue and chroma fixed.
- Respect the modular scale — pick from the listed sizes rather than introducing new ones.
- Use only the listed spacing values; do not improvise intermediate gaps.
- ${SCALE_STEPS.length} type sizes is intentional. Use semantic mapping: h1-h5 for headings, body for paragraphs, small/caption for metadata.
`;
}
