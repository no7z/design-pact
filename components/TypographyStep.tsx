"use client";
import { useMemo, useState } from "react";
import { useTokens } from "@/lib/store";
import { buildScale, SCALE_STEPS } from "@/lib/typography";

const FONT_PRESETS = [
  {
    id: "system",
    label: "System",
    stack: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  { id: "inter", label: "Inter", stack: "Inter, system-ui, sans-serif" },
  { id: "geist", label: "Geist", stack: "'Geist', system-ui, sans-serif" },
  { id: "serif", label: "Serif", stack: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Mono", stack: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace" },
  { id: "cn", label: "中文", stack: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif" },
];

const LINE_HEIGHT: Record<string, number> = {
  h1: 1.15,
  h2: 1.2,
  h3: 1.25,
  h4: 1.3,
  h5: 1.35,
  body: 1.55,
  small: 1.5,
  caption: 1.4,
};

const LABELS: Record<string, string> = {
  h1: "H1",
  h2: "H2",
  h3: "H3",
  h4: "H4",
  h5: "H5",
  body: "Body",
  small: "Small",
  caption: "Caption",
};

const SAMPLE = "敏捷的棕狐 The Quick Brown Fox 0123";

function matchPreset(stack: string): string {
  const found = FONT_PRESETS.find((p) => p.stack === stack);
  return found?.id ?? "custom";
}

export function TypographyStep() {
  const typography = useTokens((s) => s.typography);
  const setTypography = useTokens((s) => s.setTypography);
  const hasColors = useTokens((s) => s.colors.length > 0);
  const [view, setView] = useState<"instance" | "basic">("basic");

  const scale = useMemo(() => buildScale(typography), [typography]);
  const bodyPreset = matchPreset(typography.fontFamily);
  const headingPreset = matchPreset(typography.headingFamily);
  const size = (name: string, fallback: number) =>
    scale.find((s) => s.name === name)?.px ?? fallback;

  if (!hasColors) return null;

  const onPresetSelect = (which: "fontFamily" | "headingFamily", id: string) => {
    if (id === "custom") return;
    const preset = FONT_PRESETS.find((p) => p.id === id);
    if (preset) setTypography({ [which]: preset.stack });
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
      {/* Controls */}
      <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Base size */}
        <label className="block space-y-2">
          <span className="flex items-center justify-between text-xs font-medium">
            <span>基础字号 base</span>
            <span className="font-mono text-neutral-500">{typography.base}px</span>
          </span>
          <input
            type="range"
            min={12}
            max={22}
            step={1}
            value={typography.base}
            onChange={(e) => setTypography({ base: Number(e.target.value) })}
            className="w-full accent-neutral-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>12</span><span>16</span><span>22</span>
          </div>
        </label>

        {/* Ratio */}
        <label className="block space-y-2">
          <span className="flex items-center justify-between text-xs font-medium">
            <span>缩放比例 ratio</span>
            <span className="font-mono text-neutral-500">{typography.ratio.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={1.1}
            max={1.5}
            step={0.01}
            value={typography.ratio}
            onChange={(e) => setTypography({ ratio: Number(e.target.value) })}
            className="w-full accent-neutral-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>1.10 紧凑</span><span>1.25 适中</span><span>1.50 宽松</span>
          </div>
        </label>

        {/* Heading family */}
        <div className="space-y-2">
          <label className="text-xs font-medium">标题字体</label>
          <select
            value={headingPreset}
            onChange={(e) => onPresetSelect("headingFamily", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          >
            {FONT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
            <option value="custom">自定义…</option>
          </select>
          <input
            type="text"
            value={typography.headingFamily}
            onChange={(e) => setTypography({ headingFamily: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-mono text-[10px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
          />
        </div>

        {/* Body family */}
        <div className="space-y-2">
          <label className="text-xs font-medium">正文字体</label>
          <select
            value={bodyPreset}
            onChange={(e) => onPresetSelect("fontFamily", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
          >
            {FONT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
            <option value="custom">自定义…</option>
          </select>
          <input
            type="text"
            value={typography.fontFamily}
            onChange={(e) => setTypography({ fontFamily: e.target.value })}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-mono text-[10px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
          />
        </div>

        {/* Font weight */}
        <div className="space-y-2">
          <label className="text-xs font-medium">字重 weight</label>
          <div className="flex gap-1.5 flex-wrap">
            {([300, 400, 500, 600, 700] as const).map((w) => (
              <button
                key={w}
                aria-pressed={typography.fontWeight === w}
                onClick={() => setTypography({ fontWeight: w })}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  typography.fontWeight === w
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400"
                }`}
              >
                {w === 300 ? "300 Light" : w === 400 ? "400 Regular" : w === 500 ? "500 Medium" : w === 600 ? "600 SemiBold" : "700 Bold"}
              </button>
            ))}
          </div>
        </div>

        {/* Line height */}
        <div className="space-y-2">
          <label className="text-xs font-medium">行高 line-height</label>
          <div className="flex gap-1.5">
            {([1.25, 1.5, 1.75, 2.0] as const).map((lh) => (
              <button
                key={lh}
                aria-pressed={typography.lineHeight === lh}
                onClick={() => setTypography({ lineHeight: lh })}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  typography.lineHeight === lh
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400"
                }`}
              >
                {lh === 1.25 ? "1.25 紧凑" : lh === 1.5 ? "1.5 标准" : lh === 1.75 ? "1.75 宽松" : "2.0 疏散"}
              </button>
            ))}
          </div>
        </div>

        {/* Letter spacing */}
        <div className="space-y-2">
          <label className="text-xs font-medium">字间距 letter-spacing</label>
          <div className="flex gap-1.5">
            {([-0.05, 0, 0.05] as const).map((ls) => (
              <button
                key={ls}
                aria-pressed={typography.letterSpacing === ls}
                onClick={() => setTypography({ letterSpacing: ls })}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  typography.letterSpacing === ls
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400"
                }`}
              >
                {ls === -0.05 ? "−0.05em 紧" : ls === 0 ? "0 标准" : "+0.05em 宽"}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-neutral-400">
          base 控制正文字号；ratio 是模块化比例尺，H1 = base × ratio<sup>5</sup>。
          调整后右侧实时预览，并自动同步到「导出」的所有格式。
        </p>
      </div>

      {/* Preview */}
      <div className="min-w-0 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            字体预览
          </h3>
          <ViewToggle view={view} onChange={setView} />
        </div>

        {view === "basic" && (
          <div className="scrollbar-subtle overflow-x-auto">
            <div className="inline-block min-w-full space-y-2 p-6 align-top">
              {SCALE_STEPS.map(({ name }) => {
                const sizeRow = scale.find((s) => s.name === name);
                if (!sizeRow) return null;
                const isHeading = name.startsWith("h");
                const family = isHeading ? typography.headingFamily : typography.fontFamily;
                const weight = isHeading ? Math.min(900, typography.fontWeight + 200) : typography.fontWeight;
                return (
                  <div
                    key={name}
                    className="flex items-baseline gap-4 whitespace-nowrap border-b border-neutral-100 py-2 last:border-b-0 dark:border-neutral-800"
                  >
                    <span className="w-20 shrink-0 font-mono text-[10px] text-neutral-400">
                      {LABELS[name] ?? name} · {sizeRow.px}px
                    </span>
                    <span
                      className="text-neutral-900 dark:text-neutral-100"
                      style={{
                        fontFamily: family,
                        fontSize: `${sizeRow.px}px`,
                        fontWeight: weight,
                        lineHeight: isHeading ? LINE_HEIGHT[name] ?? 1.4 : typography.lineHeight,
                        letterSpacing: `${typography.letterSpacing}em`,
                      }}
                    >
                      {SAMPLE}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "instance" && (
          <div className="space-y-6 p-6">
            {/* Article card */}
            <article className="space-y-3 rounded-xl border border-neutral-100 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
              <h2
                className="text-neutral-900 dark:text-neutral-100"
                style={{
                  fontFamily: typography.headingFamily,
                  fontSize: `${size("h2", 32)}px`,
                  fontWeight: Math.min(900, typography.fontWeight + 200),
                  lineHeight: LINE_HEIGHT.h2,
                  letterSpacing: `${typography.letterSpacing}em`,
                }}
              >
                设计 Token 如何改变前端协作
              </h2>
              <p
                className="font-mono text-neutral-400"
                style={{
                  fontSize: `${size("caption", 10)}px`,
                  letterSpacing: `${typography.letterSpacing}em`,
                }}
              >
                2026 年 5 月 28 日 · 5 分钟阅读
              </p>
              <p
                className="text-neutral-700 dark:text-neutral-300"
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: `${size("body", 16)}px`,
                  fontWeight: typography.fontWeight,
                  lineHeight: typography.lineHeight,
                  letterSpacing: `${typography.letterSpacing}em`,
                }}
              >
                过去十年里，前端团队对颜色、间距、字号的口头约定，被一份 JSON 文件取代。
                Token 让 designer 与 engineer 共用同一套词汇——而当 AI 加入协作流，这份词汇成了
                让模型理解风格的唯一入口。一份好的 token 集既能产出干净的 CSS，也能让 prompt 在
                上下文里精确表达视觉语言。
              </p>
              <p
                className="text-neutral-500 dark:text-neutral-400"
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: `${size("small", 13)}px`,
                  fontWeight: typography.fontWeight,
                  lineHeight: typography.lineHeight,
                  letterSpacing: `${typography.letterSpacing}em`,
                }}
              >
                调整左侧的字重、行高和字间距，这段正文会实时反映效果。
              </p>
            </article>

            {/* UI label group */}
            <div className="space-y-3 rounded-xl border border-neutral-100 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
              <h4
                className="text-neutral-900 dark:text-neutral-100"
                style={{
                  fontFamily: typography.headingFamily,
                  fontSize: `${size("h4", 20)}px`,
                  fontWeight: Math.min(900, typography.fontWeight + 200),
                  lineHeight: LINE_HEIGHT.h4,
                  letterSpacing: `${typography.letterSpacing}em`,
                }}
              >
                组件标签
              </h4>
              <div className="flex items-center gap-3">
                <button
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-white dark:bg-white dark:text-black"
                  style={{
                    fontFamily: typography.fontFamily,
                    fontSize: `${size("small", 13)}px`,
                    fontWeight: Math.min(900, typography.fontWeight + 100),
                    letterSpacing: `${typography.letterSpacing}em`,
                  }}
                >
                  继续阅读
                </button>
                <a
                  className="text-neutral-500 underline-offset-2 hover:underline dark:text-neutral-400"
                  style={{
                    fontFamily: typography.fontFamily,
                    fontSize: `${size("small", 13)}px`,
                    fontWeight: typography.fontWeight,
                    letterSpacing: `${typography.letterSpacing}em`,
                  }}
                >
                  分享给同事 →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "instance" | "basic";
  onChange: (v: "instance" | "basic") => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg border border-neutral-200 p-0.5 dark:border-neutral-800">
      {(["instance", "basic"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={`rounded px-2.5 py-1 text-[10px] transition ${
            view === v
              ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          {v === "instance" ? "实例预览" : "基础效果"}
        </button>
      ))}
    </div>
  );
}
