import type { Typography } from "./store";

export type TypeScale = { name: string; px: number; rem: number };

export const SCALE_STEPS = [
  { name: "h1", step: 5 },
  { name: "h2", step: 4 },
  { name: "h3", step: 3 },
  { name: "h4", step: 2 },
  { name: "h5", step: 1 },
  { name: "body", step: 0 },
  { name: "small", step: -1 },
  { name: "caption", step: -2 },
] as const;

export function buildScale(t: Typography): TypeScale[] {
  return SCALE_STEPS.map(({ name, step }) => {
    const px = Math.round(t.base * Math.pow(t.ratio, step) * 100) / 100;
    return { name, px, rem: Math.round((px / 16) * 1000) / 1000 };
  });
}
