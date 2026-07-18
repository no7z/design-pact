# Audit proof: one contract, two pages, one verdict

A minimal, reproducible demonstration of `design-pact audit`. Same
[`design.md`](design.md), same page layout — the only difference is whether the
CSS keeps the contract:

| Page | What it does | Audit result |
|---|---|---|
| [`baseline.html`](baseline.html) | Styles everything through the contract's `:root` tokens | **100/100 · PASS** |
| [`drifted.html`](drifted.html) | Same page after a careless edit: hard-coded values replace tokens | **79/100 · FAIL** (exit 1) |

CI re-runs both on every push: baseline must pass, drifted must fail.
The committed reports are in [`reports/`](reports/) — open
[`baseline-report.html`](reports/baseline-report.html) and
[`drifted-report.html`](reports/drifted-report.html) in a browser, no server needed.

## What the drifted page gets wrong

Each drift class is caught by a different audit category, and every violation in
the report names the element, the property, the actual value, and the tokens it
should have used:

| Category | Injected drift | Why it fails |
|---|---|---|
| colors | CTA `#ff6b35`, lede text `#777777`, card `#fafbfc` | none of them are in the palette |
| typography | body `19px`, card headings `27px` | off the type scale (16 / 20 / 25 / …) |
| radii | cards `13px`, buttons `5px` | off the radius scale (4 / 8 / 12 / 16) |
| spacing | card padding `18px`, button padding `7px 18px`, lede margin `26px` | off the 4px spacing grid |

## Re-run it yourself (~2 minutes)

Requires Node ≥ 18 and an installed Chrome/Chromium.

```bash
git clone https://github.com/no7z/design-pact.git && cd design-pact
npm ci && npm ci --prefix packages/cli
npm run build --prefix packages/cli

node packages/cli/dist/cli.js audit examples/audit-proof/design.md examples/audit-proof/baseline.html
# ✓ Design Pact Compliance 100/100 (threshold 90)

node packages/cli/dist/cli.js audit examples/audit-proof/design.md examples/audit-proof/drifted.html
# ✗ Design Pact Compliance 79/100 (threshold 90) — exits 1
```

Or against the published package, from this directory:

```bash
npx design-pact audit design.md baseline.html
npx design-pact audit design.md drifted.html
```

Everything runs locally; no page data leaves your machine.

## How the fixtures are made

All three files are generated from one script so they can never drift apart:

```bash
npx tsx examples/audit-proof/generate.ts
```

`design.md` comes from the same exporter the web studio uses (byte-identical
`:root` block and W3C token JSON). `baseline.html` inlines that `:root` block and
styles only with `var(--…)` tokens. `drifted.html` is the baseline CSS with the
hard-coded values above substituted in.

Note: `reports/` is a committed snapshot from the last local run, so its scores
can lag the fixtures after an engine change — CI always re-audits the live pages
and is the source of truth for pass/fail.

## Known limitation worth knowing

`margin: 0 auto` centering is flagged as off-grid spacing: computed styles
resolve `auto` to a pixel value (e.g. `240px`), and the audit cannot tell it was
`auto` in the source. The baseline page centers with `display: grid` +
`justify-content: center` instead. If your page uses margin-auto centering,
expect a few spacing hits on the wrapper element.
