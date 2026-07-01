# @no7z/design-system

Turn a `design.md` — exported from the [design-system](../../README.md)
web app — into project token files. **No AI, no network, fully deterministic.**

The `design.md` file is self-contained: it holds the verbatim `:root`
CSS contract (what humans and AI agents read) plus a W3C Design Tokens JSON
block (what this CLI parses). An agent can use the file directly; this CLI is
for when you want the tokens as committed project files.

## Install the skill (recommended)

Get the `design-system` skill into your agent with the open
[`skills`](https://github.com/vercel-labs/skills) CLI — one command, works
across Claude Code / Cursor / Codex:

```bash
npx skills add no7z/design-system -g   # global: install once, available in every project
npx skills add no7z/design-system      # or: current project only (.claude/skills/)
```

The skill then opens the studio on demand via `npx @no7z/design-system open`,
so you never install the studio separately. (This package also ships its own
installer if you prefer a single, offline, version-locked bundle:
`npx @no7z/design-system init [--global]`.)

## Usage

```bash
# Generate token files in the current directory
npx @no7z/design-system add design.md

# Pick formats and an output directory
npx @no7z/design-system add design.md --format css|tailwind|w3c|all --out ./design

# Print a summary without writing anything
npx @no7z/design-system inspect design.md
```

Outputs:

| Format | File | Source |
|---|---|---|
| `css` | `tokens.css` | the verbatim `:root` block (byte-identical to the web export) |
| `w3c` | `design-tokens.json` | the W3C Design Tokens block |
| `tailwind` | `tailwind.config.js` | regenerated via the web app's own `tailwindConfig` (no drift) |

`css` and `w3c` are extracted verbatim from the file; `tailwind` is the one
format not embedded in the markdown, so it's regenerated from the JSON block
using the same code path the web app uses — it can't drift from the source.

## How to get a `design.md`

Open the design-system web app, build your design system, and click
**下载 design.md** in the export step.
