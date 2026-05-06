/**
 * Function executed inside the headless page (page.evaluate).
 * Must be self-contained — no imports, no closures over the Node side.
 */
export type PageExtraction = {
  colors: { hex: string; proportion: number }[];
  typography: {
    fontFamily: string | null;
    headingFamily: string | null;
    base: number | null;
    ratio: number | null;
    samples: { size: number; weight: number }[];
  };
  meta: { title: string; viewport: { w: number; h: number } };
};

export function pageExtractionScript(): PageExtraction {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  const rgbHex = (r: number, g: number, b: number) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

  function parseColor(input: string): { r: number; g: number; b: number; a: number } | null {
    if (!input) return null;
    const m = input.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d+(?:\.\d+)?))?\s*\)$/);
    if (!m) return null;
    const r = parseFloat(m[1]);
    const g = parseFloat(m[2]);
    const b = parseFloat(m[3]);
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    return { r, g, b, a };
  }

  const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
  const vh = Math.min(window.innerHeight, document.documentElement.clientHeight);

  // bg color aggregator: weighted by element area minus children's areas (so a body bg doesn't double-count where children cover)
  const bgAccum = new Map<string, number>();
  // text color aggregator: weighted by element bbox where text actually exists
  const textAccum = new Map<string, number>();

  const fontFamilyAccum = new Map<string, number>();
  const headingFamilyAccum = new Map<string, number>();
  const sizeWeightAccum = new Map<number, number>();

  const all = document.querySelectorAll("*") as NodeListOf<HTMLElement>;
  // precompute area per element (clipped to viewport)
  const areas = new Map<HTMLElement, number>();
  all.forEach((el) => {
    const r = el.getBoundingClientRect();
    const left = Math.max(0, r.left);
    const top = Math.max(0, r.top);
    const right = Math.min(vw, r.right);
    const bottom = Math.min(vh, r.bottom);
    const w = right - left;
    const h = bottom - top;
    areas.set(el, w > 0 && h > 0 ? w * h : 0);
  });

  all.forEach((el) => {
    const area = areas.get(el) || 0;
    if (area <= 0) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) return;

    // background: subtract children's areas to avoid double counting
    let childArea = 0;
    for (let i = 0; i < el.children.length; i++) {
      childArea += areas.get(el.children[i] as HTMLElement) || 0;
    }
    const exposedArea = Math.max(0, area - childArea);
    if (exposedArea > 0) {
      const bg = parseColor(cs.backgroundColor);
      if (bg && bg.a > 0.05) {
        const key = `${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}`;
        bgAccum.set(key, (bgAccum.get(key) || 0) + exposedArea * bg.a);
      }
    }

    // text + typography (only count elements that contain own text)
    const ownText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => (n.nodeValue || "").trim())
      .filter((t) => t.length > 0)
      .join(" ");
    if (ownText.length > 0) {
      const color = parseColor(cs.color);
      const sz = parseFloat(cs.fontSize);
      if (color && color.a > 0.05 && sz > 0) {
        // Approximate the actual painted ink area:
        // chars × emWidth × emHeight ≈ chars × fontSize² × 0.5,
        // capped at 30% of the element bbox to avoid runaway weights.
        const inkArea = Math.min(ownText.length * sz * sz * 0.5, area * 0.3);
        const key = `${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)}`;
        textAccum.set(key, (textAccum.get(key) || 0) + inkArea * color.a);
      }
      if (sz > 0 && Number.isFinite(sz)) {
        const rounded = Math.round(sz * 2) / 2;
        sizeWeightAccum.set(rounded, (sizeWeightAccum.get(rounded) || 0) + ownText.length);
      }
      const ff = cs.fontFamily;
      if (ff) {
        const tag = el.tagName;
        const isHeading = /^H[1-6]$/.test(tag);
        const target = isHeading ? headingFamilyAccum : fontFamilyAccum;
        target.set(ff, (target.get(ff) || 0) + Math.max(1, ownText.length));
      }
    }
  });

  // merge bg + text
  const merged = new Map<string, number>();
  for (const [k, v] of bgAccum) merged.set(k, (merged.get(k) || 0) + v);
  for (const [k, v] of textAccum) merged.set(k, (merged.get(k) || 0) + v);

  // perceptual merge: collapse near-duplicates
  type Bucket = { r: number; g: number; b: number; w: number };
  const buckets: Bucket[] = [];
  const sortedEntries = [...merged.entries()].sort((a, b) => b[1] - a[1]);
  const minDist = 32;
  for (const [key, w] of sortedEntries) {
    const [r, g, b] = key.split(",").map(Number);
    const close = buckets.find(
      (m) => Math.hypot(m.r - r, m.g - g, m.b - b) < minDist,
    );
    if (close) {
      const total = close.w + w;
      close.r = (close.r * close.w + r * w) / total;
      close.g = (close.g * close.w + g * w) / total;
      close.b = (close.b * close.w + b * w) / total;
      close.w = total;
    } else {
      buckets.push({ r, g, b, w });
    }
    if (buckets.length >= 12) break;
  }

  const top = buckets.slice(0, 6);
  const total = top.reduce((s, b) => s + b.w, 0) || 1;
  const colors = top.map((b) => ({
    hex: rgbHex(b.r, b.g, b.b),
    proportion: b.w / total,
  }));

  // typography summary
  const pickTop = <T,>(map: Map<T, number>): T | null =>
    [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const fontFamily = pickTop(fontFamilyAccum);
  const headingFamily = pickTop(headingFamilyAccum) ?? fontFamily;
  // base size = the most-used size in the body-text range (12-22px).
  // Falls back to the most-used size overall if nothing matches the range.
  const baseSize = (() => {
    const inRange = [...sizeWeightAccum.entries()].filter(([s]) => s >= 12 && s <= 22);
    const pool = inRange.length > 0 ? inRange : [...sizeWeightAccum.entries()];
    const top = pool.sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  })();
  // ratio: take the largest size used and compute Math.pow(largest/base, 1/5)
  const sizes = [...sizeWeightAccum.keys()].sort((a, b) => a - b);
  const largest = sizes[sizes.length - 1] ?? null;
  const ratio =
    baseSize && largest && largest > baseSize
      ? Math.pow(largest / baseSize, 1 / 5)
      : null;

  const samples = [...sizeWeightAccum.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, 12)
    .map(([size, weight]) => ({ size, weight }));

  return {
    colors,
    typography: {
      fontFamily,
      headingFamily,
      base: baseSize,
      ratio: ratio ? Math.round(ratio * 100) / 100 : null,
      samples,
    },
    meta: {
      title: document.title,
      viewport: { w: vw, h: vh },
    },
  };
}
