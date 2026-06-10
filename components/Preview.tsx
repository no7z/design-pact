"use client";
import { useState, useMemo } from "react";
import { useTokens } from "@/lib/store";
import { resolvePalette } from "@/lib/mockup";
import { darkTokens } from "@/lib/darkMode";
import { MockupView, type MockupKind } from "@/components/MockupViews";

const ZERO_GLOBALS = { dL: 0, dC: 0, dH: 0 };

type PreviewKind = MockupKind | "all";

const KINDS: { id: PreviewKind; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "landing", label: "落地页" },
  { id: "card", label: "卡片组" },
  { id: "form", label: "表单" },
  { id: "dashboard", label: "仪表盘" },
  { id: "article", label: "文章页" },
  { id: "pricing", label: "定价页" },
];

const ALL_MOCKUPS: MockupKind[] = ["landing", "card", "form", "dashboard", "article", "pricing"];
const LABELS: Record<MockupKind, string> = {
  landing: "落地页",
  card: "卡片组",
  form: "表单",
  dashboard: "仪表盘",
  article: "文章页",
  pricing: "定价页",
};

export function Preview() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const dark = useTokens((s) => s.dark);
  const [kind, setKind] = useState<PreviewKind>("all");
  const [scheme, setScheme] = useState<"light" | "dark">("light");

  const showDark = dark.enabled && scheme === "dark";
  const palette = useMemo(
    () =>
      showDark
        ? resolvePalette(darkTokens(colors, globals, dark.overrides), ZERO_GLOBALS)
        : resolvePalette(colors, globals),
    [colors, globals, showDark, dark.overrides],
  );

  if (colors.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1">
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
        {dark.enabled && (
          <div className="ml-auto flex gap-0.5 rounded-full border border-neutral-300 p-0.5 dark:border-neutral-700">
            {(["light", "dark"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScheme(s)}
                aria-pressed={scheme === s}
                className={`rounded-full px-2.5 py-0.5 text-[10px] transition ${
                  scheme === s
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                {s === "light" ? "亮" : "暗"}
              </button>
            ))}
          </div>
        )}
      </div>

      {kind === "all" ? (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 sm:grid-cols-2">
          {ALL_MOCKUPS.map((k) => (
            <div key={k} className="space-y-1.5">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {LABELS[k]}
              </p>
              <div className="aspect-[800/520] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                <MockupView kind={k} palette={palette} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="aspect-[800/520] overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
          <MockupView kind={kind} palette={palette} />
        </div>
      )}
    </div>
  );
}
