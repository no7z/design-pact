"use client";
import { useEffect, useRef, useMemo, useState } from "react";
import { useTokens } from "@/lib/store";
import {
  buildDurations,
  buildOpacityScale,
  EASING_PRESETS,
  type DurationEntry,
  type EasingPreset,
} from "@/lib/scales";
import { resolvePalette, hexA, type MockupPalette } from "@/lib/mockup";
import { relativeLuminance } from "@/lib/color";
import { StatePreview } from "./StatePreview";

const EASING_LABELS: Record<EasingPreset, string> = {
  "ease-out":    "起快终慢 · 标准退出",
  "ease-in-out": "慢快慢 · 进出对称",
  spring:        "超调回弹 · 弹簧感",
  linear:        "匀速 · 序列 / 进度条",
  "ease-in":     "起慢终快 · 标准进入",
};

const DEMO_HINTS: Record<string, string> = {
  micro:  "按钮点击",
  fast:   "悬停高亮",
  normal: "下拉菜单",
  slow:   "侧边面板",
  page:   "内容入场",
};

function usePalette(): MockupPalette {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  return useMemo(() => resolvePalette(colors, globals), [colors, globals]);
}

const onPrimary = (hex: string) => (relativeLuminance(hex) < 0.45 ? "#ffffff" : "#111111");

// ── Animation loop utility ─────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function loopAnimate(
  el: HTMLElement,
  keyframes: Keyframe[],
  durationMs: number,
  easingValue: string,
  holdEndMs = 700,
  holdStartMs = 400,
  initialDelayMs = 0,
): () => void {
  let stopped = false;

  async function tick() {
    if (stopped || !el.isConnected) return;
    const fwd = el.animate(keyframes, { duration: durationMs, easing: easingValue, fill: "forwards" });
    try { await fwd.finished; } catch { return; }
    if (stopped) return;
    await sleep(holdEndMs);
    if (stopped) return;
    const bwd = el.animate([...keyframes].reverse(), { duration: durationMs, easing: easingValue, fill: "forwards" });
    try { await bwd.finished; } catch { return; }
    if (stopped) return;
    await sleep(holdStartMs);
    tick();
  }

  setTimeout(tick, initialDelayMs);
  return () => { stopped = true; };
}

// ── Demo scenes ────────────────────────────────────────────────────────────

type DemoProps = { ms: number; easingValue: string; palette: MockupPalette; initialDelay: number };

function ButtonPressDemo({ ms, easingValue, palette, initialDelay }: DemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return loopAnimate(
      ref.current,
      [
        { transform: "scale(1)", boxShadow: `0 4px 12px ${palette.primary}50` },
        { transform: "scale(0.93)", boxShadow: "none" },
      ],
      ms, easingValue, 600, 500, initialDelay,
    );
  }, [ms, easingValue, palette, initialDelay]);

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div
        ref={ref}
        className="select-none rounded-lg px-5 py-2 text-xs font-medium"
        style={{ background: palette.primary, color: onPrimary(palette.primary) }}
      >
        保存更改
      </div>
    </div>
  );
}

function HoverHighlightDemo({ ms, easingValue, palette, initialDelay }: DemoProps) {
  const bgRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const bg = bgRef.current;
    const text = textRef.current;
    if (!bg || !text) return;
    let stopped = false;

    async function tick() {
      if (stopped || !bg!.isConnected) return;
      bg!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: easingValue, fill: "forwards" });
      const t = text!.animate(
        [{ color: palette.muted }, { color: palette.primary }],
        { duration: ms, easing: easingValue, fill: "forwards" },
      );
      try { await t.finished; } catch { return; }
      if (stopped) return;
      await sleep(700);
      if (stopped) return;
      bg!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: easingValue, fill: "forwards" });
      const t2 = text!.animate(
        [{ color: palette.primary }, { color: palette.muted }],
        { duration: ms, easing: easingValue, fill: "forwards" },
      );
      try { await t2.finished; } catch { return; }
      if (stopped) return;
      await sleep(400);
      tick();
    }

    setTimeout(tick, initialDelay);
    return () => { stopped = true; };
  }, [ms, easingValue, palette, initialDelay]);

  const items = ["首页", "文档", "设置"];
  return (
    <div className="flex h-full flex-col justify-center gap-0.5 px-4 py-3">
      {items.map((item, i) => (
        <div key={item} className="relative flex items-center rounded px-2.5 py-1.5 text-xs">
          {i === 1 && (
            <div
              ref={bgRef}
              className="absolute inset-0 rounded"
              style={{ background: palette.primary + "18", opacity: 0 }}
            />
          )}
          <span
            ref={i === 1 ? textRef : undefined}
            className="relative z-10"
            style={{ color: palette.muted }}
          >
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

function DropdownDemo({ ms, easingValue, palette, initialDelay }: DemoProps) {
  const dropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!dropRef.current) return;
    return loopAnimate(
      dropRef.current,
      [
        { opacity: 0, transform: "scaleY(0.6) translateY(-8px)" },
        { opacity: 1, transform: "scaleY(1) translateY(0)" },
      ],
      ms, easingValue, 700, 500, initialDelay,
    );
  }, [ms, easingValue, initialDelay]);

  return (
    <div className="flex h-full flex-col justify-center px-4 py-3">
      <div
        className="flex w-full items-center gap-1.5 rounded px-2.5 py-1.5 text-xs"
        style={{ border: `1px solid ${palette.border}` }}
      >
        <span className="flex-1" style={{ color: palette.muted }}>选择选项</span>
        <span className="text-[10px]" style={{ color: palette.muted }}>▾</span>
      </div>
      <div
        ref={dropRef}
        className="mt-1 overflow-hidden rounded text-xs shadow-md"
        style={{
          opacity: 0,
          transformOrigin: "top center",
          background: palette.surface,
          border: `1px solid ${palette.border}`,
        }}
      >
        {["选项一", "选项二", "选项三"].map((o, i) => (
          <div
            key={o}
            className="px-2.5 py-1.5"
            style={{
              color: i === 0 ? palette.primary : palette.fg,
              fontWeight: i === 0 ? 500 : 400,
              borderBottom: i < 2 ? `1px solid ${palette.border}` : "none",
            }}
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlidePanelDemo({ ms, easingValue, palette, initialDelay }: DemoProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!panelRef.current) return;
    return loopAnimate(
      panelRef.current,
      [
        { transform: "translateX(110%)" },
        { transform: "translateX(0)" },
      ],
      ms, easingValue, 700, 500, initialDelay,
    );
  }, [ms, easingValue, initialDelay]);

  const bar = hexA(palette.fg, 0.12);
  return (
    <div className="relative h-full overflow-hidden rounded-lg" style={{ border: `1px solid ${palette.border}` }}>
      <div className="h-full w-full p-3" style={{ background: palette.bg }}>
        <div className="mb-2 h-2 w-16 rounded" style={{ background: bar }} />
        <div className="mb-1.5 h-2 w-24 rounded" style={{ background: bar }} />
        <div className="h-2 w-20 rounded" style={{ background: bar }} />
      </div>
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-2/5 p-3 shadow-xl"
        style={{
          transform: "translateX(110%)",
          background: palette.surface,
          borderLeft: `1px solid ${palette.border}`,
        }}
      >
        <div className="mb-2 h-2 rounded" style={{ width: "80%", background: palette.primary + "70" }} />
        <div className="mb-1.5 h-1.5 w-full rounded" style={{ background: bar }} />
        <div className="mb-1.5 h-1.5 w-4/5 rounded" style={{ background: bar }} />
        <div className="h-1.5 w-3/5 rounded" style={{ background: bar }} />
      </div>
    </div>
  );
}

function PageEnterDemo({ ms, easingValue, palette, initialDelay }: DemoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    return loopAnimate(
      containerRef.current,
      [
        { opacity: 0, transform: "translateY(16px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      ms, easingValue, 700, 500, initialDelay,
    );
  }, [ms, easingValue, initialDelay]);

  const bar = hexA(palette.fg, 0.12);
  return (
    <div className="flex h-full flex-col justify-center px-4 py-3">
      <div ref={containerRef} className="space-y-1.5" style={{ opacity: 0 }}>
        <div className="h-3 rounded" style={{ width: "85%", background: palette.primary + "35" }} />
        <div className="h-2 w-full rounded" style={{ background: bar }} />
        <div className="h-2 w-5/6 rounded" style={{ background: bar }} />
        <div className="h-2 w-2/3 rounded" style={{ background: bar }} />
      </div>
    </div>
  );
}

const DEMO_COMPONENTS: Record<string, (p: DemoProps) => React.ReactElement> = {
  micro:  ButtonPressDemo,
  fast:   HoverHighlightDemo,
  normal: DropdownDemo,
  slow:   SlidePanelDemo,
  page:   PageEnterDemo,
};

// ── Demo card ──────────────────────────────────────────────────────────────

function DemoCard({
  duration,
  easing,
  palette,
  index,
}: {
  duration: DurationEntry;
  easing: EasingPreset;
  palette: MockupPalette;
  index: number;
}) {
  const Demo = DEMO_COMPONENTS[duration.name];
  const easingValue = EASING_PRESETS[easing];
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl"
      style={{ background: palette.surface, border: `1px solid ${palette.border}` }}
    >
      <div
        className="flex items-center gap-1.5 px-3 py-2"
        style={{ borderBottom: `1px solid ${palette.border}` }}
      >
        <span className="font-mono text-[10px] font-semibold" style={{ color: palette.fg }}>
          {duration.name}
        </span>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px]"
          style={{ background: hexA(palette.fg, 0.08), color: palette.muted }}
        >
          {duration.ms}ms
        </span>
        <span className="ml-auto text-[10px]" style={{ color: palette.muted }}>
          {DEMO_HINTS[duration.name]}
        </span>
      </div>
      <div className="h-32">
        {Demo && (
          <Demo
            ms={duration.ms}
            easingValue={easingValue}
            palette={palette}
            initialDelay={index * 250}
          />
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function MotionStep() {
  const motion = useTokens((s) => s.motion);
  const setMotion = useTokens((s) => s.setMotion);
  const opacity = useTokens((s) => s.opacity);
  const hasColors = useTokens((s) => s.colors.length > 0);
  const palette = usePalette();
  const primaryHex = palette.primary; // basic-view charts only need the brand color
  const [view, setView] = useState<"instance" | "basic">("instance");
  const [modalOpen, setModalOpen] = useState(false);

  const durations = useMemo(() => buildDurations(motion.base), [motion.base]);
  const overlayValue = useMemo(
    () => buildOpacityScale(opacity.base).find((o) => o.name === "overlay")?.value ?? 0.5,
    [opacity.base],
  );

  if (!hasColors) return null;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(360px,440px)_1fr]">
      {/* Controls */}
      <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              时长 Duration
            </span>
            <span className="font-mono text-xs text-neutral-500">base {motion.base}ms</span>
          </header>
          <input
            type="range"
            min={80}
            max={500}
            step={10}
            value={motion.base}
            onChange={(e) => setMotion({ base: Number(e.target.value) })}
            className="w-full accent-neutral-900 dark:accent-white"
          />
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span>快 80</span><span>标准 200</span><span>慢 500</span>
          </div>
        </section>

        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        <section className="space-y-3">
          <header>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              缓动曲线 Easing
            </span>
          </header>
          <div className="space-y-1.5">
            {(Object.keys(EASING_PRESETS) as EasingPreset[]).map((key) => (
              <button
                key={key}
                onClick={() => setMotion({ easing: key })}
                aria-pressed={motion.easing === key}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
                  motion.easing === key
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600"
                }`}
              >
                <span className="font-mono">{key}</span>
                <span className="text-[10px] opacity-70">{EASING_LABELS[key]}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Preview */}
      <div className="relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            动效演示
          </h3>
          <ViewToggle view={view} onChange={setView} />
        </div>

        {view === "instance" && (
          <div className="flex-1 space-y-4 rounded-b-xl p-6" style={{ background: palette.bg }}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {durations.map((d, i) => (
                <DemoCard
                  key={d.name}
                  duration={d}
                  easing={motion.easing}
                  palette={palette}
                  index={i}
                />
              ))}
            </div>
            <div>
              <p className="mb-2 text-[10px]" style={{ color: palette.muted }}>
                可交互 · 移上去 / 按住 / 点输入框 / 开弹窗试试
              </p>
              <StatePreview onOpenModal={() => setModalOpen(true)} />
            </div>
          </div>
        )}

        {view === "basic" && (
          <div className="space-y-6 p-6">
            {/* Duration ladder — each tile slides on its own duration */}
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                持续时长 duration
              </p>
              <div className="space-y-2.5">
                {durations.map((d, i) => (
                  <DurationLane
                    key={d.name}
                    ms={d.ms}
                    name={d.name}
                    easingValue={EASING_PRESETS[motion.easing]}
                    primaryHex={primaryHex}
                    initialDelay={i * 200}
                  />
                ))}
              </div>
            </section>

            <div className="border-t border-neutral-100 dark:border-neutral-800" />

            {/* Easing curve */}
            <section className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                缓动曲线 easing
              </p>
              <EasingCurve easing={motion.easing} primaryHex={primaryHex} />
            </section>
          </div>
        )}

        {/* Modal — pops over the whole preview window. The scrim fades and the
            dialog scales/lifts in on the current duration + easing, demonstrating
            both the motion tokens and the overlay opacity in one go. */}
        <div
          aria-hidden={!modalOpen}
          onClick={() => setModalOpen(false)}
          className="absolute inset-0 z-30 grid place-items-center p-6"
          style={{ pointerEvents: modalOpen ? "auto" : "none" }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: hexA("#000000", overlayValue),
              opacity: modalOpen ? 1 : 0,
              transition: `opacity ${motion.base}ms ${EASING_PRESETS[motion.easing]}`,
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "min(340px, 88%)",
              background: palette.surface,
              color: palette.fg,
              borderRadius: 14,
              border: `1px solid ${palette.border}`,
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
              padding: 20,
              opacity: modalOpen ? 1 : 0,
              transform: modalOpen ? "scale(1) translateY(0)" : "scale(0.92) translateY(12px)",
              transition: `opacity ${motion.base}ms ${EASING_PRESETS[motion.easing]}, transform ${motion.base}ms ${EASING_PRESETS[motion.easing]}`,
            }}
          >
            <p className="text-sm font-semibold" style={{ color: palette.fg }}>
              删除这套配色？
            </p>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: palette.muted }}>
              此操作无法撤销。删除后，关联的导出文件需要重新生成。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs"
                style={{ border: `1px solid ${palette.border}`, color: palette.fg }}
              >
                取消
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{ background: palette.primary, color: onPrimary(palette.primary) }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
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

function DurationLane({
  ms,
  name,
  easingValue,
  primaryHex,
  initialDelay,
}: {
  ms: number;
  name: string;
  easingValue: string;
  primaryHex: string;
  initialDelay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return loopAnimate(
      ref.current,
      [{ transform: "translateX(0)" }, { transform: "translateX(180px)" }],
      ms,
      easingValue,
      500,
      400,
      initialDelay,
    );
  }, [ms, easingValue, initialDelay]);

  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 font-mono text-[10px] text-neutral-400">{name}</span>
      <span className="w-12 shrink-0 font-mono text-[10px] text-neutral-300">{ms}ms</span>
      <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          ref={ref}
          className="h-5 w-5 rounded-full"
          style={{ background: primaryHex }}
        />
      </div>
    </div>
  );
}

function EasingCurve({
  easing,
  primaryHex,
}: {
  easing: EasingPreset;
  primaryHex: string;
}) {
  const cubic = EASING_PRESETS[easing];
  // Parse cubic-bezier(x1, y1, x2, y2). "linear" has no control points — render a straight line.
  const points = (() => {
    const m = cubic.match(/cubic-bezier\(([^)]+)\)/);
    if (!m) return null;
    const [x1, y1, x2, y2] = m[1].split(",").map((s) => Number(s.trim()));
    return { x1, y1, x2, y2 };
  })();

  const W = 120;
  const H = 120;
  // Y axis flipped: SVG y grows downward, but ease curves grow upward.
  const px = (v: number) => v * W;
  const py = (v: number) => H - v * H;

  return (
    <div className="flex items-center gap-5">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
        {/* axes */}
        <line x1="0" y1={H} x2={W} y2={H} stroke="rgb(229 229 229)" strokeWidth="1" />
        <line x1="0" y1="0" x2="0" y2={H} stroke="rgb(229 229 229)" strokeWidth="1" />
        {/* diagonal reference */}
        <line x1="0" y1={H} x2={W} y2="0" stroke="rgb(229 229 229)" strokeWidth="1" strokeDasharray="3 3" />
        {/* curve */}
        {points ? (
          <path
            d={`M 0 ${H} C ${px(points.x1)} ${py(points.y1)}, ${px(points.x2)} ${py(points.y2)}, ${W} 0`}
            stroke={primaryHex}
            strokeWidth="2"
            fill="none"
          />
        ) : (
          <line x1="0" y1={H} x2={W} y2="0" stroke={primaryHex} strokeWidth="2" />
        )}
      </svg>
      <div className="space-y-1">
        <p className="font-mono text-xs text-neutral-700 dark:text-neutral-200">{easing}</p>
        <p className="font-mono text-[10px] text-neutral-400">{cubic}</p>
      </div>
    </div>
  );
}
