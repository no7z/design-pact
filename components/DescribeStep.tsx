"use client";
import { BRANDS } from "@/lib/templates";
import { InputSource } from "./InputSource";

// First screen — the "start" hub. There is no in-page AI: the product
// direction is discussed with your own agent (via the design-system skill),
// and the agent produces the palette. This page is the visual editor where you
// import what the agent produced, or start from a template / image, then tune
// and export design-system.md.
export function DescribeStep({ onLoaded }: { onLoaded: () => void }) {
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
          <h1 className="text-3xl font-semibold tracking-tight">开始一套设计系统</h1>
          <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            配色由<strong className="font-medium text-neutral-700 dark:text-neutral-200">你自己的 AI agent</strong> 产出——在 Claude
            Code / Cursor 里装上 design-system skill，描述产品、由 agent 给方案，再回到这里可视化选择与微调。
            也可以直接从下面开始：选品牌模板、上传图片取色，或导入 agent 产出的配色。全程不依赖任何在线 AI。
          </p>
        </header>

        <InputSource onSuccess={onLoaded} />

        <p className="max-w-2xl text-xs text-neutral-400">
          共 {BRANDS.length} 个品牌模板可选。调好后在「导出」区下载 design-system.md，丢回项目让你的 agent 据此生成 UI。
        </p>
      </div>
    </section>
  );
}
