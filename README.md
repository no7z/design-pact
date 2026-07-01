# design-system

[![skills.sh](https://skills.sh/b/no7z/design-system)](https://skills.sh/no7z/design-system)

> 一条命令装 skill：`npx skills add no7z/design-system -g`

一个**纯前端、零后端**的设计系统编辑器，为「用 AI 生成页面的人」准备。它把一套配色派生成完整、协调的设计 tokens（色板 / 字体 / 间距 / 圆角 / 阴影 / 描边 / 透明度 / 动效），并导出成 **AI 能严格执行的 `design.md`**——丢进代码库，让你自己的 agent（Claude Code / Cursor）据此生成 UI。

**AI 全程跑在你自己的 agent 上**：配色由 agent 产出，UI 生成由 agent 完成。本工具不含任何在线 AI、不需要任何 API key——它只做确定性的 token 派生、可视化微调和导出。

## 工作流

1. **开始** — 配色由你的 agent 产出（先装 skill：`npx skills add no7z/design-system -g`，然后描述产品 → agent 给方案 → 用「导入 agent 配色」载入）。也可以直接选品牌模板、上传图片取色开局。
2. **调色** — OKLCH 色轮整体协调 + 单色编辑 + 语义角色分配 + 明暗配对，右侧 6 种 mockup 实时预览，含对比度审计。
3. **字体** — base + ratio 两个滑条驱动 8 级字号阶梯，字重/行高/字距可调。
4. **细节** — 间距 / 圆角 / 阴影 / 描边 / 透明度，全部「单 base 滑条派生整套阶梯」。
5. **动效** — 时长阶梯 + 缓动曲线。
6. **导出** — **design.md**（推荐，见下）、W3C Design Tokens JSON、Tailwind 配置、CSS 变量、AI prompt、Figma（Tokens Studio）、视觉总览 PNG/SVG/HTML；以及**分享链接**（整套 tokens 序列化进 URL，打开即载入）。

## 把设计系统接进你自己的 AI（design.md）

导出区点「下载 **design.md**」，得到一个自包含的 markdown 文件，一份文件服务三类读者：

- **人** — 散文 + 色板/字体/间距说明，在 GitHub 或编辑器里直接可读；
- **AI agent** — 文件内嵌逐字 `:root` 契约（经内置 eval harness 验证：模型按此契约生成页面的样式保真度约 97/100），把文件丢进 repo，**你自己的 Claude Code / Cursor 读它就能按你的设计系统生成 UI**，用你自己的算力；
- **工具** — 文件底部的 W3C Design Tokens JSON 块，给配套 CLI 精确转格式。

两种用法：

```bash
# 1) 让 agent 直接用：把 design.md 放进项目，配上 skill（见下）
#    agent 读文件 → 按 :root 契约生成/对齐 UI

# 2) 转成项目文件（可选）：
npx @no7z/design-system add design.md --format css|tailwind|w3c|all
#    → tokens.css / tailwind.config.js / design-tokens.json
```

- **Skill（推荐安装法）** — 用开放 skill 生态的 [`skills`](https://github.com/vercel-labs/skills) CLI，一条命令、跨 agent（Claude Code / Cursor / Codex…）：

  ```bash
  npx skills add no7z/design-system -g   # 全局：装一次，所有项目可用
  npx skills add no7z/design-system      # 或：只装当前项目（.claude/skills/）
  ```

  也可用本包自带的安装器（离线、skill + studio 同一个包）：`npx @no7z/design-system init [--global]`。

  skill 是项目起步时的决策入口——先搜 `design.md`：**有就按它生成 UI；没有就问清方向、由 agent 产出配色，并用 `npx @no7z/design-system open` 打开 design-system 网页**（默认 `http://localhost:3000`，有线上部署可替换）把配色派生成完整系统、微调后导出，再回到项目继续。studio 由 `@no7z/design-system` 包提供，skill 会在需要时自动用 `npx` 拉起，无需手动安装。
- **CLI**：见 [`packages/cli`](packages/cli/README.md)。纯本地、确定性、不联网、不调 AI；css/json 与网页导出逐字一致，tailwind 复用网页同一套 `tailwindConfig` 生成、零漂移。

## 开发

无需任何 API key——直接跑：

```bash
npm install
npm run dev
```

## 脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` / `build` / `start` | Next.js 常规（纯静态，无服务端路由） |
| `npm run eval:score [html] [fixture]` | 确定性打分（无需 key），守护 `:root` 契约不回归 |
| `npm run eval [fixture]` | 闭环评测：模型按导出契约生成页面 → Playwright 打分。仅开发用，需在 `.env.local` 配 `AI_GATEWAY_API_KEY`（应用本身不需要） |
| `npm run snapshot:templates` | 重新抓取并解析品牌模板 → `public/templates.json` |

## 架构速览

- `app/page.tsx` — 单页垂直工作流（Lenis 平滑滚动 + 左侧进度导航），无服务端路由
- `lib/tokens-core.ts` — 框架无关的 token 类型 + `computedHex` + 默认值（web 与 CLI 共用）
- `lib/store.ts` — zustand + localStorage，全部 token 状态（re-export tokens-core）
- `lib/scales.ts` / `lib/typography.ts` — 「base → 整套阶梯」派生逻辑
- `lib/export.ts` — 文本导出（含 `designSystemMarkdown`）；`lib/visualExport.ts` — 视觉导出
- `lib/templates.ts` + `public/templates.json` — 品牌模板快照（构建时由 `scripts/snapshot-templates.ts` 生成，运行时不依赖 GitHub）
- `packages/cli` — `@no7z/design-system` CLI；`skills/design-system/SKILL.md` — 给 agent 的应用/创建说明
- `test/harness/` — token→UI 保真度评测（开发工具，详见 `test/harness/run.ts` 头注释）

模板数据来源：[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)。
