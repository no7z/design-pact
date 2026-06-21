// Turn the on-page <svg> design-system board into downloadable artifacts.
// Zero dependencies: SVG is serialized directly; PNG is rasterized via canvas.

export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  const body = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
}

function svgDimensions(svgString: string): { w: number; h: number } {
  const m = svgString.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (m) return { w: parseFloat(m[1]), h: parseFloat(m[2]) };
  return { w: 1200, h: 1200 };
}

export function svgToPngBlob(svgString: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { w, h } = svgDimensions(svgString);
    const img = new Image();
    img.decoding = "sync";
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("无法创建 canvas 上下文"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG 生成失败"));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("SVG 光栅化失败"));
    img.src = url;
  });
}

export function htmlStyleGuide(svgString: string, title: string): string {
  // Strip the XML declaration so the SVG embeds cleanly inside HTML.
  const inlineSvg = svgString.replace(/^<\?xml[^>]*\?>\s*/, "");
  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #f5f5f5; font-family: ui-sans-serif, system-ui, sans-serif; }
  .wrap { max-width: 1240px; margin: 0 auto; padding: 32px 16px; }
  .card { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; }
  .card svg { width: 100%; height: auto; display: block; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">${inlineSvg}</div>
  </div>
</body>
</html>
`;
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
