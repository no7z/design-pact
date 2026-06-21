---
name: design-system
description: >-
  Establish and apply the project's design system. Invoke at the start of UI
  work, or whenever the user says "use my design system", "apply my tokens",
  "set up our design system", "build this to our design system", or asks to
  build/restyle UI. The skill first looks for a design-system.md in the repo:
  if present it generates UI against it; if absent it clarifies the product
  direction, YOU (the agent) propose 2–3 palettes, and it opens the UI
  Generator web app where the user picks one visually and tunes it into a full
  design system to export. All AI runs on the agent's own compute — the web app has no AI and
  no backend.
---

# Design system

The project's design system lives in a single file — `design-system.md` at the
repo root — exported from the UI Generator web app. It carries the canonical
color / type / spacing / radius / shadow / motion tokens plus a copy-verbatim
`:root` contract. That one file is the source of truth; you do not need the web
app or network access once it exists.

**Always start with Step 0.** It decides whether to apply an existing system or
help the user create one (you propose 2–3 palettes; they pick one visually).

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
creative part — clarify direction and propose 2–3 palettes; the web app does
the deterministic part — render each palette so the user picks one visually,
then derive the full token system (scales, shadows, dark pairs, the `:root`
contract, contrast audit) from it and let them tune it, then export
`design-system.md`.** The web app has no AI; it only needs your palettes as
input.

### 1. Clarify direction

If the product's visual direction isn't already clear from the conversation,
ask the user **one or two** quick questions — only what changes the palette,
e.g. light vs dark / mood (calm-professional, bold-energetic, warm-friendly),
and the rough industry/vibe. Don't over-interview; the user tunes everything
later in the web app.

### 2. Propose 2–3 palettes

Design **2–3 distinct palettes** (not one) so the user can choose visually in
the web app — hex codes in chat aren't something a person can judge at a
glance. Make them genuinely different takes on the brief (e.g. a calm/neutral
one, a bolder one, a warm or dark one), not minor variations.

Each palette is **6 colors** in this exact role order — background, foreground,
primary, accent, muted, border. Ensure foreground reads on background (aim for
≥ 4.5:1) and primary stands out. Don't hand-author a full `design-system.md` —
let the web app derive the scales/shadows/dark/contract so they're correct; you
only supply the 6 base colors per palette.

You can briefly describe the directions in chat, but **don't ask the user to
pick in chat** — the point is to let them see the palettes rendered on a real
UI and pick there.

### 3. Open the web app with the palettes baked into the URL

The web app loads palettes straight from `?p=` query params. Pass **one `?p=`
per palette**: with several, the user lands on a "选一套配色" screen showing each
palette rendered on a mockup, and picks one into the editor. (A single `?p=`
loads directly into the editor instead.) Each set is 6 hex values, no `#`, in
role order, `-` separated; join multiple sets with `&`:

```
# several palettes → visual picker
http://localhost:3000/?p=<bg>-<fg>-<primary>-<accent>-<muted>-<border>&p=<…setB…>&p=<…setC…>

# e.g.
http://localhost:3000/?p=ffffff-1a1a1a-2f6df6-7c3aed-6b7280-e5e7eb&p=0f1115-e6e8ec-5b8cff-ff8a3d-8a90a0-23262e&p=fff8f0-3a2a1a-e0641a-1aa3a3-9a8a7a-e8dcc8
```

`UI_GENERATOR_URL` defaults to `http://localhost:3000` (use a hosted URL if the
user has one, and skip the start step). Then:

- **Check if running:** `curl -sf http://localhost:3000 >/dev/null`. If not,
  **start it** — it lives in the UI Generator repo, NOT the user's current
  project, so never run `npm run dev` in the working directory. If you know the
  repo path (`$UI_GENERATOR_DIR` or the user tells you), start it in the
  background there and poll the port:
  `npm --prefix "$UI_GENERATOR_DIR" run dev`. If you don't know the path, ask
  for it or tell the user to run `npm run dev` there — don't guess.
- **Always print the full URL** (the fallback when no browser opens — opening
  it manually loads the palettes just the same), then also try to launch a
  browser on that URL:

  > 打开（已带 N 套配色）: **http://localhost:3000/?p=…&p=…**

  - macOS: `open "$URL"` · Linux: `xdg-open "$URL"` · Windows: `start "" "$URL"`

  Headless / no browser is fine — the printed URL is the instruction.

### 4. Tell the user what to do there

> 网页第一屏「选一套配色」会把这几套方案分别渲染在真实 UI 上，点你喜欢的那套进入
> 「调色」区。再用色轮 / 字体 / 间距 / 暗色微调（右侧实时预览 + 对比度审计）→ 在
> 「导出」区点 **「下载 design-system.md」** → 把文件放到这个项目的根目录。

(If they'd rather start from a different base, they can also pick a brand
template or extract from an image on the first screen.)

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
