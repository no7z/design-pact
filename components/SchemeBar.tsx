"use client";
import { useEffect, useState } from "react";
import { useTokens, computedHex, type Scheme } from "@/lib/store";

const SWATCH_ORDER = ["background", "primary", "accent", "foreground", "muted", "border"];

// A floating top bar for saving / switching schemes. A scheme is a snapshot of
// the WHOLE token set (colors, type, spacing, motion, …), so this lives globally
// rather than inside 调色 — it slides down from the top once you scroll into the
// editor so you can save or switch from any section.
export function SchemeBar() {
  const colors = useTokens((s) => s.colors);
  const schemes = useTokens((s) => s.schemes);
  const activeSchemeId = useTokens((s) => s.activeSchemeId);
  const saveScheme = useTokens((s) => s.saveScheme);
  const loadScheme = useTokens((s) => s.loadScheme);
  const deleteScheme = useTokens((s) => s.deleteScheme);

  const [name, setName] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const show = colors.length > 0 && scrolled;

  const handleSave = () => {
    saveScheme(name);
    setName("");
  };

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur transition-transform duration-300 dark:border-neutral-800 dark:bg-black/80 ${
        show ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-6 py-2">
        <span className="shrink-0 text-xs font-semibold">方案</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder={`方案 ${schemes.length + 1}`}
          className="w-24 shrink-0 rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={handleSave}
          className="shrink-0 rounded bg-neutral-900 px-2.5 py-1 text-xs text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          保存当前
        </button>
        <div className="scrollbar-subtle flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          {schemes.length === 0 ? (
            <span className="text-[10px] text-neutral-400">存几套，任意板块一键切换</span>
          ) : (
            schemes.map((s) => (
              <SchemeChip
                key={s.id}
                scheme={s}
                active={activeSchemeId === s.id}
                onLoad={() => loadScheme(s.id)}
                onDelete={() => deleteScheme(s.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function SchemeChip({
  scheme,
  active,
  onLoad,
  onDelete,
}: {
  scheme: Scheme;
  active: boolean;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const swatches = [...scheme.colors]
    .sort((x, y) => SWATCH_ORDER.indexOf(x.role) - SWATCH_ORDER.indexOf(y.role))
    .slice(0, 4);
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onLoad}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onLoad();
        }
      }}
      title={active ? "当前已载入" : "点击载入此方案"}
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border py-0.5 pl-1.5 pr-1 text-xs transition ${
        active
          ? "border-neutral-900 dark:border-white"
          : "border-neutral-200 hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-white"
      }`}
    >
      <span className="flex h-3.5 w-9 shrink-0 overflow-hidden rounded-sm">
        {swatches.map((c) => (
          <span key={c.id} className="flex-1" style={{ background: computedHex(c, scheme.globals) }} />
        ))}
      </span>
      <span className="max-w-24 truncate">{scheme.name}</span>
      {active && (
        <span className="text-[10px]" aria-hidden>
          ✓
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="删除此方案"
        aria-label={`删除方案 ${scheme.name}`}
        className="rounded px-1 text-[10px] text-neutral-400 transition hover:text-red-600"
      >
        ×
      </button>
    </span>
  );
}
