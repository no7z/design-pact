import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  buildSystemPrompt,
  buildUserMessage,
  type GenerateKind,
} from "@/lib/genPrompt";
import type { ColorToken, Typography } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  colors: ColorToken[];
  typography: Typography;
  kind: GenerateKind;
  model?: string;
};

const VALID_KINDS: GenerateKind[] = ["landing", "card", "form", "dashboard", "article"];
const DEFAULT_MODEL = process.env.AI_GATEWAY_DEFAULT_MODEL || "deepseek/deepseek-v3";

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
  if (!body.colors?.length) return Response.json({ error: "missing colors" }, { status: 400 });
  if (!body.typography) return Response.json({ error: "missing typography" }, { status: 400 });
  if (!VALID_KINDS.includes(body.kind))
    return Response.json({ error: "invalid kind" }, { status: 400 });

  const gateway = createOpenAI({
    baseURL: "https://ai-gateway.vercel.sh/v1",
    apiKey,
  });

  const model = body.model || DEFAULT_MODEL;

  const result = streamText({
    model: gateway(model),
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: buildUserMessage(body.colors, body.typography, body.kind),
      },
    ],
    maxOutputTokens: 16000,
  });

  return result.toTextStreamResponse();
}
