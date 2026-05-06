"use client";
import { useCallback, useState } from "react";
import { extractPalette } from "@/lib/extract";
import { useTokens } from "@/lib/store";

export function Uploader() {
  const setColors = useTokens((s) => s.setColors);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setErr(null);
      try {
        const dataUrl = await readAsDataUrl(file);
        setPreview(dataUrl);
        const palette = await extractPalette(file, 6);
        setColors(palette);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to extract palette");
      } finally {
        setBusy(false);
      }
    },
    [setColors],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
    if (item) {
      const file = item.getAsFile();
      if (file) handleFile(file);
    }
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onPaste={onPaste}
      tabIndex={0}
      className="relative grid place-items-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 text-center transition hover:border-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500"
      style={{ minHeight: 220 }}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="uploaded" className="max-h-48 rounded-lg shadow" />
      ) : (
        <div className="space-y-2">
          <div className="text-base font-medium">拖入图片 / 粘贴图片 / 选择文件</div>
          <div className="text-sm text-neutral-500">提取主色 + 比例,生成 design tokens</div>
        </div>
      )}
      <input
        suppressHydrationWarning
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      {busy && (
        <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm dark:bg-black/70">
          提取中…
        </div>
      )}
      {err && (
        <div className="absolute bottom-2 left-2 right-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {err}
        </div>
      )}
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
