"use client";
import { useEffect, useRef, useState } from "react";
import { useTokens } from "@/lib/store";
import type { ColorToken } from "@/lib/store";
import {
  clarifyDirection,
  generatePalettes,
  recommendBrands,
  type AskedItem,
  type ClarifyQuestion,
  type GeneratedPalette,
} from "@/lib/agent";
import { RecommendCard, useApplyTemplate } from "./RecommendCard";

const MAX_QUESTIONS = 2;

// Preferred swatch order for palette previews.
const SWATCH_ORDER = ["background", "primary", "accent", "foreground", "muted", "border"];

type Phase = "clarifying" | "questions" | "generating" | "results" | "error";

export function PaletteFlow({
  description,
  onLoaded,
}: {
  description: string;
  onLoaded: () => void;
}) {
  const loadTokens = useTokens((s) => s.loadTokens);
  const activeBrand = useTokens((s) => s.activeBrand);
  const applyTemplate = useApplyTemplate();

  const [phase, setPhase] = useState<Phase>("clarifying");
  const [error, setError] = useState("");
  // Stable per-mount id so palette selection keys don't collide across runs.
  const [instanceId] = useState(() => Math.random().toString(36).slice(2, 8));

  // Clarify state
  const [asked, setAsked] = useState<AskedItem[]>([]); // accumulated answered history
  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  // Result state
  const [palettes, setPalettes] = useState<GeneratedPalette[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loadingBrand, setLoadingBrand] = useState<string | null>(null);

  const aliveRef = useRef(true);
  const didStartRef = useRef(false);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Build the full brief: description + everything confirmed so far.
  const buildBrief = (history: AskedItem[]) => {
    if (history.length === 0) return description;
    return (
      description +
      "\n\n补充方向：\n" +
      history.map((a) => `- ${a.question}：${a.answer}`).join("\n")
    );
  };

  // Generate palettes + template recommendations in parallel. Sets state only
  // after the awaited fetches resolve.
  const runGenerate = async (history: AskedItem[]) => {
    setPhase("generating");
    const brief = buildBrief(history);
    const [pRes, bRes] = await Promise.allSettled([
      generatePalettes(brief),
      recommendBrands(brief),
    ]);
    if (!aliveRef.current) return;

    const pOk = pRes.status === "fulfilled" ? pRes.value : [];
    const bOk = bRes.status === "fulfilled" ? bRes.value : [];

    if (pOk.length === 0 && bOk.length === 0) {
      setError(
        pRes.status === "rejected" && pRes.reason instanceof Error
          ? pRes.reason.message
          : "AI 未返回结果，请重试",
      );
      setPhase("error");
      return;
    }
    setPalettes(pOk);
    setBrands(bOk);
    setPhase("results");
  };

  // Single-round clarify: ask all needed questions at once (or generate if the
  // description is already clear). First statement is an await, so it is safe to
  // call from an effect without triggering a synchronous setState.
  const clarifyAndProceed = async (history: AskedItem[]) => {
    try {
      const { ready, questions: next } = await clarifyDirection(description, history);
      if (!aliveRef.current) return;
      if (ready || next.length === 0) {
        await runGenerate(history);
        return;
      }
      setQuestions(next.slice(0, MAX_QUESTIONS));
      setAnswers({});
      setPhase("questions");
    } catch (e) {
      if (!aliveRef.current) return;
      setError(e instanceof Error ? e.message : "AI 澄清失败");
      setPhase("error");
    }
  };

  // Kick off on mount. clarifyAndProceed only setState after an awaited fetch,
  // so there is no synchronous cascade despite the lint rule's static warning.
  useEffect(() => {
    // Guard against StrictMode's dev double-invoke firing two clarify requests
    // (their non-deterministic results would visibly swap, e.g. 4 options → 3).
    if (didStartRef.current) return;
    didStartRef.current = true;
    void clarifyAndProceed([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAnswer = (q: ClarifyQuestion, value: string) => {
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      if (q.multi) {
        return {
          ...prev,
          [q.id]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
        };
      }
      return { ...prev, [q.id]: [value] };
    });
  };

  const allAnswered = questions.every((q) => (answers[q.id]?.length ?? 0) > 0);

  const handleContinue = () => {
    // Fold this batch into the asked history as human-readable answers.
    const batch: AskedItem[] = questions.map((q) => {
      const chosen = answers[q.id] ?? [];
      const labels = chosen
        .map((v) => q.options.find((o) => o.value === v)?.label ?? v)
        .join("、");
      return { question: q.question, answer: labels };
    });
    const next = [...asked, ...batch];
    setAsked(next);
    setPhase("generating");
    void runGenerate(next);
  };

  const handleSkip = () => {
    setPhase("generating");
    void runGenerate(asked);
  };

  const handleRetry = () => {
    setError("");
    // If questions were already answered, the failure was in generation —
    // retry that directly instead of re-asking.
    if (asked.length > 0) {
      setPhase("generating");
      void runGenerate(asked);
    } else {
      setPhase("clarifying");
      void clarifyAndProceed([]);
    }
  };

  // AI palettes reuse the template selection mechanism (store.activeBrand) so a
  // picked palette stays highlighted just like a picked template. The key is
  // scoped to this mount so a stale selection can't bleed into a new run.
  const paletteKey = (i: number) => `__ai_${instanceId}_${i}`;

  const handlePickPalette = (p: GeneratedPalette, i: number) => {
    loadTokens(p.colors, paletteKey(i));
    onLoaded();
  };

  const handlePickBrand = async (brand: string) => {
    if (loadingBrand) return;
    setLoadingBrand(brand);
    try {
      await applyTemplate(brand);
      onLoaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "模板载入失败");
    } finally {
      if (aliveRef.current) setLoadingBrand(null);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (phase === "clarifying" || phase === "generating") {
    return (
      <div className="max-w-2xl rounded-xl border border-neutral-200 px-4 py-6 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-neutral-400" />
          {phase === "clarifying" ? "AI 正在确认产品方向…" : "AI 正在生成配色方案…"}
        </span>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="max-w-2xl space-y-3">
        <div className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
        <button
          onClick={handleRetry}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          重试
        </button>
      </div>
    );
  }

  if (phase === "questions") {
    return (
      <div className="max-w-2xl space-y-6 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          描述还不够明确，确认下面几个方向，AI 据此生成更贴合的配色
        </p>
        {questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <p className="text-sm font-medium">
              {q.question}
              {q.multi && <span className="ml-2 text-xs text-neutral-400">可多选</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((o) => {
                const selected = (answers[q.id] ?? []).includes(o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => toggleAnswer(q, o.value)}
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      selected
                        ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-neutral-300 hover:border-neutral-900 dark:border-neutral-700 dark:hover:border-white"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleContinue}
            disabled={!allAnswered}
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            继续
          </button>
          <button
            onClick={handleSkip}
            className="text-sm text-neutral-500 underline-offset-4 hover:underline dark:text-neutral-400"
          >
            跳过追问，直接生成 →
          </button>
        </div>
      </div>
    );
  }

  // phase === "results" — two titled groups: AI palettes and same-category templates.
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">配色方案</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            根据你的方向AI给出方案
          </p>
        </header>
        {palettes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {palettes.map((p, i) => (
              <PaletteCard
                key={`p${i}`}
                palette={p}
                active={activeBrand === paletteKey(i)}
                disabled={loadingBrand !== null}
                onSelect={() => handlePickPalette(p, i)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">配色生成失败，可从下方同类产品中选择。</p>
        )}
      </section>

      {brands.length > 0 && (
        <section className="space-y-4">
          <header className="space-y-1">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              与你类似产品的真实品牌设计
            </p>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <RecommendCard
                key={brand}
                brand={brand}
                loading={loadingBrand === brand}
                active={activeBrand === brand}
                disabled={loadingBrand !== null}
                onSelect={() => handlePickBrand(brand)}
              />
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

function PaletteCard({
  palette,
  active,
  disabled,
  onSelect,
}: {
  palette: GeneratedPalette;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const ordered = [...palette.colors].sort((a, b) => roleRank(a) - roleRank(b));
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      className={`group flex flex-col gap-3 rounded-xl border p-4 text-left transition disabled:cursor-wait ${
        active
          ? "border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900 dark:border-white dark:bg-neutral-900 dark:ring-white"
          : "border-neutral-200 bg-white hover:border-neutral-900 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-white"
      }`}
    >
      <div className="flex h-10 gap-1 overflow-hidden rounded-md">
        {ordered.map((c) => (
          <div key={c.id} className="flex-1" style={{ background: c.hex }} />
        ))}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-black">
              AI
            </span>
            <span className="truncate text-sm font-medium">{palette.name}</span>
          </span>
          <span className="shrink-0 text-xs text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white">
            {active ? "✓ 已选" : "载入 →"}
          </span>
        </div>
        {palette.rationale && (
          <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {palette.rationale}
          </p>
        )}
      </div>
    </button>
  );
}

function roleRank(c: ColorToken): number {
  const i = SWATCH_ORDER.indexOf(c.role);
  return i < 0 ? SWATCH_ORDER.length : i;
}
