import type { ColorToken } from "./store";
import { contrastRatio, hexToOklch } from "./color";

export type Severity = "error" | "warn" | "info";

export type Audit = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  refs?: string[]; // ColorToken ids
  fix?: string;
};

const ROLE_LABEL: Record<string, string> = {
  background: "背景",
  foreground: "前景",
  primary: "主色",
  accent: "强调色",
  muted: "弱化",
  border: "描边",
  unassigned: "未分配",
};

function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

function fmtRatio(r: number): string {
  return `${r.toFixed(2)}:1`;
}

function findByRole(colors: ColorToken[], role: string): ColorToken | undefined {
  return colors.find((c) => c.role === role);
}

/**
 * Resolve effective hex of a token after globals — caller passes pre-computed
 * displayHex map to avoid recomputing per audit.
 */
type ResolvedColor = ColorToken & { displayHex: string };

const WCAG_AA_BODY = 4.5;
const WCAG_AA_LARGE = 3;

function checkContrast(
  resolved: ResolvedColor[],
  fromRole: string,
  toRole: string,
  required: number,
  label: string,
): Audit | null {
  const a = resolved.find((c) => c.role === fromRole);
  const b = resolved.find((c) => c.role === toRole);
  if (!a || !b) return null;
  const ratio = contrastRatio(a.displayHex, b.displayHex);
  if (ratio >= required) return null;
  const severity: Severity = required >= WCAG_AA_BODY ? "error" : "warn";
  return {
    id: `contrast-${fromRole}-${toRole}`,
    severity,
    title: `${label}对比度不足 (${fmtRatio(ratio)}, 目标 ${fmtRatio(required)})`,
    detail: `${roleLabel(fromRole)} ${a.displayHex} 在 ${roleLabel(toRole)} ${b.displayHex} 上对比度仅为 ${fmtRatio(ratio)}。WCAG AA 要求${required >= WCAG_AA_BODY ? "正文文字 ≥ 4.5:1" : "界面元素 ≥ 3:1"}。`,
    refs: [a.id, b.id],
    fix:
      required >= WCAG_AA_BODY
        ? "将前景色调暗或将背景色提亮 — 试试全局 ΔL 调节,或单独编辑这两个颜色。"
        : "拉开两色亮度差,或微调色相让对比更明显。",
  };
}

export function auditTokens(colors: ColorToken[], displayHexById: Map<string, string>): Audit[] {
  if (colors.length === 0) return [];
  const resolved: ResolvedColor[] = colors.map((c) => ({
    ...c,
    displayHex: displayHexById.get(c.id) ?? c.hex,
  }));

  const audits: Audit[] = [];

  // Contrast: foreground on background must clear AA body
  const fgBgAudit = checkContrast(resolved, "foreground", "background", WCAG_AA_BODY, "正文");
  if (fgBgAudit) audits.push(fgBgAudit);

  // Primary button on background — UI element
  const primaryBgAudit = checkContrast(
    resolved,
    "primary",
    "background",
    WCAG_AA_LARGE,
    "主色在背景上",
  );
  if (primaryBgAudit) audits.push(primaryBgAudit);

  // Accent button on background — UI element
  const accentBgAudit = checkContrast(
    resolved,
    "accent",
    "background",
    WCAG_AA_LARGE,
    "强调色在背景上",
  );
  if (accentBgAudit) audits.push(accentBgAudit);

  // Foreground text on primary surface (white text on a primary button etc.)
  const fgPrimaryAudit = checkContrast(
    resolved,
    "foreground",
    "primary",
    WCAG_AA_BODY,
    "前景在主色按钮上",
  );
  if (fgPrimaryAudit) audits.push(fgPrimaryAudit);

  // Border vs background — readable separator
  const border = findByRole(colors, "border");
  const bg = findByRole(colors, "background");
  if (border && bg) {
    const ratio = contrastRatio(
      displayHexById.get(border.id) ?? border.hex,
      displayHexById.get(bg.id) ?? bg.hex,
    );
    if (ratio < 1.3) {
      audits.push({
        id: "contrast-border-bg",
        severity: "warn",
        title: `描边几乎看不见 (${fmtRatio(ratio)})`,
        detail: `描边 ${displayHexById.get(border.id)} 与背景对比度仅 ${fmtRatio(ratio)},界面会缺乏分割感。`,
        refs: [border.id, bg.id],
        fix: "把描边色亮度往背景的反方向拉一档。",
      });
    }
  }

  // OKLCH distribution checks — only on chromatic colors (chroma > 0.02)
  const oklchs = resolved.map((c) => ({ ...c, oklch: hexToOklch(c.displayHex) }));
  const Ls = oklchs.map((c) => c.oklch.l);
  const Cs = oklchs.map((c) => c.oklch.c);
  const lSpread = Math.max(...Ls) - Math.min(...Ls);
  const chromatic = oklchs.filter((c) => c.oklch.c > 0.04);

  if (lSpread < 0.25) {
    audits.push({
      id: "lightness-spread",
      severity: "warn",
      title: `亮度差只有 ${(lSpread * 100).toFixed(0)}%,层级偏弱`,
      detail: `所有颜色 OKLCH 亮度集中在 ${(Math.min(...Ls) * 100).toFixed(0)}–${(Math.max(...Ls) * 100).toFixed(0)}%。视觉层级会感觉扁平。`,
      fix: "增大全局 ΔL,或单独把某个颜色拉亮/拉暗。",
    });
  }

  if (chromatic.length >= 2) {
    // hue spread on the unit circle (handle wrap-around)
    const hues = chromatic.map((c) => ((c.oklch.h ?? 0) + 360) % 360).sort((a, b) => a - b);
    let maxGap = 0;
    for (let i = 0; i < hues.length; i++) {
      const next = i === hues.length - 1 ? hues[0] + 360 : hues[i + 1];
      const gap = next - hues[i];
      if (gap > maxGap) maxGap = gap;
    }
    const span = 360 - maxGap;
    if (span < 30) {
      audits.push({
        id: "hue-concentration",
        severity: "info",
        title: `色相集中在 ${span.toFixed(0)}° 内`,
        detail: `${chromatic.length} 个有色彩的颜色集中在很窄的色相区间,接近单色调色板。视觉一致但表达力受限。`,
        fix: "想要更丰富的视觉,可以把全局 ΔH 试着推 ±15° 看看效果。",
      });
    }
  }

  // chroma imbalance: many highly chromatic colors
  const highChroma = chromatic.filter((c) => c.oklch.c > 0.14);
  if (highChroma.length >= 3) {
    audits.push({
      id: "chroma-loud",
      severity: "info",
      title: `${highChroma.length} 个高饱和度颜色,可能视觉过载`,
      detail: "强烈鲜艳的颜色多于一两个时,界面容易显得喧闹。一般强调色用一个就够。",
      refs: highChroma.map((c) => c.id),
      fix: "降低全局 ΔC,或把次要颜色的饱和度单独拉低。",
    });
  }

  // unassigned roles missing
  const has = (r: string) => colors.some((c) => c.role === r);
  if (!has("background") || !has("foreground")) {
    audits.push({
      id: "missing-roles",
      severity: "info",
      title: "未指定 background / foreground",
      detail: "这两个角色用于 WCAG 检查和导出时的 token 命名。建议在右侧颜色列表里给最大的色块标 background,给主要文字色标 foreground。",
      fix: "在颜色面板里改 role 下拉。",
    });
  }

  return audits;
}

export function severityRank(s: Severity): number {
  return s === "error" ? 0 : s === "warn" ? 1 : 2;
}
