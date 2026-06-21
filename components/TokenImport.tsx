"use client";
import { useState } from "react";
import { useTokens } from "@/lib/store";
import { parseW3CTokens } from "@/lib/importTokens";

/** Import a previously exported design-tokens.json (W3C format) back into the store. */
export function TokenImport({ onSuccess }: { onSuccess?: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const applyJson = (jsonText: string) => {
    setError("");
    try {
      const parsed = parseW3CTokens(jsonText);
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
      setError(e instanceof Error ? e.message : "解析失败");
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    applyJson(await file.text());
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        导入之前从「导出 Tokens」下载的 design-tokens.json（W3C 格式），恢复整套设计系统。
      </p>
      <label className="block cursor-pointer rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 transition hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
        点击选择 .json 文件
        <input
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </label>
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="或直接粘贴 JSON 内容…"
          rows={4}
          className="w-full resize-none rounded-lg border border-neutral-300 bg-white p-3 font-mono text-xs outline-none transition focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          onClick={() => applyJson(text)}
          disabled={!text.trim()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
        >
          导入
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
