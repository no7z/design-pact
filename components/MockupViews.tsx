"use client";
import type { MockupPalette } from "@/lib/mockup";
import { hexA } from "@/lib/mockup";
import type { GenerateKind } from "@/lib/genPrompt";

const W = 800;
const H = 520;

// ─── Shared nav bar ──────────────────────────────────────────────────────────

function Nav({ p }: { p: MockupPalette }) {
  return (
    <g>
      <rect width={W} height={44} fill={p.surface} />
      <rect y={43} width={W} height={1} fill={p.border} />
      <rect x={20} y={10} width={28} height={24} fill={p.primary} rx={4} />
      <rect x={60} y={16} width={52} height={12} fill={hexA(p.fg, 0.18)} rx={2} />
      <rect x={124} y={16} width={44} height={12} fill={hexA(p.fg, 0.18)} rx={2} />
      <rect x={180} y={16} width={48} height={12} fill={hexA(p.fg, 0.18)} rx={2} />
      <rect x={652} y={11} width={92} height={22} fill={p.primary} rx={5} />
      <rect x={756} y={11} width={28} height={22} fill={hexA(p.fg, 0.12)} rx={11} />
    </g>
  );
}

// ─── Landing ─────────────────────────────────────────────────────────────────

export function LandingMockup({ p }: { p: MockupPalette }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "100%" }}>
      <rect width={W} height={H} fill={p.bg} />
      <Nav p={p} />

      {/* Hero */}
      {/* eyebrow pill */}
      <rect x={48} y={72} width={90} height={16} fill={hexA(p.accent, 0.2)} rx={8} />
      <rect x={60} y={77} width={66} height={6} fill={p.accent} rx={2} />
      {/* H1 */}
      <rect x={48} y={98} width={284} height={26} fill={p.fg} rx={3} />
      <rect x={48} y={131} width={228} height={26} fill={p.fg} rx={3} />
      {/* subtitle */}
      <rect x={48} y={172} width={248} height={13} fill={hexA(p.fg, 0.38)} rx={2} />
      <rect x={48} y={192} width={204} height={13} fill={hexA(p.fg, 0.38)} rx={2} />
      {/* CTA buttons */}
      <rect x={48} y={220} width={140} height={36} fill={p.primary} rx={7} />
      <rect x={68} y={233} width={100} height={10} fill={hexA(p.bg, 0.6)} rx={2} />
      <rect x={200} y={220} width={120} height={36} fill="none" stroke={p.border} strokeWidth={1.5} rx={7} />
      <rect x={220} y={233} width={80} height={10} fill={hexA(p.fg, 0.3)} rx={2} />
      {/* hero illustration */}
      <rect x={420} y={56} width={336} height={212} fill={hexA(p.accent, 0.1)} rx={12} />
      <rect x={464} y={88} width={248} height={148} fill={hexA(p.accent, 0.2)} rx={8} />
      <rect x={508} y={112} width={160} height={100} fill={hexA(p.primary, 0.32)} rx={6} />
      <rect x={540} y={132} width={96} height={60} fill={hexA(p.accent, 0.48)} rx={4} />

      {/* Features */}
      <rect x={0} y={280} width={W} height={148} fill={hexA(p.muted, 0.1)} />
      <rect x={0} y={280} width={W} height={1} fill={p.border} />
      <rect x={300} y={298} width={200} height={17} fill={hexA(p.fg, 0.65)} rx={3} />
      <rect x={332} y={322} width={136} height={11} fill={hexA(p.fg, 0.28)} rx={2} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${44 + i * 244}, 344)`}>
          <rect width={216} height={76} fill={p.surface} rx={8} />
          <rect width={216} height={1} fill={p.border} />
          <rect x={14} y={14} width={28} height={28} fill={hexA(p.accent, 0.18)} rx={6} />
          <rect x={20} y={20} width={16} height={16} fill={p.accent} rx={3} />
          <rect x={52} y={17} width={84} height={12} fill={p.fg} rx={2} />
          <rect x={14} y={52} width={184} height={9} fill={hexA(p.fg, 0.28)} rx={2} />
          <rect x={14} y={65} width={148} height={9} fill={hexA(p.fg, 0.28)} rx={2} />
        </g>
      ))}

      {/* CTA strip */}
      <rect x={0} y={428} width={W} height={44} fill={p.primary} />
      <rect x={224} y={440} width={184} height={14} fill={hexA(p.bg, 0.72)} rx={3} />
      <rect x={432} y={434} width={136} height={26} fill={hexA(p.bg, 0.16)} rx={6} />
      <rect x={452} y={441} width={96} height={10} fill={hexA(p.bg, 0.62)} rx={2} />

      {/* Footer */}
      <rect x={0} y={472} width={W} height={48} fill={hexA(p.fg, 0.06)} />
      <rect x={20} y={482} width={24} height={18} fill={hexA(p.primary, 0.5)} rx={2} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={56 + i * 68} y={487} width={52} height={10} fill={hexA(p.fg, 0.2)} rx={2} />
      ))}
      <rect x={676} y={485} width={32} height={14} fill={hexA(p.fg, 0.12)} rx={7} />
      <rect x={716} y={485} width={32} height={14} fill={hexA(p.fg, 0.12)} rx={7} />
      <rect x={756} y={485} width={24} height={14} fill={hexA(p.fg, 0.12)} rx={7} />
    </svg>
  );
}

// ─── Card Grid ────────────────────────────────────────────────────────────────

export function CardMockup({ p }: { p: MockupPalette }) {
  const cardW = 232;
  const cardH = 196;
  const xs = [24, 280, 536];
  const ys = [96, 308];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "100%" }}>
      <rect width={W} height={H} fill={p.bg} />
      <Nav p={p} />

      {/* filter bar */}
      <rect x={0} y={44} width={W} height={44} fill={p.surface} />
      <rect x={0} y={87} width={W} height={1} fill={p.border} />
      <rect x={20} y={56} width={220} height={22} fill={p.bg} stroke={p.border} strokeWidth={1} rx={5} />
      <rect x={36} y={62} width={80} height={10} fill={hexA(p.fg, 0.2)} rx={2} />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={260 + i * 76}
          y={56}
          width={64}
          height={22}
          fill={i === 0 ? hexA(p.primary, 0.12) : "none"}
          stroke={i === 0 ? p.primary : p.border}
          strokeWidth={1}
          rx={11}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={272 + i * 76} y={62} width={40} height={10} fill={i === 0 ? p.primary : hexA(p.fg, 0.22)} rx={2} />
      ))}

      {/* card grid */}
      {ys.flatMap((y, ri) =>
        xs.map((x, ci) => {
          const imgH = ri === 0 ? 108 : 96;
          return (
            <g key={`${ri}-${ci}`} transform={`translate(${x}, ${y})`}>
              <rect width={cardW} height={cardH} fill={p.surface} stroke={p.border} strokeWidth={1} rx={10} />
              {/* image area */}
              <rect width={cardW} height={imgH} fill={hexA(p.accent, 0.18)} rx="10 10 0 0" />
              <rect x={cardW / 2 - 24} y={imgH / 2 - 24} width={48} height={48} fill={hexA(p.accent, 0.45)} rx={10} />
              <rect x={cardW / 2 - 12} y={imgH / 2 - 12} width={24} height={24} fill={p.accent} rx={5} />
              {/* text */}
              <rect x={16} y={imgH + 14} width={160} height={13} fill={p.fg} rx={2} />
              <rect x={16} y={imgH + 34} width={196} height={10} fill={hexA(p.fg, 0.3)} rx={2} />
              <rect x={16} y={imgH + 50} width={160} height={10} fill={hexA(p.fg, 0.3)} rx={2} />
              {/* tag + action */}
              <rect x={16} y={cardH - 26} width={52} height={16} fill={hexA(p.primary, 0.12)} rx={8} />
              <rect x={22} y={cardH - 21} width={40} height={7} fill={p.primary} rx={2} />
              <rect x={cardW - 68} y={cardH - 26} width={52} height={16} fill={p.primary} rx={8} />
              <rect x={cardW - 58} y={cardH - 21} width={32} height={7} fill={hexA(p.bg, 0.7)} rx={2} />
            </g>
          );
        }),
      )}
    </svg>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function FormMockup({ p }: { p: MockupPalette }) {
  const cx = 180;
  const cy = 28;
  const cw = 440;
  const ch = 464;
  const pad = 36;
  const inputH = 38;

  const fields: { label: number; w: number }[] = [
    { label: 80, w: cw - pad * 2 },
    { label: 68, w: cw - pad * 2 },
    { label: 100, w: cw - pad * 2 },
    { label: 72, w: cw - pad * 2 },
  ];

  let fieldY = cy + 96;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "100%" }}>
      <rect width={W} height={H} fill={p.bg} />
      <Nav p={p} />

      {/* form card */}
      <rect x={cx} y={cy} width={cw} height={ch} fill={p.surface} stroke={p.border} strokeWidth={1} rx={12} />

      {/* logo + heading */}
      <rect x={cx + cw / 2 - 16} y={cy + 28} width={32} height={28} fill={p.primary} rx={8} />
      <rect x={cx + cw / 2 - 100} y={cy + 66} width={200} height={18} fill={p.fg} rx={3} />
      <rect x={cx + cw / 2 - 80} y={cy + 90} width={160} height={12} fill={hexA(p.fg, 0.35)} rx={2} />

      {/* fields */}
      {fields.map((f, i) => {
        const y = fieldY + i * (inputH + 28);
        return (
          <g key={i}>
            <rect x={cx + pad} y={y} width={f.label} height={10} fill={hexA(p.fg, 0.55)} rx={2} />
            <rect
              x={cx + pad}
              y={y + 16}
              width={f.w}
              height={inputH}
              fill={p.bg}
              stroke={i === 2 ? p.primary : p.border}
              strokeWidth={i === 2 ? 1.5 : 1}
              rx={6}
            />
            {i === 2 && (
              <>
                <rect x={cx + pad + 12} y={y + 28} width={120} height={12} fill={hexA(p.fg, 0.25)} rx={2} />
                <rect x={cx + cw - pad - 30} y={y + 28} width={18} height={12} fill={p.primary} rx={2} />
              </>
            )}
            {i !== 2 && (
              <rect x={cx + pad + 12} y={y + 27} width={80 + i * 20} height={12} fill={hexA(p.fg, 0.18)} rx={2} />
            )}
          </g>
        );
      })}

      {/* submit button */}
      <rect
        x={cx + pad}
        y={cy + ch - 100}
        width={cw - pad * 2}
        height={44}
        fill={p.primary}
        rx={8}
      />
      <rect
        x={cx + cw / 2 - 60}
        y={cy + ch - 100 + 17}
        width={120}
        height={12}
        fill={hexA(p.bg, 0.7)}
        rx={2}
      />

      {/* footer text */}
      <rect x={cx + cw / 2 - 72} y={cy + ch - 40} width={144} height={10} fill={hexA(p.fg, 0.22)} rx={2} />
      <rect x={cx + cw / 2 - 28} y={cy + ch - 24} width={56} height={10} fill={p.accent} rx={2} />
    </svg>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function DashboardMockup({ p }: { p: MockupPalette }) {
  const sideW = 200;
  const menuItems = ["概览", "分析", "用户", "报表", "设置", "帮助"];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "100%" }}>
      <rect width={W} height={H} fill={p.bg} />

      {/* sidebar */}
      <rect width={sideW} height={H} fill={p.primary} />
      <rect x={16} y={12} width={28} height={20} fill={hexA(p.bg, 0.9)} rx={4} />
      <rect x={52} y={15} width={80} height={14} fill={hexA(p.bg, 0.5)} rx={2} />
      <rect x={0} y={48} width={sideW} height={1} fill={hexA(p.bg, 0.15)} />

      {menuItems.map((_, i) => (
        <g key={i}>
          {i === 0 && <rect x={8} y={56 + i * 44} width={sideW - 16} height={36} fill={hexA(p.bg, 0.18)} rx={6} />}
          <rect x={20} y={65 + i * 44} width={18} height={18} fill={hexA(p.bg, i === 0 ? 0.85 : 0.4)} rx={4} />
          <rect x={46} y={69 + i * 44} width={60 + (i % 3) * 16} height={10} fill={hexA(p.bg, i === 0 ? 0.85 : 0.35)} rx={2} />
        </g>
      ))}

      {/* avatar at bottom */}
      <rect x={12} y={H - 52} width={sideW - 24} height={40} fill={hexA(p.bg, 0.1)} rx={6} />
      <rect x={20} y={H - 44} width={24} height={24} fill={hexA(p.bg, 0.4)} rx={12} />
      <rect x={52} y={H - 38} width={72} height={10} fill={hexA(p.bg, 0.55)} rx={2} />
      <rect x={52} y={H - 24} width={48} height={8} fill={hexA(p.bg, 0.3)} rx={2} />

      {/* main top bar */}
      <rect x={sideW} y={0} width={W - sideW} height={44} fill={p.surface} />
      <rect x={sideW} y={43} width={W - sideW} height={1} fill={p.border} />
      <rect x={sideW + 20} y={14} width={120} height={16} fill={hexA(p.fg, 0.6)} rx={2} />
      <rect x={W - 140} y={11} width={68} height={22} fill={hexA(p.primary, 0.12)} rx={5} />
      <rect x={W - 60} y={11} width={40} height={22} fill={p.primary} rx={5} />

      {/* stats row */}
      {[0, 1, 2, 3].map((i) => {
        const x = sideW + 16 + i * 146;
        return (
          <g key={i}>
            <rect x={x} y={52} width={130} height={80} fill={p.surface} stroke={p.border} strokeWidth={1} rx={8} />
            <rect x={x + 14} y={66} width={64 + i * 8} height={22} fill={i === 0 ? p.primary : hexA(p.fg, 0.75)} rx={3} />
            <rect x={x + 14} y={95} width={48} height={10} fill={hexA(p.fg, 0.28)} rx={2} />
            <rect
              x={x + 96}
              y={68}
              width={20}
              height={12}
              fill={hexA(i % 2 === 0 ? p.accent : p.primary, 0.2)}
              rx={3}
            />
            <rect
              x={x + 99}
              y={71}
              width={14}
              height={6}
              fill={i % 2 === 0 ? p.accent : p.primary}
              rx={2}
            />
          </g>
        );
      })}

      {/* chart area */}
      <rect x={sideW + 16} y={144} width={W - sideW - 32} height={208} fill={p.surface} stroke={p.border} strokeWidth={1} rx={8} />
      <rect x={sideW + 30} y={158} width={96} height={13} fill={hexA(p.fg, 0.55)} rx={2} />
      {/* grid lines */}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={sideW + 16} y={180 + i * 44} width={W - sideW - 32} height={1} fill={hexA(p.fg, 0.06)} />
      ))}
      {/* bars */}
      {[52, 88, 68, 104, 80, 120, 72, 96].map((h, i) => (
        <g key={i}>
          <rect
            x={sideW + 48 + i * 64}
            y={348 - h}
            width={36}
            height={h}
            fill={i % 3 === 0 ? p.accent : hexA(p.primary, 0.75)}
            rx={3}
          />
        </g>
      ))}
      {/* x-axis labels */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={sideW + 52 + i * 64} y={354} width={28} height={8} fill={hexA(p.fg, 0.2)} rx={2} />
      ))}

      {/* table */}
      <rect x={sideW + 16} y={364} width={W - sideW - 32} height={144} fill={p.surface} stroke={p.border} strokeWidth={1} rx={8} />
      <rect x={sideW + 16} y={364} width={W - sideW - 32} height={30} fill={hexA(p.muted, 0.2)} rx="8 8 0 0" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={sideW + 32 + i * 132} y={373} width={80 + i * 8} height={11} fill={hexA(p.fg, 0.4)} rx={2} />
      ))}
      {[0, 1, 2].map((ri) => (
        <g key={ri}>
          <rect x={sideW + 16} y={394 + ri * 36} width={W - sideW - 32} height={1} fill={p.border} />
          {[0, 1, 2, 3].map((ci) => (
            <rect key={ci} x={sideW + 32 + ci * 132} y={401 + ri * 36} width={56 + (ci + ri) * 6} height={10} fill={hexA(p.fg, 0.25)} rx={2} />
          ))}
          <rect x={W - 80} y={398 + ri * 36} width={48} height={16} fill={ri === 1 ? hexA(p.accent, 0.15) : hexA(p.primary, 0.12)} rx={8} />
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
      <rect width={W} height={H} fill={p.bg} />
      <Nav p={p} />

      {/* hero banner */}
      <rect x={0} y={44} width={W} height={148} fill={hexA(p.accent, 0.1)} />
      <rect x={0} y={44} width={W} height={1} fill={p.border} />
      {/* category tag */}
      <rect x={colX} y={64} width={72} height={16} fill={hexA(p.accent, 0.22)} rx={8} />
      <rect x={colX + 10} y={69} width={52} height={6} fill={p.accent} rx={2} />
      {/* headline */}
      <rect x={colX} y={90} width={colW} height={24} fill={p.fg} rx={3} />
      <rect x={colX} y={121} width={420} height={24} fill={p.fg} rx={3} />
      {/* byline */}
      <rect x={colX} y={156} width={24} height={24} fill={hexA(p.primary, 0.35)} rx={12} />
      <rect x={colX + 32} y={160} width={88} height={10} fill={hexA(p.fg, 0.5)} rx={2} />
      <rect x={colX + 32} y={175} width={64} height={9} fill={hexA(p.fg, 0.3)} rx={2} />
      <rect x={colX + 148} y={162} width={1} height={18} fill={p.border} />
      <rect x={colX + 160} y={162} width={60} height={10} fill={hexA(p.fg, 0.28)} rx={2} />

      {/* article body */}
      <rect x={0} y={192} width={W} height={1} fill={p.border} />

      {/* lead paragraph */}
      <rect x={colX} y={212} width={colW} height={13} fill={hexA(p.fg, 0.7)} rx={2} />
      <rect x={colX} y={231} width={colW - 24} height={13} fill={hexA(p.fg, 0.7)} rx={2} />
      <rect x={colX} y={250} width={colW - 80} height={13} fill={hexA(p.fg, 0.7)} rx={2} />

      {/* body paragraph */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={colX}
          y={280 + i * 18}
          width={i === 4 ? colW - 160 : i % 2 === 0 ? colW : colW - 40}
          height={11}
          fill={hexA(p.fg, 0.32)}
          rx={2}
        />
      ))}

      {/* pull quote */}
      <rect x={colX} y={386} width={colW} height={56} fill={hexA(p.accent, 0.1)} rx={8} />
      <rect x={colX + 4} y={386} width={4} height={56} fill={p.accent} rx={2} />
      <rect x={colX + 20} y={402} width={colW - 40} height={12} fill={hexA(p.fg, 0.55)} rx={2} />
      <rect x={colX + 20} y={420} width={200} height={12} fill={hexA(p.fg, 0.55)} rx={2} />

      {/* image placeholder */}
      <rect x={colX} y={456} width={colW} height={56} fill={hexA(p.muted, 0.2)} rx={8} />
      <rect x={colX + colW / 2 - 20} y={470} width={40} height={28} fill={hexA(p.muted, 0.5)} rx={5} />

      {/* sidebar tags (right of article) */}
      <rect x={colX + colW + 24} y={212} width={136} height={100} fill={p.surface} stroke={p.border} strokeWidth={1} rx={8} />
      <rect x={colX + colW + 36} y={226} width={68} height={11} fill={hexA(p.fg, 0.5)} rx={2} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={colX + colW + 36} y={246 + i * 16} width={40 + (i % 3) * 12} height={9} fill={hexA(p.primary, 0.7)} rx={2} />
      ))}
    </svg>
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function MockupView({ kind, palette }: { kind: GenerateKind; palette: MockupPalette }) {
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
  }
}
