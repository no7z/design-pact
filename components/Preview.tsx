"use client";
import { useState, useMemo } from "react";
import { useTokens } from "@/lib/store";
import { resolvePalette } from "@/lib/mockup";
import { lightDarkFaces, isDarkPalette } from "@/lib/darkMode";
import { MockupView, type MockupKind } from "@/components/MockupViews";
import { useTr } from "@/lib/i18n";

const ZERO_GLOBALS = { dL: 0, dC: 0, dH: 0 };

type PreviewKind = MockupKind | "all";

const KIND_LABEL: Record<PreviewKind, { en: string; zh: string }> = {
  all: { en: "All", zh: "全部" },
  landing: { en: "Landing", zh: "落地页" },
  card: { en: "Cards", zh: "卡片组" },
  form: { en: "Form", zh: "表单" },
  dashboard: { en: "Dashboard", zh: "仪表盘" },
  article: { en: "Article", zh: "文章页" },
  pricing: { en: "Pricing", zh: "定价页" },
};
const KINDS: PreviewKind[] = ["all", "landing", "card", "form", "dashboard", "article", "pricing"];
const ALL_MOCKUPS: MockupKind[] = ["landing", "card", "form", "dashboard", "article", "pricing"];

export function Preview() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const dark = useTokens((s) => s.dark);
  const tr = useTr();
  const [kind, setKind] = useState<PreviewKind>("all");
  // Default the toggle to the base palette's own nature so enabling pairing
  // doesn't flip a dark-themed brand to light on first view.
  const [scheme, setScheme] = useState<"light" | "dark">(() =>
    isDarkPalette(useTokens.getState().colors, useTokens.getState().globals) ? "dark" : "light",
  );

  const palette = useMemo(() => {
    if (!dark.enabled) return resolvePalette(colors, globals);
    const faces = lightDarkFaces(colors, globals, dark.overrides);
    return resolvePalette(scheme === "dark" ? faces.dark : faces.light, ZERO_GLOBALS);
  }, [colors, globals, dark.enabled, dark.overrides, scheme]);

  if (colors.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              kind === k
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            }`}
          >
            {tr(KIND_LABEL[k].en, KIND_LABEL[k].zh)}
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
                {s === "light" ? tr("Light", "亮") : tr("Dark", "暗")}
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
                {tr(KIND_LABEL[k].en, KIND_LABEL[k].zh)}
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
