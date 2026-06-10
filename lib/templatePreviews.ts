"use client";
import { useEffect, useState, type RefObject } from "react";
import { fetchTemplateColors } from "@/lib/templates";

const previewCache = new Map<string, string[]>();
const inflight = new Map<string, Promise<string[]>>();

function fetchPreview(brand: string): Promise<string[]> {
  const existing = inflight.get(brand);
  if (existing) return existing;
  const p = fetchTemplateColors(brand)
    .then((tokens) => {
      const hexes = tokens.map((t) => t.hex).slice(0, 6);
      previewCache.set(brand, hexes);
      inflight.delete(brand);
      return hexes;
    })
    .catch((err) => {
      inflight.delete(brand);
      throw err;
    });
  inflight.set(brand, p);
  return p;
}

/**
 * Lazy-load a template's color swatches.
 * If a ref is provided, fetches only when the element enters the viewport.
 * If no ref is provided, fetches immediately on mount.
 */
export function useTemplatePreview(
  brand: string,
  ref?: RefObject<HTMLElement | null>,
): string[] | undefined {
  const [preview, setPreview] = useState<string[] | undefined>(() => previewCache.get(brand));

  // Adjust-during-render (not in an effect) when the brand prop changes.
  const [prevBrand, setPrevBrand] = useState(brand);
  if (prevBrand !== brand) {
    setPrevBrand(brand);
    setPreview(previewCache.get(brand));
  }

  useEffect(() => {
    if (previewCache.has(brand)) return;

    let cancelled = false;
    const trigger = () => {
      fetchPreview(brand)
        .then((hexes) => {
          if (!cancelled) setPreview(hexes);
        })
        .catch(() => {
          /* swallow — preview is non-critical */
        });
    };

    if (!ref?.current) {
      trigger();
      return () => {
        cancelled = true;
      };
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          obs.disconnect();
          trigger();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(ref.current);
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, [brand, ref]);

  return preview;
}
