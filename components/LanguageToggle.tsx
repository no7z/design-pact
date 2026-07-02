"use client";
import { useLang } from "@/lib/i18n";

// One unified "EN / ZH" badge, horizontal. The whole badge is a single button —
// click anywhere to toggle; the current language is highlighted. Sits top-right,
// vertically centered within the scheme bar's band (h-[42px]) so it lines up
// with the bar, above it (z-50).
export function LanguageToggle() {
  const lang = useLang((s) => s.lang);
  const toggle = useLang((s) => s.toggle);
  const active = "text-neutral-900 dark:text-white";
  const dim = "text-neutral-400 dark:text-neutral-500";
  return (
    <div className="fixed right-5 top-0 z-50 flex h-[42px] items-center">
      <button
        onClick={toggle}
        title="Switch language / 切换语言"
        aria-label="Switch language"
        className="flex cursor-pointer select-none items-center gap-1 text-[10px] font-semibold leading-none"
      >
        <span className={`transition-colors ${lang === "en" ? active : dim}`}>EN</span>
        <span className="font-normal text-neutral-300 dark:text-neutral-600">/</span>
        <span className={`transition-colors ${lang === "zh" ? active : dim}`}>ZH</span>
      </button>
    </div>
  );
}
