"use client";
import { useMemo } from "react";
import { useTokens, computedHex, type ColorToken } from "@/lib/store";
import { treemapBinary } from "@/lib/treemap";
import { contrastRatio } from "@/lib/color";

const TREEMAP_W = 560;
const TREEMAP_H = 320;

export function PaletteView() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);

  const resolved = useMemo(
    () => colors.map((c) => ({ ...c, displayHex: computedHex(c, globals) })),
    [colors, globals],
  );

  // Normalize proportions so they always sum to 1
  const total = resolved.reduce((s, c) => s + c.proportion, 0) || 1;
  const normed = resolved.map((c) => ({ ...c, p: c.proportion / total }));

  if (resolved.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
        上传图片后,色彩比例会显示在这里
      </div>
    );
  }

  const rects = treemapBinary(
    normed.map((c) => ({ value: Math.max(c.p, 0.0001), data: c })),
    TREEMAP_W,
    TREEMAP_H,
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
          色彩比例 Treemap
        </div>
        <div
          className="relative overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
          style={{ width: "100%", aspectRatio: `${TREEMAP_W} / ${TREEMAP_H}` }}
        >
          <svg
            viewBox={`0 0 ${TREEMAP_W} ${TREEMAP_H}`}
            className="block h-full w-full"
            preserveAspectRatio="none"
          >
            {rects.map((r) => {
              const c = r.data as ColorToken & { displayHex: string; p: number };
              const labelColor =
                contrastRatio(c.displayHex, "#ffffff") >= contrastRatio(c.displayHex, "#000000")
                  ? "#ffffff"
                  : "#000000";
              return (
                <g key={c.id}>
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={c.displayHex} />
                  {r.w > 70 && r.h > 36 && (
                    <text
                      x={r.x + 8}
                      y={r.y + 18}
                      fontSize={11}
                      fontFamily="ui-monospace, monospace"
                      fill={labelColor}
                    >
                      {c.role !== "unassigned" ? c.role : c.id}
                    </text>
                  )}
                  {r.w > 70 && r.h > 52 && (
                    <text
                      x={r.x + 8}
                      y={r.y + 32}
                      fontSize={10}
                      fontFamily="ui-monospace, monospace"
                      fill={labelColor}
                      opacity={0.85}
                    >
                      {c.displayHex} · {(c.p * 100).toFixed(1)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
