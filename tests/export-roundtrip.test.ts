// The core promise of the tool: design.md is a lossless carrier. What the web
// app exports (designSystemMarkdown) must parse back identically through both
// readers — the CLI (parseDesignSystem) and the web re-import (importTokens).
import { describe, it, expect } from "vitest";
import { designSystemMarkdown, cssVars, type ResolvedToken } from "../lib/export";
import { parseDesignSystemTokens } from "../lib/importTokens";
import { parseDesignSystem } from "../packages/cli/src/parse";
import { tailwindFromW3C } from "../packages/cli/src/tailwind";
import {
  defaultTypography,
  defaultShadow,
  defaultMotion,
  defaultBorder,
  defaultOpacity,
  type Semantic,
} from "../lib/tokens-core";

const PALETTE: ResolvedToken[] = [
  { id: "c1", hex: "#ffffff", baseHex: "#ffffff", proportion: 0.6, role: "background", displayHex: "#ffffff" },
  { id: "c2", hex: "#1a1a1a", baseHex: "#1a1a1a", proportion: 0.2, role: "foreground", displayHex: "#1a1a1a" },
  { id: "c3", hex: "#2f6df6", baseHex: "#2f6df6", proportion: 0.08, role: "primary", displayHex: "#2f6df6" },
  { id: "c4", hex: "#7c3aed", baseHex: "#7c3aed", proportion: 0.05, role: "accent", displayHex: "#7c3aed" },
  { id: "c5", hex: "#6b7280", baseHex: "#6b7280", proportion: 0.04, role: "muted", displayHex: "#6b7280" },
  { id: "c6", hex: "#e5e7eb", baseHex: "#e5e7eb", proportion: 0.03, role: "border", displayHex: "#e5e7eb" },
];

const DARK: ResolvedToken[] = PALETTE.map((c) => ({
  ...c,
  displayHex: c.role === "background" ? "#0f1115" : c.role === "foreground" ? "#e6e8ec" : c.displayHex,
}));

const SEMANTIC: Semantic = { success: "#16a34a", warning: "#d97706", error: "#dc2626", info: "#2563eb" };

const TYPO = { ...defaultTypography, base: 17, ratio: 1.3, fontWeight: 400 };
const SPACING = { base: 6 };
const RADIUS = { base: 10 };
const MOTION = { ...defaultMotion, base: 240 };

function exportMd() {
  return designSystemMarkdown(
    PALETTE, TYPO, SPACING, RADIUS, defaultShadow, MOTION, defaultBorder, defaultOpacity,
    DARK, SEMANTIC, SEMANTIC,
  );
}

describe("design.md round-trip", () => {
  const md = exportMd();

  it("carries the design-pact frontmatter marker SKILL.md greps for", () => {
    expect(md).toMatch(/^---\s*\ndesign-pact:/);
  });

  it("CLI parse extracts a :root css block and valid W3C json", () => {
    const ds = parseDesignSystem(md);
    expect(ds.rootCss).toContain(":root");
    expect(ds.rootCss).toContain("--color-primary: #2f6df6;");
    expect(ds.rootCss).toContain("@media (prefers-color-scheme: dark)");
    expect(ds.w3c).toHaveProperty("color");
    expect(ds.w3c).toHaveProperty("spacing");
  });

  it("the embedded :root block is byte-identical to cssVars output", () => {
    const ds = parseDesignSystem(md);
    const direct = cssVars(
      PALETTE, TYPO, SPACING, RADIUS, defaultShadow, MOTION, defaultBorder, defaultOpacity,
      DARK, SEMANTIC, SEMANTIC,
    );
    expect(ds.rootCss.trim()).toBe(direct.trim());
  });

  it("web re-import recovers every token value", () => {
    const p = parseDesignSystemTokens(md);
    const byRole = Object.fromEntries(p.colors.map((c) => [c.role, c.hex]));
    expect(byRole.background).toBe("#ffffff");
    expect(byRole.primary).toBe("#2f6df6");
    expect(p.darkHexes).toBeDefined();
    expect(p.typography?.base).toBe(17);
    expect(p.typography?.ratio).toBe(1.3);
    expect(p.spacing?.base).toBe(6);
    expect(p.radius?.base).toBe(10);
    expect(p.motion?.base).toBe(240);
    expect(p.border?.base).toBe(defaultBorder.base);
    expect(p.opacity?.base).toBe(defaultOpacity.base);
    // Shadow round-trips through its css serialization
    expect(p.shadow?.md.blur).toBe(defaultShadow.md.blur);
    expect(p.shadow?.md.opacity).toBeCloseTo(defaultShadow.md.opacity);
  });

  it("tailwind config regenerates from the embedded json without drift", () => {
    const ds = parseDesignSystem(md);
    const tw = tailwindFromW3C(ds.w3cText);
    expect(tw).toContain('primary: "#2f6df6"');
    expect(tw).toContain('md: "10px"'); // radius base
    expect(tw).toContain('xxs: "6px"'); // spacing base
    expect(tw).toContain("boxShadow");
  });
});

describe("parseDesignSystem error paths", () => {
  it("rejects a file without the design-pact marker", () => {
    expect(() => parseDesignSystem("# random readme\n")).toThrow();
  });

  it("rejects a marked file missing the :root css block", () => {
    expect(() => parseDesignSystem("---\ndesign-pact: 1\n---\nno blocks here\n")).toThrow();
  });

  it("rejects a marked file whose json block is invalid", () => {
    const bad = "---\ndesign-pact: 1\n---\n```css\n:root { --x: 1; }\n```\n\n```json\n{nope\n```\n";
    expect(() => parseDesignSystem(bad)).toThrow();
  });
});
