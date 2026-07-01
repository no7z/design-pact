"use client";
import { useLang, type Lang } from "@/lib/i18n";

// Fixed EN / 中 switch. English is the default; the choice persists.
export function LanguageToggle() {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const opts: { id: Lang; label: string }[] = [
    { id: "en", label: "EN" },
    { id: "zh", label: "中" },
  ];
  return (
    <div className="fixed left-4 top-4 z-50 flex overflow-hidden rounded-full border border-neutral-200 bg-white/80 text-xs font-medium backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/80">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => setLang(o.id)}
          aria-pressed={lang === o.id}
          className={`px-2.5 py-1 transition ${
            lang === o.id
              ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
