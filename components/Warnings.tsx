"use client";
import { useMemo, useState } from "react";
import { useTokens, computedHex, type ColorToken } from "@/lib/store";
import { auditTokens, severityRank, type Severity } from "@/lib/audit";

const SEVERITY_STYLE: Record<
  Severity,
  { dot: string; bg: string; border: string; label: string }
> = {
  error: {
    dot: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-300 dark:border-red-800",
    label: "错误",
  },
  warn: {
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-800",
    label: "警告",
  },
  info: {
    dot: "bg-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-300 dark:border-sky-800",
    label: "提示",
  },
};

export function Warnings() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const [expanded, setExpanded] = useState(true);

  const audits = useMemo(() => {
    if (colors.length === 0) return [];
    const map = new Map<string, string>();
    for (const c of colors) map.set(c.id, computedHex(c, globals));
    return auditTokens(colors, map).sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity),
    );
  }, [colors, globals]);

  if (colors.length === 0) return null;

  const counts = audits.reduce(
    (acc, a) => {
      acc[a.severity]++;
      return acc;
    },
    { error: 0, warn: 0, info: 0 } as Record<Severity, number>,
  );

  const colorById = new Map<string, ColorToken & { displayHex: string }>();
  for (const c of colors) {
    colorById.set(c.id, { ...c, displayHex: computedHex(c, globals) });
  }

  return (
    <section className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">协调度检查</h3>
          {audits.length === 0 ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ 全部通过</span>
          ) : (
            <span className="flex items-center gap-2 text-xs">
              {counts.error > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  {counts.error} 错误
                </span>
              )}
              {counts.warn > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {counts.warn} 警告
                </span>
              )}
              {counts.info > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  {counts.info} 提示
                </span>
              )}
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-500">{expanded ? "收起" : "展开"}</span>
      </button>

      {expanded && audits.length > 0 && (
        <ul className="mt-3 space-y-2">
          {audits.map((a) => {
            const style = SEVERITY_STYLE[a.severity];
            return (
              <li
                key={a.id}
                className={`rounded-lg border p-2.5 ${style.bg} ${style.border}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium">{a.title}</span>
                      {a.refs && a.refs.length > 0 && (
                        <span className="flex gap-0.5">
                          {a.refs.map((id) => {
                            const c = colorById.get(id);
                            if (!c) return null;
                            return (
                              <span
                                key={id}
                                title={`${c.role} · ${c.displayHex}`}
                                className="inline-block h-3.5 w-3.5 rounded-sm border border-black/10 dark:border-white/10"
                                style={{ background: c.displayHex }}
                              />
                            );
                          })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-700 dark:text-neutral-300">
                      {a.detail}
                    </p>
                    {a.fix && (
                      <p className="mt-1 text-xs text-neutral-500">→ {a.fix}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
