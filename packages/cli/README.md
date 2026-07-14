# design-pact

Turn a `design.md` — exported from the [design-pact](../../README.md)
web app — into project token files. **No AI, no network, fully deterministic.**

The `design.md` file is self-contained: it holds the verbatim `:root`
CSS contract (what humans and AI agents read) plus a W3C Design Tokens JSON
block (what this CLI parses). An agent can use the file directly; this CLI is
for when you want the tokens as committed project files.

## Install the skill (recommended)

Get the `design-pact` skill into your agent with the open
[`skills`](https://github.com/vercel-labs/skills) CLI — one command, works
across Claude Code / Cursor / Codex:

```bash
npx skills add no7z/design-pact -g   # global: install once, available in every project
npx skills add no7z/design-pact      # or: current project only (.claude/skills/)
```

The skill then opens the studio on demand via `npx design-pact open`,
so you never install the studio separately. (This package also ships its own
installer if you prefer a single, offline, version-locked bundle:
`npx design-pact init [--global]`.)

## Usage

```bash
# Generate token files in the current directory
npx design-pact add design.md

# Pick formats and an output directory
npx design-pact add design.md --format css|tailwind|w3c|shadcn|all --out ./design

# Print a summary without writing anything
npx design-pact inspect design.md

# Audit source files: find color literals outside the contract
npx design-pact check design.md src/ app/

# Audit rendered computed styles and fail below a CI threshold
npx design-pact audit design.md http://localhost:3000 --threshold 90 \
  --out design-pact-audit.html --json design-pact-audit.json

# Derive a draft design.md from an existing codebase
npx design-pact import src/ [--out design.md] [--force]
```

### `check` — enforce the contract

`check` scans your source files (css/scss/tsx/vue/svelte/…) for hex and
`rgb()`/`rgba()` color literals that aren't declared in `design.md` and reports
each with its file and line. It exits `1` when violations exist, so it slots
into CI or an agent loop: the agent generates UI against `design.md`, runs
`check`, and fixes anything flagged. `node_modules` / build output are skipped
automatically; whitelist intentional exceptions with `--allow "#hex,#hex"`.

### `audit` — verify the rendered UI

`audit` opens a URL or local HTML file in an installed Chrome/Chromium and
samples the computed styles of visible elements. Colors, font families/sizes/
weights, line height, letter spacing, spacing, and corner radii are scored
against the W3C tokens embedded in `design.md`. The HTML report is fully
self-contained and the command exits `1` when the overall score is below
`--threshold` (default `90`). Use `--json` for a machine-readable CI artifact,
`--browser /path/to/chrome` when auto-discovery is unsuitable, and `--timeout`
for slower pages. The audit runs locally and uploads nothing.

### `import` — adopt design-pact in an existing project

`import` scans tailwind configs, CSS custom properties, and raw color usage,
then assigns the six roles: colors from variables literally named
background/primary/border/… win outright; the rest are filled by OKLCH
heuristics (lightness, chroma, hue distance, contrast) and every assignment is
labeled `named` / `heuristic` / `derived` in the summary so you know what to
review. Radius, spacing, body font, and base size are detected when declared.
The output is a complete design.md — dark face and status colors derived the
same way the studio does it — and the command prints a studio URL to eyeball
the palette before you commit to it. A dark codebase is handled correctly: it
becomes the `@media (prefers-color-scheme: dark)` face.

Outputs:

| Format | File | Source |
|---|---|---|
| `css` | `tokens.css` | the verbatim `:root` block (byte-identical to the web export) |
| `w3c` | `design-tokens.json` | the W3C Design Tokens block |
| `tailwind` | `tailwind.config.js` | regenerated via the web app's own `tailwindConfig` (no drift) |
| `shadcn` | `shadcn-theme.css` | `:root` + `.dark` HSL-triplet blocks for shadcn/ui — paste into globals.css |

`css` and `w3c` are extracted verbatim from the file; `tailwind` is the one
format not embedded in the markdown, so it's regenerated from the JSON block
using the same code path the web app uses — it can't drift from the source.

## How to get a `design.md`

Open the design-system web app, build your design system, and click
**Download design.md** in the export step.
