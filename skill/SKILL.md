---
name: design-system
description: >-
  Establish and apply the project's design system. Invoke at the start of UI
  work, or whenever the user says "use my design system", "apply my tokens",
  "set up our design system", "build this to our design system", or asks to
  build/restyle UI. The skill first looks for a design-system.md in the repo:
  if present it generates UI against it; if absent it opens the UI Generator
  web app so the user can create one, then continues. Runs on the agent's own
  compute — no server dependency once the file exists.
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

The user hasn't built a design system for this project. The UI Generator is a
**local** web app — get it running, point the user at it, and resume once they
export the file.

`UI_GENERATOR_URL` defaults to `http://localhost:3000`. (If the user has a
hosted deployment, use that URL and skip the start-server step.)

1. **Check if it's already running:** `curl -sf http://localhost:3000 >/dev/null`.
   - Reachable → go to step 3.
   - Not reachable → start it (step 2).

2. **Start the local server** (only if not already running). The app is the
   UI Generator repo, not the user's current project — never run `npm run dev`
   in the user's working directory.
   - If you know the repo path (`$UI_GENERATOR_DIR`, or the user tells you),
     start it in the background there and wait for the port:
     `npm --prefix "$UI_GENERATOR_DIR" run dev` (then poll `curl` on :3000).
   - If you do **not** know where the UI Generator repo lives, ask the user for
     its path, or tell them to run `npm run dev` in it themselves. Do not guess
     a directory.

3. **Always print the URL** so the user can open it manually, then also try to
   launch a browser (the print is the fallback when no browser opens):

   > 打开 UI Generator: **http://localhost:3000**

   - macOS: `open "$UI_GENERATOR_URL"`
   - Linux: `xdg-open "$UI_GENERATOR_URL"`
   - Windows: `start "" "$UI_GENERATOR_URL"`

   If the launcher fails or there's no browser (headless/SSH), that's fine —
   the printed URL above is the instruction.

4. Tell the user, concisely, what to do there:
   > 在网页里描述你的产品 → 调好配色/字体/间距等 → 在「导出」区点
   > **「下载 design-system.md」** → 把下载的文件放到这个项目的根目录。

5. Wait for them to confirm they've added the file. Then re-run the Step 0
   search. Once `design-system.md` is present, continue to **Apply**.

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
