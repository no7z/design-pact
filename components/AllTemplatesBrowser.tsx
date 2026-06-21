"use client";
import { useState, useMemo } from "react";
import { BRANDS, brandDisplayName } from "@/lib/templates";
import { TemplateGrid } from "./TemplateGrid";

export function AllTemplatesBrowser({ onPicked }: { onPicked: (brand: string) => void }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q
      ? BRANDS.filter((b) => b.includes(q) || brandDisplayName(b).toLowerCase().includes(q))
      : BRANDS;
  }, [query]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="搜索品牌（如 stripe、notion…）"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-500"
      />
      <div className="rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800">
        <TemplateGrid brands={filtered} onPicked={onPicked} />
      </div>
    </div>
  );
}
