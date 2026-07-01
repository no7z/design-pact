import type { ColorToken, Typography, Spacing, Radius, Shadow, Motion, Border, Opacity, Semantic } from "./tokens-core";
import { SEMANTIC_KINDS } from "./tokens-core";
import { buildScale, SCALE_STEPS } from "./typography";
import { buildSpacing, buildRadius, shadowToCss, buildDurations, EASING_PRESETS, buildBorderScale, buildOpacityScale, boldWeight, headingWeight } from "./scales";
import { oklchString } from "./color";

export type ResolvedToken = ColorToken & { displayHex: string };

// What each interaction-opacity step is for — so the AI prompt tells the model
// WHEN to use them, not just their values (otherwise they go unused).
const OPACITY_USAGE: Record<string, string> = {
  hover: "tint/overlay on hover (e.g. button or row background)",
  pressed: "active/pressed feedback",
  focus: "focus ring or focused-row background",
  disabled: "opacity of disabled controls",
  overlay: "modal/drawer backdrop scrim",
};

export function w3cTokens(
  colors: ResolvedToken[],
  typography: Typography,
  spacing: Spacing,
  radius: Radius,
  shadow: Shadow,
  motion: Motion,
  border: Border,
  opacity: Opacity,
  darkColors?: ResolvedToken[] | null,
  semantic?: Semantic | null,
  darkSemantic?: Semantic | null,
) {
  const darkById = new Map((darkColors ?? []).map((c) => [c.id, c.displayHex]));
  const colorGroup: Record<string, unknown> = {};
  for (const c of colors) {
    const key = c.role === "unassigned" ? c.id : c.role;
    const ext: Record<string, unknown> = {
      proportion: c.proportion,
      oklch: oklchString(c.displayHex),
    };
    const dark = darkById.get(c.id);
    if (dark) ext.dark = dark;
    colorGroup[key] = {
      $value: c.displayHex,
      $type: "color",
      $extensions: { "design-system": ext },
    };
  }
  const fontSizes: Record<string, unknown> = {};
  for (const s of buildScale(typography)) {
    fontSizes[s.name] = { $value: `${s.rem}rem`, $type: "dimension" };
  }
  const spacingGroup: Record<string, unknown> = {};
  for (const s of buildSpacing(spacing.base)) {
    spacingGroup[s.name] = { $value: `${s.px}px`, $type: "dimension" };
  }
  const radiusGroup: Record<string, unknown> = {};
  for (const r of buildRadius(radius.base)) {
    radiusGroup[r.name] = { $value: `${r.px}px`, $type: "dimension" };
  }
  const shadowGroup: Record<string, unknown> = {};
  for (const level of ["sm", "md", "lg"] as const) {
    shadowGroup[level] = { $value: shadowToCss(shadow[level]), $type: "shadow" };
  }
  const motionGroup: Record<string, unknown> = {};
  for (const d of buildDurations(motion.base)) {
    motionGroup[`duration-${d.name}`] = { $value: `${d.ms}ms`, $type: "duration" };
  }
  motionGroup["easing"] = { $value: EASING_PRESETS[motion.easing], $type: "cubicBezier" };

  const borderGroup: Record<string, unknown> = {};
  for (const b of buildBorderScale(border.base)) {
    borderGroup[b.name] = { $value: `${b.px}px`, $type: "dimension" };
  }

  const opacityGroup: Record<string, unknown> = {};
  for (const o of buildOpacityScale(opacity.base)) {
    opacityGroup[o.name] = { $value: o.value, $type: "number" };
  }

  // Status colors as their own group, kept out of `color` (brand) so a re-import
  // restores them as overrides without polluting the brand palette.
  const semanticGroup: Record<string, unknown> | undefined = semantic
    ? Object.fromEntries(
        SEMANTIC_KINDS.map((k) => [
          k,
          {
            $value: semantic[k],
            $type: "color",
            ...(darkSemantic ? { $extensions: { "design-system": { dark: darkSemantic[k] } } } : {}),
          },
        ]),
      )
    : undefined;

  return {
    color: colorGroup,
    ...(semanticGroup ? { semantic: semanticGroup } : {}),
    typography: {
      fontFamily: {
        body: { $value: typography.fontFamily, $type: "fontFamily" },
        heading: { $value: typography.headingFamily, $type: "fontFamily" },
      },
      fontSize: fontSizes,
      fontWeight: { $value: typography.fontWeight, $type: "fontWeight" },
      fontWeightHeading: { $value: headingWeight(typography.fontWeight), $type: "fontWeight" },
      fontWeightBold: { $value: boldWeight(typography.fontWeight), $type: "fontWeight" },
      lineHeight: { $value: typography.lineHeight, $type: "number" },
      letterSpacing: { $value: `${typography.letterSpacing}em`, $type: "dimension" },
      $extensions: {
        "design-system": { base: typography.base, ratio: typography.ratio },
      },
    },
    spacing: spacingGroup,
    borderRadius: radiusGroup,
    borderWidth: borderGroup,
    shadow: shadowGroup,
    motion: motionGroup,
    opacity: opacityGroup,
  };
}

export function tailwindConfig(
  colors: ResolvedToken[],
  typography: Typography,
  spacing: Spacing,
  radius: Radius,
  shadow: Shadow,
  motion: Motion,
  border: Border,
  opacity: Opacity,
): string {
  const colorEntries = colors
    .map((c) => `        ${c.role === "unassigned" ? c.id : c.role}: "${c.displayHex}",`)
    .join("\n");
  const sizeEntries = buildScale(typography)
    .map((s) => `        "${s.name}": "${s.rem}rem",`)
    .join("\n");
  const spacingEntries = buildSpacing(spacing.base)
    .map((s) => `        ${s.name}: "${s.px}px",`)
    .join("\n");
  const radiusEntries = buildRadius(radius.base)
    .map((r) => `        ${r.name}: "${r.px}px",`)
    .join("\n");
  const shadowEntries = (["sm", "md", "lg"] as const)
    .map((level) => `        ${level}: "${shadowToCss(shadow[level])}",`)
    .join("\n");
  const durationEntries = buildDurations(motion.base)
    .map((d) => `        ${d.name}: "${d.ms}ms",`)
    .join("\n");
  const borderEntries = buildBorderScale(border.base)
    .map((b) => `        ${b.name}: "${b.px}px",`)
    .join("\n");
  const opacityEntries = buildOpacityScale(opacity.base)
    .map((o) => `        ${o.name}: "${o.value}",`)
    .join("\n");
  return `module.exports = {
  theme: {
    extend: {
      colors: {
${colorEntries}
      },
      fontFamily: {
        sans: ${JSON.stringify(typography.fontFamily.split(",").map((s) => s.trim()))},
        heading: ${JSON.stringify(typography.headingFamily.split(",").map((s) => s.trim()))},
      },
      fontSize: {
${sizeEntries}
      },
      fontWeight: {
        body: "${typography.fontWeight}",
        heading: "${headingWeight(typography.fontWeight)}",
        bold: "${boldWeight(typography.fontWeight)}",
      },
      lineHeight: {
        body: "${typography.lineHeight}",
      },
      letterSpacing: {
        body: "${typography.letterSpacing}em",
      },
      spacing: {
${spacingEntries}
      },
      borderRadius: {
${radiusEntries}
      },
      borderWidth: {
${borderEntries}
      },
      boxShadow: {
${shadowEntries}
      },
      transitionDuration: {
${durationEntries}
      },
      transitionTimingFunction: {
        standard: "${EASING_PRESETS[motion.easing]}",
      },
      opacity: {
${opacityEntries}
      },
    },
  },
};
`;
}

export function cssVars(
  colors: ResolvedToken[],
  typography: Typography,
  spacing: Spacing,
  radius: Radius,
  shadow: Shadow,
  motion: Motion,
  border: Border,
  opacity: Opacity,
  darkColors?: ResolvedToken[] | null,
  semantic?: Semantic | null,
  darkSemantic?: Semantic | null,
): string {
  const colorLines = colors
    .map((c) => `  --color-${c.role === "unassigned" ? c.id : c.role}: ${c.displayHex};`)
    .join("\n");
  const semanticLines = semantic
    ? "\n" +
      SEMANTIC_KINDS.map((k) => `  --color-${k}: ${semantic[k]};`).join("\n")
    : "";
  const sizeLines = buildScale(typography)
    .map((s) => `  --font-size-${s.name}: ${s.rem}rem;`)
    .join("\n");
  const spacingLines = buildSpacing(spacing.base)
    .map((s) => `  --spacing-${s.name}: ${s.px}px;`)
    .join("\n");
  const radiusLines = buildRadius(radius.base)
    .map((r) => `  --radius-${r.name}: ${r.px}px;`)
    .join("\n");
  const shadowLines = (["sm", "md", "lg"] as const)
    .map((level) => `  --shadow-${level}: ${shadowToCss(shadow[level])};`)
    .join("\n");
  const durationLines = buildDurations(motion.base)
    .map((d) => `  --duration-${d.name}: ${d.ms}ms;`)
    .join("\n");
  const borderLines = buildBorderScale(border.base)
    .map((b) => `  --border-${b.name}: ${b.px}px;`)
    .join("\n");
  const opacityLines = buildOpacityScale(opacity.base)
    .map((o) => `  --opacity-${o.name}: ${o.value};`)
    .join("\n");
  const darkSemanticLines =
    darkColors && darkColors.length > 0 && darkSemantic
      ? "\n" + SEMANTIC_KINDS.map((k) => `    --color-${k}: ${darkSemantic[k]};`).join("\n")
      : "";
  const darkBlock =
    darkColors && darkColors.length > 0
      ? `\n@media (prefers-color-scheme: dark) {\n  :root {\n${darkColors
          .map((c) => `    --color-${c.role === "unassigned" ? c.id : c.role}: ${c.displayHex};`)
          .join("\n")}${darkSemanticLines}\n  }\n}\n`
      : "";
  return `:root {
${colorLines}${semanticLines}
  --font-family-body: ${typography.fontFamily};
  --font-family-heading: ${typography.headingFamily};
  --font-weight: ${typography.fontWeight};
  --font-weight-heading: ${headingWeight(typography.fontWeight)};
  --font-weight-bold: ${boldWeight(typography.fontWeight)};
  --line-height: ${typography.lineHeight};
  --letter-spacing: ${typography.letterSpacing}em;
${sizeLines}
${spacingLines}
${radiusLines}
${borderLines}
${shadowLines}
${durationLines}
  --easing-standard: ${EASING_PRESETS[motion.easing]};
${opacityLines}
}
${darkBlock}`;
}

export function aiPrompt(
  colors: ResolvedToken[],
  typography: Typography,
  spacing: Spacing,
  radius: Radius,
  shadow: Shadow,
  motion: Motion,
  border: Border,
  opacity: Opacity,
  darkColors?: ResolvedToken[] | null,
  semantic?: Semantic | null,
  darkSemantic?: Semantic | null,
): string {
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
  const primary = sorted.find((c) => c.role === "primary") ?? sorted[1];
  const rootBlock = cssVars(colors, typography, spacing, radius, shadow, motion, border, opacity, darkColors, semantic, darkSemantic);
  const semanticSection = semantic
    ? `
## Status colors
Use these for feedback only — never as brand/UI surface colors. \`--color-success\` ${semantic.success} (confirmations), \`--color-warning\` ${semantic.warning} (cautions), \`--color-error\` ${semantic.error} (errors/destructive), \`--color-info\` ${semantic.info} (informational). Reference via \`var(--color-…)\`.${darkSemantic ? " In dark mode the `@media` block above overrides these with the dark-background variants — same convention as the brand colors." : ""}
`
    : "";
  const darkSection =
    darkColors && darkColors.length > 0
      ? `
## Dark mode
The \`@media (prefers-color-scheme: dark)\` block above overrides COLOR variables only — every other token (type, spacing, radius, shadow, motion) stays identical in dark mode. Do not hand-pick dark colors or adjust non-color tokens for dark mode; the block is authoritative.
`
      : "";
  return `# Design system

## Machine-readable tokens — COPY THIS BLOCK VERBATIM
Paste the \`:root\` below into your \`<style>\` exactly as written, then reference
every value through \`var(--…)\`. This block is the single source of truth.

Hard rules:
- Do NOT redefine, round, rescale, or re-derive any value. Copy it character for character.
- Do NOT introduce colors, fonts, font-sizes, spacing, radii, or shadows that are not declared here.
- If you need a lighter/darker shade of a color, derive it in OKLCH by changing lightness only — keep hue and chroma fixed. Do not invent a new hue.
- Every length in your CSS must be a \`var(--…)\` reference. Do NOT convert a \`px\` token to \`rem\` (or any other unit) — reference it as-is. Spacing, radius, and border vars are in \`px\`; font sizes are in \`rem\`; keep each as declared.

\`\`\`css
${rootBlock}\`\`\`

The prose below explains the intent behind these tokens. When prose and the \`:root\` block disagree, the block wins.

---

When generating UI from this token set, respect the following proportions and roles. The percentages reflect how much of the source design each color occupies — use them as a guide for surface area in the output.

## Color palette
${palette}

The dominant background should occupy roughly ${(dominant.proportion * 100).toFixed(0)}% of the layout.

Bind colors to roles exactly as the design tool renders them — do NOT swap primary and accent:

- **primary (${primary.displayHex})** is the main interactive fill: primary buttons / CTAs, active nav item, key links, the logo mark. This is the button color.
- **accent (${accent.displayHex})** is for SECONDARY emphasis only: badges/chips, chart & graphic accents, small highlights — typically ${Math.min(15, Math.round(accent.proportion * 100))}% or less of any screen. Do not use accent as the primary button fill.
- **muted** for secondary/placeholder text, **border** for hairlines and dividers.

## Typography
Base size ${typography.base}px, modular scale ratio ${typography.ratio}.

${scale}

Body family: ${typography.fontFamily}
Heading family: ${typography.headingFamily}
Line-height: ${typography.lineHeight}, letter-spacing: ${typography.letterSpacing}em. There are three explicit font weights — bind them by role, and never let the browser default an element's weight:

- **\`--font-weight\` (${typography.fontWeight})** → body text, labels, and any non-heading copy.
- **\`--font-weight-heading\` (${headingWeight(typography.fontWeight)})** → all headings h1–h5. Set this on every heading; do NOT leave headings at the body weight.
- **\`--font-weight-bold\` (${boldWeight(typography.fontWeight)})** → emphasis only: primary CTA labels, \`<strong>\`, badges.

## Spacing
Base unit ${spacing.base}px. Use this 8-step scale for padding/margin/gap:

${buildSpacing(spacing.base).map((s) => `- ${s.name}: ${s.px}px`).join("\n")}

Bind padding & gaps to these steps exactly as the design tool renders them —
padding is written as \`vertical horizontal\`:

- **Primary / prominent CTA button** → \`--spacing-sm\` \`--spacing-lg\` (e.g. \`padding: var(--spacing-sm) var(--spacing-lg)\`) — a taller, comfortable target.
- **Compact buttons / inputs / chips** → \`--spacing-xxs\` \`--spacing-sm\`.
- **List rows / nav items / card header & footer** → \`--spacing-xs\` \`--spacing-md\`.
- **Card / panel / modal body** → \`--spacing-md\` on all sides.
- **Gap between sibling controls, grid/flex gaps** → \`--spacing-sm\`.
- **Vertical rhythm between page sections** → \`--spacing-xl\` … \`--spacing-section\`.

Only use listed values; never improvise an intermediate gap.

## Border radius
Base ${radius.base}px. Use:

${buildRadius(radius.base).map((r) => `- ${r.name}: ${r.name === "full" ? "9999px (pill)" : `${r.px}px`}`).join("\n")}

Bind components to these steps exactly as the design tool renders them — do NOT
pick a step freely (e.g. do not make buttons pill-shaped unless \`--radius-md\`
resolves to a pill):

- **Buttons / controls / nav items** → \`--radius-md\`
- **Inputs / text fields / selects** → \`--radius-sm\`
- **Cards / panels / modals / larger surfaces** → \`--radius-lg\`
- **Badges / chips / avatars / toggles (intentionally pill)** → \`--radius-full\`
- Bigger containers may use \`--radius-xl\`; \`--radius-full\` is reserved for
  circles/pills, never for standard buttons or cards.

## Shadow / elevation
${shadow.advanced ? "Per-level custom values" : `Intensity ${shadow.intensity.toFixed(2)}`}.

${(["sm", "md", "lg"] as const).map((level) => `- ${level}: ${shadowToCss(shadow[level])}`).join("\n")}

Bind each level to an elevation exactly as the design tool renders them — do NOT
pick a level freely:

- **sm** → resting surfaces: cards, panels, subtle raise (the default for a raised element).
- **md** → hovered / lifted state: a card or button on hover, raised popovers.
- **lg** → floating overlays: modals, drawers, dropdowns, menus above the page.

Flat elements (nav bar, page background, inline controls) get NO shadow. On hover, step a card up one level (sm → md), don't jump straight to lg.

## Border width
${buildBorderScale(border.base).map((b) => `- ${b.name}: ${b.px}px`).join("\n")}

Bind each width as the design tool renders them:

- **default** → all resting borders: card outlines, input borders, dividers.
- **strong** → focused / active / selected emphasis (e.g. an input grows from \`default\` to \`strong\` on focus). Do not use \`strong\` for ordinary resting borders.

## Opacity / transparency
These drive interactive states — wire them up, don't leave them unused. Apply each via \`var(--opacity-…)\` (or an rgba/overlay at that alpha):

${buildOpacityScale(opacity.base).map((o) => `- ${o.name} (${(o.value * 100).toFixed(1)}%): ${OPACITY_USAGE[o.name] ?? "interactive state"}`).join("\n")}

Every clickable element (buttons, links, cards) should show a hover state and a disabled state using these values. Use \`overlay\` for scrims behind modals/drawers.

## Motion / Animation
Base duration ${motion.base}ms, easing: ${motion.easing} (${EASING_PRESETS[motion.easing]}).

${buildDurations(motion.base).map((d) => `- ${d.name}: ${d.ms}ms`).join("\n")}

Use \`--duration-normal\` as the default transition. Prefer \`--duration-fast\` for hover states and micro-interactions. Reserve \`--duration-page\` for route/page-level transitions.
${darkSection}${semanticSection}
## Output guidance
- Maintain the proportional relationships above when laying out a page.
- Do not introduce new hues. If you need additional shades, derive them by adjusting OKLCH lightness only, keeping hue and chroma fixed.
- Respect the modular scale — pick from the listed sizes rather than introducing new ones.
- Use only the listed spacing values; do not improvise intermediate gaps.
- ${SCALE_STEPS.length} type sizes is intentional. Use semantic mapping: h1-h5 for headings, body for paragraphs, small/caption for metadata.
`;
}

// Tokens Studio (Figma "Tokens Studio" plugin) format — designers import this
// JSON to get colors/type/spacing/etc. as Figma variables & styles. Note this
// schema uses `value`/`type` (not W3C's `$value`/`$type`) and string values.
export function tokensStudioJson(
  colors: ResolvedToken[],
  typography: Typography,
  spacing: Spacing,
  radius: Radius,
  shadow: Shadow,
  motion: Motion,
  border: Border,
  opacity: Opacity,
): string {
  const tok = (value: unknown, type: string) => ({ value, type });

  const color: Record<string, unknown> = {};
  for (const c of colors) {
    color[c.role === "unassigned" ? c.id : c.role] = tok(c.displayHex, "color");
  }
  const fontSizes: Record<string, unknown> = {};
  for (const s of buildScale(typography)) fontSizes[s.name] = tok(`${s.px}`, "fontSizes");
  const spacingGroup: Record<string, unknown> = {};
  for (const s of buildSpacing(spacing.base)) spacingGroup[s.name] = tok(`${s.px}`, "spacing");
  const borderRadius: Record<string, unknown> = {};
  for (const r of buildRadius(radius.base)) borderRadius[r.name] = tok(`${r.px}`, "borderRadius");
  const borderWidth: Record<string, unknown> = {};
  for (const b of buildBorderScale(border.base)) borderWidth[b.name] = tok(`${b.px}`, "borderWidth");
  const boxShadow: Record<string, unknown> = {};
  for (const level of ["sm", "md", "lg"] as const) {
    const s = shadow[level];
    boxShadow[level] = tok(
      { x: "0", y: `${s.offsetY}`, blur: `${s.blur}`, spread: "0", color: `rgba(0,0,0,${s.opacity})`, type: "dropShadow" },
      "boxShadow",
    );
  }
  const opacityGroup: Record<string, unknown> = {};
  for (const o of buildOpacityScale(opacity.base)) {
    opacityGroup[o.name] = tok(`${Math.round(o.value * 100)}%`, "opacity");
  }

  return JSON.stringify(
    {
      global: {
        color,
        fontFamilies: {
          body: tok(typography.fontFamily, "fontFamilies"),
          heading: tok(typography.headingFamily, "fontFamilies"),
        },
        fontWeights: {
          body: tok(`${typography.fontWeight}`, "fontWeights"),
          heading: tok(`${headingWeight(typography.fontWeight)}`, "fontWeights"),
          bold: tok(`${boldWeight(typography.fontWeight)}`, "fontWeights"),
        },
        fontSizes,
        lineHeights: { body: tok(`${typography.lineHeight}`, "lineHeights") },
        letterSpacing: { body: tok(`${typography.letterSpacing}em`, "letterSpacing") },
        spacing: spacingGroup,
        borderRadius,
        borderWidth,
        boxShadow,
        opacity: opacityGroup,
        motion: Object.fromEntries(
          buildDurations(motion.base).map((d) => [d.name, tok(`${d.ms}ms`, "other")]),
        ),
      },
    },
    null,
    2,
  );
}

// Self-contained, distributable design-system file.
//
// One markdown document that serves three readers at once:
//  - humans: the prose sections render on GitHub / in any editor
//  - AI agents: the verbatim `:root` contract in the prose — an agent reads the
//    file and generates UI against it, using ITS OWN compute (no server round-trip)
//  - tools (the companion CLI): the fenced ```json block at the bottom is the
//    W3C token set for exact, deterministic conversion to css/tailwind
//
// Flow: export this from the web app → drop it in a repo → the agent reads it.
// The CLI is optional; the file alone is enough for an agent.
export function designSystemMarkdown(
  colors: ResolvedToken[],
  typography: Typography,
  spacing: Spacing,
  radius: Radius,
  shadow: Shadow,
  motion: Motion,
  border: Border,
  opacity: Opacity,
  darkColors?: ResolvedToken[] | null,
  semantic?: Semantic | null,
  darkSemantic?: Semantic | null,
): string {
  const prompt = aiPrompt(colors, typography, spacing, radius, shadow, motion, border, opacity, darkColors, semantic, darkSemantic);
  const tokens = w3cTokens(colors, typography, spacing, radius, shadow, motion, border, opacity, darkColors, semantic, darkSemantic);
  const generated = new Date().toISOString().slice(0, 10);
  return `---
design-system: 1
generated: ${generated}
---

${prompt}
---

## 机器可读 tokens (W3C Design Tokens)

人类和 AI 读上面的说明即可。下面这段 JSON 供工具（配套 CLI）精确、确定性地还原设计系统并转成 CSS / Tailwind 等格式。

\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`
`;
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
