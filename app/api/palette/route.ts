import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { description?: string };

const DEFAULT_MODEL = process.env.AI_GATEWAY_DEFAULT_MODEL || "deepseek/deepseek-v3";

// Roles must match SemanticRole in lib/store.ts
const ROLES = ["background", "foreground", "primary", "accent", "muted", "border"] as const;

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

  // Stream the raw model text — the client parses complete palette objects
  // incrementally (lib/agent.ts) so swatch cards appear one by one instead of
  // after the full ~15s generation.
  const result = streamText({
    model: gateway(DEFAULT_MODEL),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    temperature: 0.7,
    maxOutputTokens: 1200,
    onError: (e) => console.error("palette stream:", e),
  });
  return result.toTextStreamResponse();
}
