// Regenerates the audit-proof fixture set from one source of truth:
//   npx tsx examples/audit-proof/generate.ts
//
// Emits three files next to this script:
//   design.md      — a real contract produced by the same exporter the web app uses
//   baseline.html  — a page styled exclusively with the contract's :root tokens
//   drifted.html   — the same page after a careless edit: hard-coded values
//                    replace tokens (off-palette colors, off-scale type/radius,
//                    off-grid spacing)
//
// The pair is what `design-pact audit` is for: baseline must score 100,
// drifted must fail the default threshold. CI re-runs both on every push.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  designSystemMarkdown,
  type ResolvedToken,
} from "../../lib/export";
import {
  defaultTypography,
  defaultSpacing,
  defaultRadius,
  defaultShadow,
  defaultMotion,
  defaultBorder,
  defaultOpacity,
  type Semantic,
} from "../../lib/tokens-core";
import { parseDesignSystem } from "../../packages/cli/src/parse";

const PALETTE: ResolvedToken[] = [
  { id: "c1", hex: "#ffffff", baseHex: "#ffffff", proportion: 0.6, role: "background", displayHex: "#ffffff" },
  { id: "c2", hex: "#16181d", baseHex: "#16181d", proportion: 0.2, role: "foreground", displayHex: "#16181d" },
  { id: "c3", hex: "#2f6df6", baseHex: "#2f6df6", proportion: 0.08, role: "primary", displayHex: "#2f6df6" },
  { id: "c4", hex: "#7c3aed", baseHex: "#7c3aed", proportion: 0.05, role: "accent", displayHex: "#7c3aed" },
  { id: "c5", hex: "#6b7280", baseHex: "#6b7280", proportion: 0.04, role: "muted", displayHex: "#6b7280" },
  { id: "c6", hex: "#e5e7eb", baseHex: "#e5e7eb", proportion: 0.03, role: "border", displayHex: "#e5e7eb" },
];

const SEMANTIC: Semantic = { success: "#16a34a", warning: "#d97706", error: "#dc2626", info: "#2563eb" };

const md = designSystemMarkdown(
  PALETTE,
  defaultTypography,
  defaultSpacing,
  defaultRadius,
  defaultShadow,
  defaultMotion,
  defaultBorder,
  defaultOpacity,
  null,
  SEMANTIC,
  null,
);

const { rootCss } = parseDesignSystem(md);

// Page CSS written only in contract tokens. Every color, size, spacing and
// radius resolves to a :root variable, so the audit must score 100.
const baselineCss = `
      * { box-sizing: border-box; }
      body {
        /* grid centering, not margin auto: computed auto margins resolve to px
           and would be flagged as off-grid spacing by the audit */
        display: grid;
        justify-content: center;
        margin: 0;
        background: var(--color-background);
        color: var(--color-foreground);
        font-family: var(--font-family-body);
        font-size: var(--font-size-body);
        font-weight: var(--font-weight);
        line-height: var(--line-height);
      }
      main { width: 960px; padding: var(--spacing-xl); }
      h1 {
        font-family: var(--font-family-heading);
        font-size: var(--font-size-h2);
        font-weight: var(--font-weight-heading);
        line-height: var(--line-height);
        margin: 0 0 var(--spacing-sm);
      }
      .lede { color: var(--color-muted); margin: 0 0 var(--spacing-xl); }
      .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-md); }
      .card {
        background: var(--color-background);
        border: var(--border-thin) solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--spacing-lg);
      }
      .card h2 {
        font-family: var(--font-family-heading);
        font-size: var(--font-size-h5);
        font-weight: var(--font-weight-heading);
        line-height: var(--line-height);
        margin: 0 0 var(--spacing-xs);
      }
      .card p { color: var(--color-muted); margin: 0 0 var(--spacing-md); }
      .price {
        font-size: var(--font-size-h4);
        font-weight: var(--font-weight-bold);
        margin: 0 0 var(--spacing-md);
      }
      .cta {
        display: inline-block;
        background: var(--color-primary);
        color: var(--color-background);
        font-family: var(--font-family-body);
        font-size: var(--font-size-body);
        font-weight: var(--font-weight-heading);
        line-height: var(--line-height);
        border: 0;
        border-radius: var(--radius-sm);
        padding: var(--spacing-sm) var(--spacing-md);
      }
      .badge {
        display: inline-block;
        background: var(--color-accent);
        color: var(--color-background);
        font-size: var(--font-size-small);
        border-radius: var(--radius-sm);
        padding: 0 var(--spacing-xs);
        margin: 0 0 var(--spacing-xs);
      }`;

// The same page after a careless "quick fix": tokens replaced by hard-coded
// values. Three drift classes, each caught by a different audit category:
//   colors     — #ff6b35 / #777777 / #fafbfc are not in the palette
//   typography — 19px / 27px are off the type scale (16 / 20 / 25 / …)
//   radii      — 13px / 5px are off the radius scale (0 / 4 / 8 / 16 / …)
//   spacing    — 18px / 7px / 26px are off the 4px grid
const driftedCss = baselineCss
  .replace("background: var(--color-primary);", "background: #ff6b35;")
  .replace("color: var(--color-muted); margin: 0 0 var(--spacing-xl);", "color: #777777; margin: 0 0 26px;")
  .replace("background: var(--color-background);\n        border: var(--border-thin) solid var(--color-border);", "background: #fafbfc;\n        border: var(--border-thin) solid var(--color-border);")
  .replace("font-size: var(--font-size-body);\n        font-weight: var(--font-weight);", "font-size: 19px;\n        font-weight: var(--font-weight);")
  .replace("font-size: var(--font-size-h5);", "font-size: 27px;")
  .replace("border-radius: var(--radius-md);\n        padding: var(--spacing-lg);", "border-radius: 13px;\n        padding: 18px;")
  .replace("border-radius: var(--radius-sm);\n        padding: var(--spacing-sm) var(--spacing-md);", "border-radius: 5px;\n        padding: 7px 18px;");

if (driftedCss === baselineCss) throw new Error("drift injection failed — baseline CSS changed shape");

function page(title: string, pageCss: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
${rootCss.trim()}
    </style>
    <style>${pageCss}
    </style>
  </head>
  <body>
    <main>
      <h1>Ship UI that keeps its promises</h1>
      <p class="lede">Three plans. One design contract. The audit decides who kept it.</p>
      <section class="cards">
        <article class="card">
          <h2>Starter</h2>
          <p>For side projects and quick experiments.</p>
          <p class="price">$0</p>
          <a class="cta" href="#">Get started</a>
        </article>
        <article class="card">
          <span class="badge">Popular</span>
          <h2>Pro</h2>
          <p>For teams that audit every deploy.</p>
          <p class="price">$12</p>
          <a class="cta" href="#">Choose Pro</a>
        </article>
        <article class="card">
          <h2>Scale</h2>
          <p>For platforms with many surfaces.</p>
          <p class="price">$49</p>
          <a class="cta" href="#">Talk to us</a>
        </article>
      </section>
    </main>
  </body>
</html>
`;
}

const dir = import.meta.dirname ?? __dirname;
writeFileSync(join(dir, "design.md"), md, "utf8");
writeFileSync(join(dir, "baseline.html"), page("Audit proof · baseline", baselineCss), "utf8");
writeFileSync(join(dir, "drifted.html"), page("Audit proof · drifted", driftedCss), "utf8");
console.log("✓ wrote design.md, baseline.html, drifted.html");
