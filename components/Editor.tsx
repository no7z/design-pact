"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import { HexColorPicker } from "react-colorful";
import {
  useTokens,
  computedHex,
  type ColorToken,
  type Globals,
  type SemanticRole,
} from "@/lib/store";
import { hexToOklch, oklchToHex } from "@/lib/color";
import { resolveOppositeHex, isDarkPalette } from "@/lib/darkMode";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES: SemanticRole[] = [
  "background", "primary", "foreground", "accent", "muted", "border", "unassigned",
];

const ROLE_BADGE: Record<SemanticRole, string> = {
  background: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  primary:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  foreground: "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900",
  accent:     "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  muted:      "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400",
  border:     "bg-neutral-100 text-neutral-500 ring-1 ring-neutral-300 dark:bg-neutral-900 dark:ring-neutral-700",
  unassigned: "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500",
};

const WHEEL_SIZE = 300;
const WHEEL_R = WHEEL_SIZE / 2;
const MAX_C = 0.08; // moderate chroma boost — UI rarely benefits from vivid +0.18
const MAX_H = 180; // full 1:1 hue rotation — screen angle = ΔH directly
const MAX_DIST = WHEEL_R - 24; // max drag radius in px

// ─── Color Wheel ──────────────────────────────────────────────────────────────

function ColorWheel({
  globals,
  colors,
  onChange,
  onReset,
}: {
  globals: Globals;
  colors: ColorToken[];
  onChange: (patch: Partial<Globals>) => void;
  onReset: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const prevPos = useRef<{ x: number; y: number } | null>(null);
  // Ref tracks live dH to avoid stale closures inside mousemove
  const liveDH = useRef(globals.dH);
  useEffect(() => { liveDH.current = globals.dH; }, [globals.dH]);

  // globals → dot position (invert quadratic: dist = sqrt(dC/MAX_C) * MAX_DIST)
  // Clamp to [0, 1] so a persisted dC larger than the current MAX_C (e.g. after
  // we tightened the chroma ceiling) doesn't push the handle off the wheel.
  const t = Math.min(1, Math.sqrt(Math.max(0, globals.dC) / MAX_C));
  const dist = t * MAX_DIST;
  const screenAngle = globals.dH * (180 / MAX_H);
  const angleRad = (screenAngle * Math.PI) / 180;
  const dotX = WHEEL_R + Math.cos(angleRad) * dist;
  const dotY = WHEEL_R + Math.sin(angleRad) * dist;

  // Reference hue: the primary color's base hue (falls back to first chromatic
  // color). Stays stable through ΔL/ΔC/ΔH adjustments — uses baseHex, not the
  // computed hex — so the wheel's anchor doesn't drift when the handle moves.
  const refHue = useMemo(() => {
    const primary = colors.find((c) => c.role === "primary");
    const seed =
      primary?.baseHex ?? colors.find((c) => hexToOklch(c.baseHex).c > 0.02)?.baseHex;
    if (!seed) return null;
    return hexToOklch(seed).h ?? 0;
  }, [colors]);

  // Wheel background = the actual reachable color space of THIS control.
  // ΔH maps ±MAX_H over a full screen rotation, with wrap at the 180° boundary.
  // We sample 24 points and emit a conic-gradient so each screen angle shows
  // the hue that would result from clicking there (anchored at primary's hue
  // at the 3 o'clock position, where ΔH=0).
  const wheelBackground = useMemo(() => {
    const radial = [
      "radial-gradient(circle at 50% 50%,",
      "  rgba(140,140,140,0.92) 0%,",
      "  rgba(120,120,120,0.0) 46%)",
    ].join("");
    if (refHue === null) return radial;

    const wheelL = 0.65;
    const wheelC = 0.16;
    const steps = 24;
    const stops: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const screenDeg = (i / steps) * 360;
      // Map screen angle to ΔH the same way the drag handler does
      const signed = screenDeg > 180 ? screenDeg - 360 : screenDeg;
      const dH = signed * (MAX_H / 180);
      const hue = (((refHue + dH) % 360) + 360) % 360;
      const hex = oklchToHex({ mode: "oklch", l: wheelL, c: wheelC, h: hue });
      stops.push(`${hex} ${screenDeg.toFixed(1)}deg`);
    }
    // `from 90deg` puts the gradient's 0° stop at 3 o'clock to match the
    // handle's convention (screen angle 0 = ΔH 0).
    return `${radial}, conic-gradient(from 90deg, ${stops.join(", ")})`;
  }, [refHue]);

  // Plot palette colors at their SHIFTED hue offset from the static refHue.
  // Each dot's hue = baseHex hue + globals.dH; subtract the static refHue to
  // get the screen offset. When the user drags the handle (changing globals.dH),
  // all dots rotate together with the handle. Colors that get shifted outside
  // ±MAX_H of the reference disappear (off the wheel). Primary's dot tracks
  // the handle exactly, so we skip rendering it to avoid double-marking.
  const colorDots = useMemo(() => {
    if (refHue === null) return [];
    const ringR = MAX_DIST - 4;
    const primaryId = colors.find((c) => c.role === "primary")?.id;
    const dots: { id: string; hex: string; x: number; y: number }[] = [];
    for (const c of colors) {
      if (c.id === primaryId) continue;
      if (c.role === "unassigned") continue;
      const oklch = hexToOklch(c.baseHex);
      if (oklch.c < 0.02) continue;
      const hcShifted = (((oklch.h ?? 0) + globals.dH) % 360 + 360) % 360;
      const delta = (((hcShifted - refHue) % 360) + 540) % 360 - 180;
      if (Math.abs(delta) > MAX_H) continue;
      const screenAngle = delta * (180 / MAX_H);
      const rad = (screenAngle * Math.PI) / 180;
      dots.push({
        id: c.id,
        hex: computedHex(c, globals),
        x: WHEEL_R + Math.cos(rad) * ringR,
        y: WHEEL_R + Math.sin(rad) * ringR,
      });
    }
    return dots;
  }, [colors, globals, refHue]);

  const svgCoords = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const dx = clientX - rect.left - WHEEL_R;
    const dy = clientY - rect.top - WHEEL_R;
    return { dx, dy, d: Math.sqrt(dx * dx + dy * dy) };
  };

  const dCfromDist = (d: number) => {
    const tVal = Math.min(d, MAX_DIST) / MAX_DIST;
    return parseFloat((tVal * tVal * MAX_C).toFixed(4));
  };

  const onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    dragging.current = true;

    const pos = svgCoords(e.clientX, e.clientY);
    if (pos) {
      const patch: Partial<Globals> = { dC: dCfromDist(pos.d) };
      // Initial click: set ΔH absolutely (no dead zone)
      if (pos.d > 1) {
        const screenDeg = Math.atan2(pos.dy, pos.dx) * 180 / Math.PI;
        patch.dH = parseFloat((screenDeg * (MAX_H / 180)).toFixed(1));
      }
      prevPos.current = { x: e.clientX, y: e.clientY };
      onChange(patch);
    }

    const move = (ev: MouseEvent) => {
      if (!dragging.current || !prevPos.current) return;
      const curr = svgCoords(ev.clientX, ev.clientY);
      const prev = svgCoords(prevPos.current.x, prevPos.current.y);
      if (!curr || !prev) return;

      const patch: Partial<Globals> = { dC: dCfromDist(curr.d) };

      // Delta-based ΔH: continuous across center, no jumps
      const prevAngle = Math.atan2(prev.dy, prev.dx) * 180 / Math.PI;
      const currAngle = Math.atan2(curr.dy, curr.dx) * 180 / Math.PI;
      let angleDelta = currAngle - prevAngle;
      if (angleDelta > 180) angleDelta -= 360;
      if (angleDelta < -180) angleDelta += 360;

      const newDH = parseFloat((liveDH.current + angleDelta * (MAX_H / 180)).toFixed(1));
      // Wrap ΔH within [-MAX_H, MAX_H] so dragging past boundary doesn't clamp
      patch.dH = parseFloat((((newDH + MAX_H) % (2 * MAX_H) + 2 * MAX_H) % (2 * MAX_H) - MAX_H).toFixed(1));
      liveDH.current = patch.dH;

      prevPos.current = { x: ev.clientX, y: ev.clientY };
      onChange(patch);
    };

    const up = () => {
      dragging.current = false;
      prevPos.current = null;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  return (
    <section className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold">全局协调调节 (OKLCH)</h3>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            重置
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Wheel */}
        <div className="relative shrink-0" style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}>
          {/* Gradient background — built from the actual palette hues */}
          <div
            className="absolute inset-0 rounded-full border border-neutral-300 dark:border-neutral-600"
            style={{ background: wheelBackground }}
          />
          {/* SVG overlay for interaction + dot */}
          <svg
            ref={svgRef}
            width={WHEEL_SIZE}
            height={WHEEL_SIZE}
            className="absolute inset-0 cursor-crosshair select-none"
            onMouseDown={onMouseDown}
          >
            {/* Boundary ring */}
            <circle
              cx={WHEEL_R} cy={WHEEL_R} r={MAX_DIST}
              fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1}
            />
            {/* Color token dots at their OKLCH hue positions */}
            {colorDots.map((dot) => (
              <circle
                key={dot.id}
                cx={dot.x} cy={dot.y} r={4.5}
                fill={dot.hex}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={1.5}
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
              />
            ))}
            {/* Center mark */}
            <circle cx={WHEEL_R} cy={WHEEL_R} r={2.5} fill="rgba(255,255,255,0.65)" />
            {/* Line from center to dot */}
            {dist > 5 && (
              <line
                x1={WHEEL_R} y1={WHEEL_R} x2={dotX} y2={dotY}
                stroke="rgba(255,255,255,0.55)" strokeWidth={1} strokeDasharray="3 2"
              />
            )}
            {/* Handle */}
            <circle
              cx={dotX} cy={dotY} r={7}
              fill="white"
              stroke="rgba(0,0,0,0.22)"
              strokeWidth={1.5}
              style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.35))" }}
            />
          </svg>
        </div>

        {/* ΔL slider + readouts */}
        <div className="flex flex-1 flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="flex items-center justify-between font-medium">
              <span>亮度 ΔL</span>
              <span className="font-mono text-neutral-500">{globals.dL.toFixed(3)}</span>
            </span>
            <input
              type="range" min={-0.3} max={0.3} step={0.005}
              value={globals.dL}
              onChange={(e) => onChange({ dL: parseFloat(e.target.value) })}
              className="accent-neutral-900 dark:accent-white"
            />
          </label>

          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono text-[10px]">
            <dt className="text-neutral-400">ΔH</dt>
            <dd className="text-neutral-600 dark:text-neutral-300">{globals.dH.toFixed(1)}°</dd>
            <dt className="text-neutral-400">ΔC</dt>
            <dd className="text-neutral-600 dark:text-neutral-300">{globals.dC.toFixed(3)}</dd>
          </dl>

          <p className="text-[10px] leading-snug text-neutral-400">
            向外拖动增加饱和度偏移（平方渐进），方向旋转色相（完整 360°）。圆环上的小点为各颜色当前色相位置。
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Color Card (horizontal grid) ────────────────────────────────────────────

const ROLE_ORDER: Record<SemanticRole, number> = {
  background: 0,
  primary: 1,
  foreground: 2,
  accent: 3,
  muted: 4,
  border: 5,
  unassigned: 6,
};

const HERO_ROLES = new Set<SemanticRole>(["background", "primary"]);

function ColorCard({
  token, globals, isSelected, onToggle, hero, oppositeHex,
}: {
  token: ColorToken; globals: Globals; isSelected: boolean; onToggle: () => void; hero: boolean;
  oppositeHex: string | null;
}) {
  const display = computedHex(token, globals);
  return (
    <button
      onClick={onToggle}
      className={`overflow-hidden rounded-lg border text-left transition ${
        hero ? "col-span-2" : "col-span-1"
      } ${
        isSelected
          ? "border-neutral-900 ring-2 ring-neutral-900 dark:border-white dark:ring-white"
          : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
      }`}
    >
      <div className={`relative w-full ${hero ? "h-24" : "h-16"}`} style={{ background: display }}>
        {oppositeHex && (
          // The other face — a small corner-cut triangle so the pairing reads
          // at a glance without splitting the swatch.
          <span
            className={`absolute bottom-0 right-0 ${hero ? "h-9 w-9" : "h-7 w-7"}`}
            style={{ background: oppositeHex, clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
            title={`另一面 ${oppositeHex}`}
          />
        )}
      </div>
      <div className="px-2 py-1.5">
        <div className="font-mono text-[10px] text-neutral-700 dark:text-neutral-300">{display}</div>
        <div className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-medium ${ROLE_BADGE[token.role]}`}>
          {token.name ?? token.role}
        </div>
      </div>
    </button>
  );
}

// ─── Color Detail (expanded below grid) ──────────────────────────────────────

function ColorDetail({
  token, globals, onUpdate, onRoleChange, onClose,
  paired, oppositeLabel, oppositeHex, oppositeOverridden, onOppositeChange, onOppositeReset,
}: {
  token: ColorToken; globals: Globals;
  onUpdate: (hex: string) => void;
  onRoleChange: (role: SemanticRole) => void;
  onClose: () => void;
  paired: boolean;
  oppositeLabel: string;
  oppositeHex: string;
  oppositeOverridden: boolean;
  onOppositeChange: (hex: string) => void;
  onOppositeReset: () => void;
}) {
  const display = computedHex(token, globals);
  const [pickerColor, setPickerColor] = useState(token.baseHex);
  const [showRoles, setShowRoles] = useState(false);

  // Only reset picker when switching to a different token, not when globals
  // shift display — adjust during render instead of via an effect.
  const [pickerForId, setPickerForId] = useState(token.id);
  if (pickerForId !== token.id) {
    setPickerForId(token.id);
    setPickerColor(token.baseHex);
    setShowRoles(false);
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-medium">{display}</span>
        <button
          onClick={onClose}
          className="rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
        >
          收起
        </button>
      </div>

      {/* Role is low-frequency / advanced — the role badge itself is the
          disclosure: click it to expand the role buttons. */}
      <div>
        <button
          onClick={() => setShowRoles((v) => !v)}
          title="点击调整用途"
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${ROLE_BADGE[token.role]}`}
        >
          {token.role}
          <span className="opacity-50">{showRoles ? "▴" : "▾"}</span>
        </button>
      </div>
      {showRoles && (
        <div className="flex flex-wrap gap-1">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => onRoleChange(r)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                token.role === r
                  ? ROLE_BADGE[r] + " ring-1 ring-current"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <HexColorPicker
          color={pickerColor}
          onChange={(hex) => { setPickerColor(hex); onUpdate(hex); }}
        />
        <p className="text-xs text-neutral-500">
          编辑此颜色会重置其基线 — 全局调节将以新值为起点。
        </p>
      </div>

      {paired && (
        <div className="flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{oppositeLabel}对应</span>
          <label
            className="relative h-6 w-9 cursor-pointer overflow-hidden rounded border border-neutral-200 dark:border-neutral-700"
            style={{ background: oppositeHex }}
            title={`点击微调${oppositeLabel}`}
          >
            <input
              type="color"
              value={oppositeHex}
              onChange={(e) => onOppositeChange(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-300">{oppositeHex}</span>
          <span className="text-[10px] text-neutral-400">{oppositeOverridden ? "已覆盖" : "自动"}</span>
          {oppositeOverridden && (
            <button
              onClick={onOppositeReset}
              className="text-[10px] text-neutral-400 underline-offset-2 hover:underline"
            >
              重置
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dark-pairing toggle (rendered next to the 调色 title) ────────────────────

export function DarkPairingToggle() {
  const enabled = useTokens((s) => s.dark.enabled);
  const setDarkEnabled = useTokens((s) => s.setDarkEnabled);
  const hasColors = useTokens((s) => s.colors.length > 0);
  if (!hasColors) return null;
  return (
    <button
      onClick={() => setDarkEnabled(!enabled)}
      aria-pressed={enabled}
      title="为每个颜色生成明暗配对，导出 @media (prefers-color-scheme)"
      className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
        enabled
          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
          : "border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-white dark:hover:text-white"
      }`}
    >
      {enabled ? "✓ 明暗配对" : "明暗配对"}
    </button>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────

export function Editor() {
  const colors   = useTokens((s) => s.colors);
  const globals  = useTokens((s) => s.globals);
  const dark     = useTokens((s) => s.dark);
  const rolesUncertain = useTokens((s) => s.rolesUncertain);
  const setGlobal       = useTokens((s) => s.setGlobal);
  const resetGlobals    = useTokens((s) => s.resetGlobals);
  const updateColor     = useTokens((s) => s.updateColor);
  const setRole         = useTokens((s) => s.setRole);
  const setDarkOverride = useTokens((s) => s.setDarkOverride);

  const [openId, setOpenId] = useState<string | null>(null);
  const openToken = colors.find((c) => c.id === openId) ?? null;

  // The opposite face is the light one when the base palette is itself dark.
  const oppositeLabel = isDarkPalette(colors, globals) ? "亮色" : "暗色";

  if (colors.length === 0) return null;

  return (
    <div className="space-y-4">
      <ColorWheel
        globals={globals}
        colors={colors}
        onChange={setGlobal}
        onReset={resetGlobals}
      />

      <section className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
        <h3 className="text-xs font-semibold">颜色 ({colors.length})</h3>
        {rolesUncertain && (
          <p className="mb-2.5 mt-1 text-[10px] leading-relaxed text-amber-600 dark:text-amber-500">
            颜色用途是从图片/网址按比例自动推测的，可能不准 — 点色块后点用途标签可校正。
          </p>
        )}
        <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${rolesUncertain ? "" : "mt-2.5"}`}>
          {[...colors]
            .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
            .map((c) => (
              <ColorCard
                key={c.id}
                token={c}
                globals={globals}
                isSelected={openId === c.id}
                onToggle={() => setOpenId(openId === c.id ? null : c.id)}
                hero={HERO_ROLES.has(c.role)}
                oppositeHex={dark.enabled ? resolveOppositeHex(c, globals, dark.overrides) : null}
              />
            ))}
        </div>
        {openToken && (
          <ColorDetail
            token={openToken}
            globals={globals}
            onUpdate={(hex) => updateColor(openToken.id, { hex })}
            onRoleChange={(role) => setRole(openToken.id, role)}
            onClose={() => setOpenId(null)}
            paired={dark.enabled}
            oppositeLabel={oppositeLabel}
            oppositeHex={resolveOppositeHex(openToken, globals, dark.overrides)}
            oppositeOverridden={openToken.id in dark.overrides}
            onOppositeChange={(hex) => setDarkOverride(openToken.id, hex)}
            onOppositeReset={() => setDarkOverride(openToken.id, null)}
          />
        )}
      </section>

    </div>
  );
}
