"use client";
import { useMemo, useState } from "react";
import { BRANDS } from "@/lib/templates";
import { useTokens } from "@/lib/store";
import { useCandidates, type Candidate } from "@/lib/candidates";
import { resolvePalette } from "@/lib/mockup";
import { MockupView } from "@/components/MockupViews";
import { InputSource } from "./InputSource";
import { TemplateGrid } from "./TemplateGrid";

const ZERO_GLOBALS = { dL: 0, dC: 0, dH: 0 };
const SWATCH_ORDER = ["background", "primary", "accent", "foreground", "muted", "border"];

// First screen — the "start" hub. There is no in-page AI: the product
// direction is discussed with your own agent (via the design-system skill),
// and the agent produces the palette(s). When the agent opens the app with
// several palettes (?p=…&p=…), they're shown here as visual candidates — each
// with the agent's name + description — to pick from. Picking one keeps the
// cards on screen with a "selected" marker and scrolls to 调色.
// The real brand templates stay available too, collapsed by default.
export function DescribeStep({ onLoaded }: { onLoaded: () => void }) {
  const candidates = useCandidates((s) => s.palettes);
  const matches = useCandidates((s) => s.matches);
  const loadTokens = useTokens((s) => s.loadTokens);
  const hasCandidates = candidates.length > 0;

  const [selected, setSelected] = useState<number | null>(null);
  // Templates: collapsed by default when candidates are the focus; open when
  // there are none (then it's the only way to start). User can still toggle.
  const [tplOpen, setTplOpen] = useState(!hasCandidates);

  const pick = (i: number, cand: Candidate) => {
    // Load as the active palette (activeBrand=null → any picked template
    // de-highlights automatically), mark this card, and scroll to 调色.
    loadTokens(cand.palette, null);
    setSelected(i);
    onLoaded();
  };

  // Picking a real template / image / import means the candidate is no longer
  // the active choice — drop its "已选" marker so only one is ever selected.
  const onTemplate = () => {
    setSelected(null);
    onLoaded();
  };

  return (
    <section
      id="step-describe"
      className="flex min-h-screen snap-start flex-col justify-center px-6 py-16"
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-6 lg:pl-28">
        <header className="max-w-2xl space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Step 1 / 5
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {hasCandidates ? "选一套配色" : "开始一套设计系统"}
          </h1>
          <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {hasCandidates ? (
              <>
                你的 agent 给了 {candidates.length} 套方案。点一套即载入并进入「调色」继续微调，
                可随时回到这里换选。也可展开下方从品牌模板开始。
              </>
            ) : (
              <>
                配色由
                <strong className="font-medium text-neutral-700 dark:text-neutral-200">你自己的 AI agent</strong>
                产出——在 Claude Code / Cursor 里装上 design-system skill，描述产品、由 agent 给方案，再回到这里可视化选择与微调。
                也可以展开下方，从品牌模板、上传图片取色，或导入 agent 产出的配色开始。全程不依赖任何在线 AI。
              </>
            )}
          </p>
        </header>

        {hasCandidates && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((cand, i) => (
              <CandidateCard
                key={i}
                index={i}
                candidate={cand}
                selected={selected === i}
                onPick={() => pick(i, cand)}
              />
            ))}
          </div>
        )}

        {/* Same-category real products the agent matched. Shown only when there
            are any — "有多少列多少，没有就不列". The rest live under 全部 below. */}
        {matches.length > 0 && (
          <section className="space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <header className="space-y-1">
              <h2 className="text-sm font-semibold">同类真实产品</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                和你的产品同类型的真实品牌设计（共 {matches.length} 个）。可点任意一个直接套用它的配色与字体，或继续用上面的方案。
              </p>
            </header>
            <TemplateGrid
              brands={matches}
              onPicked={onTemplate}
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            />
          </section>
        )}

        {/* Every brand template — kept available, collapsed by default. */}
        <details
          open={tplOpen}
          onToggle={(e) => setTplOpen((e.currentTarget as HTMLDetailsElement).open)}
          className="rounded-xl border border-neutral-200 dark:border-neutral-800"
        >
          <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-medium text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
            {matches.length > 0 ? "全部品牌模板 / 图片 / 导入配色" : "或：从品牌模板 / 图片 / 导入配色开始"}
            <span className="ml-1 text-neutral-400">（{tplOpen ? "收起" : "展开"}）</span>
          </summary>
          <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
            <InputSource onSuccess={onTemplate} />
          </div>
        </details>

        <p className="max-w-2xl text-xs text-neutral-400">
          共 {BRANDS.length} 个品牌模板可选。调好后在「导出」区下载 design-system.md，丢回项目让你的 agent 据此生成 UI。
        </p>
      </div>
    </section>
  );
}

function CandidateCard({
  index,
  candidate,
  selected,
  onPick,
}: {
  index: number;
  candidate: Candidate;
  selected: boolean;
  onPick: () => void;
}) {
  const { palette, name, description } = candidate;
  const resolved = useMemo(() => resolvePalette(palette, ZERO_GLOBALS), [palette]);
  const swatches = useMemo(
    () =>
      [...palette]
        .sort((a, b) => SWATCH_ORDER.indexOf(a.role) - SWATCH_ORDER.indexOf(b.role))
        .map((c) => c.hex),
    [palette],
  );

  return (
    <button
      onClick={onPick}
      aria-pressed={selected}
      className={`group relative flex flex-col overflow-hidden rounded-xl border p-2 text-left transition ${
        selected
          ? "border-neutral-900 ring-2 ring-neutral-900 dark:border-white dark:ring-white"
          : "border-neutral-200 bg-white hover:border-neutral-900 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-white"
      }`}
    >
      {selected && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-black">
          ✓ 已选
        </span>
      )}
      <div className="aspect-[800/520] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <MockupView kind="landing" palette={resolved} />
      </div>
      <div className="space-y-1.5 px-1 pb-0.5 pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-neutral-900 dark:text-white">
            {name ?? `方案 ${index + 1}`}
          </span>
          <span
            className={`shrink-0 text-xs ${
              selected
                ? "font-medium text-neutral-900 dark:text-white"
                : "text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white"
            }`}
          >
            {selected ? "已选" : "选这套 →"}
          </span>
        </div>
        {description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
        <span className="flex h-3.5 overflow-hidden rounded">
          {swatches.map((hex, j) => (
            <span key={j} className="flex-1" style={{ background: hex }} />
          ))}
        </span>
      </div>
    </button>
  );
}
