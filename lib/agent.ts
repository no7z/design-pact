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
  const seenRole = new Set<SemanticRole>();
  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const role = String((item as { role?: unknown }).role ?? "").toLowerCase() as SemanticRole;
    const hex = String((item as { hex?: unknown }).hex ?? "").toLowerCase();
    const name = String((item as { name?: unknown }).name ?? role);
    if (!PALETTE_ROLES.has(role) || !/^#[0-9a-f]{6}$/.test(hex) || seenRole.has(role)) continue;
    seenRole.add(role);
    tokens.push({ id: `c${tokens.length}`, hex, baseHex: hex, proportion: 1, role, name });
  }
  return tokens;
}

function toGeneratedPalette(item: unknown, index: number): GeneratedPalette | null {
  if (typeof item !== "object" || item === null) return null;
  const colors = toColorTokens((item as { colors?: unknown }).colors);
  // Drop palettes too sparse to be usable.
  if (colors.length < 4) return null;
  const rawName = (item as { name?: unknown }).name;
  const name =
    typeof rawName === "string" && rawName.trim() ? rawName.trim() : `方案 ${index + 1}`;
  const rationale = String((item as { rationale?: unknown }).rationale ?? "").trim();
  return { name, rationale, colors };
}

// ── Incremental palette extraction from a streamed JSON response ────────────
// The route streams raw model text; we surface each palette as soon as its
// object closes instead of waiting for the full JSON document.

function findBalancedEnd(s: string, start: number): number {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

class PaletteStreamParser {
  private buf = "";
  private pos = 0;
  private inArray = false;

  /** Feed a chunk; returns any palette objects completed by it. */
  push(chunk: string): unknown[] {
    this.buf += chunk;
    if (!this.inArray) {
      const key = this.buf.indexOf('"palettes"');
      if (key < 0) return [];
      const bracket = this.buf.indexOf("[", key);
      if (bracket < 0) return [];
      this.inArray = true;
      this.pos = bracket + 1;
    }
    const found: unknown[] = [];
    for (;;) {
      const close = this.buf.indexOf("]", this.pos);
      const start = this.buf.indexOf("{", this.pos);
      // Array closed before another object starts → done.
      if (start < 0 || (close >= 0 && close < start)) break;
      const end = findBalancedEnd(this.buf, start);
      if (end < 0) break; // object still streaming
      this.pos = end + 1;
      try {
        found.push(JSON.parse(this.buf.slice(start, end + 1)));
      } catch {
        // malformed fragment — skip and keep scanning
      }
    }
    return found;
  }
}

/**
 * AI invents several palettes directly from the (clarified) brief instead of
 * picking a template brand. Each palette carries a name + rationale.
 * The response streams: `onPalette` fires as each palette completes.
 */
export async function generatePalettes(
  brief: string,
  signal?: AbortSignal,
  onPalette?: (p: GeneratedPalette) => void,
): Promise<GeneratedPalette[]> {
  const trimmed = brief.trim();
  if (!trimmed) throw new Error("请先输入产品描述");

  const res = await fetch("/api/palette", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: trimmed }),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string })?.error || `AI 配色失败（HTTP ${res.status}）`,
    );
  }
  if (!res.body) throw new Error("AI 配色失败（无响应流）");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = new PaletteStreamParser();
  const palettes: GeneratedPalette[] = [];

  const collect = (objs: unknown[]) => {
    for (const obj of objs) {
      if (palettes.length >= 3) return;
      const p = toGeneratedPalette(obj, palettes.length);
      if (!p) continue;
      palettes.push(p);
      onPalette?.(p);
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      collect(parser.push(decoder.decode(value, { stream: true })));
    }
    collect(parser.push(decoder.decode()));
  } catch (e) {
    // Mid-stream failure: keep what already completed instead of discarding it.
    if (palettes.length === 0) throw e;
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
