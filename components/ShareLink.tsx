"use client";
import { useState } from "react";
import { buildShareUrl } from "@/lib/share";

export function ShareLink() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(buildShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <div>
        <p className="text-xs font-semibold">分享</p>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          整套 tokens 打包进一条链接，打开即载入，无需账号。
        </p>
      </div>
      <button
        onClick={copy}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        {copied ? "✓ 已复制" : "复制分享链接"}
      </button>
    </div>
  );
}
