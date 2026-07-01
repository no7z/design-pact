# @no7z/design-system

Turn a `design-system.md` — exported from the [design-system](../../README.md)
web app — into project token files. **No AI, no network, fully deterministic.**

The `design-system.md` file is self-contained: it holds the verbatim `:root`
CSS contract (what humans and AI agents read) plus a W3C Design Tokens JSON
block (what this CLI parses). An agent can use the file directly; this CLI is
for when you want the tokens as committed project files.

## Usage

```bash
# Generate token files in the current directory
npx @no7z/design-system add design-system.md

# Pick formats and an output directory
npx @no7z/design-system add design-system.md --format css|tailwind|w3c|all --out ./design

# Print a summary without writing anything
npx @no7z/design-system inspect design-system.md
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

## How to get a `design-system.md`

Open the design-system web app, build your design system, and click
**下载 design-system.md** in the export step.
