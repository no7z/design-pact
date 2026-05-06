"use client";
import { useRef, useState, useEffect, useMemo } from "react";
import { useTokens, computedHex } from "@/lib/store";
import { streamGenerate, extractHtml } from "@/lib/generate";
import { resolvePalette } from "@/lib/mockup";
import { MockupView } from "@/components/MockupViews";
import type { GenerateKind } from "@/lib/genPrompt";

const KINDS: { id: GenerateKind; label: string }[] = [
  { id: "landing", label: "落地页" },
  { id: "card", label: "卡片组" },
  { id: "form", label: "表单" },
  { id: "dashboard", label: "仪表盘" },
  { id: "article", label: "文章页" },
];

const MODELS: { id: string; label: string; tag?: string }[] = [
  { id: "deepseek/deepseek-v3",       label: "DeepSeek V3",         tag: "推荐" },
  { id: "google/gemini-3-flash",      label: "Gemini 3 Flash",      tag: "快" },
  { id: "deepseek/deepseek-v4-pro",   label: "DeepSeek V4 Pro" },
  { id: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  { id: "deepseek/deepseek-r1",       label: "DeepSeek R1",         tag: "慢" },
  { id: "zai/glm-5.1",               label: "GLM-5.1" },
  { id: "xiaomi/mimo-v2.5-pro",       label: "MiMo v2.5 Pro" },
];

type Status = "idle" | "generating" | "done" | "error";

export function Preview() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const typography = useTokens((s) => s.typography);
  const palette = useMemo(() => resolvePalette(colors, globals), [colors, globals]);

  const [kind, setKind] = useState<GenerateKind>("landing");
  const [model, setModel] = useState(MODELS[0].id);
  const [status, setStatus] = useState<Status>("idle");
  const [stream, setStream] = useState("");
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ESC closes fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

  if (colors.length === 0) return null;

  const handleGenerate = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus("generating");
    setStream("");
    setHtml(null);
    setError("");

    const resolvedColors = colors.map((c) => ({
      ...c,
      hex: computedHex(c, globals),
    }));

    try {
      await streamGenerate(
        { colors: resolvedColors, typography, kind, model },
        {
          onDelta: (chunk) => setStream((s) => s + chunk),
          onDone: (full) => {
            setHtml(extractHtml(full));
            setStatus("done");
          },
          onError: (msg) => {
            setError(msg);
            setStatus("error");
          },
        },
        ctrl.signal,
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStatus("idle");
  };

  const iframe = html !== null && (
    <iframe
      key={html.slice(0, 64)}
      title="AI 生成预览"
      sandbox="allow-same-origin"
      srcDoc={html}
      className="h-full w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
    />
  );

  return (
    <>
      {/* Fullscreen overlay */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-950">
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
            <span className="text-xs text-neutral-500">{MODELS.find(m => m.id === model)?.label} · {KINDS.find(k => k.id === kind)?.label}</span>
            <button
              onClick={() => setFullscreen(false)}
              className="rounded border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              退出全屏 (Esc)
            </button>
          </div>
          <div className="min-h-0 flex-1">{iframe}</div>
        </div>
      )}

      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-4 space-y-3">
          {/* Kind tabs */}
          <div className="flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  kind === k.id
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          {/* Model selector + generate button */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={status === "generating"}
              className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}{m.tag ? ` · ${m.tag}` : ""}
                </option>
              ))}
            </select>

            <div className="flex gap-2 ml-auto">
              {html !== null && (
                <button
                  onClick={() => setFullscreen(true)}
                  className="rounded border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  全屏
                </button>
              )}
              {status === "generating" && (
                <button
                  onClick={handleStop}
                  className="rounded border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  停止
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={status === "generating"}
                className="rounded bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {status === "generating" ? "生成中…" : "生成 Mockup"}
              </button>
            </div>
          </div>
        </div>

        {/* Output area */}
        {html === null && status !== "generating" && (
          <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
            <MockupView kind={kind} palette={palette} />
          </div>
        )}

        {status === "generating" && html === null && (
          <pre className="max-h-96 overflow-auto rounded-lg bg-neutral-50 p-4 font-mono text-[10px] leading-relaxed text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
            <code>{stream || "等待响应…"}</code>
          </pre>
        )}

        {html !== null && (
          <div className="h-[520px]">{iframe}</div>
        )}

        {status === "error" && (
          <div className="mt-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
      </section>
    </>
  );
}
