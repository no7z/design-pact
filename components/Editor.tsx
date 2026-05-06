"use client";
import { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import {
  useTokens,
  computedHex,
  type ColorToken,
  type Globals,
} from "@/lib/store";
import { buildScale } from "@/lib/typography";


function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  fmt,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex items-center justify-between font-medium">
        <span>{label}</span>
        <span className="font-mono text-neutral-500">{fmt(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="accent-neutral-900 dark:accent-white"
      />
    </label>
  );
}

function ColorItem({
  token,
  globals,
  isOpen,
  onToggle,
  onUpdate,
}: {
  token: ColorToken;
  globals: Globals;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (hex: string) => void;
}) {
  const display = computedHex(token, globals);
  const [pickerColor, setPickerColor] = useState(display);

  useEffect(() => {
    if (isOpen) setPickerColor(display);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handlePickerChange = (hex: string) => {
    setPickerColor(hex);
    onUpdate(hex);
  };

  return (
    <li className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-center gap-3">
        <button
          aria-label="编辑颜色"
          className="h-10 w-10 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-700"
          style={{ background: display }}
          onClick={onToggle}
        />
        <div className="flex-1">
          <div className="font-mono text-sm">{display}</div>
          <div className="text-xs text-neutral-500">
            {(token.proportion * 100).toFixed(1)}% · base {token.baseHex}
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row">
          <HexColorPicker color={pickerColor} onChange={handlePickerChange} />
          <div className="text-xs text-neutral-500">
            <p>编辑此颜色会重置其基线 — 全局调节将以新值为起点。</p>
          </div>
        </div>
      )}
    </li>
  );
}

export function Editor() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const setGlobal = useTokens((s) => s.setGlobal);
  const bakeGlobals = useTokens((s) => s.bakeGlobals);
  const resetGlobals = useTokens((s) => s.resetGlobals);
  const updateColor = useTokens((s) => s.updateColor);
  const typography = useTokens((s) => s.typography);
  const setTypography = useTokens((s) => s.setTypography);

  const [openId, setOpenId] = useState<string | null>(null);

  if (colors.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* global OKLCH controls */}
      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">全局协调调节 (OKLCH)</h3>
          <div className="flex gap-2">
            <button
              onClick={resetGlobals}
              className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              重置
            </button>
            <button
              onClick={bakeGlobals}
              className="rounded bg-neutral-900 px-2 py-1 text-xs text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              固化为新基线
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Slider label="亮度 ΔL" min={-0.3} max={0.3} step={0.005} value={globals.dL} onChange={(v) => setGlobal({ dL: v })} fmt={(v) => v.toFixed(3)} />
          <Slider label="饱和度 ΔC" min={-0.2} max={0.2} step={0.005} value={globals.dC} onChange={(v) => setGlobal({ dC: v })} fmt={(v) => v.toFixed(3)} />
          <Slider label="色相 ΔH" min={-180} max={180} step={1} value={globals.dH} onChange={(v) => setGlobal({ dH: v })} fmt={(v) => `${v.toFixed(0)}°`} />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          调整时所有颜色按相同 OKLCH 偏移移动,保留原有色彩关系。
        </p>
      </section>

      {/* per-color editor */}
      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="mb-3 text-sm font-semibold">颜色 ({colors.length})</h3>
        <ul className="space-y-2">
          {colors.map((c) => (
            <ColorItem
              key={c.id}
              token={c}
              globals={globals}
              isOpen={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
              onUpdate={(hex) => updateColor(c.id, { hex })}
            />
          ))}
        </ul>
      </section>

      {/* typography — temporarily hidden
      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h3 className="mb-3 text-sm font-semibold">字体规模 (modular scale)</h3>
        ...
      </section>
      */}
    </div>
  );
}
