import { converter, formatHex, parse, formatCss, type Oklch } from "culori";

const toOklch = converter("oklch");
const toRgb = converter("rgb");

export function hexToOklch(hex: string): Oklch {
  const c = toOklch(parse(hex));
  if (!c) return { mode: "oklch", l: 0, c: 0, h: 0 };
  return { ...c, h: c.h ?? 0 };
}

export function oklchToHex(c: Oklch): string {
  const rgb = toRgb(c);
  if (!rgb) return "#000000";
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return formatHex({ ...rgb, r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b) }) || "#000000";
}

export function adjustHex(
  hex: string,
  delta: { dL: number; dC: number; dH: number },
): string {
  const c = hexToOklch(hex);
  return oklchToHex({
    mode: "oklch",
    l: Math.max(0, Math.min(1, c.l + delta.dL)),
    c: Math.max(0, c.c + delta.dC),
    h: ((c.h ?? 0) + delta.dH + 360) % 360,
  });
}

export function relativeLuminance(hex: string): number {
  const rgb = toRgb(parse(hex));
  if (!rgb) return 0;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function oklchString(hex: string): string {
  const c = hexToOklch(hex);
  return formatCss(c) || "";
}
