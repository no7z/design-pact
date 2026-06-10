// Eval orchestrator: for each fixture × prompt variant (baseline | fixed),
// generate + score N times, then report mean ± standard deviation so the
// numbers are reportable (a single run mixes in run-to-run model noise).
//
// Usage:
//   tsx test/harness/run.ts                      # all fixtures, both variants
//   tsx test/harness/run.ts airbnb               # one fixture
//   EVAL_SAMPLES=5 tsx test/harness/run.ts       # 5 samples per variant
//   EVAL_MODEL=anthropic/claude-... tsx test/harness/run.ts

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadAllFixtures, loadFixture, buildPromptBaseline, buildPromptFixed, type Fixture } from "./prompt";
import { generatePage, OUT_DIR, EVAL_MODEL } from "./generate";
import { scoreHtml, type ConformanceReport } from "./score";

const VARIANTS = [
  { key: "baseline", build: buildPromptBaseline },
  { key: "fixed", build: buildPromptFixed },
] as const;

const SAMPLES = Math.max(1, Number(process.env.EVAL_SAMPLES || 3));

type Stat = { mean: number; sd: number; n: number; values: number[] };
type Aggregate = {
  fixture: string;
  variant: string;
  overall: Stat;
  categories: Record<string, Stat>;
};

function stat(values: number[]): Stat {
  const n = values.length;
  const mean = n ? values.reduce((a, b) => a + b, 0) / n : 0;
  const sd =
    n > 1 ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  return { mean, sd, n, values };
}

function aggregate(fixture: string, variant: string, reports: ConformanceReport[]): Aggregate {
  const overall = stat(reports.map((r) => r.overall));
  const catNames = reports.length ? Object.keys(reports[0].categories) : [];
  const categories: Record<string, Stat> = {};
  for (const c of catNames) categories[c] = stat(reports.map((r) => r.categories[c]?.score ?? 0));
  return { fixture, variant, overall, categories };
}

const fmt = (s: Stat) => (s.n > 1 ? `${s.mean.toFixed(1)} ±${s.sd.toFixed(1)}` : `${Math.round(s.mean)}`);

async function main() {
  const only = process.argv[2];
  const fixtures: Fixture[] = only ? [loadFixture(only)] : loadAllFixtures();

  console.log(`Model: ${EVAL_MODEL}`);
  console.log(`Fixtures: ${fixtures.map((f) => f.name).join(", ")}`);
  console.log(`Samples per variant: ${SAMPLES}\n`);

  const aggs: Aggregate[] = [];
  for (const fixture of fixtures) {
    for (const v of VARIANTS) {
      const reports: ConformanceReport[] = [];
      for (let i = 1; i <= SAMPLES; i++) {
        process.stdout.write(`  ${fixture.name}/${v.key} sample ${i}/${SAMPLES} … `);
        try {
          const html = await generatePage(v.build(fixture), fixture.name, v.key, SAMPLES > 1 ? i : undefined);
          const report = await scoreHtml(html, fixture);
          reports.push(report);
          console.log(`${report.overall}`);
        } catch (e) {
          console.log(`FAILED: ${(e as Error).message}`);
        }
      }
      if (reports.length) aggs.push(aggregate(fixture.name, v.key, reports));
    }
  }

  printComparison(aggs);
  printCategoryBreakdown(aggs);

  mkdirSync(OUT_DIR, { recursive: true });
  const reportPath = join(OUT_DIR, "report.json");
  writeFileSync(reportPath, JSON.stringify({ model: EVAL_MODEL, samples: SAMPLES, aggregates: aggs }, null, 2), "utf8");
  console.log(`\nFull report → ${reportPath}`);
}

function printComparison(aggs: Aggregate[]) {
  const byFixture = new Map<string, Record<string, Stat>>();
  for (const a of aggs) {
    const m = byFixture.get(a.fixture) ?? {};
    m[a.variant] = a.overall;
    byFixture.set(a.fixture, m);
  }
  console.log(`\n━━━━━━━━━━━━━━ OVERALL (mean ± sd, n=${SAMPLES}) ━━━━━━━━━━━━━━`);
  console.log("fixture".padEnd(15) + "baseline".padStart(13) + "fixed".padStart(13) + "lift".padStart(8) + "  robust");
  for (const [fixture, m] of byFixture) {
    const b = m.baseline ?? stat([]);
    const f = m.fixed ?? stat([]);
    const lift = f.mean - b.mean;
    // Lift is "robust" when it clears 2× the pooled standard deviation.
    const pooled = Math.sqrt(b.sd ** 2 + f.sd ** 2);
    const robust = SAMPLES < 2 ? "n/a" : lift >= 2 * pooled ? "✓ yes" : "~ weak";
    console.log(
      fixture.padEnd(15) +
        fmt(b).padStart(13) +
        fmt(f).padStart(13) +
        `${lift >= 0 ? "+" : ""}${lift.toFixed(1)}`.padStart(8) +
        `  ${robust}`,
    );
  }
}

function printCategoryBreakdown(aggs: Aggregate[]) {
  for (const a of aggs) {
    console.log(`\n── ${a.fixture} / ${a.variant}  (overall ${fmt(a.overall)}) ──`);
    for (const [name, s] of Object.entries(a.categories)) {
      const bar = "█".repeat(Math.round(s.mean / 10)).padEnd(10, "░");
      console.log(`  ${name.padEnd(11)} ${bar} ${fmt(s).padStart(12)}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
