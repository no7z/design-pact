export type TreemapItem<T> = { value: number; data: T };
export type TreemapRect<T> = { x: number; y: number; w: number; h: number; data: T };

/**
 * Binary-split treemap: alternates h/v cuts, always produces 2D layout.
 * Better than squarify for small palettes (4–8 colors) with one dominant color.
 */
export function treemapBinary<T>(
  items: TreemapItem<T>[],
  width: number,
  height: number,
): TreemapRect<T>[] {
  if (items.length === 0 || width <= 0 || height <= 0) return [];
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const scaled = items.map((i) => ({ ...i, value: i.value / total }));
  return splitBinary(scaled, 0, 0, width, height, width >= height ? "h" : "v");
}

function splitBinary<T>(
  items: TreemapItem<T>[],
  x: number,
  y: number,
  w: number,
  h: number,
  dir: "h" | "v",
): TreemapRect<T>[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ x, y, w, h, data: items[0].data }];

  const total = items.reduce((s, i) => s + i.value, 0);
  // Find split index: first group whose cumulative area >= half total
  let acc = 0;
  let splitIdx = 1;
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].value;
    if (acc >= total / 2) { splitIdx = i + 1; break; }
  }
  const leftFrac = items.slice(0, splitIdx).reduce((s, i) => s + i.value, 0) / total;
  const nextDir: "h" | "v" = dir === "h" ? "v" : "h";

  if (dir === "h") {
    const splitW = w * leftFrac;
    return [
      ...splitBinary(items.slice(0, splitIdx), x, y, splitW, h, nextDir),
      ...splitBinary(items.slice(splitIdx), x + splitW, y, w - splitW, h, nextDir),
    ];
  } else {
    const splitH = h * leftFrac;
    return [
      ...splitBinary(items.slice(0, splitIdx), x, y, w, splitH, nextDir),
      ...splitBinary(items.slice(splitIdx), x, y + splitH, w, h - splitH, nextDir),
    ];
  }
}

/** Squarified treemap algorithm (Bruls et al.). Returns rects in same units as width/height. */
export function squarify<T>(
  items: TreemapItem<T>[],
  width: number,
  height: number,
): TreemapRect<T>[] {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0 || width <= 0 || height <= 0) return [];
  const scaled = items.map((i) => ({ ...i, value: (i.value / total) * width * height }));
  const sorted = [...scaled].sort((a, b) => b.value - a.value);
  const result: TreemapRect<T>[] = [];
  layout(sorted, [], width, height, 0, 0, result);
  return result;
}

function layout<T>(
  remaining: TreemapItem<T>[],
  row: TreemapItem<T>[],
  w: number,
  h: number,
  x: number,
  y: number,
  out: TreemapRect<T>[],
) {
  if (remaining.length === 0) {
    placeRow(row, w, h, x, y, out);
    return;
  }
  const next = remaining[0];
  const newRow = [...row, next];
  const side = Math.min(w, h);
  if (row.length === 0 || worst(newRow, side) <= worst(row, side)) {
    layout(remaining.slice(1), newRow, w, h, x, y, out);
  } else {
    const rect = placeRow(row, w, h, x, y, out);
    if (w >= h) {
      layout(remaining, [], w, h - rect.usedShort, x, y + rect.usedShort, out);
    } else {
      layout(remaining, [], w - rect.usedShort, h, x + rect.usedShort, y, out);
    }
  }
}

function worst<T>(row: TreemapItem<T>[], side: number): number {
  if (row.length === 0) return Infinity;
  const sum = row.reduce((s, i) => s + i.value, 0);
  const max = Math.max(...row.map((i) => i.value));
  const min = Math.min(...row.map((i) => i.value));
  const s2 = sum * sum;
  const w2 = side * side;
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

function placeRow<T>(
  row: TreemapItem<T>[],
  w: number,
  h: number,
  x: number,
  y: number,
  out: TreemapRect<T>[],
): { usedShort: number } {
  const sum = row.reduce((s, i) => s + i.value, 0);
  if (sum === 0 || row.length === 0) return { usedShort: 0 };
  if (w >= h) {
    const rowH = sum / w;
    let cx = x;
    for (const i of row) {
      const rw = i.value / rowH;
      out.push({ x: cx, y, w: rw, h: rowH, data: i.data });
      cx += rw;
    }
    return { usedShort: rowH };
  } else {
    const rowW = sum / h;
    let cy = y;
    for (const i of row) {
      const rh = i.value / rowW;
      out.push({ x, y: cy, w: rowW, h: rh, data: i.data });
      cy += rh;
    }
    return { usedShort: rowW };
  }
}
