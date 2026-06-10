"use client";
import { useState } from "react";
import { downloadFile } from "@/lib/export";

type Phase = "idle" | "loading" | "done" | "error";

/**
 * Closed-loop proof: send the exported AI prompt to a real model and render
 * the page it builds with the user's tokens. Same prompt contract the eval
 * harness scores at 97/100 fidelity.
 */
export function GeneratePage({ prompt }: { prompt: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");

  const generate = async () => {
    setPhase("loading");
    setError("");
    try {
      const res = await fetch("/api/generate-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = (await res.json()) as { html?: string; error?: string };
      if (!res.ok || !data.html) throw new Error(data.error || "生成失败，请重试");
      setHtml(data.html);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败，请重试");
      setPhase("error");
    }
  };

  const openInNewWindow = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const btn =
    "rounded border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800";

  return (
    <section className="rounded-xl border border-neutral-200 dark:border-neutral-800">
      <div className="space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold">真实页面测试</p>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              把导出的 AI prompt 直接交给模型，生成一张用你的 tokens 构建的落地页——眼见为实。
            </p>
          </div>
          {phase !== "loading" && (
            <button
              onClick={generate}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              {phase === "idle" ? "生成真实页面" : "重新生成"}
            </button>
          )}
        </div>

        {phase === "loading" && (
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-6 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-400" />
            AI 正在按你的 tokens 构建页面…（约 1–2 分钟）
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={openInNewWindow} className={btn}>
                新窗口打开 ↗
              </button>
              <button
                onClick={() => downloadFile("generated-page.html", html, "text/html")}
                className={btn}
              >
                下载 HTML
              </button>
              <span className="ml-auto text-[10px] text-neutral-400">
                预览已禁用脚本，仅展示样式效果
              </span>
            </div>
            <iframe
              srcDoc={html}
              sandbox=""
              title="AI 按当前 tokens 生成的页面"
              className="h-[560px] w-full rounded-lg border border-neutral-200 bg-white dark:border-neutral-800"
            />
          </div>
        )}
      </div>
    </section>
  );
}
