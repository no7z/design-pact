---
name: design-system
description: >-
  Apply the user's design system when building or restyling UI. Trigger when
  the user says things like "use my design system", "apply my tokens", "build
  this with my design-system.md", "match our design system", or when a
  design-system.md file is present in the repo. The file is produced by the
  UI Generator web app (its export step) and contains the canonical color /
  type / spacing / radius / shadow / motion tokens plus a copy-verbatim
  :root contract.
---

# Design system

Use this skill whenever you generate or restyle UI and the user has a design
system to follow. The design system lives in a single markdown file —
typically `design-system.md` at the repo root — exported from the UI Generator
web app. That one file is the source of truth; you do not need the web app or
any network access.

## Step 1 — locate the file

In order:

1. The path the user gave you, if any.
2. `design-system.md` at the repo root.
3. Search the repo: look for a markdown file whose frontmatter starts with
   `ui-generator:` (ripgrep: `rg -l "^ui-generator:" --type md`).

If you find none, ask the user to export one from the UI Generator web app
("下载 design-system.md" in the export step) and drop it in the repo. Do not
invent tokens.

## Step 2 — read it

`read` the whole file. It has two parts:

- **Prose + a `:root { … }` CSS block** — this is the contract. It lists every
  color, font size, spacing step, radius, shadow, duration, and easing as a CSS
  custom property, with usage guidance. This block is authoritative.
- **A fenced ` ```json ` block at the bottom** (W3C Design Tokens) — the same
  values in machine-readable form. Read this only if you need to derive a
  config file (see Step 4); for generating UI, the `:root` block is enough.

## Step 3 — generate UI against the contract

Hard rules (the file states these too — follow them exactly):

- Paste the `:root` block into your `<style>` **verbatim**. Do not round,
  rescale, rename, or re-derive any value.
- Reference every value through `var(--…)`. Every length must be a token
  reference — do not convert a `px` token to `rem` or vice-versa.
- Introduce **no** colors, fonts, sizes, spacing, radii, or shadows that are
  not declared. If you need a lighter/darker shade, derive it in OKLCH by
  changing lightness only — keep hue and chroma fixed.
- If a `@media (prefers-color-scheme: dark)` block is present, it overrides
  color variables only; every other token stays identical in dark mode.
- Wire interactive states (hover / pressed / focus / disabled) using the
  opacity tokens, and transitions using the motion tokens.

The reasoning and image generation run on **your** model — this skill adds no
server dependency. Generate the page, then verify the rendered output uses the
tokens (no stray hex values, no off-scale sizes).

## Step 4 — optional: emit config files

If the user wants the tokens as project files rather than (or in addition to)
generated UI, the companion CLI converts the file's `json` block into
`tokens.css` / `tailwind.config.js` / `design-tokens.json`:

```bash
npx <pkg> add design-system.md --format css|tailwind|w3c|all --out ./design
```

If the CLI isn't installed, you can produce the same output yourself by reading
the ` ```json ` block (W3C Design Tokens) and writing the requested format —
but prefer the CLI when available so the conversion stays canonical.
