import { NextRequest } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

const DEFAULT_MODEL = process.env.AI_GATEWAY_DEFAULT_MODEL || "deepseek/deepseek-v3";

// Mirrors test/harness/generate.ts — the exact contract the eval harness
// validated (rootMatch 40→100, mean 89→97). Keep the two in sync.
const SYSTEM_PROMPT = `You are a senior front-end engineer. Given a design system, produce ONE complete, self-contained HTML file for a product landing page (hero, feature grid, pricing, footer).

Rules:
- Inline everything in a single <style> tag. No external CSS/JS frameworks, no CDN links.
- Use ONLY the design tokens given. Follow any "copy verbatim" instruction exactly.
- Output raw HTML only — start with <!DOCTYPE html>. No markdown fences, no commentary.`;

type Body = { prompt?: string };

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "generate-page", 5);
  if (limited) return limited;

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    console.error("generate-page: AI_GATEWAY_API_KEY not set");
    return Response.json({ error: "服务端未配置 AI 密钥" }, { status: 500 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const prompt = body.prompt?.trim();
  if (!prompt) return Response.json({ error: "missing prompt" }, { status: 400 });
  if (prompt.length > 32_000) {
    return Response.json({ error: "prompt too large" }, { status: 400 });
  }

  const gateway = createOpenAI({ baseURL: "https://ai-gateway.vercel.sh/v1", apiKey });

  let raw: string;
  try {
    const result = await generateText({
      model: gateway(DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      maxOutputTokens: 8000,
    });
    raw = result.text;
  } catch (e) {
    console.error("generate-page:", e);
    return Response.json({ error: "AI 调用失败，请重试" }, { status: 502 });
  }

  const html = stripFences(raw);
  if (!/<html[\s>]/i.test(html)) {
    return Response.json({ error: "模型未输出有效 HTML，请重试" }, { status: 502 });
  }
  return Response.json({ html });
}

function stripFences(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const lt = t.indexOf("<");
  return lt > 0 ? t.slice(lt) : t;
}
