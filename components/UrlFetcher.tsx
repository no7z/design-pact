"use client";
import { useState } from "react";
import { useTokens } from "@/lib/store";
import type { PageExtraction } from "@/lib/extractFromPage";
import { extractPalette } from "@/lib/extract";

type Mode = "auto" | "computed" | "screenshot";

type ExtractResponse = {
  mode: "computed" | "screenshot";
  fallbackTriggered: boolean;
  fallbackReason?: string;
  extraction: PageExtraction | null;
  screenshotDataUrl: string | null;
  meta: { title: string };
};

const MODE_LABEL: Record<Mode, string> = {
  auto: "自动",
  computed: "真实样式",
  screenshot: "强制截图",
};

const MODE_HINT: Record<Mode, string> = {
  auto: "先抓真实 CSS,失败再降级到截图",
  computed: "只抓 DOM 计算样式;字体能识别但反爬站会失败",
  screenshot: "直接渲染截图,不识别字体;适合反爬站",
};

export function UrlFetcher() {
  const setColors = useTokens((s) => s.setColors);
  const setTypography = useTokens((s) => s.setTypography);
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<Mode>("auto");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    title: string;
    mode: "computed" | "screenshot";
    fallbackReason?: string;
    screenshotDataUrl?: string;
  } | null>(null);

  const submit = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setErr(null);
    setSuccess(null);
    try {
      const r = await fetch("/api/extract-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, mode }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({ error: r.statusText }));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const data = (await r.json()) as ExtractResponse;

      if (data.mode === "computed" && data.extraction) {
        if (data.extraction.colors.length === 0) throw new Error("未提取到颜色");
        setColors(data.extraction.colors);
        const t: Partial<{
          fontFamily: string;
          headingFamily: string;
          base: number;
          ratio: number;
        }> = {};
        if (data.extraction.typography.fontFamily)
          t.fontFamily = data.extraction.typography.fontFamily;
        if (data.extraction.typography.headingFamily)
          t.headingFamily = data.extraction.typography.headingFamily;
        if (data.extraction.typography.base)
          t.base = Math.round(data.extraction.typography.base);
        if (data.extraction.typography.ratio) t.ratio = data.extraction.typography.ratio;
        if (Object.keys(t).length > 0) setTypography(t);
      } else if (data.mode === "screenshot" && data.screenshotDataUrl) {
        // Run client-side image quantization on the returned screenshot
        const blob = await dataUrlToBlob(data.screenshotDataUrl);
        const palette = await extractPalette(blob, 6);
        if (palette.length === 0) throw new Error("从截图未提取到颜色");
        setColors(palette);
        // Typography: leave as-is in screenshot mode (user sets manually)
      } else {
        throw new Error("服务端响应缺少颜色数据");
      }

      setSuccess({
        title: data.meta.title || url,
        mode: data.mode,
        fallbackReason: data.fallbackReason,
        screenshotDataUrl: data.screenshotDataUrl ?? undefined,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://stripe.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          disabled={busy}
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={submit}
          disabled={busy || !url.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "提取中…" : "提取"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500">提取方式:</span>
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            disabled={busy}
            title={MODE_HINT[m]}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              mode === m
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <p className="text-xs text-neutral-500">{MODE_HINT[mode]}</p>

      {success && (
        <div className="space-y-2 rounded bg-green-50 p-2 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
          <div>
            ✓ 已从「{success.title}」提取 design tokens
            {success.mode === "screenshot" && (
              <span className="ml-1 rounded bg-amber-200 px-1 text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                截图模式 — 字体未识别
              </span>
            )}
          </div>
          {success.fallbackReason && (
            <div className="text-green-700/70 dark:text-green-400/80">
              真实样式失败,已降级:{success.fallbackReason}
            </div>
          )}
          {success.screenshotDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={success.screenshotDataUrl}
              alt="captured screenshot"
              className="max-h-32 rounded border border-green-300 dark:border-green-800"
            />
          )}
        </div>
      )}

      {err && (
        <div className="rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {err}
        </div>
      )}
    </div>
  );
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const r = await fetch(dataUrl);
  return r.blob();
}
