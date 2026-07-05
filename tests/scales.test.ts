import { describe, it, expect } from "vitest";
import {
  buildSpacing,
  buildRadius,
  buildShadowsFromIntensity,
  shadowToCss,
  buildDurations,
  buildBorderScale,
  buildOpacityScale,
  boldWeight,
  headingWeight,
  SPACING_STEPS,
  SHADOW_DEFAULTS,
} from "../lib/scales";

describe("buildSpacing", () => {
  it("derives the 8-step scale from the base", () => {
    const scale = buildSpacing(4);
    expect(scale).toHaveLength(SPACING_STEPS.length);
    expect(scale[0]).toEqual({ name: "xxs", px: 4 });
    expect(scale.find((s) => s.name === "md")?.px).toBe(16);
    expect(scale.find((s) => s.name === "section")?.px).toBe(96);
  });

  it("is strictly increasing for any positive base", () => {
    for (const base of [2, 4, 5.5, 8]) {
      const px = buildSpacing(base).map((s) => s.px);
      for (let i = 1; i < px.length; i++) expect(px[i]).toBeGreaterThan(px[i - 1]);
    }
  });
});

describe("buildRadius", () => {
  it("derives sm..xl from base and pins full at 9999", () => {
    const scale = buildRadius(8);
    expect(scale.find((r) => r.name === "sm")?.px).toBe(4);
    expect(scale.find((r) => r.name === "md")?.px).toBe(8);
    expect(scale.find((r) => r.name === "xl")?.px).toBe(16);
    expect(scale.find((r) => r.name === "full")?.px).toBe(9999);
  });

  it("keeps full pinned even at base 0", () => {
    const scale = buildRadius(0);
    expect(scale.find((r) => r.name === "md")?.px).toBe(0);
    expect(scale.find((r) => r.name === "full")?.px).toBe(9999);
  });
});

describe("buildShadowsFromIntensity", () => {
  it("returns the documented defaults at intensity 0.5", () => {
    expect(buildShadowsFromIntensity(0.5)).toEqual(SHADOW_DEFAULTS);
  });

  it("returns no shadow at intensity 0", () => {
    const s = buildShadowsFromIntensity(0);
    for (const level of [s.sm, s.md, s.lg]) {
      expect(level.blur).toBe(0);
      expect(level.offsetY).toBe(0);
      expect(level.opacity).toBe(0);
    }
  });

  it("doubles the defaults at intensity 1", () => {
    const s = buildShadowsFromIntensity(1);
    expect(s.md.blur).toBe(SHADOW_DEFAULTS.md.blur * 2);
    expect(s.md.opacity).toBeCloseTo(SHADOW_DEFAULTS.md.opacity * 2);
  });

  it("clamps negative intensity to zero instead of inverting", () => {
    const s = buildShadowsFromIntensity(-1);
    expect(s.lg.blur).toBe(0);
    expect(s.lg.opacity).toBe(0);
  });
});

describe("shadowToCss", () => {
  it("serializes in the exact format importTokens parses back", () => {
    expect(shadowToCss({ blur: 12, offsetY: 4, opacity: 0.08 })).toBe(
      "0 4px 12px 0 rgba(0,0,0,0.080)",
    );
  });
});

describe("buildDurations", () => {
  it("derives the 5 duration steps and keeps normal == base", () => {
    const d = buildDurations(200);
    expect(d.find((x) => x.name === "normal")?.ms).toBe(200);
    expect(d.find((x) => x.name === "micro")?.ms).toBe(80);
    expect(d.find((x) => x.name === "page")?.ms).toBe(500);
  });
});

describe("buildBorderScale", () => {
  it("derives default and strong (2x, rounded to 0.5)", () => {
    expect(buildBorderScale(1)).toEqual([
      { name: "default", px: 1 },
      { name: "strong", px: 2 },
    ]);
    expect(buildBorderScale(1.25).find((b) => b.name === "strong")?.px).toBe(2.5);
  });
});

describe("buildOpacityScale", () => {
  it("derives interactive states from base and pins disabled/overlay", () => {
    const o = Object.fromEntries(buildOpacityScale(0.08).map((x) => [x.name, x.value]));
    expect(o.hover).toBe(0.08);
    expect(o.pressed).toBe(0.12);
    expect(o.focus).toBe(0.16);
    expect(o.disabled).toBe(0.38);
    expect(o.overlay).toBe(0.5);
  });
});

describe("font weights", () => {
  it("boldWeight gives a light body a real bold and clamps at 900", () => {
    expect(boldWeight(300)).toBe(600);
    expect(boldWeight(400)).toBe(700);
    expect(boldWeight(700)).toBe(900);
    expect(boldWeight(900)).toBe(900);
  });

  it("headingWeight is one notch heavier, clamped at 900", () => {
    expect(headingWeight(400)).toBe(600);
    expect(headingWeight(800)).toBe(900);
  });
});
