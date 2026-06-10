import { NextRequest } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const runtime = "nodejs";
export const maxDuration = 30;

type AskedItem = { question: string; answer: string };
type Body = { description?: string; asked?: AskedItem[] };

type ClarifyQuestion = {
  id: string;
  question: string;
  multi?: boolean;
  options: { label: string; value: string }[];
};

const DEFAULT_MODEL = process.env.AI_GATEWAY_DEFAULT_MODEL || "deepseek/deepseek-v3";

const SYSTEM_PROMPT =
  "你是资深品牌视觉设计顾问。你的任务是在为产品设计配色之前，确认产品的视觉方向。" +
  "只在产品描述没有写明时才追问，描述里已经说清的方向一律不要重复问。" +
  "如果信息已足够，输出 {\"ready\":true,\"questions\":[]}。" +
  "如果还不够，输出 {\"ready\":false,\"questions\":[...]}，一次性最多提出 2 个单选/多选题，只问对配色影响最大的两类：" +
  "(1) 明暗与对比（如：明亮轻快 / 深沉稳重 / 柔和中性 / 高对比活力）；" +
  "(2) 气质与情绪（如：专业可信 / 创新前沿 / 温暖友好 / 活力年轻 / 极简纯净）。" +
  "不要单独问『行业 / 品类』——行业能从描述推断，且已被气质覆盖。不要分多轮。" +
  "每题给 3 到 5 个互斥选项，选项要具体、贴近设计语言（如『冷静专业的科技蓝』而非『蓝色』）。" +
  '问题格式：{"id":"tone","question":"整体色调倾向？","multi":false,"options":[{"label":"冷静专业","value":"calm-professional"},...]}。' +
  "只输出 JSON，不要 markdown 围栏、解释或额外字段。";

export async function POST(req: NextRequest) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI_GATEWAY_API_KEY not set. Add it to .env.local and restart." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const description = body.description?.trim();
  if (!description) return Response.json({ error: "missing description" }, { status: 400 });
  const asked = Array.isArray(body.asked) ? body.asked : [];

  const gateway = createOpenAI({ baseURL: "https://ai-gateway.vercel.sh/v1", apiKey });

  const history =
    asked.length > 0
      ? "已确认的方向：\n" + asked.map((a) => `- ${a.question}：${a.answer}`).join("\n") + "\n\n"
      : "";
  const userMessage =
    `产品描述：${description}\n\n` +
    history +
    `请判断是否还需要澄清。输出格式：{"ready":bool,"questions":[...]}`;

  let raw: string;
  try {
    const result = await generateText({
      model: gateway(DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.4,
      maxOutputTokens: 600,
    });
    raw = result.text;
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "AI 调用失败" },
      { status: 502 },
    );
  }

  const parsed = parseClarify(raw);
  if (!parsed) {
    return Response.json({ error: "模型未按格式输出，请重试", raw }, { status: 502 });
  }
  return Response.json(parsed);
}

function parseClarify(raw: string): { ready: boolean; questions: ClarifyQuestion[] } | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }

  const obj = parsed as { ready?: unknown; questions?: unknown };
  const ready = obj.ready === true;
  const rawList = Array.isArray(obj.questions) ? obj.questions : [];

  const questions: ClarifyQuestion[] = [];
  for (let i = 0; i < rawList.length; i++) {
    const q = rawList[i] as Record<string, unknown>;
    if (typeof q !== "object" || q === null) continue;
    const question = typeof q.question === "string" ? q.question.trim() : "";
    const rawOpts = Array.isArray(q.options) ? q.options : [];
    const options = rawOpts
      .map((o) => {
        const oo = o as Record<string, unknown>;
        const label = typeof oo?.label === "string" ? oo.label.trim() : "";
        const value = typeof oo?.value === "string" ? oo.value.trim() : label;
        return { label, value };
      })
      .filter((o) => o.label.length > 0);
    if (!question || options.length < 2) continue;
    questions.push({
      id: typeof q.id === "string" && q.id.trim() ? q.id.trim() : `q${i}`,
      question,
      multi: q.multi === true,
      options,
    });
  }

  // If model said not-ready but gave no usable questions, treat as ready to avoid a dead end.
  if (!ready && questions.length === 0) return { ready: true, questions: [] };
  return { ready, questions };
}
