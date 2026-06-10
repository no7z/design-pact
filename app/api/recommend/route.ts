import { NextRequest } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { BRANDS } from "@/lib/templates";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = { description?: string };

const DEFAULT_MODEL = process.env.AI_GATEWAY_DEFAULT_MODEL || "deepseek/deepseek-v3";

const SYSTEM_PROMPT =
  "你是设计风格推荐助手。根据用户的产品描述，从给定的品牌设计模板列表中选出最多 3 个与该产品同类或同行业、且视觉风格相符的品牌，按匹配度降序输出。" +
  "宁缺毋滥：只返回真正同类的品牌，没有把握就少返回甚至返回空数组，绝不要为了凑数选不相关的品牌。" +
  "只输出 JSON，格式：{\"recommendations\":[\"brand1\",\"brand2\"]}（可以是空数组 {\"recommendations\":[]}）。" +
  "不要输出 markdown 围栏、解释或额外字段。返回的品牌名必须完全来自列表，区分大小写。";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "recommend", 10);
  if (limited) return limited;

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error("recommend: AI_GATEWAY_API_KEY not set");
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
    `可选品牌（共 ${BRANDS.length} 个）：${BRANDS.join(", ")}\n\n` +
    `输出格式：{"recommendations":["brand1","brand2",...]}`;

  let raw: string;
  try {
    const result = await generateText({
      model: gateway(DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.3,
      maxOutputTokens: 400,
    });
    raw = result.text;
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "AI 调用失败" },
      { status: 502 },
    );
  }

  const recommendations = parseAndFilter(raw);
  // null = model didn't return a usable JSON shape (treat as failure).
  // [] = valid response with no same-category match (legitimate, show nothing).
  if (recommendations === null) {
    return Response.json(
      { error: "模型未按格式输出，请重试", raw },
      { status: 502 },
    );
  }
  return Response.json({ recommendations });
}

function parseAndFilter(raw: string): string[] | null {
  // Strip markdown fences just in case
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  // Find the first { ... } block
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }

  const list = (parsed as { recommendations?: unknown })?.recommendations;
  if (!Array.isArray(list)) return null;

  const allowed = new Set<string>(BRANDS);
  return list
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().toLowerCase())
    .filter((x) => allowed.has(x as (typeof BRANDS)[number]))
    .slice(0, 3);
}
