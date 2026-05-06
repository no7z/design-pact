"use client";
import { useMemo, useState } from "react";
import { useTokens, computedHex } from "@/lib/store";
import {
  w3cTokens,
  tailwindConfig,
  cssVars,
  aiPrompt,
  downloadFile,
  type ResolvedToken,
} from "@/lib/export";

type Tab = "json" | "tailwind" | "css" | "ai";

export function Export() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const typography = useTokens((s) => s.typography);
  const [tab, setTab] = useState<Tab>("json");
  const [copied, setCopied] = useState(false);

  const resolved: ResolvedToken[] = useMemo(
    () => colors.map((c) => ({ ...c, displayHex: computedHex(c, globals) })),
    [colors, globals],
  );

  const content = useMemo(() => {
    switch (tab) {
      case "json":
        return JSON.stringify(w3cTokens(resolved, typography), null, 2);
      case "tailwind":
        return tailwindConfig(resolved, typography);
      case "css":
        return cssVars(resolved, typography);
      case "ai":
        return aiPrompt(resolved, typography);
    }
  }, [tab, resolved, typography]);

  if (resolved.length === 0) return null;

  const filename =
    tab === "json"
      ? "design-tokens.json"
      : tab === "tailwind"
        ? "tailwind.config.js"
        : tab === "css"
          ? "tokens.css"
          : "design-prompt.md";

  const onCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">导出</h3>
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {copied ? "已复制" : "复制"}
          </button>
          <button
            onClick={() => downloadFile(filename, content)}
            className="rounded bg-neutral-900 px-2 py-1 text-xs text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            下载 {filename}
          </button>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {(
          [
            ["json", "W3C Tokens"],
            ["tailwind", "Tailwind"],
            ["css", "CSS vars"],
            ["ai", "AI prompt"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-xs ${
              tab === key
                ? "border-neutral-900 font-medium dark:border-white"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <pre className="max-h-[480px] overflow-auto rounded-lg bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed dark:bg-neutral-900">
        <code>{content}</code>
      </pre>
    </section>
  );
}
