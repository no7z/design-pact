"use client";
import { useMemo, useState } from "react";
import { useTokens, computedHex } from "@/lib/store";
import {
  designSystemMarkdown,
  downloadFile,
  type ResolvedToken,
} from "@/lib/export";
import { DesignSystemBoard, BOARD_SVG_ID } from "./DesignSystemBoard";
import { serializeSvg, svgToPngBlob, htmlStyleGuide, downloadBlob } from "@/lib/visualExport";
import { lightDarkFaces } from "@/lib/darkMode";
import { resolveSemantic } from "@/lib/semantic";

export function Export() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const typography = useTokens((s) => s.typography);
  const spacing = useTokens((s) => s.spacing);
  const radius = useTokens((s) => s.radius);
  const shadow = useTokens((s) => s.shadow);
  const motion = useTokens((s) => s.motion);
  const border = useTokens((s) => s.border);
  const opacity = useTokens((s) => s.opacity);
  const dark = useTokens((s) => s.dark);
  const semanticOverride = useTokens((s) => s.semanticOverride);
  const [visualOpen, setVisualOpen] = useState(true);
  const [vBusy, setVBusy] = useState(false);

  // When pairing is on, exports follow the CSS convention regardless of
  // whether the brand is light- or dark-based: :root is always the LIGHT
  // face, @media(prefers-color-scheme:dark) the dark face. When off, export
  // the palette as-is (single theme).
  const resolved: ResolvedToken[] = useMemo(() => {
    if (!dark.enabled) {
      return colors.map((c) => ({ ...c, displayHex: computedHex(c, globals) }));
    }
    return lightDarkFaces(colors, globals, dark.overrides).light.map((c) => ({ ...c, displayHex: c.hex }));
  }, [colors, globals, dark.enabled, dark.overrides]);

  const darkResolved: ResolvedToken[] | null = useMemo(
    () =>
      dark.enabled
        ? lightDarkFaces(colors, globals, dark.overrides).dark.map((c) => ({ ...c, displayHex: c.hex }))
        : null,
    [colors, globals, dark.enabled, dark.overrides],
  );

  const semantic = useMemo(() => {
    const bg = resolved.find((c) => c.role === "background")?.displayHex ?? resolved[0]?.displayHex ?? "#ffffff";
    return resolveSemantic(bg, semanticOverride);
  }, [resolved, semanticOverride]);

  if (resolved.length === 0) return null;

  const boardSvg = () => document.getElementById(BOARD_SVG_ID) as SVGSVGElement | null;

  const exportSvg = () => {
    const svg = boardSvg();
    if (svg) downloadFile("design-system.svg", serializeSvg(svg), "image/svg+xml");
  };
  const exportHtml = () => {
    const svg = boardSvg();
    if (svg) downloadFile("design-system.html", htmlStyleGuide(serializeSvg(svg), "设计系统总览"), "text/html");
  };
  const openHtml = () => {
    const svg = boardSvg();
    if (!svg) return;
    const html = htmlStyleGuide(serializeSvg(svg), "设计系统总览");
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const exportMarkdown = () =>
    downloadFile(
      "design-system.md",
      designSystemMarkdown(resolved, typography, spacing, radius, shadow, motion, border, opacity, darkResolved, semantic),
      "text/markdown",
    );
  const exportPng = async () => {
    const svg = boardSvg();
    if (!svg) return;
    setVBusy(true);
    try {
      const blob = await svgToPngBlob(serializeSvg(svg), 2);
      downloadBlob("design-system.png", blob);
    } finally {
      setVBusy(false);
    }
  };

  const visualBtn =
    "rounded border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div>
          <p className="text-xs font-semibold">设计系统文件 · 给 AI / 团队</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            一个 design-system.md：丢进代码库，让你自己的 AI（Claude Code / Cursor）按它生成 UI——用你自己的算力，无需本工具在线。
          </p>
        </div>
        <button
          onClick={exportMarkdown}
          className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          下载 design-system.md
        </button>
      </div>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setVisualOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-xs font-semibold">设计系统总览 · 视觉导出</span>
          <span className="text-xs text-neutral-400">{visualOpen ? "收起 ↑" : "展开 ↓"}</span>
        </button>
        {visualOpen && (
          <div className="space-y-3 border-t border-neutral-200 px-4 pb-4 pt-3 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={openHtml} className="rounded bg-neutral-900 px-2.5 py-1 text-xs text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                在新窗口打开 ↗
              </button>
              <span className="mx-1 text-[10px] text-neutral-300 dark:text-neutral-600">下载：</span>
              <button onClick={exportHtml} className={visualBtn}>HTML</button>
              <button onClick={exportPng} disabled={vBusy} className={visualBtn}>PNG</button>
              <button onClick={exportSvg} className={visualBtn}>SVG</button>
              {vBusy && <span className="text-xs text-neutral-400">导出中…</span>}
              <span className="ml-auto text-[10px] text-neutral-400">SVG 可直接拖进 Figma / Illustrator</span>
            </div>
            <div className="max-h-[520px] overflow-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800">
              <DesignSystemBoard />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
