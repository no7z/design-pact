// Generation step — turns a design-system prompt into a self-contained HTML
// page by calling a model through the Vercel AI Gateway (same pattern as
// app/api/recommend/route.ts). Non-deterministic; needs AI_GATEWAY_API_KEY.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// tsx doesn't load .env.local the way Next does — do it ourselves.
function loadEnvLocal() {
  const p = join(__dirname, "..", "..", ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}
loadEnvLocal();

const MODEL = process.env.EVAL_MODEL || process.env.AI_GATEWAY_DEFAULT_MODEL || "deepseek/deepseek-v3";

const SYSTEM_PROMPT = `You are a senior front-end engineer. Given a design system, produce ONE complete, self-contained HTML file for a product landing page (hero, feature grid, pricing, footer).

Rules:
- Inline everything in a single <style> tag. No external CSS/JS frameworks, no CDN links.
- Use ONLY the design tokens given. Follow any "copy verbatim" instruction exactly.
- Output raw HTML only — start with <!DOCTYPE html>. No markdown fences, no commentary.`;

export const OUT_DIR = join(__dirname, "..", "out");

export async function generatePage(
  prompt: string,
  fixtureName: string,
  variant: string,
  sample?: number,
): Promise<string> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error("AI_GATEWAY_API_KEY not set (add it to .env.local)");

  const gateway = createOpenAI({ baseURL: "https://ai-gateway.vercel.sh/v1", apiKey });
  const result = await generateText({
    model: gateway(MODEL),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    maxOutputTokens: 8000,
  });

  const html = stripFences(result.text);
  mkdirSync(OUT_DIR, { recursive: true });
  const suffix = sample == null ? "" : `-s${sample}`;
  const file = join(OUT_DIR, `${fixtureName}-${variant}${suffix}.html`);
  writeFileSync(file, html, "utf8");
  return html;
}

function stripFences(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const lt = t.indexOf("<");
  return lt > 0 ? t.slice(lt) : t;
}

export { MODEL as EVAL_MODEL };
