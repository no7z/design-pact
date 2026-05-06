import type { ColorToken, Typography } from "./store";
import { buildScale, SCALE_STEPS } from "./typography";
import { oklchString } from "./color";

export type ResolvedToken = ColorToken & { displayHex: string };

export function w3cTokens(colors: ResolvedToken[], typography: Typography) {
  const colorGroup: Record<string, unknown> = {};
  for (const c of colors) {
    const key = c.role === "unassigned" ? c.id : c.role;
    colorGroup[key] = {
      $value: c.displayHex,
      $type: "color",
      $extensions: {
        "ui-generator": { proportion: c.proportion, oklch: oklchString(c.displayHex) },
      },
    };
  }
  const fontSizes: Record<string, unknown> = {};
  for (const s of buildScale(typography)) {
    fontSizes[s.name] = { $value: `${s.rem}rem`, $type: "dimension" };
  }
  return {
    color: colorGroup,
    typography: {
      fontFamily: {
        body: { $value: typography.fontFamily, $type: "fontFamily" },
        heading: { $value: typography.headingFamily, $type: "fontFamily" },
      },
      fontSize: fontSizes,
      $extensions: {
        "ui-generator": { base: typography.base, ratio: typography.ratio },
      },
    },
  };
}

export function tailwindConfig(colors: ResolvedToken[], typography: Typography): string {
  const colorEntries = colors
    .map((c) => `        ${c.role === "unassigned" ? c.id : c.role}: "${c.displayHex}",`)
    .join("\n");
  const sizeEntries = buildScale(typography)
    .map((s) => `        "${s.name}": "${s.rem}rem",`)
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
    },
  },
};
`;
}

export function cssVars(colors: ResolvedToken[], typography: Typography): string {
  const colorLines = colors
    .map((c) => `  --color-${c.role === "unassigned" ? c.id : c.role}: ${c.displayHex};`)
    .join("\n");
  const sizeLines = buildScale(typography)
    .map((s) => `  --font-size-${s.name}: ${s.rem}rem;`)
    .join("\n");
  return `:root {
${colorLines}
  --font-family-body: ${typography.fontFamily};
  --font-family-heading: ${typography.headingFamily};
${sizeLines}
}
`;
}

export function aiPrompt(colors: ResolvedToken[], typography: Typography): string {
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

## Output guidance
- Maintain the proportional relationships above when laying out a page.
- Do not introduce new hues. If you need additional shades, derive them by adjusting OKLCH lightness only, keeping hue and chroma fixed.
- Respect the modular scale — pick from the listed sizes rather than introducing new ones.
- ${SCALE_STEPS.length} type sizes is intentional. Use semantic mapping: h1-h5 for headings, body for paragraphs, small/caption for metadata.
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
