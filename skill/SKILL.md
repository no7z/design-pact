---
name: design-system
description: >-
  Establish and apply the project's design system. Invoke at the start of UI
  work, or whenever the user says "use my design system", "apply my tokens",
  "set up our design system", "build this to our design system", or asks to
  build/restyle UI. The skill first looks for a design-system.md in the repo:
  if present it generates UI against it; if absent it clarifies the product
  direction, YOU (the agent) propose a palette, and it opens the UI Generator
  web app to turn that palette into a full design system the user tunes and
  exports. All AI runs on the agent's own compute — the web app has no AI and
  no backend.
---

# Design system

The project's design system lives in a single file — `design-system.md` at the
repo root — exported from the UI Generator web app. It carries the canonical
color / type / spacing / radius / shadow / motion tokens plus a copy-verbatim
`:root` contract. That one file is the source of truth; you do not need the web
app or network access once it exists.

**Always start with Step 0.** It decides whether to apply an existing system or
help the user create one.

## Step 0 — find or create the design system

Look for `design-system.md`, in order:

1. A path the user gave you.
2. `design-system.md` at the repo root.
3. Search the repo for the file's frontmatter marker:
   `rg -l "^ui-generator:" --type md`.

Then branch:

- **Found** → go to **Apply** below. (If you found more than one, ask the user
  which to use.)
- **Not found** → go to **Create** below. Do **not** invent tokens or guess a
  palette — get a real `design-system.md` first.

## Create — no design-system.md yet

There's no design system yet. The division of labor: **you (the agent) do the
creative part — clarify direction and propose the palette; the web app does the
deterministic part — derive the full token system (scales, shadows, dark
pairs, the `:root` contract, contrast audit) from your palette and let the user
tune it visually, then export `design-system.md`.** The web app has no AI; it
only needs your palette as input.

### 1. Clarify direction

If the product's visual direction isn't already clear from the conversation,
ask the user **one or two** quick questions — only what changes the palette,
e.g. light vs dark / mood (calm-professional, bold-energetic, warm-friendly),
and the rough industry/vibe. Don't over-interview; the user tunes everything
later in the web app.

### 2. Propose a palette

Pick **6 colors**, one per semantic role, that fit the product. Ensure
foreground reads on background (aim for ≥ 4.5:1) and primary stands out.
Write them to `design-tokens.json` in the user's project (this is the file the
web app imports — minimal W3C Design Tokens shape):

```json
{
  "color": {
    "background": { "$value": "#ffffff", "$type": "color" },
    "foreground": { "$value": "#1a1a1a", "$type": "color" },
    "primary":    { "$value": "#2f6df6", "$type": "color" },
    "accent":     { "$value": "#7c3aed", "$type": "color" },
    "muted":      { "$value": "#6b7280", "$type": "color" },
    "border":     { "$value": "#e5e7eb", "$type": "color" }
  }
}
```

Offer the user 1–3 directions in chat if useful, but write the one they pick.
Do **not** hand-author a full `design-system.md` — let the web app derive the
scales/shadows/dark/contract so they're correct.

### 3. Open the web app to turn the palette into a full system

The UI Generator is a **local** web app — get it running, then point the user
at it. `UI_GENERATOR_URL` defaults to `http://localhost:3000` (use a hosted URL
instead if the user has one, and skip the start step).

- **Check if running:** `curl -sf http://localhost:3000 >/dev/null`. If not,
  **start it** — but it lives in the UI Generator repo, NOT the user's current
  project, so never run `npm run dev` in the working directory. If you know the
  repo path (`$UI_GENERATOR_DIR` or the user tells you), start it in the
  background there and poll the port:
  `npm --prefix "$UI_GENERATOR_DIR" run dev`. If you don't know the path, ask
  for it or tell the user to run `npm run dev` there — don't guess.
- **Always print the URL** (the fallback when no browser opens), then also try
  to launch a browser:

  > 打开 UI Generator: **http://localhost:3000**

  - macOS: `open "$UI_GENERATOR_URL"` · Linux: `xdg-open "$UI_GENERATOR_URL"` ·
    Windows: `start "" "$UI_GENERATOR_URL"`

  Headless / no browser is fine — the printed URL is the instruction.

### 4. Tell the user what to do there

> 在首屏点 **「导入 agent 配色」** 选刚生成的 `design-tokens.json` → 调色轮 /
> 字体 / 间距 / 暗色等微调（右侧实时预览 + 对比度审计）→ 在「导出」区点
> **「下载 design-system.md」** → 把文件放到这个项目的根目录。

### 5. Resume

Wait for the user to confirm `design-system.md` is in the repo, then re-run the
Step 0 search and continue to **Apply**.

## Apply — design-system.md is present

`read` the whole file. It has two parts:

- **Prose + a `:root { … }` CSS block** — the contract. Every color, font size,
  spacing step, radius, shadow, duration, and easing as a CSS custom property,
  with usage guidance. This block is authoritative.
- **A fenced ` ```json ` block at the bottom** (W3C Design Tokens) — the same
  values, machine-readable. Read this only if deriving a config file (see
  "Config files" below); for generating UI the `:root` block is enough.

Generate UI strictly against the contract (the file restates these — follow
exactly):

- Paste the `:root` block into your `<style>` **verbatim**. Do not round,
  rescale, rename, or re-derive any value.
- Reference every value through `var(--…)`. Every length must be a token
  reference — never convert a `px` token to `rem` or vice-versa.
- Introduce **no** colors, fonts, sizes, spacing, radii, or shadows that aren't
  declared. Need a lighter/darker shade? Derive it in OKLCH by changing
  lightness only — keep hue and chroma fixed.
- If a `@media (prefers-color-scheme: dark)` block is present, it overrides
  color variables only; every other token is identical in dark mode.
- Wire interactive states (hover / pressed / focus / disabled) with the opacity
  tokens, and transitions with the motion tokens.

Reasoning and generation run on **your** model — no server dependency. After
generating, verify the output uses the tokens (no stray hex values, no
off-scale sizes).

## Config files (optional)

If the user wants the tokens as project files rather than (or in addition to)
generated UI, the companion CLI converts the file's `json` block into
`tokens.css` / `tailwind.config.js` / `design-tokens.json`:

```bash
npx design-system-md add design-system.md --format css|tailwind|w3c|all --out ./design
```

If the CLI isn't installed you can produce the same output by reading the
` ```json ` block (W3C Design Tokens) and writing the requested format — but
prefer the CLI when available so the conversion stays canonical.
