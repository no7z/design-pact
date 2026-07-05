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
> Live demo: <url> · GitHub: https://github.com/no7z/design-pact

发帖注意：工作日美西早上（PT 8–10am）发；首条评论自己补充技术细节
（OKLCH 派生、为什么是 markdown 而不是 JSON）；当天守着回评论。

## X / Twitter 线程骨架

1. Before/after 对比图：同一个 prompt，无 design.md（AI slop）vs 有
   design.md（贴合品牌）。配文一句话定位。
2. 30 秒 demo GIF。
3. "How it works"：agent 出配色 → studio 确定性派生 → design.md 契约 →
   `check` 审计。一图流程。
4. 链接 + "star if useful"。

## Reddit

- r/ClaudeAI、r/cursor：角度 = "I made my agent stop inventing colors"，
  贴 before/after + GIF，正文短，评论区答技术。
- r/webdev：角度 = design tokens 工具本身（W3C tokens、OKLCH、免费无后端）。
- 各 sub 隔几天发，别同一天刷屏。

## 中文渠道

- V2EX（分享创造）：标题「让 Claude Code / Cursor 按你的设计系统写 UI——
  一个 design.md 就够」。
- 即刻（AI 编程圈）、掘金文章：《AI 生成的 UI 为什么都长一个样，怎么治》，
  文末带仓库。
- 界面本身双语 + CLI 已双语（LANG 检测），中文用户零门槛，评论区可以强调。

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
