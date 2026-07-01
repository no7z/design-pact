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
repo root — exported from the design-system web app. It carries the canonical
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
   `rg -l "^design-system:" --type md`.

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

Give each palette a short **name** and a one-line **description** (what it's for
/ the mood), so the user can tell the options apart on the picker — they're
shown on each card. e.g. name「海洋蓝」, description「冷静专业，适合 B2B SaaS」.

You can briefly describe the directions in chat, but **don't ask the user to
pick in chat** — the point is to let them see the palettes rendered on a real
UI and pick there.

### 2.5 Match same-category real products

The web app ships a library of ~70 real brand design templates. List the ones in
the **same product category** as what's being built, so the user can start from
a proven real-world design. They appear as a "同类真实产品" row on the first
screen and are passed via `?m=` in step 3.

**Match by PRODUCT CATEGORY, not by color or vibe.** To keep this accurate
(don't rely on recognizing every slug from memory — some are obscure), the
brands are pre-grouped below. Steps:

1. Classify the product being built into ONE of the categories below.
2. Take the slugs from that category. If an adjacent category clearly also fits
   the product (e.g. an "AI devtool" spans **AI** and **开发者工具**), you may
   include those too.
3. **宁缺毋滥** — if no category genuinely fits, send no `m=` at all (the row
   just won't appear). Never pad with off-category brands.

```
AI（大模型 / 生成式 AI 产品）:   claude cohere mistral.ai minimax x.ai elevenlabs runwayml together.ai replicate ollama lovable
开发者工具 / 基础设施 / 后端:     cursor warp vercel supabase mongodb clickhouse hashicorp sentry posthog mintlify sanity resend expo composio opencode.ai voltagent
生产力 / 协作 / 工作流 SaaS:      notion airtable miro slack linear.app cal superhuman zapier raycast intercom clay
设计 / 建站 / 无代码:            figma framer webflow
金融科技 / 支付:                stripe mastercard revolut wise
加密货币 / 交易所:               coinbase binance kraken
汽车:                          tesla bmw bmw-m ferrari lamborghini bugatti renault
消费电子 / 科技巨头 / 游戏主机:   apple nvidia meta ibm playstation
电商 / 零售 / 消费品牌:          shopify nike starbucks
出行 / 市场 / 流媒体（消费平台）: airbnb uber pinterest spotify
媒体 / 出版:                    theverge wired
电信:                          vodafone
航天:                          spacex
```

e.g. a payments dashboard → category 金融科技 → `stripe,mastercard,revolut,wise`;
an EV brand site → 汽车 → `tesla,bmw,lamborghini`; an AI chat product → AI →
`claude,x.ai,mistral.ai,cohere`; a project-tracking SaaS → 生产力 →
`linear.app,notion,airtable,slack`.

### 3. Open the web app with the palettes baked into the URL

The web app loads palettes straight from `?p=` query params. Pass **one `?p=`
per palette**: with several, the user lands on a "选一套配色" screen showing each
palette rendered on a mockup with its name + description, and picks one into the
editor. (A single `?p=` loads directly into the editor instead.)

Each set is the 6 hex values (no `#`, role order, `-` separated), optionally
followed by the **name** and **description**, appended with `~` and
**URL-encoded** (they usually contain CJK/spaces):

```
p=<bg>-<fg>-<primary>-<accent>-<muted>-<border>~<name>~<description>
```

Join multiple sets with `&`:

```
# several palettes → visual picker (with names + descriptions)
http://localhost:3000/?p=ffffff-1a1a1a-2f6df6-7c3aed-6b7280-e5e7eb~%E6%B5%B7%E6%B4%8B%E8%93%9D~%E5%86%B7%E9%9D%99%E4%B8%93%E4%B8%9A%EF%BC%8C%E9%80%82%E5%90%88%20B2B%20SaaS&p=0f1115-e6e8ec-5b8cff-ff8a3d-8a90a0-23262e~%E6%9A%97%E5%A4%9C~%E7%A7%91%E6%8A%80%E6%84%9F%E5%8D%81%E8%B6%B3
```

(Names/descriptions are optional — a bare `p=<hexes>` still works. Build the URL
programmatically with `encodeURIComponent` for each name/description so the `~`
delimiters stay intact.)

Append the same-category brands from step 2.5 as a single comma-separated `m=`
(slugs only, no encoding needed). Unknown slugs are dropped; omit `m=` entirely
when nothing matched:

```
…&m=stripe,linear.app,vercel,supabase
```

Full URL: `http://localhost:3000/?<query>` (`DESIGN_SYSTEM_URL` defaults to
`http://localhost:3000`; use a hosted URL if the user has one).

**Do these IN ORDER. Step 1 always happens — even if 2 and 3 fail, the printed
URL is all the user needs.**

1. **Print the full URL on its own line and tell the user to open it.** Do this
   first, unconditionally. Opening it manually loads the palettes just the same.

   > 打开（已带 N 套配色）: http://localhost:3000/?p=…&p=…

2. **Make sure the studio is serving:** `curl -sf http://localhost:3000 >/dev/null`.
   If it returns nothing, start it in the **background** — it lives in the UI
   Generator repo, NOT the user's current project (never `npm run dev` in the
   working directory). The repo path is `$DESIGN_SYSTEM_DIR`; if that's empty, ask
   the user for it. Then `npm --prefix "<dir>" run dev &` and poll `curl` until
   the port answers. (If you can't start it, that's fine — the user can run it
   themselves; you've already given them the URL in step 1.)

3. **Try to open a browser** on the URL: macOS `open "$URL"` · Linux
   `xdg-open "$URL"` · Windows `start "" "$URL"`. Headless / no browser is fine.

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
