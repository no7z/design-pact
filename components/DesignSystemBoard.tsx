"use client";
import { useTokens, computedHex } from "@/lib/store";
import { brandDisplayName } from "@/lib/templates";
import { buildScale } from "@/lib/typography";
import {
  buildSpacing,
  buildRadius,
  buildBorderScale,
  buildOpacityScale,
  buildDurations,
  EASING_PRESETS,
} from "@/lib/scales";
import { oklchString } from "@/lib/color";
import { headingWeight } from "@/lib/scales";

// Hand-authored SVG so the export is clean, editable vector (Figma/Illustrator
// import it natively) and can be rasterized to PNG with zero dependencies.

const W = 1200;
const PAD = 48;
const COL = "#171717"; // ink
const SUB = "#737373"; // muted label
const HAIR = "#e5e5e5"; // hairline
const LABEL_FONT = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export const BOARD_SVG_ID = "ds-board-svg";

export function DesignSystemBoard() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const typography = useTokens((s) => s.typography);
  const spacing = useTokens((s) => s.spacing);
  const radius = useTokens((s) => s.radius);
  const shadow = useTokens((s) => s.shadow);
  const motion = useTokens((s) => s.motion);
  const border = useTokens((s) => s.border);
  const opacity = useTokens((s) => s.opacity);
  const activeBrand = useTokens((s) => s.activeBrand);

  if (colors.length === 0) return null;

  const resolved = colors.map((c) => ({ ...c, hex: computedHex(c, globals) }));
  const primary =
    resolved.find((c) => c.role === "primary")?.hex ?? resolved[0].hex;

  const brandName =
    activeBrand && !activeBrand.startsWith("__ai")
      ? brandDisplayName(activeBrand)
      : "Design System";
  const date = new Date().toISOString().slice(0, 10);

  const els: React.ReactNode[] = [];
  let y = PAD;
  let k = 0; // react key counter
  const key = () => `e${k++}`;

  const sectionLabel = (label: string) => {
    els.push(
      <text
        key={key()}
        x={PAD}
        y={y}
        fontFamily={LABEL_FONT}
        fontSize={12}
        fontWeight={600}
        letterSpacing="0.08em"
        fill={SUB}
      >
        {label.toUpperCase()}
      </text>,
    );
    y += 24;
  };
  const divider = () => {
    y += 8;
    els.push(<line key={key()} x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={HAIR} />);
    y += 28;
  };

  // ── Header ───────────────────────────────────────────────────────────────
  els.push(
    <text key={key()} x={PAD} y={y + 26} fontFamily={LABEL_FONT} fontSize={34} fontWeight={700} fill={COL}>
      {brandName}
    </text>,
    <text key={key()} x={PAD} y={y + 50} fontFamily={LABEL_FONT} fontSize={13} fill={SUB}>
      设计系统总览 · {date}
    </text>,
  );
  y += 78;
  divider();

  // ── Colors ───────────────────────────────────────────────────────────────
  sectionLabel("Colors 色板");
  {
    const sw = 150;
    const sh = 88;
    const gap = 16;
    const perRow = Math.floor((W - 2 * PAD + gap) / (sw + gap));
    const startY = y;
    resolved.forEach((c, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = PAD + col * (sw + gap);
      const cy = startY + row * (sh + 56);
      els.push(
        <g key={key()}>
          <rect x={x} y={cy} width={sw} height={sh} rx={10} fill={c.hex} stroke={HAIR} />
          <text x={x} y={cy + sh + 16} fontFamily={LABEL_FONT} fontSize={12} fontWeight={600} fill={COL}>
            {c.role === "unassigned" ? c.id : c.role}
          </text>
          <text x={x} y={cy + sh + 31} fontFamily={MONO} fontSize={11} fill={SUB}>
            {c.hex.toUpperCase()}
          </text>
          <text x={x} y={cy + sh + 45} fontFamily={MONO} fontSize={9.5} fill={SUB}>
            {fmtOklch(c.hex)}
          </text>
        </g>,
      );
    });
    const rows = Math.ceil(resolved.length / perRow);
    y = startY + rows * (sh + 56) - 8;
  }
  divider();

  // ── Typography ─────────────────────────────────────────────────────────────
  sectionLabel("Typography 字阶");
  {
    els.push(
      <text key={key()} x={PAD} y={y} fontFamily={LABEL_FONT} fontSize={11} fill={SUB}>
        {`Base ${typography.base}px · Ratio ${typography.ratio} · ${typography.fontFamily.split(",")[0].trim()}`}
      </text>,
    );
    y += 22;
    buildScale(typography).forEach((s) => {
      const isHeading = s.name.startsWith("h");
      const lh = Math.max(s.px * 1.15, 18);
      els.push(
        <g key={key()}>
          <text x={PAD} y={y + s.px} fontFamily={isHeading ? typography.headingFamily : typography.fontFamily}
            fontSize={s.px}
            fontWeight={isHeading ? headingWeight(typography.fontWeight) : typography.fontWeight}
            fill={COL}>
            Ag 设计 Design 123
          </text>
          <text x={W - PAD} y={y + s.px} textAnchor="end" fontFamily={MONO} fontSize={11} fill={SUB}>
            {`${s.name}  ${s.rem}rem · ${s.px}px`}
          </text>
        </g>,
      );
      y += lh + 10;
    });
  }
  divider();

  // ── Spacing ────────────────────────────────────────────────────────────────
  sectionLabel("Spacing 间距");
  {
    const maxPx = Math.max(...buildSpacing(spacing.base).map((s) => s.px));
    const maxBar = W - 2 * PAD - 160;
    buildSpacing(spacing.base).forEach((s) => {
      const bar = Math.max(2, (s.px / maxPx) * maxBar);
      els.push(
        <g key={key()}>
          <text x={PAD} y={y + 11} fontFamily={MONO} fontSize={11} fill={SUB}>{s.name}</text>
          <text x={PAD + 64} y={y + 11} fontFamily={MONO} fontSize={11} fill={SUB}>{s.px}px</text>
          <rect x={PAD + 120} y={y} width={bar} height={14} rx={3} fill={primary} />
        </g>,
      );
      y += 24;
    });
  }
  divider();

  // ── Radius ─────────────────────────────────────────────────────────────────
  sectionLabel("Radius 圆角");
  {
    const box = 72;
    const gap = 24;
    const startY = y;
    buildRadius(radius.base).forEach((r, i) => {
      const x = PAD + i * (box + gap + 24);
      const rr = Math.min(r.px, box / 2);
      els.push(
        <g key={key()}>
          <rect x={x} y={startY} width={box} height={box} rx={rr} fill={primary + "22"} stroke={primary} />
          <text x={x} y={startY + box + 16} fontFamily={MONO} fontSize={11} fill={COL}>{r.name}</text>
          <text x={x} y={startY + box + 30} fontFamily={MONO} fontSize={10} fill={SUB}>
            {r.name === "full" ? "9999" : r.px + "px"}
          </text>
        </g>,
      );
    });
    y = startY + box + 42;
  }
  divider();

  // ── Border ─────────────────────────────────────────────────────────────────
  sectionLabel("Border 描边");
  {
    const box = 72;
    const gap = 60;
    const startY = y;
    buildBorderScale(border.base).forEach((b, i) => {
      const x = PAD + i * (box + gap);
      els.push(
        <g key={key()}>
          <rect x={x} y={startY} width={box} height={box} rx={8} fill="#fff"
            stroke={b.name === "strong" ? primary : "#cbd5e1"} strokeWidth={b.px} />
          <text x={x} y={startY + box + 16} fontFamily={MONO} fontSize={11} fill={COL}>{b.name}</text>
          <text x={x} y={startY + box + 30} fontFamily={MONO} fontSize={10} fill={SUB}>{b.px}px</text>
        </g>,
      );
    });
    y = startY + box + 42;
  }
  divider();

  // ── Shadow ─────────────────────────────────────────────────────────────────
  sectionLabel("Elevation 阴影");
  {
    const cw = 150;
    const ch = 76;
    const gap = 56;
    const startY = y;
    (["sm", "md", "lg"] as const).forEach((lvl, i) => {
      const s = shadow[lvl];
      const x = PAD + i * (cw + gap);
      els.push(
        <g key={key()}>
          <defs>
            <filter id={`board-sh-${lvl}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx={0} dy={s.offsetY} stdDeviation={s.blur / 2} floodColor="#000" floodOpacity={s.opacity} />
            </filter>
          </defs>
          <rect x={x} y={startY} width={cw} height={ch} rx={12} fill="#fff" filter={`url(#board-sh-${lvl})`} />
          <text x={x} y={startY + ch + 18} fontFamily={MONO} fontSize={11} fill={COL}>{lvl}</text>
          <text x={x} y={startY + ch + 32} fontFamily={MONO} fontSize={9.5} fill={SUB}>
            {`blur ${s.blur} · y ${s.offsetY} · ${Math.round(s.opacity * 100)}%`}
          </text>
        </g>,
      );
    });
    y = startY + ch + 44;
  }
  divider();

  // ── Opacity ────────────────────────────────────────────────────────────────
  sectionLabel("Opacity 透明度");
  {
    const sw = 120;
    const sh = 54;
    const gap = 24;
    const startY = y;
    buildOpacityScale(opacity.base).forEach((o, i) => {
      const x = PAD + i * (sw + gap);
      els.push(
        <g key={key()}>
          <rect x={x} y={startY} width={sw} height={sh} rx={8} fill="#f5f5f5" stroke={HAIR} />
          <rect x={x} y={startY} width={sw} height={sh} rx={8} fill={primary} fillOpacity={o.value} />
          <text x={x} y={startY + sh + 16} fontFamily={MONO} fontSize={11} fill={COL}>{o.name}</text>
          <text x={x} y={startY + sh + 30} fontFamily={MONO} fontSize={10} fill={SUB}>
            {Math.round(o.value * 100)}%
          </text>
        </g>,
      );
    });
    y = startY + sh + 42;
  }
  divider();

  // ── Motion ─────────────────────────────────────────────────────────────────
  sectionLabel("Motion 动效");
  {
    const startY = y;
    buildDurations(motion.base).forEach((d, i) => {
      els.push(
        <g key={key()}>
          <text x={PAD} y={startY + i * 22 + 11} fontFamily={MONO} fontSize={11} fill={SUB}>{d.name}</text>
          <text x={PAD + 90} y={startY + i * 22 + 11} fontFamily={MONO} fontSize={11} fill={COL}>{d.ms}ms</text>
        </g>,
      );
    });
    // Easing curve preview
    const cx = W - PAD - 180;
    const sz = 110;
    const cyTop = startY;
    const bez = parseCubicBezier(EASING_PRESETS[motion.easing]);
    els.push(
      <g key={key()}>
        <rect x={cx} y={cyTop} width={sz} height={sz} rx={8} fill="#fafafa" stroke={HAIR} />
        {bez && (
          <path
            d={`M ${cx} ${cyTop + sz} C ${cx + bez[0] * sz} ${cyTop + sz - bez[1] * sz} ${cx + bez[2] * sz} ${cyTop + sz - bez[3] * sz} ${cx + sz} ${cyTop}`}
            fill="none"
            stroke={primary}
            strokeWidth={2}
          />
        )}
        <text x={cx} y={cyTop + sz + 16} fontFamily={MONO} fontSize={11} fill={SUB}>
          {motion.easing}
        </text>
      </g>,
    );
    y = startY + Math.max(buildDurations(motion.base).length * 22, sz + 30);
  }

  y += PAD;
  const totalH = y;

  return (
    <svg
      id={BOARD_SVG_ID}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${totalH}`}
      width="100%"
      style={{ height: "auto", display: "block" }}
      role="img"
      aria-label="设计系统总览"
    >
      <rect x={0} y={0} width={W} height={totalH} fill="#ffffff" />
      {els}
    </svg>
  );
}

// Round oklch() to readable precision so the label fits under a swatch.
function fmtOklch(hex: string): string {
  const m = oklchString(hex).match(/oklch\(([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (!m) return oklchString(hex);
  return `oklch(${(+m[1]).toFixed(2)} ${(+m[2]).toFixed(3)} ${(+m[3]).toFixed(0)})`;
}

// "cubic-bezier(x1,y1,x2,y2)" → [x1,y1,x2,y2]; null for keywords like "linear".
function parseCubicBezier(s: string): [number, number, number, number] | null {
  const m = s.match(/cubic-bezier\(([^)]+)\)/);
  if (!m) return null;
  const n = m[1].split(",").map((v) => parseFloat(v.trim()));
  return n.length === 4 ? [n[0], n[1], n[2], n[3]] : null;
}
