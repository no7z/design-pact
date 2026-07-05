# Launch playbook

内部文档：发布渠道、文案草稿、以及发布前必须完成的事。不随 npm 包分发。

## 发布前 checklist（顺序即优先级）

- [ ] **Demo GIF**（20–30 秒）：`/design-pact` → studio 打开 → 拖色轮 → 导出
      design.md → agent 生成符合契约的 UI → `check` 通过。放 `docs/demo.gif`，
      README 首屏引用。这是转化率的第一决定因素。
- [ ] **Live demo**：静态导出部署回 Vercel；`gh repo edit --homepage <url>`；
      README 加 "Try it live"。
- [ ] **Social preview**：仓库 Settings → Social preview 上传一张 1280×640 卡片
      （工具截图 + 一句话定位）。
- [ ] `NPM_TOKEN` secret 配好，打一个 tag 验证 Release workflow。
- [ ] 自己开 3–5 个 roadmap issue（shadcn 导出、反向导入、MCP server…），
      贴 `good first issue` 标签——空 issue 区会让访客觉得项目没人气。

## Show HN 草稿

> **Show HN: Make Claude Code/Cursor follow your design system (one markdown file, no backend)**
>
> I build UIs with coding agents a lot, and the recurring failure is style
> drift: every generation invents new grays, new radii, new shadows — the
> "AI slop" look.
>
> This tool splits the work by what each side is good at: your agent does the
> creative part (it proposes 2–3 palettes from your brief), and a local web
> studio does the deterministic part — it derives a complete token system
> (color/type/spacing/radius/shadow/motion, dark mode, contrast audit) from
> the palette you pick, then exports a single `design.md`.
>
> `design.md` is readable three ways: prose for humans, a verbatim `:root`
> contract for agents (Claude Code/Cursor read it and generate UI on your own
> compute), and a W3C Design Tokens JSON block for tools. A companion CLI
> converts it to tokens.css/tailwind config, and `check` scans your source for
> color literals outside the contract — so the agent loop closes: generate,
> check, fix.
>
> No AI API key, no backend, no account. The studio is a static export; all
> AI runs on whatever agent you already pay for.
>
> Live demo: https://design-pact.vercel.app · GitHub: https://github.com/no7z/design-pact

发帖注意：工作日美西早上（PT 8–10am）发；首条评论自己补充技术细节
（OKLCH 派生、为什么是 markdown 而不是 JSON）；当天守着回评论。

## X / Twitter 线程（成品，直接粘贴）

配图：`docs/social/before-after.png`（1 楼）、`docs/demo.gif`（2 楼）。

**1/**（带对比图）
> The same prompt, the same agent. The only difference: a design.md file in the repo.
>
> AI-generated UIs drift — every generation invents new grays, new radii, new shadows. design-pact makes your agent sign a contract instead.
>
> github.com/no7z/design-pact

**2/**（带 demo GIF）
> How it works:
>
> 1. your agent proposes 2–3 palettes from your brief (its creativity, your compute)
> 2. a local studio derives the full token system — type/spacing/radius/shadows/dark mode — deterministically
> 3. export one design.md
> 4. Claude Code / Cursor build UI from it
>
> No AI API key. No backend. No account.

**3/**
> The loop actually closes:
>
> `npx design-pact import src/` — adopt it in an existing codebase (maps the colors you already use onto roles)
>
> `npx design-pact check design.md src/` — every color outside the contract, file:line, exit 1
>
> The slop version of that screenshot? check found 24 stray colors. The contract version: 0.
>
> generate → check → fix. Works in CI too.

**4/**
> Try it:
>
> Live studio: design-pact.vercel.app
> One command: `npx design-pact open`
> GitHub (MIT): github.com/no7z/design-pact
>
> Show HN: <发帖后补链接>

## Reddit

- r/ClaudeAI、r/cursor：角度 = "I made my agent stop inventing colors"，
  贴 before/after + GIF，正文短，评论区答技术。
- r/webdev：角度 = design tokens 工具本身（W3C tokens、OKLCH、免费无后端）。
- 各 sub 隔几天发，别同一天刷屏。

## 中文渠道（成品，直接粘贴）

### V2EX · 分享创造

标题：**让 Claude Code / Cursor 按你的设计系统写 UI —— 一个 design.md 就够了**

> 用 AI agent 写前端的人应该都遇到过：每次生成都发明一批新的灰色、新的圆角、新的阴影，页面越攒越"AI 味"。
>
> 我做了个开源工具 design-pact，思路是把工作按擅长程度拆开：**agent 做创意**（根据你的描述提 2–3 套配色），**本地工具做确定性推导**（从你选中的那套配色派生出完整 token 系统：字号阶梯 / 间距 / 圆角 / 阴影 / 暗色配对 / 对比度审计），导出一份 design.md 放进仓库。
>
> 这个文件同时给三种"读者"用：人读散文部分；agent 读内嵌的逐字 :root 契约（Claude Code / Cursor 直接按它生成 UI，用你自己的算力）；工具读底部的 W3C Design Tokens JSON。
>
> 闭环的两条命令：
> - `npx design-pact import src/` —— 存量项目反推：扫 tailwind 配置 / CSS 变量 / hex 使用频率，生成 design.md 草稿
> - `npx design-pact check design.md src/` —— 审计代码里所有契约外的颜色，精确到文件:行号，exit 1 可进 CI
>
> 零后端、零账户、不要 API key，界面和 CLI 都是中英双语。
>
> 在线试用：https://design-pact.vercel.app
> GitHub（MIT）：https://github.com/no7z/design-pact
>
> 配图：before/after 对比（同一个 prompt，无契约 24 个野颜色 vs 有契约 0 违规）。欢迎拍砖。

### 即刻（AI 编程圈）

> AI 生成的 UI 为什么都长一个样？因为 agent 每次都在重新发明设计系统。
>
> 我的解法：让它签契约。design-pact —— agent 提配色、本地工具确定性派生整套 tokens、导出一份 design.md 放进仓库，Claude Code / Cursor 照它写 UI，`check` 命令审计有没有偷用契约外的颜色（精确到行号）。
>
> 全程零后端不要 API key，中英双语。
> 试玩：design-pact.vercel.app
> GitHub：github.com/no7z/design-pact
> 配图：同一个 prompt 有无契约的对比，野颜色 24 → 0。

### 掘金（长文，发布后一周内）

标题：《AI 生成的 UI 为什么都长一个样，怎么治》——痛点分析 + design.md 契约思路 + import/check 实战（拿一个真实项目跑 import 的过程做案例），文末带仓库。

## Awesome 列表 PR

- [ ] awesome-claude-code（skills/工具区）
- [ ] awesome-cursor / awesome-cursorrules
- [ ] awesome-design-tokens
- [ ] VoltAgent/awesome-design-md —— 我们用它做模板数据源，PR 加反向链接，互利
- [ ] （做了 MCP server 之后）awesome-mcp-servers

每个 PR 描述一句话即可：»Design-system generator for AI-agent workflows —
derives a full token set from a palette, exports an agent-executable design.md.«

## 时机

蹭节点：Claude Code / Cursor 大版本发布、"AI slop UI" 相关热帖出现时，
带 before/after 图下场。发布别赶在大厂发布会同一天。
