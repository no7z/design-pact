import {
  type ColorToken,
  type SemanticRole,
  type Semantic,
  type Typography,
  type Spacing,
  type Radius,
} from "./store";

export const BRANDS = [
  "airbnb", "airtable", "apple", "binance", "bmw", "bmw-m", "bugatti",
  "cal", "claude", "clay", "clickhouse", "cohere", "coinbase", "composio",
  "cursor", "elevenlabs", "expo", "ferrari", "figma", "framer", "hashicorp",
  "ibm", "intercom", "kraken", "lamborghini", "linear.app", "lovable",
  "mastercard", "meta", "minimax", "mintlify", "miro", "mistral.ai",
  "mongodb", "nike", "notion", "nvidia", "ollama", "opencode.ai",
  "pinterest", "playstation", "posthog", "raycast", "renault", "replicate",
  "resend", "revolut", "runwayml", "sanity", "sentry", "shopify", "slack",
  "spacex", "spotify", "starbucks", "stripe", "supabase", "superhuman",
  "tesla", "theverge", "together.ai", "uber", "vercel", "vodafone",
  "voltagent", "warp", "webflow", "wired", "wise", "x.ai", "zapier",
] as const;

export type Brand = (typeof BRANDS)[number];

export function brandDisplayName(brand: string): string {
  return brand
    .split(/[-.]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Template snapshot ───────────────────────────────────────────────────────
// 73 个 DESIGN.md 在构建时由 scripts/snapshot-templates.ts 解析为
// public/templates.json，运行时只读本地快照，不再依赖 GitHub。
// 刷新快照：npm run snapshot:templates

export type SnapshotColor = { hex: string; role: SemanticRole; name?: string };

export type TemplateEntry = {
  colors: SnapshotColor[];
  semantic?: Partial<Semantic>;
  typography: Partial<Typography>;
  spacing: Partial<Spacing>;
  radius: Partial<Radius>;
};

export type TemplateSnapshot = {
  generatedAt: string;
  source: string;
  templates: Record<string, TemplateEntry>;
};

let snapshotPromise: Promise<TemplateSnapshot> | null = null;

function loadSnapshot(): Promise<TemplateSnapshot> {
  if (!snapshotPromise) {
    const p = fetch("/templates.json").then(async (res) => {
      if (!res.ok) throw new Error(`无法加载模板库 (${res.status})`);
      return (await res.json()) as TemplateSnapshot;
    });
    snapshotPromise = p;
    // 失败后清掉缓存，下次调用可重试
    p.catch(() => {
      if (snapshotPromise === p) snapshotPromise = null;
    });
  }
  return snapshotPromise;
}

export async function fetchTemplateColors(brand: string): Promise<ColorToken[]> {
  return (await fetchTemplate(brand)).colors;
}

export async function fetchTemplate(brand: string): Promise<{
  colors: ColorToken[];
  semantic?: Partial<Semantic>;
  typography: Partial<Typography>;
  spacing: Partial<Spacing>;
  radius: Partial<Radius>;
}> {
  const snap = await loadSnapshot();
  const entry = snap.templates[brand];
  if (!entry) throw new Error(`无法加载 ${brand} 模板`);
  return {
    colors: entry.colors.map((c) => ({
      id: uid(),
      hex: c.hex,
      baseHex: c.hex,
      proportion: 1,
      role: c.role,
      name: c.name,
    })),
    semantic: entry.semantic,
    typography: entry.typography,
    spacing: entry.spacing,
    radius: entry.radius,
  };
}

function inferRole(name: string): SemanticRole {
  const n = name.toLowerCase();
  // Match prefix/substring so variants like canvas-soft, primary-deep, ink-muted all resolve
  if (/canvas|^background|^surface/.test(n)) return "background";
  if (/^primary/.test(n)) return "primary";
  if (/^ink|^on-|charcoal|^slate$|^steel$|^stone$|^foreground$/.test(n)) return "foreground";
  if (/hairline|^border$|divider|stroke/.test(n)) return "border";
  if (/muted|subtle|secondary|ghost|tint|soft/.test(n)) return "muted";
  if (/^brand-|^semantic-|^link-|accent/.test(n)) return "accent";
  return "unassigned";
}

let _idCounter = 0;
const uid = () => `t${Date.now().toString(36)}${(++_idCounter).toString(36)}`;

// Suffixes that mark a variant of a root token (skip in favor of the root)
const VARIANT_SUFFIX_RE =
  /-(?:deep|soft|strong|mid|press|pressed|hover|subtle|mute|muted|secondary|tertiary|bold|light|dark|active|focus|disabled|\d+)$/;

// How many tokens to keep per role
const ROLE_QUOTAS: [SemanticRole, number][] = [
  ["background", 1],
  ["primary", 1],
  ["foreground", 1],
  ["border", 1],
  ["muted", 1],
  ["accent", 3],
];

function selectKeyColors(all: ColorToken[]): ColorToken[] {
  const isVariant = (t: ColorToken) => VARIANT_SUFFIX_RE.test(t.name ?? "");
  const grouped = new Map<SemanticRole, ColorToken[]>();
  for (const t of all) {
    const list = grouped.get(t.role) ?? [];
    list.push(t);
    grouped.set(t.role, list);
  }
  const result: ColorToken[] = [];
  for (const [role, quota] of ROLE_QUOTAS) {
    const list = grouped.get(role) ?? [];
    const roots = list.filter((t) => !isVariant(t));
    // Prefer root tokens; fall back to variants if not enough roots
    const pool = roots.length >= quota ? roots : [...roots, ...list.filter(isVariant)];
    result.push(...pool.slice(0, quota));
  }
  return result;
}

function inferRoleFromSection(heading: string): SemanticRole | undefined {
  const h = heading.toLowerCase();
  if (/hairline|divider|stroke|border/.test(h)) return "border";
  if (/muted|subtle|tint/.test(h)) return "muted";
  if (/surface|background|canvas|gradient/.test(h)) return "background";
  if (/neutral|text|ink|foreground|typography/.test(h)) return "foreground";
  if (/secondary|accent|semantic|state/.test(h)) return "accent";
  if (/primary|brand/.test(h)) return "primary";
  return undefined;
}

const YAML_RE = /^[ \t]*([a-z][a-z0-9-]*)[ \t]*:[ \t]*["']?(#[0-9a-fA-F]{6})["']?/i;
const BOLD_PARENS_RE = /^[ \t]*[-*][ \t]+\*\*([^*\n]+?)\*\*[ \t]*\(`?(#[0-9a-fA-F]{6})`?\)/;
const LIST_RE = /^[ \t]*[-*][ \t]+([^:`\n*]+?)[ \t]*:[ \t]*`?(#[0-9a-fA-F]{6})`?/;
const HEADER_RE = /^#{2,5}[ \t]+(.+?)\s*$/;

export function parseMdColors(md: string): ColorToken[] {
  return selectKeyColors(parseMdColorsAll(md));
}

/**
 * Every color found in the markdown, before role quotas — the candidate pool
 * the snapshot normalizer (lib/templateNormalize.ts) re-selects roles from.
 */
export function parseMdColorsAll(md: string): ColorToken[] {
  const seen = new Map<string, { hex: string; role: SemanticRole }>();
  let sectionRole: SemanticRole | undefined;

  for (const line of md.split("\n")) {
    const header = HEADER_RE.exec(line);
    if (header) {
      const inferred = inferRoleFromSection(header[1]);
      if (inferred !== undefined) sectionRole = inferred;
      continue;
    }

    let name: string | undefined;
    let hex: string | undefined;

    const yaml = YAML_RE.exec(line);
    if (yaml) {
      name = yaml[1].trim().toLowerCase();
      hex = yaml[2].toLowerCase();
    }
    if (!hex) {
      const bold = BOLD_PARENS_RE.exec(line);
      if (bold) {
        name = bold[1].trim().toLowerCase().replace(/\s+/g, "-");
        hex = bold[2].toLowerCase();
      }
    }
    if (!hex) {
      const list = LIST_RE.exec(line);
      if (list) {
        name = list[1].trim().toLowerCase().replace(/\s+/g, "-");
        hex = list[2].toLowerCase();
      }
    }

    if (!name || !hex || seen.has(name)) continue;

    // Prefer name-based role; fall back to current section role
    const nameRole = inferRole(name);
    const role: SemanticRole =
      nameRole !== "unassigned" ? nameRole : sectionRole ?? "unassigned";
    seen.set(name, { hex, role });
  }

  const all: ColorToken[] = [];
  for (const [name, { hex, role }] of seen) {
    all.push({
      id: uid(),
      hex,
      baseHex: hex,
      proportion: 1,
      role,
      name,
    });
  }
  return all;
}

// ─── Typography parsing ─────────────────────────────────────────────────────

// YAML block start, e.g. "  body:" or "    display-xl:"
const TYPO_TOKEN_RE = /^[ \t]{2,}([a-z][a-z0-9-]*)[ \t]*:[ \t]*$/i;
// Property lines under a token block — capture raw value then strip outer quotes
const FONT_SIZE_RE = /^[ \t]*fontSize[ \t]*:[ \t]*(\d+(?:\.\d+)?)\s*px/i;
const FONT_FAMILY_RE = /^[ \t]*fontFamily[ \t]*:[ \t]*(.+?)\s*$/i;
// Table row, e.g. "| display-xxl | 56px | ..." or "| Body paragraph | 16px | ..."
const TYPO_TABLE_RE = /^\|\s*([^|]+?)\s*\|\s*(\d+(?:\.\d+)?)\s*px/i;
// Bold-list, e.g. "- **Body**: 16px / ..." or "- **H1 (hero)** | 64px ..."
const TYPO_BOLD_RE = /^[ \t]*[-*][ \t]+\*\*([^*\n]+?)\*\*[^a-zA-Z0-9]*?(\d+(?:\.\d+)?)\s*px/i;

function stripQuotes(s: string): string {
  return s.replace(/^["']/, "").replace(/["']$/, "").trim();
}

type TypoCollection = Record<string, { fontSize?: number; fontFamily?: string }>;

function normalizeTypoKey(raw: string): string {
  return raw.toLowerCase().replace(/\s*\([^)]+\)/g, "").replace(/\s+/g, "-").trim();
}

function recordTypo(coll: TypoCollection, key: string, patch: { fontSize?: number; fontFamily?: string }) {
  const slot = (coll[key] ??= {});
  if (patch.fontSize !== undefined && slot.fontSize === undefined) slot.fontSize = patch.fontSize;
  if (patch.fontFamily !== undefined && slot.fontFamily === undefined) slot.fontFamily = patch.fontFamily;
}

export function parseMdTypography(md: string): Partial<Typography> {
  const lines = md.split("\n");
  const coll: TypoCollection = {};
  let currentToken: string | undefined;

  for (const line of lines) {
    const tok = TYPO_TOKEN_RE.exec(line);
    if (tok) {
      currentToken = tok[1].toLowerCase();
      continue;
    }
    // Reset block context on unindented non-empty lines
    if (line.length > 0 && !/^[ \t]/.test(line)) currentToken = undefined;

    if (currentToken) {
      const fs = FONT_SIZE_RE.exec(line);
      if (fs) recordTypo(coll, currentToken, { fontSize: parseFloat(fs[1]) });
      const ff = FONT_FAMILY_RE.exec(line);
      if (ff) recordTypo(coll, currentToken, { fontFamily: stripQuotes(ff[1]) });
    }

    const tr = TYPO_TABLE_RE.exec(line);
    if (tr) recordTypo(coll, normalizeTypoKey(tr[1]), { fontSize: parseFloat(tr[2]) });

    const bl = TYPO_BOLD_RE.exec(line);
    if (bl) recordTypo(coll, normalizeTypoKey(bl[1]), { fontSize: parseFloat(bl[2]) });
  }

  // Prefer exact common keys; fall back to fuzzy prefix match for messy DESIGN.md formats
  const bodyExact = ["body", "body-md", "body-base", "body-lg", "paragraph", "p"];
  const headExact = [
    "display-xxl", "display-xl", "display-lg", "display-md", "display",
    "hero-display", "hero",
    "h1", "headline", "title", "heading",
  ];
  const findIn = (keys: string[]) =>
    keys.map((k) => coll[k]).find((v) => v?.fontSize || v?.fontFamily);
  const findByPrefix = (re: RegExp) =>
    Object.keys(coll)
      .filter((k) => re.test(k) && (coll[k].fontSize || coll[k].fontFamily))
      .map((k) => coll[k])[0];

  const body = findIn(bodyExact) ?? findByPrefix(/^(body|paragraph)/);
  const heading = findIn(headExact) ?? findByPrefix(/^(display|h1|hero|headline)/);

  const result: Partial<Typography> = {};
  if (body?.fontSize && body.fontSize >= 10 && body.fontSize <= 24) result.base = body.fontSize;
  if (body?.fontFamily) result.fontFamily = body.fontFamily;
  if (heading?.fontFamily) result.headingFamily = heading.fontFamily;

  // Derive ratio from heading/body size if both available; clamp to sensible range
  if (body?.fontSize && heading?.fontSize && heading.fontSize > body.fontSize) {
    const r = Math.pow(heading.fontSize / body.fontSize, 1 / 5);
    if (r >= 1.1 && r <= 1.5) result.ratio = Math.round(r * 100) / 100;
  }

  return result;
}

// ─── Spacing / Radius parsing ────────────────────────────────────────────────

// Matches a numeric px value as a standalone token (avoids "letter-spacing: -1.4px")
const PX_RE = /(\d+(?:\.\d+)?)\s*px/gi;

// Section headers we care about (markdown ## ### #### + YAML top-level keys)
const SPACING_SECTION_RE =
  /^(?:#{1,5}[ \t]+.*\bspacing\b.*|\s*spacing\s*:)\s*$/i;
const RADIUS_SECTION_RE =
  /^(?:#{1,5}[ \t]+.*(?:radius|border-?radius).*|\s*(?:border-?radius|radius)\s*:)\s*$/i;
const NEXT_SECTION_RE = /^(?:#{1,5}[ \t]+|\s*[a-z][a-z0-9-]*\s*:\s*$)/i;

function collectPxFromSection(md: string, headerRe: RegExp): number[] {
  const lines = md.split("\n");
  const result: number[] = [];
  let inSection = false;
  let headerLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inSection) {
      if (headerRe.test(line)) {
        inSection = true;
        headerLine = i;
      }
      continue;
    }
    // Stop at next section header (but not the one we just entered)
    if (i > headerLine && NEXT_SECTION_RE.test(line)) {
      // Don't include the header line we just hit
      break;
    }
    // Collect all px values on this line, skip if line mentions letter-spacing / line-height
    if (/letter-?spacing|line-?height|font-?size/i.test(line)) continue;
    let m: RegExpExecArray | null;
    PX_RE.lastIndex = 0;
    while ((m = PX_RE.exec(line)) !== null) {
      const v = parseFloat(m[1]);
      if (v > 0 && v < 300) result.push(v);
    }
  }
  return result;
}

export function parseMdSpacing(md: string): Partial<Spacing> {
  const vals = collectPxFromSection(md, SPACING_SECTION_RE);
  if (vals.length === 0) return {};
  // Smallest positive value is the base unit; clamp to slider range [2, 8]
  const min = Math.min(...vals);
  if (min < 1 || min > 16) return {};
  return { base: Math.max(2, Math.min(8, Math.round(min))) };
}

export function parseMdRadius(md: string): Partial<Radius> {
  const vals = collectPxFromSection(md, RADIUS_SECTION_RE);
  if (vals.length === 0) return {};
  // Filter outliers like 9999 (full radius)
  const useful = vals.filter((v) => v > 0 && v < 200);
  if (useful.length === 0) return {};
  // Use the median-ish: smallest non-trivial value (skip 0/1)
  const sorted = useful.filter((v) => v >= 2).sort((a, b) => a - b);
  if (sorted.length === 0) return {};
  const base = sorted[0];
  if (base < 0 || base > 32) return {};
  return { base: Math.round(base) };
}
