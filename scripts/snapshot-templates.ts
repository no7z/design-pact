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
  parseMdColors,
  parseMdTypography,
  parseMdSpacing,
  parseMdRadius,
  type TemplateEntry,
  type TemplateSnapshot,
} from "../lib/templates";

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
  const colors = parseMdColors(md).map(({ hex, role, name }) => ({ hex, role, name }));
  if (colors.length === 0) throw new Error("解析不出任何颜色");
  return {
    colors,
    typography: parseMdTypography(md),
    spacing: parseMdSpacing(md),
    radius: parseMdRadius(md),
  };
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
