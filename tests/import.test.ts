import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  scanSignals,
  assignRoles,
  scanProject,
  draftToMarkdown,
  studioQuery,
  type ColorSignal,
} from "../packages/cli/src/import";
import { parseDesignSystem } from "../packages/cli/src/parse";
import { parseDesignSystemTokens } from "../lib/importTokens";
import { runCheck } from "../packages/cli/src/check";

describe("scanSignals", () => {
  it("counts literals with the given weight; variable names are strong hints", () => {
    const into = new Map<string, ColorSignal>();
    scanSignals("--color-primary: #2f6df6;\n.a { color: #2f6df6 }\n", 3, into);
    const sig = into.get("#2f6df6")!;
    expect(sig.count).toBe(6);
    expect(sig.hints.primary).toBe(6); // named var: weight * 2
  });

  it("reads camelCase tailwind keys and rgb() literals; CSS properties are weak hints", () => {
    const into = new Map<string, ColorSignal>();
    scanSignals('borderColor: "#e5e7eb",\nbackground: rgb(255, 255, 255),\n', 5, into);
    expect(into.get("#e5e7eb")!.hints.border).toBe(10); // config key: strong
    expect(into.get("#ffffff")!.hints.background).toBe(1); // css property: weak
  });
});

describe("scanSignals real-world naming (regressions from ai-monitor-platform)", () => {
  it("state-modifier names don't claim a role: --mm-focus-border is not the border", () => {
    const into = new Map<string, ColorSignal>();
    scanSignals("--mm-focus-border: #22D3EE;\n--mm-focus-text: #22D3EE;\n", 3, into);
    const sig = into.get("#22d3ee")!;
    expect(sig.count).toBe(6); // still counted as usage
    expect(sig.hints).toEqual({}); // but names nothing
  });

  it("structural noun beats emphasis modifier: --text-primary is a foreground", () => {
    const into = new Map<string, ColorSignal>();
    scanSignals("--text-primary: #1C1B19;\n", 3, into);
    const sig = into.get("#1c1b19")!;
    expect(sig.hints.foreground).toBe(6);
    expect(sig.hints.primary).toBeUndefined();
  });

  it("a bare --primary still hints primary", () => {
    const into = new Map<string, ColorSignal>();
    scanSignals("--primary: #2f6df6;\n", 3, into);
    expect(into.get("#2f6df6")!.hints.primary).toBe(6);
  });
});

describe("assignRoles", () => {
  const sig = (hex: string, count: number, hints: ColorSignal["hints"] = {}): ColorSignal => ({ hex, count, hints });

  it("name hints beat frequency", () => {
    const roles = assignRoles([
      sig("#ff0000", 100),
      sig("#2f6df6", 1, { primary: 1 }),
      sig("#ffffff", 50),
      sig("#111111", 40),
    ]);
    expect(roles.find((r) => r.role === "primary")).toMatchObject({ hex: "#2f6df6", provenance: "named" });
  });

  it("assigns a plausible palette from frequency alone", () => {
    const roles = assignRoles([
      sig("#ffffff", 90), // light, frequent → background
      sig("#111827", 60), // near-black, high contrast → foreground
      sig("#2f6df6", 30), // saturated blue → primary
      sig("#d97706", 12), // saturated orange, far hue → accent
      sig("#6b7280", 10), // mid gray → muted
      sig("#e5e7eb", 8),  // light gray near bg → border
    ]);
    const byRole = Object.fromEntries(roles.map((r) => [r.role, r.hex]));
    expect(byRole.background).toBe("#ffffff");
    expect(byRole.foreground).toBe("#111827");
    expect(byRole.primary).toBe("#2f6df6");
    expect(byRole.accent).toBe("#d97706");
    expect(byRole.muted).toBe("#6b7280");
    expect(byRole.border).toBe("#e5e7eb");
    expect(roles.every((r) => r.provenance === "heuristic")).toBe(true);
  });

  it("derives every missing role rather than failing on an empty scan", () => {
    const roles = assignRoles([]);
    expect(roles).toHaveLength(6);
    expect(roles.every((r) => /^#[0-9a-f]{6}$/.test(r.hex))).toBe(true);
    expect(roles.every((r) => r.provenance === "derived")).toBe(true);
  });
});

describe("scanProject + draftToMarkdown end-to-end", () => {
  it("derives a round-trippable design.md from a fixture project", () => {
    const dir = mkdtempSync(join(tmpdir(), "ds-import-"));
    try {
      mkdirSync(join(dir, "src"));
      writeFileSync(
        join(dir, "tailwind.config.js"),
        `module.exports = { theme: { extend: { colors: {
            primary: "#0f766e", accent: "#d97706", border: "#e2e8f0",
          }, borderRadius: { md: "6px" } } } };\n`,
      );
      writeFileSync(
        join(dir, "src", "globals.css"),
        `:root { --background: #fafaf9; --text: #1c1917; --spacing-sm: 4px; }
         body { font-family: Inter, sans-serif; }
         html { font-size: 16px; }
         .btn { background: #0f766e; border-radius: 6px; }
         .card { border: 1px solid #e2e8f0; color: #78716c; }\n`,
      );
      writeFileSync(join(dir, "src", "app.tsx"), `const c = "#78716c";\nconst d = "#78716c";\n`);

      const draft = scanProject([dir]);
      const byRole = Object.fromEntries(draft.colors.map((c) => [c.role, c]));
      expect(byRole.primary).toMatchObject({ hex: "#0f766e", provenance: "named" });
      expect(byRole.accent).toMatchObject({ hex: "#d97706", provenance: "named" });
      expect(byRole.border).toMatchObject({ hex: "#e2e8f0", provenance: "named" });
      expect(byRole.background).toMatchObject({ hex: "#fafaf9", provenance: "named" });
      expect(byRole.foreground).toMatchObject({ hex: "#1c1917", provenance: "named" });
      expect(byRole.muted.hex).toBe("#78716c");
      expect(draft.radiusBase).toBe(6);
      expect(draft.spacingBase).toBe(4);
      expect(draft.fontFamily).toContain("Inter");
      expect(draft.fontSizeBase).toBe(16);

      // The draft parses through both readers and honors the detected values.
      const md = draftToMarkdown(draft);
      const ds = parseDesignSystem(md);
      expect(ds.rootCss).toContain("--color-primary: #0f766e;");
      expect(ds.rootCss).toContain("@media (prefers-color-scheme: dark)");
      const p = parseDesignSystemTokens(md);
      expect(p.radius?.base).toBe(6);
      expect(p.spacing?.base).toBe(4);
      expect(p.typography?.base).toBe(16);
      expect(p.typography?.fontFamily).toContain("Inter");

      // Closing the loop: the fixture's own colors pass `check` against the
      // draft contract it produced.
      const clean = runCheck(ds.w3c, [dir]);
      expect(clean.violations).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("skips var() font-family references and keeps looking for a real stack", () => {
    const dir = mkdtempSync(join(tmpdir(), "ds-import-font-"));
    try {
      writeFileSync(
        join(dir, "app.css"),
        `body { font-family: var(--font-body); }
         .prose { font-family: "Source Serif 4", Georgia, serif; }\n`,
      );
      const draft = scanProject([dir]);
      expect(draft.fontFamily).toBe("Source Serif 4, Georgia, serif");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("a dark codebase becomes the @media(dark) face, with a derived light :root", () => {
    const dir = mkdtempSync(join(tmpdir(), "ds-import-dark-"));
    try {
      writeFileSync(
        join(dir, "app.css"),
        `:root { --bg: #0f1115; --text: #e6e8ec; --brand: #5b8cff; }
         .x { background: #0f1115; color: #e6e8ec; border-color: #5b8cff; }\n`,
      );
      const draft = scanProject([dir]);
      expect(draft.colors.find((c) => c.role === "background")!.hex).toBe("#0f1115");
      const md = draftToMarkdown(draft);
      // :root background must be light; the detected dark bg lands in the dark block
      const root = parseDesignSystem(md).rootCss;
      const rootBg = /--color-background: (#[0-9a-f]{6});/.exec(root)![1];
      expect(rootBg).not.toBe("#0f1115");
      expect(root).toContain("--color-background: #0f1115;"); // inside @media(dark)
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("studioQuery", () => {
  it("serializes the six roles in studio ?p= order", () => {
    const draft = scanProject([]); // all derived
    const q = studioQuery({ ...draft, colors: draft.colors });
    expect(q).toMatch(/^p=([0-9a-f]{6}-){5}[0-9a-f]{6}~/);
  });
});
