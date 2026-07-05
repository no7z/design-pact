import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeHex, tokenHexes, scanText, runCheck } from "../packages/cli/src/check";
import { designSystemMarkdown, type ResolvedToken } from "../lib/export";
import { parseDesignSystem } from "../packages/cli/src/parse";
import {
  defaultTypography, defaultSpacing, defaultRadius, defaultShadow,
  defaultMotion, defaultBorder, defaultOpacity,
} from "../lib/tokens-core";

describe("normalizeHex", () => {
  it("lowercases and passes through 6-digit hex", () => {
    expect(normalizeHex("#2F6DF6")).toBe("#2f6df6");
  });
  it("expands 3-digit shorthand", () => {
    expect(normalizeHex("#fff")).toBe("#ffffff");
    expect(normalizeHex("#a1b")).toBe("#aa11bb");
  });
  it("strips the alpha of 8-digit hex", () => {
    expect(normalizeHex("#2f6df680")).toBe("#2f6df6");
  });
  it("rejects non-hex", () => {
    expect(normalizeHex("#xyz")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
  });
});

describe("tokenHexes", () => {
  it("collects $type:color values at any depth, including dark pairs", () => {
    const w3c = {
      color: {
        primary: {
          $value: "#2F6DF6",
          $type: "color",
          $extensions: { "design-pact": { dark: "#5B8CFF" } },
        },
      },
      semantic: { error: { $value: "#dc2626", $type: "color" } },
      spacing: { md: { $value: "16px", $type: "dimension" } },
    };
    const hexes = tokenHexes(w3c);
    expect(hexes.has("#2f6df6")).toBe(true);
    expect(hexes.has("#5b8cff")).toBe(true);
    expect(hexes.has("#dc2626")).toBe(true);
    expect(hexes.has("#000000")).toBe(true); // shadow serialization is always legal
    expect(hexes.has("#16px")).toBe(false);
  });
});

describe("scanText", () => {
  const allowed = new Set(["#2f6df6", "#ffffff", "#000000"]);

  it("flags hex literals outside the set with 1-based line numbers", () => {
    const found = scanText("a { color: #2f6df6; }\nb { color: #ff0000; }\n", allowed);
    expect(found).toEqual([{ line: 2, literal: "#ff0000", hex: "#ff0000" }]);
  });

  it("matches shorthand against the expanded value", () => {
    expect(scanText(".x { color: #fff }", allowed)).toEqual([]);
    expect(scanText(".x { color: #f00 }", allowed)).toHaveLength(1);
  });

  it("flags rgb()/rgba() literals, ignoring alpha", () => {
    expect(scanText("box-shadow: 0 0 1px rgba(0, 0, 0, 0.5)", allowed)).toEqual([]);
    const found = scanText("color: rgb(255, 0, 0)", allowed);
    expect(found).toEqual([{ line: 1, literal: "rgb(255, 0, 0)", hex: "#ff0000" }]);
  });

  it("ignores out-of-range rgb()", () => {
    expect(scanText("color: rgb(999, 0, 0)", allowed)).toEqual([]);
  });
});

describe("runCheck end-to-end against an exported design.md", () => {
  const palette: ResolvedToken[] = [
    { id: "c1", hex: "#ffffff", baseHex: "#ffffff", proportion: 0.6, role: "background", displayHex: "#ffffff" },
    { id: "c2", hex: "#1a1a1a", baseHex: "#1a1a1a", proportion: 0.2, role: "foreground", displayHex: "#1a1a1a" },
    { id: "c3", hex: "#2f6df6", baseHex: "#2f6df6", proportion: 0.2, role: "primary", displayHex: "#2f6df6" },
  ];
  const md = designSystemMarkdown(
    palette, defaultTypography, defaultSpacing, defaultRadius, defaultShadow,
    defaultMotion, defaultBorder, defaultOpacity,
  );
  const { w3c } = parseDesignSystem(md);

  it("passes a project that only uses contract colors, fails one that strays", () => {
    const dir = mkdtempSync(join(tmpdir(), "ds-check-"));
    try {
      mkdirSync(join(dir, "src"));
      writeFileSync(
        join(dir, "src", "ok.css"),
        ":root { } .btn { background: #2f6df6; color: #FFFFFF; }\n",
      );
      const clean = runCheck(w3c, [dir]);
      expect(clean.violations).toEqual([]);
      expect(clean.filesScanned).toBe(1);

      writeFileSync(join(dir, "src", "stray.tsx"), 'const c = "#ff00aa";\n');
      mkdirSync(join(dir, "node_modules"));
      writeFileSync(join(dir, "node_modules", "dep.css"), ".x { color: #123456 }\n");

      const dirty = runCheck(w3c, [dir]);
      expect(dirty.filesScanned).toBe(2); // node_modules skipped
      expect(dirty.violations).toHaveLength(1);
      expect(dirty.violations[0]).toMatchObject({ line: 1, hex: "#ff00aa" });
      expect(dirty.violations[0].file.endsWith("stray.tsx")).toBe(true);

      // --allow whitelists the stray color
      expect(runCheck(w3c, [dir], ["#ff00aa"]).violations).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
