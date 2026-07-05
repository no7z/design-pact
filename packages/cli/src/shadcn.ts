// shadcn/ui theme from the design.md W3C block.
//
// shadcn themes through a fixed set of CSS variables (HSL triplets, a `.dark`
// class block) in globals.css. This maps our six roles + semantic colors onto
// that convention so an entire shadcn component tree adopts the contract in
// one paste. Deterministic, same zero-drift approach as tailwind.ts: parsed
// from the exported JSON, converted with culori, no re-derivation of values.
//
// Mapping notes (shadcn semantics differ from ours in two places):
//  - shadcn's `secondary` / `muted` / `accent` are SUBTLE SURFACES (hover
//    backgrounds, muted panels), not brand colors — they map to the border
//    tone, with foregrounds from the palette. Our vivid brand accent instead
//    lands in `--chart-2`, where a second brand color actually shows up.
//  - `*-foreground` companions are picked by WCAG contrast between the
//    palette's own background/foreground against the surface, so no color
//    outside the contract is ever introduced.

import { converter } from "culori";
import { parseW3CTokens } from "../../../lib/importTokens";
import { contrastRatio } from "../../../lib/color";
import { defaultRadius } from "../../../lib/tokens-core";

const toHsl = converter("hsl");

/** #rrggbb → shadcn HSL triplet, e.g. "217.2 91.2% 59.8%". */
export function hexToHslTriplet(hex: string): string {
  const c = toHsl(hex);
  if (!c) return "0 0% 0%";
  const h = Number.isFinite(c.h) ? (c.h as number) : 0;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return `${r1(h)} ${r1((c.s ?? 0) * 100)}% ${r1((c.l ?? 0) * 100)}%`;
}

/** The candidate (bg or fg) that reads best on the given surface. */
function onColor(surface: string, bg: string, fg: string): string {
  return contrastRatio(fg, surface) >= contrastRatio(bg, surface) ? fg : bg;
}

type Face = Record<string, string>; // role → hex

function faceVars(f: Face, destructive: string): [string, string][] {
  const on = (surface: string) => onColor(surface, f.background, f.foreground);
  return [
    ["background", f.background],
    ["foreground", f.foreground],
    ["card", f.background],
    ["card-foreground", f.foreground],
    ["popover", f.background],
    ["popover-foreground", f.foreground],
    ["primary", f.primary],
    ["primary-foreground", on(f.primary)],
    ["secondary", f.border],
    ["secondary-foreground", f.foreground],
    ["muted", f.border],
    ["muted-foreground", f.muted],
    ["accent", f.border],
    ["accent-foreground", f.foreground],
    ["destructive", destructive],
    ["destructive-foreground", on(destructive)],
    ["border", f.border],
    ["input", f.border],
    ["ring", f.primary],
    ["chart-1", f.primary],
    ["chart-2", f.accent],
    ["chart-3", f.chart3],
    ["chart-4", f.chart4],
    ["chart-5", f.chart5],
  ];
}

const asObj = (x: unknown): Record<string, unknown> | undefined =>
  x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : undefined;

/** semantic.<kind> light + dark hexes straight from the raw W3C JSON. */
function semanticPair(w3c: unknown, kind: string): { light?: string; dark?: string } {
  const node = asObj(asObj(asObj(w3c)?.semantic)?.[kind]);
  const light = typeof node?.$value === "string" ? node.$value : undefined;
  const dark = asObj(asObj(node?.$extensions)?.["design-pact"])?.dark;
  return { light, dark: typeof dark === "string" ? dark : undefined };
}

export function shadcnFromW3C(jsonText: string): string {
  const p = parseW3CTokens(jsonText);
  const w3c = JSON.parse(jsonText);

  const light: Face = {};
  const dark: Face = {};
  p.colors.forEach((c, i) => {
    light[c.role] = c.hex;
    dark[c.role] = p.darkHexes?.[i] ?? c.hex;
  });
  for (const face of [light, dark]) {
    for (const role of ["background", "foreground", "primary", "accent", "muted", "border"]) {
      if (!face[role]) {
        throw new Error(
          `design.md is missing the ${role} role — cannot build a shadcn theme without all six roles.`,
        );
      }
    }
  }

  const err = semanticPair(w3c, "error");
  const success = semanticPair(w3c, "success");
  const warning = semanticPair(w3c, "warning");
  const info = semanticPair(w3c, "info");
  // Charts 3-5 use the status hues when present; otherwise repeat the brand
  // pair rather than inventing colors.
  light.chart3 = success.light ?? light.primary;
  light.chart4 = warning.light ?? light.accent;
  light.chart5 = info.light ?? light.primary;
  dark.chart3 = success.dark ?? success.light ?? dark.primary;
  dark.chart4 = warning.dark ?? warning.light ?? dark.accent;
  dark.chart5 = info.dark ?? info.light ?? dark.primary;

  const radiusPx = p.radius?.base ?? defaultRadius.base;
  const radiusRem = Math.round((radiusPx / 16) * 1000) / 1000;

  const block = (vars: [string, string][], indent: string) =>
    vars.map(([k, v]) => `${indent}--${k}: ${hexToHslTriplet(v)};`).join("\n");

  return `/* shadcn/ui theme — generated from design.md by design-pact.
 * Paste into your globals.css (replacing the existing :root/.dark theme
 * blocks). Values are HSL triplets as shadcn expects; toggle dark mode with
 * the "dark" class. */

:root {
${block(faceVars(light, err.light ?? light.primary), "  ")}
  --radius: ${radiusRem}rem;
}

.dark {
${block(faceVars(dark, err.dark ?? err.light ?? dark.primary), "  ")}
}
`;
}
