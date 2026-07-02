"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Bilingual UI. English is the default; a header toggle flips to 简体中文.
// Strings are translated in place with `tr("English", "中文")` rather than a
// central key dictionary — for a two-language app this keeps each translation
// next to its use and avoids a parallel file to keep in sync.

export type Lang = "en" | "zh";

type LangState = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
};

export const useLang = create<LangState>()(
  persist(
    (set, get) => ({
      lang: "en",
      setLang: (lang) => set({ lang }),
      toggle: () => set({ lang: get().lang === "en" ? "zh" : "en" }),
    }),
    // skipHydration: the static export prerenders with the "en" default, then
    // StoreHydration rehydrates from localStorage on the client (same pattern
    // as the tokens store) so there is no hydration mismatch.
    { name: "design-system-lang", skipHydration: true },
  ),
);

export const LANG_STORAGE_KEY = "design-system-lang";

/**
 * First-visit default (no stored preference yet). Priority:
 * 1. `?lang=zh|en` in the URL — the agent sets this to match the language it's
 *    talking to the user in (see SKILL.md).
 * 2. The browser's language.
 * 3. English.
 */
export function detectDefaultLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "zh" || q === "en") return q;
  } catch {
    /* ignore */
  }
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("zh") ? "zh" : "en";
}

/** Component hook: subscribes to the language and returns a picker. */
export function useTr() {
  const lang = useLang((s) => s.lang);
  return (en: string, zh: string) => (lang === "zh" ? zh : en);
}

/** Non-reactive picker for lib / non-component code (reads current state). */
export function trg(en: string, zh: string): string {
  return useLang.getState().lang === "zh" ? zh : en;
}
