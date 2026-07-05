# 工作流式页面 v1.7：样式模块（间距 / 圆角 / 阴影）

## v1.7 — 这次的任务

在「字体」section 之后、「导出」之前加 **样式 section**，左侧调节、右侧实时预览。包含三类 token：
1. **Spacing**（间距）—— 单 `base` 滑条（2–8px），派生 8 级阶梯
2. **Radius**（圆角）—— 单 `base` 滑条（0–24px），派生 sm/md/lg/xl/full
3. **Shadow**（阴影）—— 默认 `intensity` 单滑条 0–1，三档 elevation 按比例缩放；展开「高级选项」后变成每级 3 参数（blur / offset-y / opacity）独立调

## Context

现有 store 完全没有 spacing / radius / shadow 字段；导出 4 种格式（W3C/Tailwind/CSS/AI prompt）也没输出这三类 token。设计师调好的色板和字体之后必须能继续调间距和圆角阴影，否则导出的设计系统残缺。

**用户决策**：
- 调节粒度 = 单 base 滑条 + 预设阶梯（和字体 base/ratio 风格一致）
- 阴影 = 单 intensity 滑条 + 可展开「高级」3 参数模式
- 模板载入：**同步解析 spacing / radius**，shadow 保持默认（DESIGN.md 里的 shadow 描述多元，估算误差大）

---

## 改动概览

### 新建

**`lib/scales.ts`** — 间距/圆角/阴影派生 + CSS 序列化
```ts
export const SPACING_STEPS = [
  { name: "xxs", mul: 1 },  // base * 1
  { name: "xs",  mul: 2 },
  { name: "sm",  mul: 3 },
  { name: "md",  mul: 4 },
  { name: "lg",  mul: 6 },
  { name: "xl",  mul: 8 },
  { name: "xxl", mul: 12 },
  { name: "section", mul: 24 },
] as const;

export const RADIUS_STEPS = [
  { name: "sm",   mul: 0.5 },
  { name: "md",   mul: 1 },
  { name: "lg",   mul: 1.5 },
  { name: "xl",   mul: 2 },
  { name: "full", px: 9999 },
] as const;

export function buildSpacing(base: number): { name: string; px: number }[];
export function buildRadius(base: number): { name: string; px: number }[];

// Shadow defaults at intensity = 0.5 (multiplied by intensity * 2 to scale)
const SHADOW_DEFAULTS = {
  sm: { blur: 4, offsetY: 1, opacity: 0.04 },
  md: { blur: 12, offsetY: 4, opacity: 0.08 },
  lg: { blur: 24, offsetY: 8, opacity: 0.12 },
};
export function buildShadowsFromIntensity(intensity: number): ShadowTokens;
export function shadowToCss(s: ShadowToken): string; // "0 4px 12px rgba(0,0,0,0.08)"
```

**`components/StyleStep.tsx`** — `#step-tokens` 内容
- 左侧控件（grid col 1，约 380px）：
  - **间距** section：base 滑条 2–8 px + 当前 8 级阶梯小预览（细色块条）
  - **圆角** section：base 滑条 0–24 px
  - **阴影** section：intensity 滑条 0–1 + 「高级 ↓」可展开行；展开后渲染 sm/md/lg 三组，每组 3 个数字 input（blur / offset-y / opacity）+「重置为简单模式」按钮
- 右侧预览（grid col 1fr）：
  - **间距标尺**：8 级色块横向排列，每个色块上方标 `xs 8px`
  - **圆角卡片**：5 张同色卡（sm/md/lg/xl/full），用 primary 色填充
  - **阴影示例**：3 张白色卡片浮在浅灰背景上，配 sm/md/lg elevation；卡片下方标 `sm · 0 1px 4px rgba(...)`
- 三组堆叠在同一面板，section 之间加细分割线

**`lib/templates.ts` 新增 `parseMdSpacing(md)` 和 `parseMdRadius(md)`**
- Spacing：扫描 `spacing:` YAML 块 + Markdown 表格 + 加粗列表里的 px 值；取最小有效值作 `base`；过滤掉 letter-spacing / line-height 误差
- Radius：同样扫描 `borderRadius:` / `radius:` 段；最小值作 base；常见值如 4/8/12/16
- 返回 `Partial<{ spacing: Spacing; radius: Radius }>`
- Shadow **不解析**（用户决策）

### 修改

**`lib/store.ts`** — 加 3 个字段 + actions
```ts
type Spacing = { base: number };           // px, default 4
type Radius = { base: number };             // px, default 8
type ShadowToken = { blur: number; offsetY: number; opacity: number };
type Shadow = {
  intensity: number;     // 0..1, default 0.5
  advanced: boolean;     // false = simple slider; true = per-level edits
  sm: ShadowToken;
  md: ShadowToken;
  lg: ShadowToken;
};

// State 加：
spacing: Spacing;
radius: Radius;
shadow: Shadow;

setSpacing: (s: Partial<Spacing>) => void;
setRadius: (r: Partial<Radius>) => void;
setShadow: (s: Partial<Shadow>) => void;
setShadowLevel: (level: "sm" | "md" | "lg", t: Partial<ShadowToken>) => void;
```
默认值：`spacing = { base: 4 }`、`radius = { base: 8 }`、`shadow = buildShadowsFromIntensity(0.5) + { intensity: 0.5, advanced: false }`。

zustand persist 已经无 partialize，全字段自动持久化。

**`lib/templates.ts` 的 `fetchTemplate`** — 返回值加 spacing / radius
```ts
fetchTemplate(brand): Promise<{
  colors: ColorToken[];
  typography: Partial<Typography>;
  spacing: Partial<Spacing>;
  radius: Partial<Radius>;
}>;
```

**`components/TemplateStep.tsx` / `AllTemplatesBrowser.tsx`** — `handlePick`/`handleSelect`
- 拿到 `{ colors, typography, spacing, radius }` 后追加 `setSpacing(spacing)` + `setRadius(radius)`

**`lib/export.ts`** — 4 种格式都扩展输出
- W3C JSON：`spacing.xs..section`、`borderRadius.sm..full`、`shadow.sm/md/lg`
- Tailwind 配置：`theme.extend.spacing`、`borderRadius`、`boxShadow`
- CSS 变量：`--spacing-xs..` / `--radius-sm..` / `--shadow-sm..` 等
- AI prompt：加描述（间距阶梯、圆角风格、阴影深度）

**`app/page.tsx`** — 插入 `#step-tokens` section（介于 `#step-typography` 和 `#step-export` 之间）
- 复用 step-edit 的 `lg:pl-28` + max-w-[1440px] 容器
- 标题「样式」，副文「调节间距阶梯、圆角和阴影深度」
- 同时把所有 step 编号统一为 5 制：1/5, 2/5, 3/5, 4/5, 5/5

**`components/WorkflowNav.tsx`** — `ALL_STEPS` 加 `{ id: "step-tokens", label: "细节" }`，位置在「字体」「导出」之间

### 不动

- `components/MockupViews.tsx`（已经用了 card-shadow filter + rx，改它不在范围）
- Editor / Preview / TypographyStep
- AI 推荐流程

---

## 关键实现细节

### Shadow CSS 序列化
```ts
function shadowToCss(s: ShadowToken): string {
  return `0 ${s.offsetY}px ${s.blur}px 0 rgba(0,0,0,${s.opacity.toFixed(3)})`;
}
```
高级模式下用户改任一字段直接 setShadowLevel，`advanced=true` 状态不再受 intensity 控制。
切回简单模式（按重置按钮）→ 重新 buildShadowsFromIntensity，覆盖 sm/md/lg。

### intensity → 三档计算
```ts
function buildShadowsFromIntensity(i: number) {
  const scale = Math.max(0, i * 2); // 0..2
  const apply = (d: ShadowToken) => ({
    blur: Math.round(d.blur * scale),
    offsetY: Math.round(d.offsetY * scale * 10) / 10,
    opacity: Math.round(d.opacity * scale * 1000) / 1000,
  });
  return {
    sm: apply(SHADOW_DEFAULTS.sm),
    md: apply(SHADOW_DEFAULTS.md),
    lg: apply(SHADOW_DEFAULTS.lg),
  };
}
```

### Spacing / Radius 解析鲁棒性
对于格式如：
```yaml
spacing:
  xxs: 4px  |  xs: 8px  |  sm: 12px
```
（Linear 的内联格式）也要支持。正则：`(\b(?:xxs?|sm|md|lg|xl{1,2}|section)\s*:\s*(\d+(?:\.\d+)?)\s*px)` 全局扫，取最小作为 base。

Radius 同理，匹配 `(\d+)\s*px` 在 radius/borderRadius 段附近。

模板解析失败 → 字段省略，调用方保留 store 默认值（4 / 8）。

### 预览视觉

Spacing 标尺（横向）：
```
[xxs|4px][xs|8px ][sm|12px  ][md|16px    ][lg|24px      ]...
```
每个色块宽 = 该级 px 值（直接用 px），高 24px，主色填充。

Radius 卡（5 张并排）：
```
□ □ ▢ ▢ ●
sm md lg xl full
```
每张 60×60 用 primary 色块 + 标签。

Shadow 卡（3 张并排，浅灰 panel 背景里浮起白色卡）：
```
[ sm ] [ md ] [ lg ]
```
卡片 90×60 白色，应用 shadowToCss(...)，下方小字标签。

---

## 复用现有代码

| 既有 | 路径 | 怎么用 |
|---|---|---|
| `fetchTemplate` 已有 returns colors+typography | `lib/templates.ts` | 扩展返回 spacing/radius |
| `parseMdColors` / `parseMdTypography` 模式 | `lib/templates.ts` | 复制行扫描结构做 parseMdSpacing/Radius |
| TypographyStep 的「左右两栏 + slider + 预览」结构 | `components/TypographyStep.tsx` | 直接抄改 |
| WorkflowNav 加节点 | `components/WorkflowNav.tsx` | 数组加一项 |
| zustand persist 自动覆盖 | `lib/store.ts` | 不需要碰 persist 配置 |

---

## 实现顺序

1. **`lib/scales.ts`**：写 SPACING_STEPS / RADIUS_STEPS / buildSpacing / buildRadius / buildShadowsFromIntensity / shadowToCss + Node 单测
2. **store 扩展**：加 Spacing/Radius/Shadow 类型 + actions + 默认值
3. **`parseMdSpacing/Radius`** + `fetchTemplate` 扩展；用 stripe/notion DESIGN.md 跑测试
4. **TemplateStep / AllTemplatesBrowser**：handlePick 追加 setSpacing/setRadius
5. **`StyleStep.tsx`**：控件 + 预览，简单模式 → 高级模式切换
6. **`app/page.tsx`**：插入 #step-tokens section，统一 step 编号为 1/5..5/5
7. **`WorkflowNav`**：加节点
8. **`lib/export.ts`**：4 种格式都扩展 spacing/radius/shadow 输出
9. **类型检查 + 浏览器手测**（base/intensity 滑条响应、模板解析、导出包含新字段）

---

## 验证步骤

1. **解析单测**：node 脚本，对 stripe/notion/linear/apple 4 个模板跑 parseMdSpacing/Radius，确认 base 落在合理范围（spacing 2–8、radius 0–24）
2. **完整流程**：
   - 选 Stripe → 滚到「细节」section
   - spacing base 应该是 Stripe 解析出的（如 8）；改滑条到 4，右侧 8 级标尺整体收紧
   - radius base 默认或解析值；改到 16，5 张卡变成大圆角
   - shadow intensity 改到 1.0，三张卡阴影变深；展开高级，改 lg 的 blur 到 40，单独这张卡变虚
3. **导出联动**：
   - Tailwind 输出包含 `spacing: { xs: '8px', ... }`、`borderRadius`、`boxShadow`
   - CSS 输出 `--spacing-xs: 8px;` 等
4. **模板切换不丢用户调整**：在「细节」section 改完 → 切到另一个模板 → 解析的新 spacing/radius 覆盖；shadow 保持用户调好的值（因为不解析）
5. **持久化**：刷新页面后 base/intensity/advanced 状态都恢复
6. **WorkflowNav**：左侧出现 6 个节点（描述/模板/调色/字体/细节/导出），active 状态正确切换
7. **类型检查**：`npx tsc --noEmit`

---

---

# v1.6（已完成）：字体模块（载入模板字号、可调节 base + ratio）

## v1.6 — 这次的任务

在「调色」section 之后、「导出」之前增加 **字体配置 section**。

## Context

现有 `Typography = { base, ratio, fontFamily, headingFamily }`、`buildScale` 已经能从 base × ratio^step 生成 8 级（h1...caption）字号阶梯。导出（W3C/Tailwind/CSS/AI prompt）已经把这些 token 输出了。但 **UI 上没有任何编辑入口**，模板里的 typography 信息也完全没解析。

文章 https://thariqs.github.io/html-effectiveness/05-design-system.html 给出的典型字号阶梯（Display 48 / H1 32 / H2 24 / Body 16 / Small 14 / Caption 12，line-height 反比缩放）和现有的 buildScale 概念一致。

**用户决策**：
- 调节粒度 = base + ratio 两个滑条（沿用现有 buildScale，不做 per-level px 输入）
- Mockup 文本不动（继续用色块占位）；新增的字体区做专门预览

---

## 改动概览

### 新建

**`components/TypographyStep.tsx`** — 字体配置 + 预览的 section 内容
- 左侧控件区（约 40% 宽）：
  - **基础字号 base** 滑条（12–22 px，step 1）+ 数字回显
  - **缩放比例 ratio** 滑条（1.1–1.5，step 0.01）+ 数字回显
  - **正文字体** select（预设栈 + 「自定义」转 input）
  - **标题字体** select（同上）
- 右侧预览区：用 `buildScale(typography)` 渲染 8 级阶梯，每行：
  - 左对齐：`<标签 px>` 灰字（如 `H1 · 32px`）
  - 右侧：`<文本示例>` 用当前 fontFamily / 计算后的 fontSize 渲染，混合「敏捷的棕色狐狸 The Quick Brown Fox 1234」
  - 标题级别（h1-h5）用 headingFamily + weight 600；body/small/caption 用 fontFamily + weight 400
  - line-height 按级别分发（display 1.1，h 1.25，body 1.5，caption 1.4 — 内置常量）
- 整体复用现有 Editor section 的 `lg:grid-cols-2` 布局

**`lib/templates.ts` 新增 `parseMdTypography(md)`**
- 扫描 markdown 找以下信号：
  - YAML 风格：`body:` / `paragraph:` 块下的 `fontSize: NNpx` → `base`
  - YAML 风格：`body:` 块下的 `fontFamily: "..."` → `fontFamily`
  - YAML 风格：`display-xl` / `display-lg` / `h1` 块下的 `fontFamily: "..."` → `headingFamily`
  - 列表风格：`- Body: 16px / 1.5 / 400` 用正则提 px 值
  - 表格风格：`| body | 16px |` 同理
- 若拿到 body 和 display/h1 字号，按 `ratio = (h1 / body)^(1/5)` 推 ratio，限制在 [1.1, 1.5]，超出回退 1.25
- 返回 `Partial<Typography>`（只填能识别的字段，其余调用方合并默认值）

### 修改

**`lib/templates.ts`**
- 重命名 `fetchTemplateColors` → 内部保留，但导出新的统一入口 `fetchTemplate(brand): Promise<{ colors: ColorToken[]; typography: Partial<Typography> }>`
  - 内部一次 fetch DESIGN.md，调用 `parseMdColors` + `parseMdTypography`
- 旧的 `fetchTemplateColors` 保留（`useTemplatePreview` 等还在用，只关心色板）

**`components/TemplateStep.tsx` 和 `components/AllTemplatesBrowser.tsx`** — `handlePick`/`handleSelect`
- 改调 `fetchTemplate(brand)`，拿到 `{ colors, typography }` 后：
  - `loadTokens(colors, brand)`（不变）
  - `setTypography(typography)`（新增；store 已有该 action）

**`app/page.tsx`** — 在 `#step-edit` section 后、`#step-export` 前插入 `#step-typography` section
- 复用 Step 标记样式（`Step 4/4`），section 包装与 step-edit 一致
- 仅当 `hasColors` 时显示（已经在 WorkArea 内部，自动满足）

**`components/WorkflowNav.tsx`**
- `ALL_STEPS` 加入 `{ id: "step-typography", label: "字体" }`，位置在「调色」「导出」之间
- `colors.length === 0` 时和「调色」「导出」一起隐藏

### 不动

- `lib/store.ts` 的 `Typography` 类型和 `setTypography` action（已经够用）
- `lib/typography.ts` 的 `buildScale`、`SCALE_STEPS`（直接复用）
- `lib/export.ts` 的所有 4 个导出格式（已经导出了 typography，base/ratio 变化自动反映）
- `components/MockupViews.tsx`（保持色块占位）
- `lib/agent.ts` / `/api/recommend`（AI 推荐流程不变）

---

## 关键实现细节

### 字体预设栈

```ts
const FONT_PRESETS = [
  { id: "system", label: "System", stack: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { id: "inter",  label: "Inter",  stack: "Inter, system-ui, sans-serif" },
  { id: "geist",  label: "Geist",  stack: "'Geist', system-ui, sans-serif" },
  { id: "serif",  label: "Serif",  stack: "Georgia, 'Times New Roman', serif" },
  { id: "mono",   label: "Mono",   stack: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace" },
  { id: "cn",     label: "中文",    stack: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif" },
];
```
载入模板时如果 fontFamily 字符串能精确匹配某个预设的 stack 就高亮；否则保留 raw 字符串放到「自定义」分支并显示 input。

### 行高约定（写死，不暴露给用户）

```ts
const LINE_HEIGHT_BY_LEVEL: Record<ScaleName, number> = {
  h1: 1.15, h2: 1.2, h3: 1.25, h4: 1.3, h5: 1.35,
  body: 1.55, small: 1.5, caption: 1.4,
};
```
预览区按行显示，每行 `lineHeight` 取自此表。

### 预览示例文本

固定字串：`敏捷的棕狐 The Quick Brown Fox 0123`。

### Typography 解析鲁棒性

DESIGN.md 里典型的三种格式都要兼容：
```yaml
body:
  fontFamily: "Inter, sans-serif"
  fontSize: 16px
```
```markdown
| body | 16px | 400 | 1.55 |
```
```markdown
- **Body**: 16px / 1.55 / 430
```
正则按宽松匹配：抓 `body[^\n]*?(\d+(?:\.\d+)?)px` 拿 base；`display|h1[^\n]*?(\d+)px` 拿 heading 尺寸；`fontFamily[^\n]*?["']([^"'\n]+)` 拿家族字符串（第一次匹配 body 区域取 body，更上方/单独 display 区域取 heading）。

---

## 复用的现有代码

| 既有 | 路径 | 怎么用 |
|---|---|---|
| `Typography` type + `setTypography` | `lib/store.ts` | 直接 setTypography(parsed) |
| `buildScale(typography)` | `lib/typography.ts` | TypographyStep 预览循环 + 导出已用 |
| `SCALE_STEPS` 8 级名称 | `lib/typography.ts` | 预览渲染顺序 |
| `fetchTemplateColors` | `lib/templates.ts` | 内部被 `fetchTemplate` 复用 |
| `loadTokens` | `lib/store.ts` | TemplateStep / AllTemplatesBrowser 不变 |
| Editor section 的 grid-cols-2 + header 样式 | `app/page.tsx` | 复制结构 |
| WorkflowNav `IntersectionObserver` 切 active | `components/WorkflowNav.tsx` | 加新 step 自动生效 |
| 导出（W3C/Tailwind/CSS/AI prompt） | `lib/export.ts` | 不动，自动随 typography 更新 |

---

## 实现顺序

1. **`parseMdTypography`** + `fetchTemplate` 在 `lib/templates.ts` 增加；curl 一个 DESIGN.md 用 node 跑测试，验证能拿到 body/heading 字号和 family
2. **TypographyStep 组件**：纯本地状态（slider + select）→ setTypography
3. **TemplateStep / AllTemplatesBrowser**：切换到 `fetchTemplate`，把 typography 一起写入
4. **page.tsx**：插入 #step-typography section
5. **WorkflowNav**：加节点
6. **类型检查 + 手测**

---

## 验证步骤

1. **解析测试**：curl 几个 DESIGN.md，对比 parseMdTypography 解析出的 base / ratio / fontFamily / headingFamily 是否合理
   - Stripe：预期 base 16，headingFamily 含 "sohne" 之类
   - Linear：base 16，headingFamily 含 "Linear Display"
   - Apple：base 17，headingFamily 含 "SF Pro"
2. **完整流程**：
   - 描述 → 推荐 → 选 Stripe → 滚到「字体」section
   - 检查 base/ratio 是否被模板填充，预览显示 Stripe 风格的字体阶梯
   - 拖 base 滑条 12→22，预览每行字号实时变化
   - 拖 ratio 滑条 1.1→1.5，h1 显著变化、body 不动（buildScale 保 step=0 不变）
   - 切换 fontFamily 预设，预览家族切换
   - 切到 Notion 模板，typography 应该重置成 Notion 的 stack
3. **导出联动**：滑条改 base 后，到 #step-export 看 CSS 变量里 `--font-size-h1` 等数字同步变了
4. **持久化**：调好 base + ratio 后刷新页面，值保留（zustand persist 已经覆盖）
5. **WorkflowNav**：左侧出现 5 个节点；点击「字体」平滑滚到正确位置；scroll 时 active 状态切换
6. **类型检查**：`npx tsc --noEmit`
7. **回退路径**：从图片上传载入色板（不走模板）→ typography 仍保持默认值不被清空

---

---

# v1.5（已完成）：平滑滚动 + 侧栏导航 + 全模板色板 + 调色/预览并排 + 全部 mockup

## v1 状态（已完成）

垂直工作流已上线：DescribeStep（AI 推荐）→ TemplateStep（4–6 卡片 + 浏览全部）→ Editor → Preview → Export。`/api/recommend` 走 Vercel AI Gateway + deepseek-v3，验证三个不同描述返回合理品牌。文件已清理（删除 generate.ts / genPrompt.ts / Compare.tsx / VariantsBar.tsx 等）。

## Context

v1 完成后用户提出 5 个 UX 增强：

1. **Lenis 平滑滚动** —— 原生 `scroll-snap` 体感生硬，换成 Lenis 的丝滑动画
2. **左侧定位导航** —— 在页面左侧加可点击的进度阳，跳转到对应 section
3. **浏览全部模板带色板** —— 现在「浏览全部 73 个」只显示品牌名，要把每个的色板缩略也展示出来
4. **调色 + 预览并排** —— 现在调色和预览是上下两个 section，看不到实时变化；改成左右结构（预览 sticky 跟随）
5. **预览「全部」选项** —— 增加一个 tab 把 5 个 mockup 缩小平铺，一次看全所有场景的色板效果

---

## 改动概览

### 新增

**`components/SmoothScroll.tsx`**（或直接在 page.tsx 用 `ReactLenis`）
- 安装 `lenis` 依赖
- 用 `lenis/react` 的 `<ReactLenis root>` 包整个 main，配置 `duration: 1.2` + `smoothWheel: true`
- **弃用原生 `snap-y snap-proximity`**：v1 的 snap 体感僵硬，Lenis 的平滑滚动本身就是答案

**`components/WorkflowNav.tsx`** —— 左侧竖向进度阳
- `fixed left-6 top-1/2 -translate-y-1/2`，宽度约 90px
- 4 个节点：`描述 / 模板 / 调色 / 导出`，节点之间用 1px 竖线连接
- 节点形态：空心圆 `○` + 文字 → active 时实心圆 `●` + 加粗
- 用 `IntersectionObserver` 监听 4 个 section，当前最大可见比例的为 active
- 点击 → 调 `useLenis()` 拿到的 lenis 实例，`lenis.scrollTo("#step-x", { duration: 1.2 })`
- 当 `colors.length === 0` 时隐藏「调色」「导出」两个节点（保持与 WorkArea 同步）

**`lib/templatePreviews.ts`** —— 共享色板预览 hook
- 从 `TemplateStep.tsx` 把模块级 `previewCache: Map<string, string[]>` 提出来
- 导出 `useTemplatePreview(brand: string, options?: { ref?: RefObject })` hook
- 内部 IntersectionObserver：只在卡片进入视口（或调用方传 ref 时）才触发 `fetchTemplateColors`
- 缓存命中直接返回，避免重复请求
- 这样 AllTemplatesBrowser 改为 73 个卡片不会一次发 73 个 HTTP

### 修改

**`app/page.tsx`** —— 三处大改
- 外层用 `<ReactLenis root>` 包裹，移除 `h-screen snap-y snap-proximity overflow-y-scroll` 改成 `min-h-screen`
- 渲染 `<WorkflowNav />`（fixed，不占文档流）
- **合并 §3 Edit 和 §4 Preview 为同一个 section**，内部 `grid grid-cols-1 lg:grid-cols-2 gap-8`
  - 左列：Editor（标题「调色」+ 内容）
  - 右列：Preview（标题「预览」+ 内容），加 `lg:sticky lg:top-8 lg:self-start` 让它跟随滚动
- Export 保持独立 section（`#step-export`）
- 各 section 加 id：`step-describe / step-template / step-edit / step-export`（DescribeStep、TemplateStep 已有 id）

**`components/AllTemplatesBrowser.tsx`** —— 从列表改为色板网格
- 顶部搜索框保留
- 内容区从 `<div className="max-h-72 overflow-y-auto">` 列表 → `<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">`
- 每个卡片复用 TemplateStep 的视觉（色块 bar + 名称），用 `useTemplatePreview(brand)` 懒加载色板
- 卡片可点击载入（已有 `handleSelect` 逻辑保留）

**`components/Preview.tsx`** —— 加「全部」tab
- `KINDS` 数组追加 `{ id: "all", label: "全部" }`
- 扩展类型：`type PreviewKind = MockupKind | "all"`（不污染 `MockupViews` 内部的 `MockupKind`）
- 渲染分支：
  - `kind === "all"`：`<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto h-full">`，遍历 5 个 mockup 类型，每个外层 `aspect-[800/520]` 容器 + 上方标签
  - 否则保持原 `<MockupView />` 全尺寸渲染

**`components/TemplateStep.tsx`** —— 切到共享 hook
- 删除本地 `previewCache` 和 useEffect
- 改用 `useTemplatePreview(brand)` per card
- 卡片样式与 AllTemplatesBrowser 保持一致（统一来源）

### 不动

DescribeStep、InputSource、Editor、Export、MockupViews、store、lib/agent.ts、lib/templates.ts、lib/mockup.ts、`/api/recommend` 路由

---

## 关键技术细节

### Lenis + Next.js 16 / React 19

`lenis` v1+ 内置 React 适配 `lenis/react`，导出 `<ReactLenis>` 和 `useLenis()`。无需 RAF 手动管理：

```tsx
"use client";
import { ReactLenis, useLenis } from "lenis/react";

// page.tsx
<ReactLenis root options={{ duration: 1.2, smoothWheel: true, wheelMultiplier: 1 }}>
  {/* ... */}
</ReactLenis>

// WorkflowNav.tsx
const lenis = useLenis();
const handleClick = (id: string) => lenis?.scrollTo(`#${id}`, { duration: 1.2 });
```

⚠️ Lenis 文档里有 React 19 兼容性 PR 已合并，使用最新版 `lenis@^1.1.x` 即可。

### IntersectionObserver 选 active

```tsx
const [active, setActive] = useState("step-describe");
useEffect(() => {
  const obs = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    },
    { threshold: [0.3, 0.5, 0.7] },
  );
  STEPS.forEach((s) => {
    const el = document.getElementById(s.id);
    if (el) obs.observe(el);
  });
  return () => obs.disconnect();
}, [hasColors]);
```

### useTemplatePreview hook 形状

```tsx
const previewCache = new Map<string, string[]>();
const inflight = new Map<string, Promise<string[]>>();

export function useTemplatePreview(brand: string, ref: RefObject<HTMLElement>) {
  const [preview, setPreview] = useState<string[] | undefined>(() => previewCache.get(brand));
  useEffect(() => {
    if (previewCache.has(brand) || !ref.current) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const p = inflight.get(brand) ?? fetchTemplateColors(brand).then((t) => t.map((x) => x.hex).slice(0, 6));
      inflight.set(brand, p);
      p.then((hexes) => {
        previewCache.set(brand, hexes);
        setPreview(hexes);
      }).catch(() => {});
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [brand]);
  return preview;
}
```

`inflight` Map 防止同时有多个组件触发相同品牌的 fetch（搜索切换时常见）。

### Preview「全部」mockup 渲染

```tsx
{kind === "all" ? (
  <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2">
    {(["landing","card","form","dashboard","article"] as const).map((k) => (
      <div key={k} className="space-y-1.5">
        <p className="text-xs text-neutral-500">{LABELS[k]}</p>
        <div className="aspect-[800/520] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <MockupView kind={k} palette={palette} />
        </div>
      </div>
    ))}
  </div>
) : (
  <MockupView kind={kind} palette={palette} />
)}
```

MockupView 的 SVG 用 `viewBox="0 0 800 520"` + `width="100%" height="100%"`，外层用 `aspect-[800/520]` 限定比例即可自动缩放，无需 transform。

---

## 实现顺序

1. **依赖**：`npm i lenis`
2. **`lib/templatePreviews.ts`**：抽 hook，加 inflight 防重
3. **`AllTemplatesBrowser` 升级**：改色板网格，用 hook
4. **`TemplateStep`**：切到 hook（统一来源）
5. **`Preview` 加「全部」**：扩展类型 + 分支渲染
6. **`WorkflowNav`**：竖向进度阳 + IntersectionObserver
7. **`page.tsx` 重构**：ReactLenis 包装 + 合并 Edit/Preview 为 grid-cols-2 + 挂 WorkflowNav
8. **类型检查 + 手测**

---

## 复用现有代码

| 既有 | 怎么用 |
|---|---|
| `lib/templates.ts` 的 `fetchTemplateColors`、`BRANDS`、`brandDisplayName` | `useTemplatePreview` 内部调用 |
| `components/MockupViews.tsx` 的 `MockupView` + `MockupKind` | Preview「全部」遍历渲染 |
| `lib/mockup.ts` 的 `resolvePalette` | Preview 不变 |
| `components/TemplateStep.tsx` 的卡片样式 | 抽成共享视觉（卡片色块 + 名称）|
| `components/Editor.tsx` / `Export.tsx` | 不动，仅外层布局变 |

---

## 验证

1. **滚动顺滑度**：滚轮、触控板、键盘 PgUp/PgDn → 全平滑（不是阶梯式 snap）
2. **左侧导航**：
   - 4 个节点点击 → 平滑滚到对应 section
   - 滚动时 active 状态随当前可见 section 切换
   - `colors.length === 0` 时只看到「描述」「模板」两个节点
3. **浏览全部模板**：
   - 展开后看到色板网格（搜索仍可用）
   - 滚动列表时再加载更多色板（控制台无 73 个并发请求）
4. **调色 + 预览并排**：
   - lg 屏幕下左右分布，调色轮时右侧 mockup 实时更新
   - 右侧 sticky 跟随，长内容滚动时不丢失视野
   - 窄屏（< lg）回退到上下堆叠
5. **Preview「全部」**：
   - 切到「全部」tab，看到 5 个 mini mockup 平铺
   - 调色板时 5 个一起变色
   - mini mockup 比例正确，不变形
6. **类型检查**：`npx tsc --noEmit`
7. **持久化**：刷新页面 description / 颜色 / 推荐保留（store 持久化不变）
