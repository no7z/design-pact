"use client";
import { useEffect, useState } from "react";
import { useTokens } from "@/lib/store";
import { applyShareFromUrl } from "@/lib/share";
import { applyPaletteFromUrl } from "@/lib/urlPalette";

export function StoreHydration({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const done = () => {
      // A share link (#s=) or a ?p= palette in the URL overrides persisted
      // state. Share carries the full system, so it wins if both are present.
      if (!applyShareFromUrl()) applyPaletteFromUrl();
      if (!cancelled) setHydrated(true);
    };
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
    // Same-document hash navigation (share link clicked while the app is
    // already open) doesn't remount — listen for it explicitly.
    const onHashChange = () => applyShareFromUrl();
    window.addEventListener("hashchange", onHashChange);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);
  if (!hydrated) {
    return (
      <div className="grid place-items-center py-16 text-sm text-neutral-500">加载中…</div>
    );
  }
  return <>{children}</>;
}
