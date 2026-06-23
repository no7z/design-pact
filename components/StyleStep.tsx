"use client";
import { useMemo, useState } from "react";
import { useTokens, computedHex } from "@/lib/store";
import {
  buildSpacing,
  buildRadius,
  shadowToCss,
  SHADOW_DEFAULTS,
  buildBorderScale,
  buildOpacityScale,
} from "@/lib/scales";
import { hexA, resolvePalette } from "@/lib/mockup";
import { relativeLuminance } from "@/lib/color";

const SHADOW_LEVELS = ["sm", "md", "lg"] as const;
type ShadowParam = "blur" | "offsetY" | "opacity";

function usePrimaryHex(): string {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const primary = colors.find((c) => c.role === "primary") ?? colors[0];
  return primary ? computedHex(primary, globals) : "#5e6ad2";
}

export function StyleStep() {
  const spacing = useTokens((s) => s.spacing);
  const radius = useTokens((s) => s.radius);
  const shadow = useTokens((s) => s.shadow);
  const border = useTokens((s) => s.border);
  const opacity = useTokens((s) => s.opacity);
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const setSpacing = useTokens((s) => s.setSpacing);
  const setRadius = useTokens((s) => s.setRadius);
  const setShadowIntensity = useTokens((s) => s.setShadowIntensity);
  const setShadowAdvanced = useTokens((s) => s.setShadowAdvanced);
  const setShadowLevel = useTokens((s) => s.setShadowLevel);
  const setBorder = useTokens((s) => s.setBorder);
  const setOpacity = useTokens((s) => s.setOpacity);
  const hasColors = useTokens((s) => s.colors.length > 0);
  const [view, setView] = useState<"instance" | "basic">("instance");

  const primaryHex = usePrimaryHex();
  const palette = useMemo(() => resolvePalette(colors, globals), [colors, globals]);
  const onPrimary = relativeLuminance(palette.primary) < 0.45 ? "#ffffff" : "#111111";
  const spacingScale = useMemo(() => buildSpacing(spacing.base), [spacing.base]);
  const radiusScale = useMemo(() => buildRadius(radius.base), [radius.base]);
  const borderScale = useMemo(() => buildBorderScale(border.base), [border.base]);
  const opacityScale = useMemo(() => buildOpacityScale(opacity.base), [opacity.base]);

  const sp = (name: string, fallback: number) =>
    spacingScale.find((s) => s.name === name)?.px ?? fallback;
  const rd = (name: string, fallback: number) =>
    radiusScale.find((r) => r.name === name)?.px ?? fallback;
  const bw = (name: string, fallback: number) =>
    borderScale.find((b) => b.name === name)?.px ?? fallback;

  if (!hasColors) return null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(360px,440px)_1fr]">
      {/* Controls */}
      <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Spacing */}
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              间距
            </span>
            <span className="font-mono text-xs text-neutral-500">base {spacing.base}px</span>
          </header>
          <input
            type="range"
            min={2}
            max={8}
            step={1}
            value={spacing.base}
            onChange={(e) => setSpacing({ base: Number(e.target.value) })}
            className="w-full accent-neutral-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>紧凑 2</span><span>常用 4</span><span>宽松 8</span>
          </div>
        </section>

        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* Radius */}
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              圆角
            </span>
            <span className="font-mono text-xs text-neutral-500">base {radius.base}px</span>
          </header>
          <input
            type="range"
            min={0}
            max={24}
            step={1}
            value={radius.base}
            onChange={(e) => setRadius({ base: Number(e.target.value) })}
            className="w-full accent-neutral-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>方 0</span><span>圆 8</span><span>大圆 24</span>
          </div>
        </section>

        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* Shadow */}
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                阴影
              </span>
              <button
                onClick={() => {
                  if (shadow.advanced) {
                    // Toggle off → re-derive sm/md/lg from current intensity
                    setShadowIntensity(shadow.intensity);
                  } else {
                    setShadowAdvanced(true);
                  }
                }}
                aria-pressed={shadow.advanced}
                aria-label={shadow.advanced ? "切换到简单模式" : "切换到高级模式"}
                title={shadow.advanced ? "切换到简单模式" : "切换到高级模式"}
                className={`grid h-5 w-5 place-items-center rounded transition ${
                  shadow.advanced
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                    : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <line x1="3" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="6" cy="4" r="1.8" fill="currentColor" />
                  <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="10" cy="8" r="1.8" fill="currentColor" />
                  <line x1="3" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="7" cy="12" r="1.8" fill="currentColor" />
                </svg>
              </button>
            </div>
            <span className="font-mono text-xs text-neutral-500">
              {shadow.advanced ? "高级" : `intensity ${shadow.intensity.toFixed(2)}`}
            </span>
          </header>
          {!shadow.advanced && (
            <>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={shadow.intensity}
                onChange={(e) => setShadowIntensity(Number(e.target.value))}
                className="w-full accent-neutral-900 dark:accent-white"
              />
              <div className="flex justify-between text-[10px] text-neutral-400">
                <span>无 0</span><span>柔和 0.5</span><span>强烈 1.0</span>
              </div>
            </>
          )}

          {shadow.advanced && (
            <div className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <ShadowParamSlider
                param="blur"
                label="模糊 Blur"
                shadow={shadow}
                onApply={(mul) => applyShadowMultiplier("blur", mul, setShadowLevel)}
                max={3}
                step={0.05}
              />
              <ShadowParamSlider
                param="offsetY"
                label="偏移 Offset Y"
                shadow={shadow}
                onApply={(mul) => applyShadowMultiplier("offsetY", mul, setShadowLevel)}
                max={3}
                step={0.05}
              />
              <ShadowParamSlider
                param="opacity"
                label="不透明度 Opacity"
                shadow={shadow}
                onApply={(mul) => applyShadowMultiplier("opacity", mul, setShadowLevel)}
                max={3}
                step={0.05}
              />
            </div>
          )}
        </section>

        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* Border width */}
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              描边粗细
            </span>
            <span className="font-mono text-xs text-neutral-500">base {border.base}px</span>
          </header>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={border.base}
            onChange={(e) => setBorder({ base: Number(e.target.value) })}
            className="w-full accent-neutral-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>细 0.5</span><span>常用 1</span><span>粗 4</span>
          </div>
        </section>

        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* Opacity */}
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              透明度
            </span>
            <span className="font-mono text-xs text-neutral-500">base {opacity.base}</span>
          </header>
          <input
            type="range"
            min={0.04}
            max={0.16}
            step={0.01}
            value={opacity.base}
            onChange={(e) => setOpacity({ base: Number(e.target.value) })}
            className="w-full accent-neutral-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>淡 0.04</span><span>标准 0.08</span><span>深 0.16</span>
          </div>
        </section>
      </div>

      {/* Preview */}
      <div className="flex flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            组件细节
          </h3>
          <ViewToggle view={view} onChange={setView} />
        </div>

        {view === "basic" && (
          <div className="space-y-5 p-6">
            {/* Spacing ladder */}
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">间距 spacing</p>
              <div className="flex flex-col gap-1.5">
                {spacingScale.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 font-mono text-[10px] text-neutral-400">{s.name}</span>
                    <span className="w-12 shrink-0 font-mono text-[10px] text-neutral-300">{s.px}px</span>
                    <div
                      className="h-3 rounded"
                      style={{ width: `${Math.min(s.px * 2, 320)}px`, background: primaryHex + "33" }}
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-neutral-100 dark:border-neutral-800" />

            {/* Radius ladder */}
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">圆角 radius</p>
              <div className="flex flex-wrap gap-3">
                {radiusScale.map((r) => (
                  <div key={r.name} className="flex flex-col items-center gap-1.5">
                    <div
                      className="h-12 w-16"
                      style={{ background: primaryHex + "33", borderRadius: r.px }}
                    />
                    <span className="font-mono text-[10px] text-neutral-400">{r.name}</span>
                    <span className="font-mono text-[10px] text-neutral-300">
                      {r.name === "full" ? "9999px" : `${r.px}px`}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-neutral-100 dark:border-neutral-800" />

            {/* Shadow ladder */}
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">阴影 shadow</p>
              <div
                className="grid grid-cols-3 gap-4 rounded-xl p-5"
                style={{ background: "rgb(226 232 240)" }}
              >
                {SHADOW_LEVELS.map((level) => (
                  <div key={level} className="flex flex-col items-center gap-2">
                    <div
                      className="h-16 w-full rounded-md"
                      style={{ background: "white", boxShadow: shadowToCss(shadow[level]) }}
                    />
                    <span className="font-mono text-[10px]" style={{ color: "rgb(100 116 139)" }}>{level}</span>
                    <span className="font-mono text-[10px]" style={{ color: "rgb(148 163 184)" }}>
                      blur {shadow[level].blur} · y {shadow[level].offsetY}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-neutral-100 dark:border-neutral-800" />

            {/* Border ladder */}
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">描边 border</p>
              <div className="flex gap-3 pt-1">
                {borderScale.map((b) => (
                  <div key={b.name} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-md border-neutral-400 dark:border-neutral-500"
                      style={{ border: `${b.px}px solid`, height: 36 }}
                    />
                    <span className="font-mono text-[10px] text-neutral-400">{b.name} · {b.px}px</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-neutral-100 dark:border-neutral-800" />

            {/* Opacity ladder */}
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">透明度 opacity</p>
              <div className="flex gap-2">
                {opacityScale.map((o) => (
                  <div key={o.name} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="h-10 w-full rounded"
                      style={{ background: primaryHex, opacity: o.value }}
                    />
                    <span className="font-mono text-[10px] text-neutral-400">{o.name}</span>
                    <span className="font-mono text-[10px] text-neutral-300">{(o.value * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === "instance" && (
          <div className="flex-1 space-y-4 rounded-b-xl p-6" style={{ background: palette.bg }}>

        {/* Spacing — task list card, rendered in the actual palette */}
        <div>
          <p className="mb-2 text-[10px]" style={{ color: palette.muted }}>间距 · 列表卡片</p>
          <div
            className="overflow-hidden"
            style={{
              border: `${bw("default", border.base)}px solid ${palette.border}`,
              borderRadius: Math.min(rd("lg", 12), sp("xs", 8) + 8),
              background: palette.surface,
              boxShadow: shadowToCss(shadow.sm),
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: `${sp("xs", 8)}px ${sp("md", 16)}px`, borderBottom: `1px solid ${palette.border}` }}
            >
              <span className="text-xs font-medium" style={{ color: palette.fg }}>今日任务</span>
              <span
                className="grid h-4 w-4 shrink-0 place-items-center text-[10px] font-semibold"
                style={{ background: palette.primary, color: onPrimary, borderRadius: "50%" }}
              >
                3
              </span>
            </div>
            {[
              { label: "整理设计规范", done: true },
              { label: "组件库评审", done: false },
              { label: "输出交互文档", done: false },
            ].map(({ label, done }, i, arr) => (
              <div
                key={label}
                className="flex items-center"
                style={{
                  padding: `${sp("xs", 8)}px ${sp("md", 16)}px`,
                  gap: sp("xs", 8),
                  borderBottom: i < arr.length - 1 ? `1px solid ${palette.border}` : "none",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: done ? "none" : `1.5px solid ${palette.border}`,
                    background: done ? palette.primary : "transparent",
                    display: "inline-block",
                  }}
                />
                <span
                  className="text-xs"
                  style={{ color: done ? palette.muted : palette.fg, textDecoration: done ? "line-through" : "none" }}
                >
                  {label}
                </span>
              </div>
            ))}
            <div
              className="flex items-center justify-between"
              style={{ padding: `${sp("xs", 8)}px ${sp("md", 16)}px`, borderTop: `1px solid ${palette.border}` }}
            >
              <span className="text-[10px]" style={{ color: palette.muted }}>今天 · 2 未完成</span>
              <span className="text-[10px]" style={{ color: palette.primary }}>＋ 添加</span>
            </div>
          </div>
        </div>

        {/* Combined instance: shadow + border + opacity on one realistic card */}
        <div>
          <p className="mb-2 text-[10px]" style={{ color: palette.muted }}>阴影 · 描边 · 透明度 · 组合实例</p>
          <div>
            <div
              style={{
                background: palette.surface,
                border: `${border.base}px solid ${palette.border}`,
                borderRadius: Math.min(rd("lg", 12), sp("md", 16) + 4),
                boxShadow: shadowToCss(shadow.md),
                padding: `${sp("md", 16)}px`,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 12, color: palette.fg }}>发布更新</div>
              <div
                style={{
                  fontSize: 11,
                  color: palette.muted,
                  marginTop: 2,
                  marginBottom: sp("sm", 12),
                }}
              >
                卡片用阴影抬升；同一输入框按状态切换描边粗细，按钮演示交互透明度。
              </div>
              <div className="mb-3 grid grid-cols-3" style={{ gap: sp("sm", 12) }}>
                {[
                  { label: "默认", strong: false, focus: false },
                  { label: "选中", strong: true, focus: false },
                  { label: "聚焦", strong: true, focus: true },
                ].map((s) => {
                  const w = s.strong ? bw("strong", border.base * 2) : bw("default", border.base);
                  return (
                    <div key={s.label} className="flex flex-col gap-1">
                      <span className="font-mono text-[10px]" style={{ color: palette.muted }}>
                        {s.label} · {w}px
                      </span>
                      <div
                        style={{
                          border: `${w}px solid ${s.strong ? palette.primary : palette.border}`,
                          borderRadius: rd("sm", 4),
                          padding: `${sp("xxs", 4)}px ${sp("sm", 12)}px`,
                          fontSize: 11,
                          color: palette.muted,
                          background: palette.bg,
                          boxShadow: s.focus
                            ? `0 0 0 3px ${hexA(primaryHex, opacityScale.find((o) => o.name === "focus")?.value ?? 0.16)}`
                            : "none",
                        }}
                      >
                        搜索…
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-start" style={{ gap: sp("sm", 12) }}>
                {opacityScale.map((o) => {
                  // overlay = modal/drawer scrim — show it over a thumbnail, not as a button tint.
                  if (o.name === "overlay") {
                    return (
                      <div key={o.name} className="flex flex-col items-center gap-1">
                        <div
                          className="relative overflow-hidden"
                          style={{
                            width: 132,
                            height: 84,
                            borderRadius: rd("md", 8),
                            background: palette.bg,
                            border: `1px solid ${palette.border}`,
                          }}
                        >
                          {/* faux page content, dimmed by the scrim */}
                          <div style={{ position: "absolute", inset: 0, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ height: 7, width: "55%", borderRadius: 3, background: palette.fg, opacity: 0.7 }} />
                            <div style={{ height: 6, width: "90%", borderRadius: 3, background: palette.muted, opacity: 0.5 }} />
                            <div style={{ height: 6, width: "80%", borderRadius: 3, background: palette.muted, opacity: 0.5 }} />
                            <div style={{ height: 6, width: "65%", borderRadius: 3, background: palette.muted, opacity: 0.5 }} />
                          </div>
                          {/* scrim at the overlay opacity */}
                          <span style={{ position: "absolute", inset: 0, background: hexA("#000000", o.value) }} />
                          {/* dialog popping out above the scrim */}
                          <div
                            className="absolute left-1/2 top-1/2"
                            style={{
                              transform: "translate(-50%, -50%)",
                              width: "72%",
                              background: palette.surface,
                              borderRadius: rd("sm", 4),
                              border: `1px solid ${palette.border}`,
                              padding: "7px 9px",
                              boxShadow: shadowToCss(shadow.lg),
                              display: "flex",
                              flexDirection: "column",
                              gap: 5,
                            }}
                          >
                            <span style={{ fontSize: 10, fontWeight: 600, color: palette.fg }}>弹窗标题</span>
                            <span
                              className="self-end"
                              style={{
                                background: palette.primary,
                                color: onPrimary,
                                borderRadius: rd("sm", 4),
                                padding: "1px 7px",
                                fontSize: 9,
                              }}
                            >
                              确定
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px]" style={{ color: palette.muted }}>
                          {o.name} · {o.value}
                        </span>
                      </div>
                    );
                  }
                  const isFocus = o.name === "focus";
                  const isDisabled = o.name === "disabled";
                  return (
                    <div key={o.name} className="flex flex-col items-center gap-1">
                      <div
                        style={{
                          position: "relative",
                          borderRadius: rd("md", 8),
                          border: isFocus
                            ? `${bw("strong", border.base * 2)}px solid ${palette.primary}`
                            : `${bw("default", border.base)}px solid ${palette.border}`,
                          padding: `${sp("xxs", 4)}px ${sp("sm", 12)}px`,
                          background: palette.bg,
                          fontSize: 11,
                          color: isDisabled ? palette.muted : palette.fg,
                          opacity: isDisabled ? o.value : 1,
                          boxShadow: isFocus ? `0 0 0 3px ${hexA(primaryHex, o.value)}` : "none",
                          overflow: "hidden",
                        }}
                      >
                        发布
                        {(o.name === "hover" || o.name === "pressed") && (
                          <span
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: primaryHex,
                              opacity: o.value,
                              pointerEvents: "none",
                            }}
                          />
                        )}
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: palette.muted }}>
                        {o.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
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

// Apply a multiplier to a single shadow param (blur/offsetY/opacity) across
// all three levels at once, using SHADOW_DEFAULTS as the unit reference.
function applyShadowMultiplier(
  param: ShadowParam,
  mul: number,
  setShadowLevel: (
    level: "sm" | "md" | "lg",
    t: { blur?: number; offsetY?: number; opacity?: number },
  ) => void,
) {
  for (const level of SHADOW_LEVELS) {
    const base = SHADOW_DEFAULTS[level][param];
    const next =
      param === "opacity"
        ? Math.round(base * mul * 1000) / 1000
        : param === "offsetY"
          ? Math.round(base * mul * 10) / 10
          : Math.round(base * mul);
    setShadowLevel(level, { [param]: next });
  }
}

function ShadowParamSlider({
  param,
  label,
  shadow,
  onApply,
  max,
  step,
}: {
  param: ShadowParam;
  label: string;
  shadow: { sm: { blur: number; offsetY: number; opacity: number }; md: { blur: number; offsetY: number; opacity: number }; lg: { blur: number; offsetY: number; opacity: number } };
  onApply: (mul: number) => void;
  max: number;
  step: number;
}) {
  // Derive current multiplier from md level (relative to its default)
  const baseMd = SHADOW_DEFAULTS.md[param];
  const current = baseMd > 0 ? shadow.md[param] / baseMd : 0;
  const clamped = Math.max(0, Math.min(max, current));
  const display = SHADOW_LEVELS.map((lv) => {
    const v = shadow[lv][param];
    return param === "opacity" ? v.toFixed(2) : `${v}${param === "offsetY" ? "" : ""}`;
  }).join(" / ");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="font-mono text-[10px] text-neutral-500">
          {clamped.toFixed(2)}× · {display}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={clamped}
        onChange={(e) => onApply(Number(e.target.value))}
        className="w-full accent-neutral-900 dark:accent-white"
      />
    </div>
  );
}
