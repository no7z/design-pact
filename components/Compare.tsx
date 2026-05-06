"use client";
import { useEffect, useMemo, useState } from "react";
import { useTokens, computedHex, type Variant } from "@/lib/store";
import { squarify } from "@/lib/treemap";
import { contrastRatio } from "@/lib/color";
import { streamGenerate, extractHtml } from "@/lib/generate";
import type { GenerateKind } from "@/lib/genPrompt";

const KINDS: { id: GenerateKind; label: string }[] = [
  { id: "landing", label: "落地页" },
  { id: "card", label: "卡片网格" },
  { id: "form", label: "表单" },
  { id: "dashboard", label: "仪表盘" },
  { id: "article", label: "文章" },
];

type SideState = {
  busy: boolean;
  stream: string;
  html: string | null;
  err: string | null;
};

const emptySide: SideState = { busy: false, stream: "", html: null, err: null };

export function Compare({ open, onClose }: { open: boolean; onClose: () => void }) {
  const variants = useTokens((s) => s.variants);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [kind, setKind] = useState<GenerateKind>("landing");
  const [left, setLeft] = useState<SideState>(emptySide);
  const [right, setRight] = useState<SideState>(emptySide);

  // initialize selections when modal opens
  useEffect(() => {
    if (open && variants.length >= 2) {
      setLeftId((cur) => cur ?? variants[0].id);
      setRightId((cur) => cur ?? variants[1].id);
    }
  }, [open, variants]);

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const leftV = variants.find((v) => v.id === leftId) ?? null;
  const rightV = variants.find((v) => v.id === rightId) ?? null;

  const generateOne = async (
    variant: Variant,
    setSide: (updater: (s: SideState) => SideState) => void,
  ) => {
    setSide(() => ({ busy: true, stream: "", html: null, err: null }));
    let acc = "";
    let surfaced = false;
    try {
      await streamGenerate(
        { colors: variant.colors, typography: variant.typography, kind },
        {
          onDelta: (d) => {
            acc += d;
            setSide((s) => ({ ...s, stream: acc }));
          },
          onDone: (full) => {
            setSide((s) => ({ ...s, html: extractHtml(full) }));
          },
          onError: (m) => {
            surfaced = true;
            setSide((s) => ({ ...s, err: m }));
          },
        },
      );
    } catch (e) {
      if (!surfaced)
        setSide((s) => ({
          ...s,
          err: e instanceof Error ? e.message : "generation failed",
        }));
    } finally {
      setSide((s) => ({ ...s, busy: false }));
    }
  };

  const generateBoth = () => {
    if (leftV) generateOne(leftV, setLeft);
    if (rightV) generateOne(rightV, setRight);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="m-4 flex flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-neutral-950"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div>
            <h2 className="text-base font-semibold">变体对比</h2>
            <p className="text-xs text-neutral-500">
              选择两个变体,左右并排查看色彩比例和 AI 生成效果。
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="关闭"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <label className="flex items-center gap-2 text-xs">
            <span className="font-medium">左:</span>
            <select
              value={leftId ?? ""}
              onChange={(e) => {
                setLeftId(e.target.value || null);
                setLeft(emptySide);
              }}
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">--</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span className="font-medium">右:</span>
            <select
              value={rightId ?? ""}
              onChange={(e) => {
                setRightId(e.target.value || null);
                setRight(emptySide);
              }}
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="">--</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <span className="ml-2 text-xs text-neutral-500">·</span>
          <div className="flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${
                  kind === k.id
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <button
            onClick={generateBoth}
            disabled={!leftV || !rightV || left.busy || right.busy}
            className="ml-auto rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {left.busy || right.busy ? "生成中…" : "并排生成"}
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-2">
          <Side variant={leftV} state={left} kind={kind} />
          <div className="border-t border-neutral-200 dark:border-neutral-800 md:border-l md:border-t-0">
            <Side variant={rightV} state={right} kind={kind} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Side({
  variant,
  state,
  kind,
}: {
  variant: Variant | null;
  state: SideState;
  kind: GenerateKind;
}) {
  if (!variant) {
    return (
      <div className="grid h-full place-items-center p-8 text-sm text-neutral-500">
        选择一个变体
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="mb-1 text-sm font-semibold">{variant.name}</div>
      <div className="mb-3 text-[11px] text-neutral-500">
        {variant.colors.length} 色 · base {variant.typography.base}px · ratio {variant.typography.ratio}
      </div>
      <ProportionBar variant={variant} />
      <Treemap variant={variant} />
      <div className="mt-3 flex-1">
        {state.html ? (
          <iframe
            key={state.html.length}
            title={`preview ${variant.name}`}
            sandbox=""
            srcDoc={state.html}
            className="h-[420px] w-full rounded-lg border border-neutral-200 dark:border-neutral-800"
          />
        ) : state.busy ? (
          <pre className="max-h-[420px] overflow-auto rounded-lg bg-neutral-50 p-3 font-mono text-[10px] leading-relaxed dark:bg-neutral-900">
            <code>{state.stream || "等待响应…"}</code>
          </pre>
        ) : state.err ? (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {state.err}
          </div>
        ) : (
          <div className="grid h-[420px] place-items-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 dark:border-neutral-700">
            点上方「并排生成」用此变体生成「{kind}」预览
          </div>
        )}
      </div>
    </div>
  );
}

function ProportionBar({ variant }: { variant: Variant }) {
  return (
    <div className="mb-3 flex h-8 w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      {variant.colors.map((c) => (
        <div
          key={c.id}
          title={`${c.role} · ${c.hex} · ${(c.proportion * 100).toFixed(1)}%`}
          style={{ flex: c.proportion, background: computedHex(c, variant.globals) }}
        />
      ))}
    </div>
  );
}

function Treemap({ variant }: { variant: Variant }) {
  const W = 480;
  const H = 200;
  const resolved = useMemo(
    () => variant.colors.map((c) => ({ ...c, hex: computedHex(c, variant.globals) })),
    [variant],
  );
  const rects = squarify(
    resolved.map((c) => ({ value: Math.max(c.proportion, 0.0001), data: c })),
    W,
    H,
  );
  return (
    <div
      className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
      style={{ width: "100%", aspectRatio: `${W} / ${H}` }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" preserveAspectRatio="none">
        {rects.map((r) => {
          const c = r.data as (typeof resolved)[number];
          const fg =
            contrastRatio(c.hex, "#ffffff") >= contrastRatio(c.hex, "#000000")
              ? "#fff"
              : "#000";
          return (
            <g key={c.id}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={c.hex} />
              {r.w > 60 && r.h > 28 && (
                <text
                  x={r.x + 6}
                  y={r.y + 14}
                  fontSize={10}
                  fontFamily="ui-monospace, monospace"
                  fill={fg}
                >
                  {c.role !== "unassigned" ? c.role : c.id}
                </text>
              )}
              {r.w > 60 && r.h > 44 && (
                <text
                  x={r.x + 6}
                  y={r.y + 26}
                  fontSize={9}
                  fontFamily="ui-monospace, monospace"
                  fill={fg}
                  opacity={0.85}
                >
                  {c.hex} · {(c.proportion * 100).toFixed(1)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
