"use client";
import { useEffect, useState } from "react";
import { useTokens } from "@/lib/store";

export function StoreHydration({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const done = () => {
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
    return () => {
      cancelled = true;
    };
  }, []);
  if (!hydrated) {
    return (
      <div className="grid place-items-center py-16 text-sm text-neutral-500">加载中…</div>
    );
  }
  return <>{children}</>;
}
