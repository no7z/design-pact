"use client";
import { useMemo } from "react";
import { useTokens } from "@/lib/store";
import { contrastRatio } from "@/lib/color";
import { resolvePalette } from "@/lib/mockup";
import { useTr } from "@/lib/i18n";

type Pair = {
  label: string;
  fg: string;
  bg: string;
  fgName: string;
  bgName: string;
  /** Minimum WCAG ratio for this pair's purpose. Text=4.5, UI/border=3. */
  minimum: number;
};

function gradeFor(ratio: number, minimum: number): { tag: "AAA" | "AA" | "AA Large" | "Fail"; tone: "good" | "ok" | "warn" | "bad" } {
  if (ratio >= 7) return { tag: "AAA", tone: "good" };
  if (ratio >= 4.5) return { tag: "AA", tone: "good" };
  if (ratio >= 3) return { tag: minimum <= 3 ? "AA" : "AA Large", tone: minimum <= 3 ? "good" : "ok" };
  return { tag: "Fail", tone: "bad" };
}

const TONE_BADGE = {
  good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  ok: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  bad: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
} as const;

export function ContrastMatrix() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const tr = useTr();

  const pairs = useMemo<Pair[]>(() => {
    if (colors.length === 0) return [];
    const palette = resolvePalette(colors, globals);
    return [
      { label: tr("Body text", "正文 text"), fgName: "fg", bgName: "bg", fg: palette.fg, bg: palette.bg, minimum: 4.5 },
      { label: tr("Card body", "卡片正文"), fgName: "fg", bgName: "surface", fg: palette.fg, bg: palette.surface, minimum: 4.5 },
      { label: tr("Primary button text", "主按钮文字"), fgName: "bg", bgName: "primary", fg: palette.bg, bg: palette.primary, minimum: 4.5 },
      { label: tr("Primary vs page", "主色块 vs 页面"), fgName: "primary", bgName: "bg", fg: palette.primary, bg: palette.bg, minimum: 3 },
      { label: tr("Accent vs page", "强调色 vs 页面"), fgName: "accent", bgName: "bg", fg: palette.accent, bg: palette.bg, minimum: 3 },
      { label: tr("Secondary text", "次要文字"), fgName: "muted", bgName: "bg", fg: palette.muted, bg: palette.bg, minimum: 4.5 },
      { label: tr("Divider visibility", "分隔线可见性"), fgName: "border", bgName: "bg", fg: palette.border, bg: palette.bg, minimum: 3 },
    ];
  }, [colors, globals, tr]);

  if (pairs.length === 0) return null;

  const summary = pairs.reduce(
    (acc, p) => {
      const r = contrastRatio(p.fg, p.bg);
      if (r < p.minimum) acc.fail += 1;
      else if (r >= 7) acc.aaa += 1;
      else acc.aa += 1;
      return acc;
    },
    { aaa: 0, aa: 0, fail: 0 },
  );

  return (
    <section className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <header className="mb-2.5 flex items-center justify-between">
        <h3 className="text-xs font-semibold">{tr("Contrast (WCAG)", "对比度（WCAG）")}</h3>
        <div className="flex gap-1.5 text-[10px]">
          <span className={`rounded px-1.5 py-0.5 font-medium ${TONE_BADGE.good}`}>AAA {summary.aaa}</span>
          <span className={`rounded px-1.5 py-0.5 font-medium ${TONE_BADGE.good}`}>AA {summary.aa}</span>
          <span className={`rounded px-1.5 py-0.5 font-medium ${TONE_BADGE.bad}`}>Fail {summary.fail}</span>
        </div>
      </header>
      <ul className="space-y-1.5">
        {pairs.map((p) => {
          const ratio = contrastRatio(p.fg, p.bg);
          const grade = gradeFor(ratio, p.minimum);
          return (
            <li
              key={p.label}
              className="flex items-center gap-3 rounded-lg border border-neutral-100 px-2.5 py-1.5 dark:border-neutral-800"
            >
              <div
                className="flex h-7 w-12 shrink-0 items-center justify-center rounded text-[10px] font-medium"
                style={{ background: p.bg, color: p.fg }}
                title={`${p.fgName} on ${p.bgName}`}
              >
                Aa
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  {p.label}
                </div>
                <div className="font-mono text-[10px] text-neutral-400">
                  {p.fgName} × {p.bgName}
                </div>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-neutral-600 dark:text-neutral-300">
                {ratio.toFixed(2)}
              </span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${TONE_BADGE[grade.tone]}`}>
                {grade.tag}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-neutral-400">
        {tr("Body text needs ≥4.5 (AA) / ≥7 (AAA); UI elements and dividers only need ≥3. A Fail means adjust the colors or change a role.", "正文文字要求 ≥4.5（AA）/ ≥7（AAA）；UI 元素和分隔线 ≥3 即可。Fail 标识需要调整颜色或换 role。")}
      </p>
    </section>
  );
}
