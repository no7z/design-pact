"use client";
import { useState } from "react";
import { useTokens } from "@/lib/store";
import { parseDesignSystemTokens } from "@/lib/importTokens";
import { useTr } from "@/lib/i18n";

/** Import a previously exported design.md back into the store. */
export function TokenImport({ onSuccess }: { onSuccess?: () => void }) {
  const tr = useTr();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const applyText = (raw: string) => {
    setError("");
    try {
      const parsed = parseDesignSystemTokens(raw);
      const s = useTokens.getState();
      s.loadTokens(parsed.colors, null);
      if (parsed.typography) s.setTypography(parsed.typography);
      if (parsed.spacing) s.setSpacing(parsed.spacing);
      if (parsed.radius) s.setRadius(parsed.radius);
      if (parsed.motion) s.setMotion(parsed.motion);
      if (parsed.border) s.setBorder(parsed.border);
      if (parsed.opacity) s.setOpacity(parsed.opacity);
      if (parsed.shadow) useTokens.setState({ shadow: parsed.shadow });
      if (parsed.darkHexes) {
        // loadTokens re-ids colors to c0..cN in array order — key overrides accordingly.
        const overrides: Record<string, string> = {};
        parsed.darkHexes.forEach((hex, i) => {
          if (hex) overrides[`c${i}`] = hex;
        });
        useTokens.setState({ dark: { enabled: true, overrides } });
      }
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("Parse failed", "解析失败"));
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    applyText(await file.text());
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void onFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {tr("Import a design.md you downloaded earlier to restore the whole design system.", "导入之前下载的 design.md，恢复整套设计系统。")}
      </p>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`block cursor-pointer rounded-lg border border-dashed px-4 py-6 text-center text-sm transition ${
          dragging
            ? "border-neutral-900 bg-neutral-50 text-neutral-900 dark:border-white dark:bg-neutral-900 dark:text-white"
            : "border-neutral-300 text-neutral-500 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
        }`}
      >
        {dragging ? tr("Release to import design.md", "松开导入 design.md") : tr("Click to choose, or drag design.md here", "点击选择，或拖拽 design.md 到这里")}
        <input
          type="file"
          accept=".md,text/markdown"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </label>
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tr("Or paste design.md contents directly…", "或直接粘贴 design.md 内容…")}
          rows={4}
          className="w-full resize-none rounded-lg border border-neutral-300 bg-white p-3 font-mono text-xs outline-none transition focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={() => applyText(text)}
          disabled={!text.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          {tr("Import", "导入")}
        </button>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
