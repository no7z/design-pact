"use client";
import type { MockupPalette } from "@/lib/mockup";
import { hexA } from "@/lib/mockup";
export type MockupKind = "landing" | "card" | "form" | "dashboard" | "article" | "pricing";

const W = 800;
const H = 520;

// SVG <rect rx> can't do per-corner radii. This builds a path with rounded
// top corners only (square bottom) — for image/header overlays that sit on
// top of a rounded card.
function topRoundRect(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x},${y + r} a${r},${r} 0 0 1 ${r},${-r} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} h${-w} z`;
}

// ─── Shared defs (drop shadow, etc.) ────────────────────────────────────────

function Defs() {
  return (
    <defs>
      <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dy="2" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.08" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

// ─── Shared nav bar ──────────────────────────────────────────────────────────

function Nav({ p }: { p: MockupPalette }) {
  return (
    <g>
      <rect width={W} height={48} fill={p.surface} />
      <rect y={47} width={W} height={1} fill={p.border} />
      {/* Logo: small primary square + wordmark */}
      <rect x={20} y={16} width={16} height={16} fill={p.primary} rx={4} />
      <rect x={44} y={20} width={56} height={8} fill={hexA(p.fg, 0.85)} rx={2} />
      {/* Nav links */}
      <rect x={132} y={20} width={36} height={8} fill={hexA(p.fg, 0.5)} rx={2} />
      <rect x={184} y={20} width={44} height={8} fill={hexA(p.fg, 0.5)} rx={2} />
      <rect x={244} y={20} width={32} height={8} fill={hexA(p.fg, 0.5)} rx={2} />
      {/* Search input */}
      <rect x={320} y={12} width={220} height={24} fill={p.bg} stroke={p.border} rx={5} />
      <circle cx={332} cy={24} r={4} fill="none" stroke={hexA(p.fg, 0.4)} strokeWidth={1.5} />
      <rect x={340} y={20} width={60} height={8} fill={hexA(p.fg, 0.22)} rx={2} />
      {/* Right actions */}
      <circle cx={672} cy={24} r={5} fill="none" stroke={hexA(p.fg, 0.45)} strokeWidth={1.2} />
      <rect x={690} y={13} width={70} height={22} fill={p.primary} rx={5} />
      <rect x={702} y={20} width={46} height={8} fill={hexA(p.bg, 0.85)} rx={2} />
      <circle cx={778} cy={24} r={10} fill={hexA(p.accent, 0.6)} />
    </g>
  );
}

// ─── Landing ─────────────────────────────────────────────────────────────────

export function LandingMockup({ p }: { p: MockupPalette }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "100%" }}>
      <Defs />
      <rect width={W} height={H} fill={p.bg} />
      <Nav p={p} />

      {/* Hero */}
      <rect x={48} y={80} width={88} height={20} fill={hexA(p.accent, 0.18)} rx={10} />
      <circle cx={60} cy={90} r={3} fill={p.accent} />
      <rect x={72} y={87} width={54} height={6} fill={p.accent} rx={2} />

      <rect x={48} y={114} width={300} height={26} fill={p.fg} rx={3} />
      <rect x={48} y={148} width={236} height={26} fill={p.fg} rx={3} />

      <rect x={48} y={190} width={300} height={10} fill={hexA(p.fg, 0.45)} rx={2} />
      <rect x={48} y={208} width={260} height={10} fill={hexA(p.fg, 0.45)} rx={2} />
      <rect x={48} y={226} width={180} height={10} fill={hexA(p.fg, 0.45)} rx={2} />

      <rect x={48} y={258} width={140} height={38} fill={p.primary} rx={8} />
      <rect x={70} y={272} width={88} height={10} fill={hexA(p.bg, 0.85)} rx={2} />
      <rect x={200} y={258} width={120} height={38} fill="none" stroke={p.border} strokeWidth={1.5} rx={8} />
      <rect x={220} y={272} width={80} height={10} fill={hexA(p.fg, 0.55)} rx={2} />

      {/* Social proof line */}
      <rect x={48} y={316} width={108} height={8} fill={hexA(p.fg, 0.32)} rx={2} />
      <g>
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={170 + i * 14} cy={320} r={8} fill={hexA(p.accent, 0.35 + i * 0.1)} stroke={p.bg} strokeWidth={1.5} />
        ))}
      </g>
      <rect x={232} y={316} width={88} height={8} fill={hexA(p.fg, 0.35)} rx={2} />

      {/* Hero illustration — layered cards */}
      <g filter="url(#card-shadow)">
        <rect x={420} y={72} width={328} height={224} fill={p.surface} stroke={p.border} rx={14} />
      </g>
      <rect x={440} y={94} width={120} height={9} fill={hexA(p.fg, 0.55)} rx={2} />
      <rect x={440} y={110} width={80} height={7} fill={hexA(p.fg, 0.25)} rx={2} />
      {/* chart shape */}
      <rect x={440} y={132} width={288} height={88} fill={hexA(p.accent, 0.08)} rx={8} />
      <path
        d={`M 452 200 L 488 168 L 524 184 L 560 142 L 596 156 L 632 124 L 668 138 L 712 110`}
        fill="none"
        stroke={p.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[488, 524, 560, 596, 632, 668, 712].map((x, i) => (
        <circle key={i} cx={x} cy={[168, 184, 142, 156, 124, 138, 110][i]} r={2.5} fill={p.accent} />
      ))}
      {/* mini metric */}
      <rect x={440} y={232} width={88} height={48} fill={hexA(p.primary, 0.08)} rx={6} />
      <rect x={448} y={242} width={32} height={6} fill={hexA(p.fg, 0.4)} rx={2} />
      <rect x={448} y={256} width={56} height={14} fill={p.primary} rx={2} />
      <rect x={540} y={232} width={88} height={48} fill={hexA(p.accent, 0.08)} rx={6} />
      <rect x={548} y={242} width={32} height={6} fill={hexA(p.fg, 0.4)} rx={2} />
      <rect x={548} y={256} width={56} height={14} fill={p.accent} rx={2} />
      <rect x={640} y={232} width={88} height={48} fill={hexA(p.muted, 0.25)} rx={6} />
      <rect x={648} y={242} width={32} height={6} fill={hexA(p.fg, 0.4)} rx={2} />
      <rect x={648} y={256} width={48} height={14} fill={hexA(p.fg, 0.7)} rx={2} />

      {/* Features section */}
      <rect x={0} y={316} width={W} height={148} fill={hexA(p.muted, 0.12)} />
      <rect x={0} y={316} width={W} height={1} fill={p.border} />
      <rect x={320} y={332} width={160} height={14} fill={hexA(p.fg, 0.7)} rx={3} />
      <rect x={344} y={354} width={112} height={9} fill={hexA(p.fg, 0.3)} rx={2} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${44 + i * 244}, 380)`} filter="url(#card-shadow)">
          <rect width={216} height={68} fill={p.surface} stroke={p.border} rx={10} />
          <circle cx={28} cy={34} r={14} fill={hexA(p.accent, 0.16)} />
          <circle cx={28} cy={34} r={6} fill={p.accent} />
          <rect x={52} y={20} width={88} height={10} fill={p.fg} rx={2} />
          <rect x={52} y={38} width={148} height={7} fill={hexA(p.fg, 0.32)} rx={2} />
          <rect x={52} y={50} width={120} height={7} fill={hexA(p.fg, 0.32)} rx={2} />
        </g>
      ))}

      {/* Footer */}
      <rect x={0} y={464} width={W} height={56} fill={hexA(p.fg, 0.04)} />
      <rect x={20} y={482} width={16} height={16} fill={hexA(p.primary, 0.55)} rx={4} />
      <rect x={44} y={486} width={56} height={8} fill={hexA(p.fg, 0.4)} rx={2} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={140 + i * 76} y={486} width={56} height={8} fill={hexA(p.fg, 0.25)} rx={2} />
      ))}
      <circle cx={696} cy={490} r={9} fill={hexA(p.fg, 0.1)} />
      <circle cx={722} cy={490} r={9} fill={hexA(p.fg, 0.1)} />
      <circle cx={748} cy={490} r={9} fill={hexA(p.fg, 0.1)} />
      <circle cx={774} cy={490} r={9} fill={hexA(p.fg, 0.1)} />
    </svg>
  );
}

// ─── Card Grid ────────────────────────────────────────────────────────────────

export function CardMockup({ p }: { p: MockupPalette }) {
  const cardW = 232;
  const cardH = 192;
  const xs = [24, 280, 536];
  const ys = [108, 316];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "100%" }}>
      <Defs />
      <rect width={W} height={H} fill={p.bg} />
      <Nav p={p} />

      {/* Header + filter */}
      <rect x={24} y={64} width={120} height={14} fill={p.fg} rx={3} />
      <rect x={24} y={84} width={200} height={9} fill={hexA(p.fg, 0.4)} rx={2} />

      {/* filter tabs */}
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect
            x={400 + i * 76}
            y={68}
            width={68}
            height={22}
            fill={i === 0 ? hexA(p.primary, 0.12) : "none"}
            stroke={i === 0 ? p.primary : p.border}
            strokeWidth={1}
            rx={11}
          />
          <rect
            x={414 + i * 76}
            y={74}
            width={40}
            height={9}
            fill={i === 0 ? p.primary : hexA(p.fg, 0.32)}
            rx={2}
          />
        </g>
      ))}

      {/* card grid */}
      {ys.flatMap((y, ri) =>
        xs.map((x, ci) => {
          const imgH = 104;
          return (
            <g key={`${ri}-${ci}`} transform={`translate(${x}, ${y})`}>
              <g filter="url(#card-shadow)">
                <rect width={cardW} height={cardH} fill={p.surface} stroke={p.border} rx={12} />
              </g>
              {/* image */}
              <path d={topRoundRect(0, 0, cardW, imgH, 12)} fill={hexA(p.accent, 0.12)} />
              {/* abstract image content */}
              <circle cx={cardW / 2 - 24} cy={imgH / 2 + 8} r={20} fill={hexA(p.accent, 0.35)} />
              <circle cx={cardW / 2 + 16} cy={imgH / 2 - 8} r={28} fill={hexA(p.primary, 0.3)} />
              <rect x={16} y={16} width={42} height={16} fill={p.bg} rx={8} />
              <rect x={24} y={22} width={26} height={4} fill={p.primary} rx={2} />
              {/* text */}
              <rect x={16} y={imgH + 14} width={150} height={11} fill={p.fg} rx={2} />
              <rect x={16} y={imgH + 32} width={196} height={7} fill={hexA(p.fg, 0.32)} rx={2} />
              <rect x={16} y={imgH + 44} width={160} height={7} fill={hexA(p.fg, 0.32)} rx={2} />
              {/* meta + action */}
              <circle cx={24} cy={cardH - 18} r={8} fill={hexA(p.muted, 0.5)} />
              <rect x={38} y={cardH - 22} width={60} height={8} fill={hexA(p.fg, 0.4)} rx={2} />
              <rect x={cardW - 56} y={cardH - 28} width={44} height={20} fill={p.primary} rx={10} />
              <rect x={cardW - 46} y={cardH - 22} width={24} height={8} fill={hexA(p.bg, 0.85)} rx={2} />
            </g>
          );
        }),
      )}
    </svg>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function FormMockup({ p }: { p: MockupPalette }) {
  const splitX = 360; // brand panel width
  const formX = splitX + 60;
  const formW = W - formX - 60;
  const inputH = 36;
  const fieldsY = 168;

  const fields = [
    { label: 56, hint: 132 },
    { label: 76, hint: 96 },
    { label: 92, hint: 116 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "100%" }}>
      <Defs />
      <rect width={W} height={H} fill={p.bg} />

      {/* Left brand panel */}
      <rect x={0} y={0} width={splitX} height={H} fill={p.primary} />
      {/* decorative orbs */}
      <circle cx={88} cy={H - 80} r={140} fill={hexA(p.bg, 0.06)} />
      <circle cx={280} cy={460} r={64} fill={hexA(p.accent, 0.18)} />
      <circle cx={48} cy={84} r={38} fill={hexA(p.bg, 0.1)} />
      {/* logo + wordmark */}
      <rect x={48} y={48} width={28} height={28} fill={hexA(p.bg, 0.95)} rx={7} />
      <rect x={56} y={56} width={12} height={12} fill={p.primary} rx={3} />
      <rect x={84} y={56} width={72} height={12} fill={hexA(p.bg, 0.85)} rx={2} />
      {/* big marketing headline */}
      <rect x={48} y={172} width={260} height={20} fill={hexA(p.bg, 0.92)} rx={3} />
      <rect x={48} y={200} width={220} height={20} fill={hexA(p.bg, 0.92)} rx={3} />
      <rect x={48} y={228} width={180} height={20} fill={hexA(p.bg, 0.92)} rx={3} />
      {/* body copy */}
      <rect x={48} y={266} width={264} height={9} fill={hexA(p.bg, 0.55)} rx={2} />
      <rect x={48} y={282} width={232} height={9} fill={hexA(p.bg, 0.55)} rx={2} />
      <rect x={48} y={298} width={196} height={9} fill={hexA(p.bg, 0.55)} rx={2} />
      {/* testimonial tile */}
      <rect x={48} y={344} width={264} height={104} fill={hexA(p.bg, 0.12)} rx={10} />
      <circle cx={68} cy={364} r={9} fill={hexA(p.bg, 0.45)} />
      <rect x={86} y={358} width={60} height={8} fill={hexA(p.bg, 0.7)} rx={2} />
      <rect x={86} y={372} width={88} height={6} fill={hexA(p.bg, 0.4)} rx={2} />
      <rect x={64} y={394} width={232} height={7} fill={hexA(p.bg, 0.6)} rx={2} />
      <rect x={64} y={408} width={212} height={7} fill={hexA(p.bg, 0.6)} rx={2} />
      <rect x={64} y={422} width={176} height={7} fill={hexA(p.bg, 0.6)} rx={2} />

      {/* Right form area */}
      <rect x={formX - 12} y={56} width={48} height={10} fill={hexA(p.fg, 0.45)} rx={2} />
      <rect x={W - 100} y={52} width={44} height={18} fill={hexA(p.fg, 0.06)} rx={9} />
      <rect x={W - 92} y={58} width={28} height={6} fill={p.accent} rx={2} />

      {/* logo (small) */}
      <rect x={formX} y={96} width={28} height={28} fill={p.primary} rx={7} />
      <rect x={formX + 8} y={104} width={12} height={12} fill={hexA(p.bg, 0.9)} rx={3} />

      {/* headings */}
      <rect x={formX} y={140} width={156} height={16} fill={p.fg} rx={3} />
      <rect x={formX} y={166} width={220} height={9} fill={hexA(p.fg, 0.42)} rx={2} />

      {/* fields */}
      {fields.map((f, i) => {
        const y = fieldsY + 26 + i * (inputH + 24);
        const focused = i === 1;
        return (
          <g key={i}>
            <rect x={formX} y={y} width={f.label} height={9} fill={hexA(p.fg, 0.6)} rx={2} />
            <rect
              x={formX}
              y={y + 14}
              width={formW}
              height={inputH}
              fill={p.bg}
              stroke={focused ? p.primary : p.border}
              strokeWidth={focused ? 1.5 : 1}
              rx={6}
            />
            <rect
              x={formX + 12}
              y={y + 25}
              width={f.hint}
              height={9}
              fill={hexA(p.fg, focused ? 0.72 : 0.25)}
              rx={2}
            />
            {i === 2 && (
              <>
                <circle cx={formX + formW - 18} cy={y + 32} r={5} fill="none" stroke={hexA(p.fg, 0.4)} strokeWidth={1.2} />
                <rect x={formX + formW - 20} y={y + 35} width={4} height={6} fill={hexA(p.fg, 0.4)} rx={1} />
              </>
            )}
          </g>
        );
      })}

      {/* remember + forgot row */}
      <rect x={formX} y={fieldsY + 26 + 3 * (inputH + 24) + 8} width={14} height={14} fill={p.bg} stroke={p.border} rx={3} />
      <rect x={formX + 22} y={fieldsY + 26 + 3 * (inputH + 24) + 12} width={56} height={8} fill={hexA(p.fg, 0.5)} rx={2} />
      <rect x={formX + formW - 60} y={fieldsY + 26 + 3 * (inputH + 24) + 12} width={60} height={8} fill={p.accent} rx={2} />

      {/* submit */}
      <rect
        x={formX}
        y={fieldsY + 26 + 3 * (inputH + 24) + 32}
        width={formW}
        height={42}
        fill={p.primary}
        rx={8}
      />
      <rect
        x={formX + formW / 2 - 32}
        y={fieldsY + 26 + 3 * (inputH + 24) + 32 + 17}
        width={64}
        height={10}
        fill={hexA(p.bg, 0.9)}
        rx={2}
      />

      {/* divider */}
      <rect x={formX} y={H - 88} width={(formW - 30) / 2} height={1} fill={p.border} />
      <rect x={formX + formW / 2 - 8} y={H - 92} width={16} height={8} fill={hexA(p.fg, 0.4)} rx={2} />
      <rect x={formX + formW / 2 + 15} y={H - 88} width={(formW - 30) / 2} height={1} fill={p.border} />

      {/* social buttons */}
      <rect x={formX} y={H - 72} width={(formW - 12) / 2} height={36} fill={p.bg} stroke={p.border} rx={6} />
      <circle cx={formX + 24} cy={H - 54} r={6} fill={hexA(p.fg, 0.5)} />
      <rect x={formX + 40} y={H - 58} width={56} height={8} fill={hexA(p.fg, 0.55)} rx={2} />
      <rect x={formX + (formW + 12) / 2} y={H - 72} width={(formW - 12) / 2} height={36} fill={p.bg} stroke={p.border} rx={6} />
      <circle cx={formX + (formW + 12) / 2 + 24} cy={H - 54} r={6} fill={hexA(p.fg, 0.5)} />
      <rect x={formX + (formW + 12) / 2 + 40} y={H - 58} width={56} height={8} fill={hexA(p.fg, 0.55)} rx={2} />
    </svg>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function DashboardMockup({ p }: { p: MockupPalette }) {
  const sideW = 200;
  const menuCount = 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "100%" }}>
      <Defs />
      <rect width={W} height={H} fill={p.bg} />

      {/* sidebar */}
      <rect width={sideW} height={H} fill={p.primary} />
      <rect x={16} y={14} width={20} height={20} fill={hexA(p.bg, 0.92)} rx={5} />
      <rect x={44} y={20} width={84} height={10} fill={hexA(p.bg, 0.6)} rx={2} />
      <rect x={0} y={56} width={sideW} height={1} fill={hexA(p.bg, 0.15)} />

      {Array.from({ length: menuCount }).map((_, i) => {
        const active = i === 0;
        return (
          <g key={i}>
            {active && <rect x={8} y={68 + i * 38} width={sideW - 16} height={30} fill={hexA(p.bg, 0.18)} rx={6} />}
            <rect
              x={20}
              y={75 + i * 38}
              width={14}
              height={14}
              fill={hexA(p.bg, active ? 0.9 : 0.45)}
              rx={3}
            />
            <rect
              x={42}
              y={78 + i * 38}
              width={64 + (i % 3) * 14}
              height={8}
              fill={hexA(p.bg, active ? 0.9 : 0.4)}
              rx={2}
            />
          </g>
        );
      })}

      {/* avatar at bottom */}
      <rect x={12} y={H - 56} width={sideW - 24} height={44} fill={hexA(p.bg, 0.1)} rx={8} />
      <circle cx={28} cy={H - 34} r={12} fill={hexA(p.bg, 0.45)} />
      <rect x={48} y={H - 41} width={72} height={9} fill={hexA(p.bg, 0.6)} rx={2} />
      <rect x={48} y={H - 28} width={48} height={7} fill={hexA(p.bg, 0.32)} rx={2} />

      {/* main top bar */}
      <rect x={sideW} y={0} width={W - sideW} height={48} fill={p.surface} />
      <rect x={sideW} y={47} width={W - sideW} height={1} fill={p.border} />
      <rect x={sideW + 20} y={16} width={108} height={14} fill={hexA(p.fg, 0.65)} rx={2} />
      <rect x={sideW + 20} y={34} width={64} height={8} fill={hexA(p.fg, 0.32)} rx={2} />
      <circle cx={W - 96} cy={24} r={6} fill="none" stroke={hexA(p.fg, 0.4)} strokeWidth={1.2} />
      <rect x={W - 76} y={13} width={56} height={22} fill={p.primary} rx={5} />
      <rect x={W - 68} y={20} width={40} height={8} fill={hexA(p.bg, 0.85)} rx={2} />

      {/* stats row */}
      {[0, 1, 2, 3].map((i) => {
        const x = sideW + 16 + i * 146;
        const isPrimary = i === 0;
        return (
          <g key={i} filter="url(#card-shadow)">
            <rect x={x} y={56} width={130} height={84} fill={p.surface} stroke={p.border} rx={10} />
            <rect x={x + 14} y={68} width={48} height={8} fill={hexA(p.fg, 0.5)} rx={2} />
            <rect
              x={x + 14}
              y={82}
              width={68 + i * 4}
              height={22}
              fill={isPrimary ? p.primary : hexA(p.fg, 0.85)}
              rx={3}
            />
            {/* mini trend chart */}
            <path
              d={`M ${x + 14} ${130} L ${x + 30} ${122} L ${x + 46} ${126} L ${x + 62} ${118} L ${x + 78} ${122} L ${x + 94} ${112} L ${x + 116} ${116}`}
              fill="none"
              stroke={i % 2 === 0 ? p.accent : p.primary}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <rect
              x={x + 96}
              y={68}
              width={24}
              height={14}
              fill={hexA(i % 2 === 0 ? p.accent : p.primary, 0.18)}
              rx={3}
            />
            <rect
              x={x + 101}
              y={72}
              width={14}
              height={6}
              fill={i % 2 === 0 ? p.accent : p.primary}
              rx={2}
            />
          </g>
        );
      })}

      {/* chart area */}
      <g filter="url(#card-shadow)">
        <rect x={sideW + 16} y={152} width={W - sideW - 32} height={196} fill={p.surface} stroke={p.border} rx={10} />
      </g>
      <rect x={sideW + 30} y={166} width={84} height={11} fill={hexA(p.fg, 0.6)} rx={2} />
      <rect x={sideW + 30} y={181} width={140} height={7} fill={hexA(p.fg, 0.3)} rx={2} />
      {/* legend chips */}
      {[
        { label: 56, color: p.primary },
        { label: 48, color: p.accent },
      ].map((s, i) => (
        <g key={i}>
          <circle cx={W - 140 + i * 70} cy={172} r={3} fill={s.color} />
          <rect x={W - 132 + i * 70} y={168} width={s.label} height={8} fill={hexA(p.fg, 0.4)} rx={2} />
        </g>
      ))}
      {/* grid lines */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={sideW + 30} y={206 + i * 32} width={W - sideW - 60} height={1} fill={hexA(p.fg, 0.05)} />
      ))}
      {/* area chart fill */}
      <path
        d={`M ${sideW + 30} 320 L ${sideW + 30} 280 L ${sideW + 96} 256 L ${sideW + 162} 270 L ${sideW + 228} 240 L ${sideW + 294} 252 L ${sideW + 360} 224 L ${sideW + 426} 234 L ${sideW + 492} 212 L ${sideW + 540} 232 L ${sideW + 540} 320 Z`}
        fill={hexA(p.primary, 0.15)}
      />
      <path
        d={`M ${sideW + 30} 280 L ${sideW + 96} 256 L ${sideW + 162} 270 L ${sideW + 228} 240 L ${sideW + 294} 252 L ${sideW + 360} 224 L ${sideW + 426} 234 L ${sideW + 492} 212 L ${sideW + 540} 232`}
        fill="none"
        stroke={p.primary}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* accent line */}
      <path
        d={`M ${sideW + 30} 300 L ${sideW + 96} 290 L ${sideW + 162} 286 L ${sideW + 228} 276 L ${sideW + 294} 272 L ${sideW + 360} 258 L ${sideW + 426} 268 L ${sideW + 492} 252 L ${sideW + 540} 260`}
        fill="none"
        stroke={p.accent}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeDasharray="3 2"
      />
      {/* x-axis labels */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={sideW + 22 + i * 80} y={336} width={28} height={6} fill={hexA(p.fg, 0.2)} rx={2} />
      ))}

      {/* table */}
      <g filter="url(#card-shadow)">
        <rect x={sideW + 16} y={362} width={W - sideW - 32} height={148} fill={p.surface} stroke={p.border} rx={10} />
      </g>
      <path d={topRoundRect(sideW + 16, 362, W - sideW - 32, 32, 10)} fill={hexA(p.muted, 0.2)} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={sideW + 32 + i * 132} y={374} width={64 + i * 8} height={9} fill={hexA(p.fg, 0.45)} rx={2} />
      ))}
      {[0, 1, 2].map((ri) => (
        <g key={ri}>
          <rect x={sideW + 16} y={394 + ri * 36} width={W - sideW - 32} height={1} fill={p.border} />
          <circle cx={sideW + 42} cy={410 + ri * 36} r={9} fill={hexA(p.accent, 0.3 + ri * 0.15)} />
          <rect x={sideW + 58} y={406 + ri * 36} width={52 + ri * 8} height={8} fill={hexA(p.fg, 0.55)} rx={2} />
          <rect x={sideW + 58} y={418 + ri * 36} width={36} height={6} fill={hexA(p.fg, 0.28)} rx={2} />
          {[1, 2].map((ci) => (
            <rect
              key={ci}
              x={sideW + 32 + (ci + 1) * 132}
              y={409 + ri * 36}
              width={48 + ri * 4}
              height={8}
              fill={hexA(p.fg, 0.32)}
              rx={2}
            />
          ))}
          <rect
            x={W - 84}
            y={406 + ri * 36}
            width={52}
            height={16}
            fill={ri === 1 ? hexA(p.accent, 0.18) : hexA(p.primary, 0.14)}
            rx={8}
          />
          <rect
            x={W - 74}
            y={411 + ri * 36}
            width={32}
            height={6}
            fill={ri === 1 ? p.accent : p.primary}
            rx={2}
          />
        </g>
      ))}
    </svg>
  );
}

// ─── Article ──────────────────────────────────────────────────────────────────

export function ArticleMockup({ p }: { p: MockupPalette }) {
  const colX = 152;
  const colW = 496;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "100%" }}>
      <Defs />
      <rect width={W} height={H} fill={p.bg} />
      <Nav p={p} />

      {/* hero banner */}
      <rect x={0} y={48} width={W} height={148} fill={hexA(p.accent, 0.08)} />
      <rect x={0} y={48} width={W} height={1} fill={p.border} />
      {/* breadcrumb */}
      <rect x={colX} y={66} width={36} height={6} fill={hexA(p.fg, 0.4)} rx={2} />
      <rect x={colX + 42} y={66} width={48} height={6} fill={hexA(p.fg, 0.4)} rx={2} />
      <rect x={colX + 96} y={66} width={60} height={6} fill={hexA(p.fg, 0.4)} rx={2} />
      {/* category tag */}
      <rect x={colX} y={84} width={64} height={18} fill={hexA(p.accent, 0.2)} rx={9} />
      <rect x={colX + 12} y={91} width={40} height={6} fill={p.accent} rx={2} />
      {/* headline */}
      <rect x={colX} y={112} width={colW} height={22} fill={p.fg} rx={3} />
      <rect x={colX} y={140} width={400} height={22} fill={p.fg} rx={3} />
      {/* byline */}
      <circle cx={colX + 13} cy={180} r={13} fill={hexA(p.primary, 0.35)} />
      <rect x={colX + 32} y={170} width={88} height={9} fill={hexA(p.fg, 0.55)} rx={2} />
      <rect x={colX + 32} y={184} width={120} height={7} fill={hexA(p.fg, 0.3)} rx={2} />

      {/* article body */}
      <rect x={0} y={196} width={W} height={1} fill={p.border} />

      {/* lead paragraph */}
      <rect x={colX} y={216} width={colW} height={11} fill={hexA(p.fg, 0.7)} rx={2} />
      <rect x={colX} y={232} width={colW - 16} height={11} fill={hexA(p.fg, 0.7)} rx={2} />
      <rect x={colX} y={248} width={colW - 56} height={11} fill={hexA(p.fg, 0.7)} rx={2} />

      {/* body paragraph */}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={colX}
          y={276 + i * 16}
          width={i === 3 ? colW - 120 : i % 2 === 0 ? colW : colW - 28}
          height={8}
          fill={hexA(p.fg, 0.32)}
          rx={2}
        />
      ))}

      {/* image with caption */}
      <rect x={colX} y={356} width={colW} height={64} fill={hexA(p.muted, 0.2)} rx={8} />
      <circle cx={colX + 60} cy={388} r={16} fill={hexA(p.accent, 0.3)} />
      <rect x={colX + 84} y={380} width={120} height={9} fill={hexA(p.fg, 0.4)} rx={2} />
      <rect x={colX + 84} y={394} width={80} height={6} fill={hexA(p.fg, 0.25)} rx={2} />
      <rect x={colX} y={426} width={200} height={6} fill={hexA(p.fg, 0.3)} rx={2} />

      {/* pull quote */}
      <rect x={colX} y={448} width={colW} height={56} fill={hexA(p.accent, 0.08)} rx={8} />
      <rect x={colX + 4} y={448} width={3} height={56} fill={p.accent} rx={1.5} />
      <rect x={colX + 24} y={462} width={colW - 48} height={10} fill={hexA(p.fg, 0.55)} rx={2} />
      <rect x={colX + 24} y={480} width={240} height={10} fill={hexA(p.fg, 0.55)} rx={2} />

      {/* sidebar (right of article) */}
      <g filter="url(#card-shadow)">
        <rect x={colX + colW + 24} y={216} width={132} height={84} fill={p.surface} stroke={p.border} rx={10} />
      </g>
      <rect x={colX + colW + 36} y={228} width={72} height={9} fill={hexA(p.fg, 0.55)} rx={2} />
      <rect x={colX + colW + 36} y={244} width={108} height={1} fill={p.border} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={colX + colW + 42} cy={262 + i * 16} r={3} fill={p.accent} />
          <rect
            x={colX + colW + 50}
            y={259 + i * 16}
            width={70 - (i % 3) * 8}
            height={7}
            fill={hexA(p.fg, 0.4)}
            rx={2}
          />
        </g>
      ))}

      {/* tags below sidebar */}
      <rect x={colX + colW + 24} y={316} width={64} height={9} fill={hexA(p.fg, 0.5)} rx={2} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect
            x={colX + colW + 24 + (i % 2) * 70}
            y={336 + Math.floor(i / 2) * 26}
            width={62}
            height={18}
            fill={hexA(p.primary, 0.1)}
            rx={9}
          />
          <rect
            x={colX + colW + 36 + (i % 2) * 70}
            y={343 + Math.floor(i / 2) * 26}
            width={38 - (i % 3) * 6}
            height={6}
            fill={p.primary}
            rx={2}
          />
        </g>
      ))}
    </svg>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export function PricingMockup({ p }: { p: MockupPalette }) {
  const planW = 220;
  const planH = 304;
  const gap = 24;
  const planY = 144;
  const totalW = planW * 3 + gap * 2;
  const startX = (W - totalW) / 2;

  const plans = [
    { name: 56, price: 32, popular: false, features: 6, primary: false },
    { name: 72, price: 40, popular: true, features: 6, primary: true },
    { name: 64, price: 48, popular: false, features: 6, primary: false },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "100%" }}>
      <Defs />
      <rect width={W} height={H} fill={p.bg} />
      <Nav p={p} />

      {/* header */}
      <rect x={W / 2 - 140} y={72} width={280} height={20} fill={p.fg} rx={3} />
      <rect x={W / 2 - 200} y={102} width={400} height={9} fill={hexA(p.fg, 0.45)} rx={2} />

      {/* billing toggle pill */}
      <rect x={W / 2 - 92} y={122} width={184} height={28} fill={hexA(p.muted, 0.25)} rx={14} />
      <rect x={W / 2 - 88} y={126} width={88} height={20} fill={p.bg} rx={10} />
      <rect x={W / 2 - 70} y={132} width={52} height={8} fill={p.fg} rx={2} />
      <rect x={W / 2 + 8} y={132} width={68} height={8} fill={hexA(p.fg, 0.45)} rx={2} />

      {/* plans */}
      {plans.map((plan, i) => {
        const x = startX + i * (planW + gap);
        const y = plan.popular ? planY - 12 : planY;
        const h = plan.popular ? planH + 24 : planH;
        return (
          <g key={i} filter="url(#card-shadow)">
            <rect
              x={x}
              y={y}
              width={planW}
              height={h}
              fill={p.surface}
              stroke={plan.popular ? p.primary : p.border}
              strokeWidth={plan.popular ? 2 : 1}
              rx={14}
            />
            {plan.popular && (
              <>
                <rect x={x + planW / 2 - 36} y={y - 12} width={72} height={20} fill={p.primary} rx={10} />
                <rect x={x + planW / 2 - 18} y={y - 6} width={36} height={8} fill={hexA(p.bg, 0.9)} rx={2} />
              </>
            )}
            {/* plan name */}
            <rect x={x + 24} y={y + 28} width={plan.name} height={12} fill={p.fg} rx={2} />
            {/* tagline */}
            <rect x={x + 24} y={y + 48} width={planW - 48} height={8} fill={hexA(p.fg, 0.4)} rx={2} />
            <rect x={x + 24} y={y + 62} width={140} height={8} fill={hexA(p.fg, 0.4)} rx={2} />
            {/* price */}
            <rect x={x + 24} y={y + 86} width={12} height={22} fill={hexA(p.fg, 0.5)} rx={2} />
            <rect x={x + 40} y={y + 80} width={plan.price} height={32} fill={p.fg} rx={3} />
            <rect x={x + 40 + plan.price + 8} y={y + 98} width={32} height={10} fill={hexA(p.fg, 0.4)} rx={2} />
            {/* divider */}
            <rect x={x + 24} y={y + 124} width={planW - 48} height={1} fill={p.border} />
            {/* features */}
            {Array.from({ length: plan.features }).map((_, fi) => (
              <g key={fi}>
                <circle
                  cx={x + 32}
                  cy={y + 144 + fi * 22}
                  r={6}
                  fill={hexA(plan.popular ? p.primary : p.accent, 0.15)}
                />
                <path
                  d={`M ${x + 29} ${y + 144 + fi * 22} l 2 2 l 4 -4`}
                  stroke={plan.popular ? p.primary : p.accent}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <rect
                  x={x + 46}
                  y={y + 140 + fi * 22}
                  width={planW - 80 - ((fi * 13) % 36)}
                  height={8}
                  fill={hexA(p.fg, 0.55)}
                  rx={2}
                />
              </g>
            ))}
            {/* CTA */}
            <rect
              x={x + 20}
              y={y + h - 52}
              width={planW - 40}
              height={36}
              fill={plan.primary ? p.primary : "none"}
              stroke={plan.primary ? "none" : p.border}
              strokeWidth={1.5}
              rx={8}
            />
            <rect
              x={x + planW / 2 - 32}
              y={y + h - 52 + 14}
              width={64}
              height={8}
              fill={plan.primary ? hexA(p.bg, 0.9) : hexA(p.fg, 0.7)}
              rx={2}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function MockupView({ kind, palette }: { kind: MockupKind; palette: MockupPalette }) {
  switch (kind) {
    case "landing":
      return <LandingMockup p={palette} />;
    case "card":
      return <CardMockup p={palette} />;
    case "form":
      return <FormMockup p={palette} />;
    case "dashboard":
      return <DashboardMockup p={palette} />;
    case "article":
      return <ArticleMockup p={palette} />;
    case "pricing":
      return <PricingMockup p={palette} />;
  }
}
