import { BRANDS } from "@/lib/templates";
import type { ColorToken, SemanticRole } from "@/lib/store";

const ALLOWED = new Set<string>(BRANDS);

const PALETTE_ROLES = new Set<SemanticRole>([
  "background",
  "foreground",
  "primary",
  "accent",
  "muted",
  "border",
]);

// ─── Clarify: interactive Q&A to confirm product direction ──────────────────

export type ClarifyQuestion = {
  id: string;
  question: string;
  multi?: boolean;
  options: { label: string; value: string }[];
};
export type ClarifyResult = { ready: boolean; questions: ClarifyQuestion[] };
export type AskedItem = { question: string; answer: string };

/**
 * Ask the AI whether the description is clear enough to design a palette.
 * Returns the next batch of clarifying questions, or ready=true. Multi-round:
 * pass the answered history in `asked` to refine over successive calls.
 */
export async function clarifyDirection(
  description: string,
  asked: AskedItem[] = [],
  signal?: AbortSignal,
): Promise<ClarifyResult> {
  const trimmed = description.trim();
  if (!trimmed) throw new Error("请先输入产品描述");

  const res = await fetch("/api/clarify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: trimmed, asked }),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `AI 澄清失败（HTTP ${res.status}）`);
  }

  const ready = data?.ready === true;
  const questions: ClarifyQuestion[] = Array.isArray(data?.questions)
    ? (data.questions as ClarifyQuestion[])
    : [];
  return { ready, questions };
}

// ─── Palettes: AI generates several palettes directly from the brief ────────

export type GeneratedPalette = {
  name: string;
  rationale: string;
  colors: ColorToken[];
};

function toColorTokens(list: unknown): ColorToken[] {
  const arr = Array.isArray(list) ? list : [];
  const tokens: ColorToken[] = [];
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const role = String((item as { role?: unknown }).role ?? "") as SemanticRole;
    const hex = String((item as { hex?: unknown }).hex ?? "").toLowerCase();
    const name = String((item as { name?: unknown }).name ?? role);
    if (!PALETTE_ROLES.has(role) || !/^#[0-9a-f]{6}$/.test(hex)) continue;
    tokens.push({ id: `c${tokens.length}`, hex, baseHex: hex, proportion: 1, role, name });
  }
  return tokens;
}

/**
 * AI invents several palettes directly from the (clarified) brief instead of
 * picking a template brand. Each palette carries a name + rationale.
 */
export async function generatePalettes(
  brief: string,
  signal?: AbortSignal,
): Promise<GeneratedPalette[]> {
  const trimmed = brief.trim();
  if (!trimmed) throw new Error("请先输入产品描述");

  const res = await fetch("/api/palette", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: trimmed }),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `AI 配色失败（HTTP ${res.status}）`);
  }

  const list = Array.isArray(data?.palettes) ? (data.palettes as unknown[]) : [];
  const palettes: GeneratedPalette[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const colors = toColorTokens((item as { colors?: unknown }).colors);
    if (colors.length === 0) continue;
    const name = String((item as { name?: unknown }).name ?? "配色方案");
    const rationale = String((item as { rationale?: unknown }).rationale ?? "");
    palettes.push({ name, rationale, colors });
  }

  if (palettes.length === 0) throw new Error("AI 未返回有效配色，请重试或换一种描述");
  return palettes;
}

export async function recommendBrands(description: string, signal?: AbortSignal): Promise<string[]> {
  const trimmed = description.trim();
  if (!trimmed) throw new Error("请先输入产品描述");

  const res = await fetch("/api/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: trimmed }),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `AI 推荐失败（HTTP ${res.status}）`);
  }

  const list = Array.isArray(data?.recommendations) ? (data.recommendations as unknown[]) : [];
  // Empty is a valid answer: no same-category match → show nothing.
  return list
    .filter((x): x is string => typeof x === "string")
    .filter((x) => ALLOWED.has(x));
}
