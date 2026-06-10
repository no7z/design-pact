import { NextRequest } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { description?: string };

const DEFAULT_MODEL = process.env.AI_GATEWAY_DEFAULT_MODEL || "deepseek/deepseek-v3";

// Roles must match SemanticRole in lib/store.ts
const ROLES = ["background", "foreground", "primary", "accent", "muted", "border"] as const;
type Role = (typeof ROLES)[number];

type Color = { role: Role; hex: string; name: string };
type Palette = { name: string; rationale: string; colors: Color[] };

const SYSTEM_PROMPT =
  "你是资深品牌视觉设计师。根据用户的产品描述，直接设计 3 套和谐、专业、符合行业气质的配色方案，不要从任何模板里挑。" +
  "3 套方案的方向要明显不同（例如：克制专业 / 大胆活力 / 暗色高对比），各有取舍。" +
  "每套方案输出 6 个颜色，每个角色恰好一次：background（页面底色）、foreground（正文文字）、primary（主操作/品牌色）、accent（强调/点缀色）、muted（次要文字/弱化色）、border（描边/分隔线）。" +
  "确保 foreground 在 background 上有足够对比度（正文可读），primary 在 background 上醒目。" +
  '只输出 JSON，格式：{"palettes":[{"name":"方案名","rationale":"1-2句设计理由","colors":[{"role":"background","hex":"#RRGGBB","name":"简短英文名"}, ...]}, ...]}。' +
  "hex 必须是 6 位十六进制。name 与 rationale 用中文。不要输出 markdown 围栏、解释或额外字段。";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "palette", 10);
  if (limited) return limited;

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error("palette: AI_GATEWAY_API_KEY not set");
    return Response.json({ error: "服务端未配置 AI 密钥" }, { status: 500 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const description = body.description?.trim();
  if (!description) return Response.json({ error: "missing description" }, { status: 400 });

  const gateway = createOpenAI({ baseURL: "https://ai-gateway.vercel.sh/v1", apiKey });

  const userMessage =
    `产品描述：${description}\n\n` +
    `输出 3 套方向不同的配色。格式：{"palettes":[{"name":"...","rationale":"...","colors":[{"role":"background","hex":"#RRGGBB","name":"..."}, ...]}, ...]}，` +
    `每套角色顺序：${ROLES.join(", ")}`;

  let raw: string;
  try {
    const result = await generateText({
      model: gateway(DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.7,
      maxOutputTokens: 1200,
    });
    raw = result.text;
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "AI 调用失败" },
      { status: 502 },
    );
  }

  const palettes = parseAndValidate(raw);
  if (palettes.length === 0) {
    return Response.json({ error: "模型未按格式输出，请重试", raw }, { status: 502 });
  }
  return Response.json({ palettes });
}

// Validate one palette's color list — reused per palette.
function validateColors(list: unknown): Color[] {
  if (!Array.isArray(list)) return [];
  const allowedRole = new Set<string>(ROLES);
  const hexRe = /^#[0-9a-fA-F]{6}$/;
  const seenRole = new Set<string>();
  const out: Color[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const role = String((item as { role?: unknown }).role ?? "").toLowerCase();
    const hex = String((item as { hex?: unknown }).hex ?? "").toLowerCase();
    const name = String((item as { name?: unknown }).name ?? role);
    if (!allowedRole.has(role) || !hexRe.test(hex) || seenRole.has(role)) continue;
    seenRole.add(role);
    out.push({ role: role as Role, hex, name: name.trim().toLowerCase().replace(/\s+/g, "-") });
  }
  return out;
}

function parseAndValidate(raw: string): Palette[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return [];
  }

  const list = (parsed as { palettes?: unknown })?.palettes;
  if (!Array.isArray(list)) return [];

  const out: Palette[] = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i] as Record<string, unknown>;
    if (typeof p !== "object" || p === null) continue;
    const colors = validateColors(p.colors);
    // Drop palettes too sparse to be usable.
    if (colors.length < 4) continue;
    const name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : `方案 ${i + 1}`;
    const rationale = typeof p.rationale === "string" ? p.rationale.trim() : "";
    out.push({ name, rationale, colors });
  }
  return out;
}
