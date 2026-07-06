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
import { deriveSemantic } from "@/lib/semantic";
import { useTr } from "@/lib/i18n";

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
  const [visualOpen, setVisualOpen] = useState(true);
  const [vBusy, setVBusy] = useState(false);
  const tr = useTr();

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

  // Status colors are pure-derived from the background. With light/dark pairing
  // on, each face has its own background, so each gets its own derived set —
  // the light set goes in :root, the dark set in the @media dark block.
  const bgOf = (cs: ResolvedToken[]) =>
    cs.find((c) => c.role === "background")?.displayHex ?? cs[0]?.displayHex ?? "#ffffff";
  const semantic = useMemo(() => deriveSemantic(bgOf(resolved)), [resolved]);
  const darkSemantic = useMemo(
    () => (darkResolved ? deriveSemantic(bgOf(darkResolved)) : null),
    [darkResolved],
  );

  if (resolved.length === 0) return null;

  const boardSvg = () => document.getElementById(BOARD_SVG_ID) as SVGSVGElement | null;

  const exportSvg = () => {
    const svg = boardSvg();
    if (svg) downloadFile("design-pact.svg", serializeSvg(svg), "image/svg+xml");
  };
  const exportHtml = () => {
    const svg = boardSvg();
    if (svg) downloadFile("design-pact.html", htmlStyleGuide(serializeSvg(svg), tr("Design system overview", "设计系统总览")), "text/html");
  };
  const openHtml = () => {
    const svg = boardSvg();
    if (!svg) return;
    const html = htmlStyleGuide(serializeSvg(svg), tr("Design system overview", "设计系统总览"));
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const exportMarkdown = () =>
    downloadFile(
      "design.md",
      designSystemMarkdown(resolved, typography, spacing, radius, shadow, motion, border, opacity, darkResolved, semantic, darkSemantic),
      "text/markdown",
    );
  const exportPng = async () => {
    const svg = boardSvg();
    if (!svg) return;
    setVBusy(true);
    try {
      const blob = await svgToPngBlob(serializeSvg(svg), 2);
      downloadBlob("design-pact.png", blob);
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
          <p className="text-xs font-semibold">{tr("Design system file · for AI / your team", "设计系统文件 · 给 AI / 团队")}</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {tr(
              "One design.md: drop it in your repo and let your own AI (Claude Code / Cursor) build UI from it — on your compute, no need for this tool to be online.",
              "一个 design.md：丢进代码库，让你自己的 AI（Claude Code / Cursor）按它生成 UI——用你自己的算力，无需本工具在线。",
            )}
          </p>
        </div>
        <button
          onClick={exportMarkdown}
          className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          {tr("Download design.md", "下载 design.md")}
        </button>
      </div>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setVisualOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-xs font-semibold">{tr("Design system overview · visual export", "设计系统总览 · 视觉导出")}</span>
          <span className="text-xs text-neutral-400">{visualOpen ? tr("collapse ↑", "收起 ↑") : tr("expand ↓", "展开 ↓")}</span>
        </button>
        {visualOpen && (
          <div className="space-y-3 border-t border-neutral-200 px-4 pb-4 pt-3 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={openHtml} className="rounded bg-neutral-900 px-2.5 py-1 text-xs text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200">
                {tr("Open in new tab ↗", "在新窗口打开 ↗")}
              </button>
              <span className="mx-1 text-[10px] text-neutral-300 dark:text-neutral-600">{tr("Download:", "下载：")}</span>
              <button onClick={exportHtml} className={visualBtn}>HTML</button>
              <button onClick={exportPng} disabled={vBusy} className={visualBtn}>PNG</button>
              <button onClick={exportSvg} className={visualBtn}>SVG</button>
              {vBusy && <span className="text-xs text-neutral-400">{tr("exporting…", "导出中…")}</span>}
              <span className="ml-auto text-[10px] text-neutral-400">{tr("SVG drops straight into Figma / Illustrator", "SVG 可直接拖进 Figma / Illustrator")}</span>
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
