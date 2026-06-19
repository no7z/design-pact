# UI Generator

为「用 AI 生成页面的人」准备的设计系统生成器。描述你的产品，得到一整套协调的设计 tokens（色板 / 字体 / 间距 / 圆角 / 阴影 / 描边 / 透明度 / 动效），再以 AI 能严格执行的格式导出。

核心主张：**导出的 AI prompt 经闭环评测验证**——内置 eval harness 用真实模型按 prompt 生成页面、Playwright 读取 computed style 打分，当前格式的样式保真度约 97/100（prose-only 基线 89）。

## 工作流

1. **描述** — 一句话描述产品；AI 必要时追问 1–2 个方向问题，然后给出 3 套 AI 配色 + 同类真实品牌模板推荐。不想用 AI 也可以直接浏览全部品牌模板、上传图片取色、从网址提取或导入 JSON。
2. **调色** — OKLCH 色轮整体协调 + 单色编辑 + 语义角色分配，右侧 5 种 mockup 实时预览，含对比度审计。
3. **字体** — base + ratio 两个滑条驱动 8 级字号阶梯，字重/行高/字距可调。
4. **细节** — 间距 / 圆角 / 阴影 / 描边 / 透明度，全部「单 base 滑条派生整套阶梯」。
5. **动效** — 时长阶梯 + 缓动曲线。
6. **导出** — W3C Design Tokens JSON、Tailwind 配置、CSS 变量、AI prompt、Figma（Tokens Studio）、视觉总览 PNG/SVG/HTML。还可以：
   - **下载 design-system.md**（推荐）：一个自包含文件，丢进代码库给你自己的 AI 用，见下方；
   - **真实页面测试**：把 prompt 直接交给模型，现场生成一张用你的 tokens 构建的落地页；
   - **分享链接**：整套 tokens 序列化进 URL，打开即载入。

## 把设计系统接进你自己的 AI（design-system.md）

导出区点「下载 **design-system.md**」，得到一个自包含的 markdown 文件。它一份文件服务三类读者：

- **人** — 散文 + 色板/字体/间距说明，在 GitHub 或编辑器里直接可读；
- **AI agent** — 文件内嵌逐字 `:root` 契约（就是 eval 打到 ~97/100 那段），把文件丢进 repo，**你自己的 Claude Code / Cursor 读它就能按你的设计系统生成 UI**——用你自己的算力，不依赖本工具在线；
- **工具** — 文件底部的 W3C Design Tokens JSON 块，给配套 CLI 精确转格式。

两种用法：

```bash
# 1) 让 agent 直接用：把 design-system.md 放进项目，配上 skill（见 skill/SKILL.md）
#    agent 读文件 → 按 :root 契约生成/对齐 UI

# 2) 转成项目文件（可选）：
npx design-system-md add design-system.md --format css|tailwind|w3c|all
#    → tokens.css / tailwind.config.js / design-tokens.json
```

- **Skill**：`skill/SKILL.md` 拷到 `~/.claude/skills/design-system/`（或项目 `.claude/skills/design-system/`）。它是项目起步时的决策入口——先搜 `design-system.md`：**有就按它生成 UI，没有就打开 UI Generator 网页**（默认 `http://localhost:3000`，有线上部署可替换）让你现做、导出后回到项目继续。
- **CLI**：见 [`packages/cli`](packages/cli/README.md)。纯本地、确定性、不联网、不调 AI；css/json 与网页导出逐字一致，tailwind 复用网页同一套 `tailwindConfig` 生成、零漂移。

## 开发

```bash
npm install
cp .env.local.example .env.local   # 如无该文件，手动创建并填入下方变量
npm run dev
```

`.env.local`：

```
AI_GATEWAY_API_KEY=...          # Vercel AI Gateway 密钥（AI 功能必需）
AI_GATEWAY_DEFAULT_MODEL=...    # 可选，默认 deepseek/deepseek-v3
```

## 脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` / `build` / `start` | Next.js 常规 |
| `npm run eval [fixture]` | 闭环评测：模型按导出 prompt 生成页面 → Playwright 打分（需要 API key） |
| `npm run eval:score [html] [fixture]` | 确定性打分（无需 key），可作回归检查 |
| `npm run snapshot:templates` | 重新抓取并解析品牌模板 → `public/templates.json` |

## 架构速览

- `app/page.tsx` — 单页垂直工作流（Lenis 平滑滚动 + 左侧进度导航）
- `lib/store.ts` — zustand + localStorage，全部 token 状态
- `lib/scales.ts` / `lib/typography.ts` — 「base → 整套阶梯」派生逻辑
- `lib/export.ts` — 4 种文本导出；`lib/visualExport.ts` — 视觉导出
- `lib/templates.ts` + `public/templates.json` — 品牌模板快照（构建时由 `scripts/snapshot-templates.ts` 生成，运行时不依赖 GitHub）
- `app/api/*` — clarify / palette / recommend / extract-url / generate-page，全部走 Vercel AI Gateway，内存限流
- `test/harness/` — token→UI 保真度评测（详见 `test/harness/run.ts` 头注释）

模板数据来源：[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)。
