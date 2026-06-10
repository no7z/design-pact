"use client";
import { useRef } from "react";
import { useTokens } from "@/lib/store";
import { brandDisplayName, fetchTemplate } from "@/lib/templates";
import { useTemplatePreview } from "@/lib/templatePreviews";

/**
 * Loads a template brand into the store (colors + typography/spacing/radius).
 * Used by the PaletteFlow "same-category templates" block.
 */
export function useApplyTemplate() {
  const loadTokens = useTokens((s) => s.loadTokens);
  const setTypography = useTokens((s) => s.setTypography);
  const setSpacing = useTokens((s) => s.setSpacing);
  const setRadius = useTokens((s) => s.setRadius);

  return async (brand: string) => {
    const { colors, typography, spacing, radius } = await fetchTemplate(brand);
    if (colors.length === 0) throw new Error("未提取到颜色");
    loadTokens(colors, brand);
    if (typography && Object.keys(typography).length > 0) setTypography(typography);
    if (spacing && Object.keys(spacing).length > 0) setSpacing(spacing);
    if (radius && Object.keys(radius).length > 0) setRadius(radius);
  };
}

export function RecommendCard({
  brand,
  loading,
  active,
  disabled,
  onSelect,
}: {
  brand: string;
  loading: boolean;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const colors = useTemplatePreview(brand, ref);

  return (
    <button
      ref={ref}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      className={`group flex flex-col gap-3 rounded-xl border p-4 text-left transition disabled:cursor-wait ${
        active
          ? "border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900 dark:border-white dark:bg-neutral-900 dark:ring-white"
          : "border-neutral-200 bg-white hover:border-neutral-900 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-white"
      }`}
    >
      <div className="flex h-8 gap-1 overflow-hidden rounded-md">
        {colors ? (
          colors.map((hex, i) => (
            <div key={i} className="flex-1" style={{ background: hex }} />
          ))
        ) : (
          <div className="flex-1 animate-pulse bg-neutral-100 dark:bg-neutral-800" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{brandDisplayName(brand)}</span>
        <span className="text-xs text-neutral-400">
          {loading ? "加载中…" : active ? "✓ 已选" : "→"}
        </span>
      </div>
    </button>
  );
}
