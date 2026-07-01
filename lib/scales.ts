// Spacing / radius / shadow derivation utilities.
// Mirrors the modular scale approach used by lib/typography.ts so the same
// "single base slider drives the whole token set" UX works here.

export type ScaleEntry = { name: string; px: number };

export const SPACING_STEPS = [
  { name: "xxs", mul: 1 },
  { name: "xs", mul: 2 },
  { name: "sm", mul: 3 },
  { name: "md", mul: 4 },
  { name: "lg", mul: 6 },
  { name: "xl", mul: 8 },
  { name: "xxl", mul: 12 },
  { name: "section", mul: 24 },
] as const;

export const RADIUS_STEPS = [
  { name: "sm", mul: 0.5 },
  { name: "md", mul: 1 },
  { name: "lg", mul: 1.5 },
  { name: "xl", mul: 2 },
  { name: "full", px: 9999 },
] as const;

export function buildSpacing(base: number): ScaleEntry[] {
  return SPACING_STEPS.map(({ name, mul }) => ({
    name,
    px: Math.round(base * mul * 100) / 100,
  }));
}

export function buildRadius(base: number): ScaleEntry[] {
  return RADIUS_STEPS.map((step) => ({
    name: step.name,
    px: "px" in step ? step.px : Math.round(base * step.mul * 100) / 100,
  }));
}

export type ShadowToken = { blur: number; offsetY: number; opacity: number };
export type ShadowLevels = { sm: ShadowToken; md: ShadowToken; lg: ShadowToken };

// Reference values at intensity 0.5 (multiplier 1). Exported so advanced-mode
// sliders can express their value as a multiplier × these defaults.
export const SHADOW_DEFAULTS: ShadowLevels = {
  sm: { blur: 4, offsetY: 1, opacity: 0.04 },
  md: { blur: 12, offsetY: 4, opacity: 0.08 },
  lg: { blur: 24, offsetY: 8, opacity: 0.12 },
};

// intensity = 0 → no shadow; 0.5 → defaults; 1 → 2× defaults
export function buildShadowsFromIntensity(intensity: number): ShadowLevels {
  const scale = Math.max(0, intensity * 2);
  const apply = (d: ShadowToken): ShadowToken => ({
    blur: Math.round(d.blur * scale),
    offsetY: Math.round(d.offsetY * scale * 10) / 10,
    opacity: Math.round(d.opacity * scale * 1000) / 1000,
  });
  return {
    sm: apply(SHADOW_DEFAULTS.sm),
    md: apply(SHADOW_DEFAULTS.md),
    lg: apply(SHADOW_DEFAULTS.lg),
  };
}

export function shadowToCss(s: ShadowToken): string {
  return `0 ${s.offsetY}px ${s.blur}px 0 rgba(0,0,0,${s.opacity.toFixed(3)})`;
}

// ── Motion / duration ──────────────────────────────────────────────────────

export const DURATION_STEPS = [
  { name: "micro",  mul: 0.4 },
  { name: "fast",   mul: 0.75 },
  { name: "normal", mul: 1 },
  { name: "slow",   mul: 1.5 },
  { name: "page",   mul: 2.5 },
] as const;

export type DurationEntry = { name: string; ms: number };

export function buildDurations(base: number): DurationEntry[] {
  return DURATION_STEPS.map(({ name, mul }) => ({
    name,
    ms: Math.round(base * mul),
  }));
}

export const EASING_PRESETS = {
  "ease-out":    "cubic-bezier(0.0, 0, 0.2, 1)",
  "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
  spring:        "cubic-bezier(0.34, 1.56, 0.64, 1)",
  linear:        "linear",
  "ease-in":     "cubic-bezier(0.4, 0, 1, 1)",
} as const;

export type EasingPreset = keyof typeof EASING_PRESETS;

// ── Border ─────────────────────────────────────────────────────────────────

export type BorderEntry = { name: string; px: number };

const round05 = (v: number) => Math.round(v * 2) / 2;

export function buildBorderScale(base: number): BorderEntry[] {
  return [
    { name: "default", px: base },
    { name: "strong",  px: round05(base * 2) },
  ];
}

// ── Font weight ──────────────────────────────────────────────────────────────

// The store keeps one body weight; emphasis (CTA buttons, <strong>, badges)
// needs a heavier companion. Derive it so a Light (300) body still gets a real
// bold, and clamp at 900.
export function boldWeight(base: number): number {
  return Math.min(900, Math.max(base + 300, 600));
}

// Heading weight — one notch heavier than body so headings read bolder without
// jumping all the way to the emphasis `boldWeight`. Body 400 → headings 600
// (semibold). Clamp at 900. The whole app (specimen, board, export) derives the
// heading weight through this one helper so they never drift apart.
export function headingWeight(base: number): number {
  return Math.min(900, base + 200);
}

// ── Opacity ─────────────────────────────────────────────────────────────────

export type OpacityEntry = { name: string; value: number };

export function buildOpacityScale(base: number): OpacityEntry[] {
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return [
    { name: "hover",    value: r(base) },
    { name: "pressed",  value: r(base * 1.5) },
    { name: "focus",    value: r(base * 2) },
    { name: "disabled", value: 0.38 },
    // Modal/drawer backdrop scrim — a fixed, perceptible dim (not tied to the
    // tiny interactive base, which made it ~0.04 = invisible).
    { name: "overlay",  value: 0.5 },
  ];
}
