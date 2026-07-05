import { describe, it, expect } from "vitest";
import { hexToHslTriplet, shadcnFromW3C } from "../packages/cli/src/shadcn";
import { designSystemMarkdown, type ResolvedToken } from "../lib/export";
import { parseDesignSystem } from "../packages/cli/src/parse";
import {
  defaultTypography, defaultSpacing, defaultShadow,
  defaultMotion, defaultBorder, defaultOpacity,
  type Semantic,
} from "../lib/tokens-core";

describe("hexToHslTriplet", () => {
  it("formats shadcn-style HSL triplets", () => {
    expect(hexToHslTriplet("#ffffff")).toBe("0 0% 100%");
    expect(hexToHslTriplet("#000000")).toBe("0 0% 0%");
    expect(hexToHslTriplet("#ff0000")).toBe("0 100% 50%");
    expect(hexToHslTriplet("#00ff00")).toBe("120 100% 50%");
  });
});

const PALETTE: ResolvedToken[] = [
  { id: "c1", hex: "#ffffff", baseHex: "#ffffff", proportion: 0.55, role: "background", displayHex: "#ffffff" },
  { id: "c2", hex: "#1a1a1a", baseHex: "#1a1a1a", proportion: 0.2, role: "foreground", displayHex: "#1a1a1a" },
  { id: "c3", hex: "#2f6df6", baseHex: "#2f6df6", proportion: 0.1, role: "primary", displayHex: "#2f6df6" },
  { id: "c4", hex: "#7c3aed", baseHex: "#7c3aed", proportion: 0.06, role: "accent", displayHex: "#7c3aed" },
  { id: "c5", hex: "#6b7280", baseHex: "#6b7280", proportion: 0.05, role: "muted", displayHex: "#6b7280" },
  { id: "c6", hex: "#e5e7eb", baseHex: "#e5e7eb", proportion: 0.04, role: "border", displayHex: "#e5e7eb" },
];
const DARK: ResolvedToken[] = PALETTE.map((c) => ({
  ...c,
  displayHex: c.role === "background" ? "#0f1115" : c.role === "foreground" ? "#e6e8ec" : c.displayHex,
  hex: c.role === "background" ? "#0f1115" : c.role === "foreground" ? "#e6e8ec" : c.hex,
}));
const SEMANTIC: Semantic = { success: "#16a34a", warning: "#d97706", error: "#dc2626", info: "#2563eb" };
const DARK_SEMANTIC: Semantic = { success: "#34d17a", warning: "#f3a33c", error: "#f26b66", info: "#5b9df5" };

function w3cText(): string {
  const md = designSystemMarkdown(
    PALETTE, defaultTypography, defaultSpacing, { base: 8 }, defaultShadow,
    defaultMotion, defaultBorder, defaultOpacity, DARK, SEMANTIC, DARK_SEMANTIC,
  );
  return parseDesignSystem(md).w3cText;
}

describe("shadcnFromW3C", () => {
  const css = shadcnFromW3C(w3cText());

  it("emits :root and .dark blocks", () => {
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
  });

  it("maps the brand roles onto shadcn variables as HSL triplets", () => {
    expect(css).toContain(`--primary: ${hexToHslTriplet("#2f6df6")};`);
    expect(css).toContain(`--border: ${hexToHslTriplet("#e5e7eb")};`);
    expect(css).toContain(`--muted-foreground: ${hexToHslTriplet("#6b7280")};`);
    expect(css).toContain(`--ring: ${hexToHslTriplet("#2f6df6")};`);
    // brand accent lands in chart-2, not shadcn's subtle `accent` surface
    expect(css).toContain(`--chart-2: ${hexToHslTriplet("#7c3aed")};`);
    expect(css).toContain(`--accent: ${hexToHslTriplet("#e5e7eb")};`);
  });

  it("picks the readable foreground for primary from within the palette", () => {
    // white on #2f6df6 beats near-black on it
    expect(css).toContain(`--primary-foreground: ${hexToHslTriplet("#ffffff")};`);
  });

  it("maps semantic error to destructive, per face", () => {
    expect(css).toContain(`--destructive: ${hexToHslTriplet("#dc2626")};`);
    expect(css).toContain(`--destructive: ${hexToHslTriplet("#f26b66")};`);
  });

  it("dark block uses the dark face", () => {
    const darkBlock = css.slice(css.indexOf(".dark {"));
    expect(darkBlock).toContain(`--background: ${hexToHslTriplet("#0f1115")};`);
    expect(darkBlock).toContain(`--foreground: ${hexToHslTriplet("#e6e8ec")};`);
  });

  it("converts the radius base to rem", () => {
    expect(css).toContain("--radius: 0.5rem;");
  });

  it("rejects a token set missing one of the six roles", () => {
    const json = JSON.parse(w3cText());
    delete json.color.primary;
    expect(() => shadcnFromW3C(JSON.stringify(json))).toThrow(/primary/);
  });
});
