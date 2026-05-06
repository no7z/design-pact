export type ExtractedColor = { hex: string; proportion: number };

const toHex = (n: number) => n.toString(16).padStart(2, "0");
const rgbHex = (r: number, g: number, b: number) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

/**
 * Extract a palette from an image with proportions.
 * Strategy: downsample to ~200px on long edge, quantize each channel into 5-bit buckets,
 * then merge top N buckets by population. Returns up to `k` colors with normalized proportions.
 */
export async function extractPalette(file: File | Blob, k = 6): Promise<ExtractedColor[]> {
  const img = await loadImage(file);
  const max = 200;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  // bucket by 5-bit channels (32^3 = 32768 buckets) and accumulate true RGB for centroid
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const cur = buckets.get(key);
    if (cur) {
      cur.r += r;
      cur.g += g;
      cur.b += b;
      cur.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }

  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  // merge perceptually close buckets greedily
  const merged: { r: number; g: number; b: number; n: number }[] = [];
  const minDist = 38;
  for (const b of sorted) {
    const cr = b.r / b.n;
    const cg = b.g / b.n;
    const cb = b.b / b.n;
    const close = merged.find((m) => {
      const mr = m.r / m.n;
      const mg = m.g / m.n;
      const mb = m.b / m.n;
      return Math.hypot(mr - cr, mg - cg, mb - cb) < minDist;
    });
    if (close) {
      close.r += b.r;
      close.g += b.g;
      close.b += b.b;
      close.n += b.n;
    } else {
      merged.push({ ...b });
    }
    if (merged.length >= k * 4) break;
  }

  const top = merged.slice(0, k);
  const total = top.reduce((s, b) => s + b.n, 0) || 1;
  return top.map((b) => ({
    hex: rgbHex(Math.round(b.r / b.n), Math.round(b.g / b.n), Math.round(b.b / b.n)),
    proportion: b.n / total,
  }));
}

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
