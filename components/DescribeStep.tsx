"use client";
import { useMemo } from "react";
import { BRANDS } from "@/lib/templates";
import { useTokens, type ColorToken } from "@/lib/store";
import { useCandidates } from "@/lib/candidates";
import { resolvePalette } from "@/lib/mockup";
import { MockupView } from "@/components/MockupViews";
import { InputSource } from "./InputSource";

const ZERO_GLOBALS = { dL: 0, dC: 0, dH: 0 };
const SWATCH_ORDER = ["background", "primary", "accent", "foreground", "muted", "border"];

// First screen — the "start" hub. There is no in-page AI: the product
// direction is discussed with your own agent (via the design-system skill),
// and the agent produces the palette(s). When the agent opens the app with
// several palettes (?p=…&p=…), they're shown here as visual candidates to pick.
// Otherwise: import the agent's colors, or start from a template / image.
export function DescribeStep({ onLoaded }: { onLoaded: () => void }) {
  const candidates = useCandidates((s) => s.palettes);
  const clearCandidates = useCandidates((s) => s.clear);
  const loadTokens = useTokens((s) => s.loadTokens);

  const pick = (palette: ColorToken[]) => {
    loadTokens(palette, null);
    clearCandidates();
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
            {candidates.length > 0 ? "选一套配色" : "开始一套设计系统"}
          </h1>
          <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {candidates.length > 0 ? (
              <>你的 agent 给了 {candidates.length} 套方案。点一套预览喜欢的，进入「调色」继续微调；不满意可在下方换模板或重选。</>
            ) : (
              <>
                配色由
                <strong className="font-medium text-neutral-700 dark:text-neutral-200">你自己的 AI agent</strong>
                产出——在 Claude Code / Cursor 里装上 design-system skill，描述产品、由 agent 给方案，再回到这里可视化选择与微调。
                也可以直接从下面开始：选品牌模板、上传图片取色，或导入 agent 产出的配色。全程不依赖任何在线 AI。
              </>
            )}
          </p>
        </header>

        {candidates.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((palette, i) => (
              <CandidateCard key={i} index={i} palette={palette} onPick={() => pick(palette)} />
            ))}
          </div>
        )}

        <InputSource onSuccess={onLoaded} />

        <p className="max-w-2xl text-xs text-neutral-400">
          共 {BRANDS.length} 个品牌模板可选。调好后在「导出」区下载 design-system.md，丢回项目让你的 agent 据此生成 UI。
        </p>
      </div>
    </section>
  );
}

function CandidateCard({
  index,
  palette,
  onPick,
}: {
  index: number;
  palette: ColorToken[];
  onPick: () => void;
}) {
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
      className="group flex flex-col gap-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 text-left transition hover:border-neutral-900 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-white"
    >
      <div className="aspect-[800/520] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <MockupView kind="landing" palette={resolved} />
      </div>
      <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
        <span className="flex h-4 flex-1 overflow-hidden rounded">
          {swatches.map((hex, j) => (
            <span key={j} className="flex-1" style={{ background: hex }} />
          ))}
        </span>
        <span className="shrink-0 text-xs text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white">
          方案 {index + 1} →
        </span>
      </div>
    </button>
  );
}
