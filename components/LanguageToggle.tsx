"use client";
import { useLang } from "@/lib/i18n";

// Minimal single-text language switch, fixed top-right above the scheme bar.
// Shows the language you'll switch TO; one click toggles.
export function LanguageToggle() {
  const lang = useLang((s) => s.lang);
  const toggle = useLang((s) => s.toggle);
  return (
    <button
      onClick={toggle}
      title="Switch language / 切换语言"
      aria-label="Switch language"
      className="fixed right-5 top-3 z-50 text-xs font-medium tracking-wide text-neutral-400 transition-colors hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white"
    >
      {lang === "en" ? "中文" : "EN"}
    </button>
  );
}
