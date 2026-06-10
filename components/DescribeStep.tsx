"use client";
import { useState } from "react";
import { useTokens } from "@/lib/store";
import { InputSource } from "./InputSource";
import { PaletteFlow } from "./PaletteFlow";

export function DescribeStep({ onLoaded }: { onLoaded: () => void }) {
  const description = useTokens((s) => s.description);
  const setDescription = useTokens((s) => s.setDescription);

  // runId: 0 = not started; >0 mounts a fresh PaletteFlow (bump to re-run).
  const [runId, setRunId] = useState(0);
  const [showFallback, setShowFallback] = useState(false);

  const started = runId > 0;

  return (
    <section
      id="step-describe"
      className="flex min-h-screen snap-start flex-col justify-center px-6 py-16"
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-6 lg:pl-28">
        <div className="max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
            Step 1 / 5
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">描述你的产品</h1>
          {/* <p className="text-sm text-neutral-500 dark:text-neutral-400">
            用几句话告诉 AI 你想做什么。方向不清晰时，AI 会用选项追问，再给你几套配色和参考模板。
          </p> */}
        </header>

        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例如：面向开发者的 AI 编程助手，开发者友好、信息密度高的暗色调"
            rows={5}
            className="w-full resize-none rounded-xl border border-neutral-300 bg-white p-4 pb-16 text-sm leading-relaxed outline-none transition focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-500"
          />
          <button
            onClick={() => setRunId((n) => n + 1)}
            disabled={!description.trim()}
            aria-label={started ? "重新分析" : "分析"}
            title={started ? "重新分析" : "分析"}
            className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-lg bg-neutral-900 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            {started ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>

        </div>

        {started && (
          <PaletteFlow key={runId} description={description} onLoaded={onLoaded} />
        )}

        <div className="max-w-2xl pt-6">
          <button
            onClick={() => setShowFallback((v) => !v)}
            className="text-xs text-neutral-500 underline-offset-4 hover:underline dark:text-neutral-400"
          >
            {showFallback ? "收起" : "浏览全部 73 个模板 / 上传图片 / 网址 ↓"}
          </button>
          {showFallback && (
            <div className="mt-3">
              <InputSource onSuccess={onLoaded} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
