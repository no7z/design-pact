import { describe, it, expect } from "vitest";
import { buildScale, SCALE_STEPS } from "../lib/typography";
import { defaultTypography } from "../lib/tokens-core";

describe("buildScale", () => {
  it("keeps body pinned to the base size", () => {
    const scale = buildScale(defaultTypography);
    const body = scale.find((s) => s.name === "body");
    expect(body?.px).toBe(16);
    expect(body?.rem).toBe(1);
  });

  it("derives all 8 steps, strictly decreasing from h1 to caption", () => {
    const scale = buildScale(defaultTypography);
    expect(scale).toHaveLength(SCALE_STEPS.length);
    for (let i = 1; i < scale.length; i++) {
      expect(scale[i].px).toBeLessThan(scale[i - 1].px);
    }
  });

  it("scales h1 by ratio^5", () => {
    const t = { ...defaultTypography, base: 16, ratio: 1.25 };
    const h1 = buildScale(t).find((s) => s.name === "h1");
    expect(h1?.px).toBeCloseTo(16 * Math.pow(1.25, 5), 1);
  });

  it("ratio changes leave body untouched", () => {
    const a = buildScale({ ...defaultTypography, ratio: 1.1 });
    const b = buildScale({ ...defaultTypography, ratio: 1.5 });
    expect(a.find((s) => s.name === "body")?.px).toBe(b.find((s) => s.name === "body")?.px);
    expect(b.find((s) => s.name === "h1")!.px).toBeGreaterThan(a.find((s) => s.name === "h1")!.px);
  });
});
