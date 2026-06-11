"use client";
import { useState } from "react";
import { useTokens, type Scheme } from "@/lib/store";
import { resolvePalette, type MockupPalette } from "@/lib/mockup";
import { MockupView, type MockupKind } from "@/components/MockupViews";

const KINDS: { id: MockupKind; label: string }[] = [
  { id: "landing", label: "落地页" },
  { id: "card", label: "卡片组" },
  { id: "form", label: "表单" },
  { id: "dashboard", label: "仪表盘" },
  { id: "article", label: "文章页" },
  { id: "pricing", label: "定价页" },
];

const SWATCH_ORDER = ["background", "primary", "accent", "foreground", "muted", "border"];

type SideSel = "current" | string; // "current" or scheme id

type SideData = {
  label: string;
  palette: MockupPalette;
  swatches: string[];
  meta: string;
  schemeId: string | null;
};

/**
 * Scheme A/B comparison: snapshot the whole token state as a named scheme,
 * then compare any two schemes (or the live state) on the same mockup and
 * apply either side.
 */
export function SchemePanel() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const typography = useTokens((s) => s.typography);
  const radius = useTokens((s) => s.radius);
  const motion = useTokens((s) => s.motion);
  const schemes = useTokens((s) => s.schemes);
  const saveScheme = useTokens((s) => s.saveScheme);
  const loadScheme = useTokens((s) => s.loadScheme);
  const deleteScheme = useTokens((s) => s.deleteScheme);

  const [name, setName] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [sideA, setSideA] = useState<SideSel>("current");
  const [sideB, setSideB] = useState<SideSel>("");
  const [kind, setKind] = useState<MockupKind>("landing");

  const resolveSide = (sel: SideSel): SideData => {
    const scheme = sel === "current" ? null : schemes.find((x) => x.id === sel) ?? null;
    const c = scheme ? scheme.colors : colors;
    const g = scheme ? scheme.globals : globals;
    const t = scheme ? scheme.typography : typography;
    const r = scheme ? scheme.radius : radius;
    const m = scheme ? scheme.motion : motion;
    const swatches = [...c]
      .sort((x, y) => SWATCH_ORDER.indexOf(x.role) - SWATCH_ORDER.indexOf(y.role))
      .map((x) => x.hex)
      .slice(0, 6);
    return {
      label: scheme ? scheme.name : "当前状态",
      palette: resolvePalette(c, g),
      swatches,
      meta: `字号 ${t.base}px·${t.ratio} / 圆角 ${r.base}px / 动效 ${m.base}ms·${m.easing}`,
      schemeId: scheme?.id ?? null,
    };
  };

  const validSel = (sel: SideSel) =>
    sel !== "" && (sel === "current" || schemes.some((x) => x.id === sel));
  const a = validSel(sideA) ? resolveSide(sideA) : null;
  const b = validSel(sideB) ? resolveSide(sideB) : null;

  if (colors.length === 0) return null;

  const handleSave = () => {
    const id = saveScheme(name);
    setName("");
    // First save: point side B at the new scheme so 对比 is one click away.
    if (!sideB) setSideB(id);
  };

  const sideOptions = (
    <>
      <option value="current">当前状态</option>
      {schemes.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </>
  );

  const selectCls =
    "rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <section className="mb-6 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      {/* Save + chips row */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold">方案</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`方案 ${schemes.length + 1}`}
          className="w-28 rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={handleSave}
          className="rounded bg-neutral-900 px-2.5 py-1 text-xs text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          保存当前为方案
        </button>

        {schemes.map((s) => (
          <SchemeChip
            key={s.id}
            scheme={s}
            onLoad={() => loadScheme(s.id)}
            onDelete={() => {
              deleteScheme(s.id);
              if (sideA === s.id) setSideA("current");
              if (sideB === s.id) setSideB("");
            }}
          />
        ))}

        {schemes.length > 0 && (
          <button
            onClick={() => setCompareOpen((o) => !o)}
            aria-pressed={compareOpen}
            className={`ml-auto rounded-full border px-3 py-1 text-xs transition ${
              compareOpen
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                : "border-neutral-300 hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-white"
            }`}
          >
            A/B 对比
          </button>
        )}
      </div>

      {schemes.length === 0 && (
        <p className="mt-1.5 text-[10px] text-neutral-400">
          先把当前状态存成方案，再调整方向（或换模板），即可 A/B 并排对比两套设计。
        </p>
      )}

      {/* Compare area */}
      {compareOpen && schemes.length > 0 && (
        <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium">A</span>
            <select value={sideA} onChange={(e) => setSideA(e.target.value)} className={selectCls}>
              {sideOptions}
            </select>
            <span className="ml-2 font-medium">B</span>
            <select value={sideB} onChange={(e) => setSideB(e.target.value)} className={selectCls}>
              <option value="">选择方案…</option>
              {sideOptions}
            </select>
            <div className="ml-auto flex flex-wrap gap-1">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setKind(k.id)}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] transition ${
                    kind === k.id
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CompareSide side={a} tag="A" kind={kind} onApply={(id) => loadScheme(id)} />
            <CompareSide side={b} tag="B" kind={kind} onApply={(id) => loadScheme(id)} />
          </div>
        </div>
      )}
    </section>
  );
}

function SchemeChip({
  scheme,
  onLoad,
  onDelete,
}: {
  scheme: Scheme;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const swatches = [...scheme.colors]
    .sort((x, y) => SWATCH_ORDER.indexOf(x.role) - SWATCH_ORDER.indexOf(y.role))
    .slice(0, 4);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 py-0.5 pl-1.5 pr-1 text-xs dark:border-neutral-700">
      <span className="flex h-3.5 w-9 overflow-hidden rounded-sm">
        {swatches.map((c) => (
          <span key={c.id} className="flex-1" style={{ background: c.hex }} />
        ))}
      </span>
      <span className="max-w-24 truncate">{scheme.name}</span>
      <button
        onClick={onLoad}
        title="载入此方案"
        className="rounded px-1 text-[10px] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
      >
        载入
      </button>
      <button
        onClick={onDelete}
        title="删除此方案"
        aria-label={`删除方案 ${scheme.name}`}
        className="rounded px-1 text-[10px] text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-800"
      >
        ×
      </button>
    </span>
  );
}

function CompareSide({
  side,
  tag,
  kind,
  onApply,
}: {
  side: SideData | null;
  tag: "A" | "B";
  kind: MockupKind;
  onApply: (schemeId: string) => void;
}) {
  if (!side) {
    return (
      <div className="grid aspect-[800/560] place-items-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400 dark:border-neutral-700">
        选择{tag}侧方案
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="grid h-4 w-4 place-items-center rounded bg-neutral-900 text-[10px] font-semibold text-white dark:bg-white dark:text-black">
          {tag}
        </span>
        <span className="text-xs font-medium">{side.label}</span>
        <span className="flex h-3 w-12 overflow-hidden rounded-sm">
          {side.swatches.map((hex, i) => (
            <span key={i} className="flex-1" style={{ background: hex }} />
          ))}
        </span>
        {side.schemeId && (
          <button
            onClick={() => onApply(side.schemeId!)}
            className="ml-auto rounded bg-neutral-900 px-2 py-0.5 text-[10px] text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            应用此方案
          </button>
        )}
      </div>
      <div className="aspect-[800/520] overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <MockupView kind={kind} palette={side.palette} />
      </div>
      <p className="font-mono text-[10px] text-neutral-400">{side.meta}</p>
    </div>
  );
}
