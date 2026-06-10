"use client";
import { useState, useMemo, useRef } from "react";
import { BRANDS, brandDisplayName, fetchTemplate } from "@/lib/templates";
import { useTokens } from "@/lib/store";
import { useTemplatePreview } from "@/lib/templatePreviews";

export function AllTemplatesBrowser({ onPicked }: { onPicked: (brand: string) => void }) {
  const loadTokens = useTokens((s) => s.loadTokens);
  const setTypography = useTokens((s) => s.setTypography);
  const setSpacing = useTokens((s) => s.setSpacing);
  const setRadius = useTokens((s) => s.setRadius);
  const activeBrand = useTokens((s) => s.activeBrand);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q
      ? BRANDS.filter((b) => b.includes(q) || brandDisplayName(b).toLowerCase().includes(q))
      : BRANDS;
  }, [query]);

  const handleSelect = async (brand: string) => {
    if (loading) return;
    setLoading(brand);
    setError("");
    try {
      const { colors, typography, spacing, radius } = await fetchTemplate(brand);
      if (colors.length === 0) throw new Error("未提取到颜色");
      loadTokens(colors, brand);
      if (typography && Object.keys(typography).length > 0) setTypography(typography);
      if (spacing && Object.keys(spacing).length > 0) setSpacing(spacing);
      if (radius && Object.keys(radius).length > 0) setRadius(radius);
      onPicked(brand);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="搜索品牌（如 stripe、notion…）"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-500"
      />
      <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filtered.length === 0 ? (
          <p className="col-span-full p-3 text-xs text-neutral-400">无匹配品牌</p>
        ) : (
          filtered.map((brand) => (
            <BrowserCard
              key={brand}
              brand={brand}
              loading={loading === brand}
              active={activeBrand === brand}
              disabled={loading !== null}
              onSelect={() => handleSelect(brand)}
            />
          ))
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function BrowserCard({
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
      className={`group flex flex-col gap-2 rounded-lg border p-2 text-left transition disabled:cursor-wait ${
        active
          ? "border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900 dark:border-white dark:bg-neutral-900 dark:ring-white"
          : "border-neutral-200 bg-white hover:border-neutral-900 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-white"
      }`}
    >
      <div className="flex h-6 gap-0.5 overflow-hidden rounded">
        {colors ? (
          colors.map((hex, i) => (
            <div key={i} className="flex-1" style={{ background: hex }} />
          ))
        ) : (
          <div className="flex-1 animate-pulse bg-neutral-100 dark:bg-neutral-800" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="truncate text-[11px] font-medium">{brandDisplayName(brand)}</span>
        <span className="shrink-0 text-[10px] text-neutral-400">
          {loading ? "…" : active ? "✓" : ""}
        </span>
      </div>
    </button>
  );
}
