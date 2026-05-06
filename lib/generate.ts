"use client";
import type { ColorToken, Typography } from "./store";
import type { GenerateKind } from "./genPrompt";

export type GenerateEvents = {
  onDelta?: (chunk: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (message: string) => void;
  onUsage?: (usage: { input: number; output: number; total: number }) => void;
};

export async function streamGenerate(
  body: { colors: ColorToken[]; typography: Typography; kind: GenerateKind; model?: string },
  events: GenerateEvents,
  signal?: AbortSignal,
): Promise<string> {
  const r = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({ error: r.statusText }));
    const msg = j.error || `HTTP ${r.status}`;
    events.onError?.(msg);
    throw new Error(msg);
  }
  if (!r.body) {
    events.onError?.("no response body");
    throw new Error("no response body");
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let acc = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    acc += chunk;
    events.onDelta?.(chunk);
  }

  events.onDone?.(acc);
  return acc;
}

export function extractHtml(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:html)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fence) return fence[1].trim();
  const m =
    trimmed.match(/<!doctype[\s\S]*<\/html>/i) || trimmed.match(/<html[\s\S]*<\/html>/i);
  return m ? m[0] : trimmed;
}
