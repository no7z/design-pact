"use client";
import { useEffect, useState } from "react";
import { useTokens } from "@/lib/store";
import { useLang, detectDefaultLang, LANG_STORAGE_KEY } from "@/lib/i18n";
import { applyPaletteFromUrl } from "@/lib/urlPalette";

export function StoreHydration({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const done = () => {
      // A ?p= palette in the URL (agent handoff) overrides persisted state.
      applyPaletteFromUrl();
      if (!cancelled) setHydrated(true);
    };
    // Language preference rehydrates alongside the tokens store. On the very
    // first visit (nothing stored) pick a default from the URL (?lang=, set by
    // the agent) or the browser language, then persist it.
    try {
      const hadStored = localStorage.getItem(LANG_STORAGE_KEY) != null;
      useLang.persist.rehydrate();
      if (!hadStored) useLang.getState().setLang(detectDefaultLang());
    } catch {
      /* default stays "en" */
    }
    try {
      const result = useTokens.persist.rehydrate();
      if (result && typeof (result as { then?: unknown }).then === "function") {
        (result as Promise<unknown>).then(done, done);
      } else {
        done();
      }
    } catch {
      done();
    }
    return () => {
      cancelled = true;
    };
  }, []);
  if (!hydrated) {
    return (
      <div className="grid place-items-center py-16 text-sm text-neutral-500">Loading…</div>
    );
  }
  return <>{children}</>;
}
