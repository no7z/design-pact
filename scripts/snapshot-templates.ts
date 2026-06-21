// Build-time template snapshot.
//
// Fetches every brand's DESIGN.md from the awesome-design-md repo, runs the
// markdown parsers from lib/templates.ts, and writes the parsed result to
// public/templates.json so the app never hits GitHub at runtime.
//
// Run: npm run snapshot:templates

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  BRANDS,
  parseMdColorsAll,
  parseMdTypography,
  parseMdSpacing,
  parseMdRadius,
  type TemplateEntry,
  type TemplateSnapshot,
} from "../lib/templates";
import { normalizePalette } from "../lib/templateNormalize";
import { contrastRatio } from "../lib/color";

const SOURCE = "https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md";
const OUT = join(__dirname, "..", "public", "templates.json");
const CONCURRENCY = 8;

async function fetchMd(brand: string): Promise<string> {
  const res = await fetch(`${SOURCE}/${brand}/DESIGN.md`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function buildEntry(brand: string): Promise<TemplateEntry> {
  const md = await fetchMd(brand);
  const pool = parseMdColorsAll(md).map(({ hex, role, name }) => ({ hex, role, name }));
  if (pool.length === 0) throw new Error("解析不出任何颜色");
  const colors = normalizePalette(pool);
  assertContract(brand, colors);
  return {
    colors,
    typography: parseMdTypography(md),
    spacing: parseMdSpacing(md),
    radius: parseMdRadius(md),
  };
}

// The standard every template in the snapshot must meet — fail the build
// rather than ship an unreadable palette.
function assertContract(brand: string, colors: { hex: string; role: string }[]) {
  const byRole = (r: string) => colors.find((c) => c.role === r)?.hex;
  const bg = byRole("background");
  const fg = byRole("foreground");
  const primary = byRole("primary");
  if (!bg || !fg || !primary) throw new Error(`${brand}: 缺角色 bg/fg/primary`);
  const crFg = contrastRatio(bg, fg);
  if (crFg < 4.5) throw new Error(`${brand}: fg/bg 对比 ${crFg.toFixed(2)} < 4.5`);
  const crP = contrastRatio(bg, primary);
  if (crP < 1.3) throw new Error(`${brand}: primary≈bg 对比 ${crP.toFixed(2)}`);
}

async function main() {
  const templates: Record<string, TemplateEntry> = {};
  const failed: { brand: string; reason: string }[] = [];
  const queue = [...BRANDS];

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let brand = queue.shift(); brand; brand = queue.shift()) {
        try {
          templates[brand] = await buildEntry(brand);
        } catch (e) {
          failed.push({ brand, reason: e instanceof Error ? e.message : String(e) });
        }
      }
    }),
  );

  if (failed.length > 0) {
    console.error(`✗ ${failed.length} 个模板失败：`);
    for (const f of failed) console.error(`  - ${f.brand}: ${f.reason}`);
    process.exit(1);
  }

  // Stable key order for clean git diffs.
  const sorted = Object.fromEntries(
    Object.keys(templates)
      .sort()
      .map((k) => [k, templates[k]]),
  );
  const snapshot: TemplateSnapshot = {
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    templates: sorted,
  };
  writeFileSync(OUT, JSON.stringify(snapshot, null, 1) + "\n", "utf8");
  console.log(`✓ ${Object.keys(sorted).length}/${BRANDS.length} 个模板写入 ${OUT}`);
}

void main();
