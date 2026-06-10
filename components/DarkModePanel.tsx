"use client";
import { useTokens, computedHex, type SemanticRole } from "@/lib/store";
import { resolveDarkHex } from "@/lib/darkMode";

const ROLE_ORDER: Record<SemanticRole, number> = {
  background: 0,
  primary: 1,
  foreground: 2,
  accent: 3,
  muted: 4,
  border: 5,
  unassigned: 6,
};

/**
 * Dark counterpart editor: auto-derives a dark hex per token (OKLCH, role
 * aware) with per-token override. Exports emit the pairs as an
 * `@media (prefers-color-scheme: dark)` variable block.
 */
export function DarkModePanel() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const dark = useTokens((s) => s.dark);
  const setDarkEnabled = useTokens((s) => s.setDarkEnabled);
  const setDarkOverride = useTokens((s) => s.setDarkOverride);

  if (colors.length === 0) return null;

  const sorted = [...colors].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9),
  );

  return (
    <section className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold">暗色配对</h3>
          <p className="mt-0.5 text-[10px] text-neutral-400">
            自动从亮色派生暗色对；点暗色块可微调。导出时输出 @media (prefers-color-scheme: dark) 变量。
          </p>
        </div>
        <button
          onClick={() => setDarkEnabled(!dark.enabled)}
          aria-pressed={dark.enabled}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            dark.enabled
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
              : "border-neutral-300 hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-white"
          }`}
        >
          {dark.enabled ? "已启用" : "启用"}
        </button>
      </div>

      {dark.enabled && (
        <div className="mt-3 space-y-1.5">
          {sorted.map((t) => {
            const light = computedHex(t, globals);
            const darkHex = resolveDarkHex(t, globals, dark.overrides);
            const overridden = t.id in dark.overrides;
            return (
              <div key={t.id} className="flex items-center gap-2 text-[10px]">
                <span className="w-20 truncate text-neutral-500 dark:text-neutral-400">
                  {t.role === "unassigned" ? t.name ?? t.id : t.role}
                </span>
                <span
                  className="h-6 w-10 shrink-0 rounded border border-neutral-200 dark:border-neutral-700"
                  style={{ background: light }}
                  title={`亮色 ${light}`}
                />
                <span className="text-neutral-300 dark:text-neutral-600">→</span>
                <label
                  className="relative h-6 w-10 shrink-0 cursor-pointer overflow-hidden rounded border border-neutral-200 dark:border-neutral-700"
                  style={{ background: darkHex }}
                  title={`暗色 ${darkHex}（点击微调）`}
                >
                  <input
                    type="color"
                    value={darkHex}
                    onChange={(e) => setDarkOverride(t.id, e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                <span className="font-mono text-neutral-600 dark:text-neutral-300">{darkHex}</span>
                {overridden && (
                  <button
                    onClick={() => setDarkOverride(t.id, null)}
                    className="text-neutral-400 underline-offset-2 hover:underline"
                  >
                    重置
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
