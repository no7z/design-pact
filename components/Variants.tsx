"use client";
import { useState } from "react";
import { useTokens, computedHex, type Variant } from "@/lib/store";

export function Variants({ onCompare }: { onCompare: () => void }) {
  const colors = useTokens((s) => s.colors);
  const variants = useTokens((s) => s.variants);
  const activeId = useTokens((s) => s.activeVariantId);
  const saveAs = useTokens((s) => s.saveAsVariant);
  const updateActive = useTokens((s) => s.updateActiveVariant);
  const loadVariant = useTokens((s) => s.loadVariant);
  const renameVariant = useTokens((s) => s.renameVariant);
  const deleteVariant = useTokens((s) => s.deleteVariant);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  const canSave = colors.length > 0;
  const activeVariant = variants.find((v) => v.id === activeId);

  const handleSave = () => {
    const name = window.prompt("变体名称?", `变体 ${variants.length + 1}`);
    if (name === null) return;
    saveAs(name);
  };

  const handleDelete = (v: Variant) => {
    if (window.confirm(`删除「${v.name}」?`)) deleteVariant(v.id);
  };

  const startRename = (v: Variant) => {
    setRenamingId(v.id);
    setDraftName(v.name);
  };
  const commitRename = () => {
    if (renamingId) renameVariant(renamingId, draftName);
    setRenamingId(null);
  };

  if (variants.length === 0 && !canSave) return null;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          变体 ({variants.length})
        </h3>
        <div className="flex gap-1.5">
          {activeVariant && (
            <button
              onClick={updateActive}
              className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              title="把当前编辑覆盖到这个变体"
            >
              更新「{activeVariant.name}」
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded bg-neutral-900 px-2 py-1 text-xs text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            另存为
          </button>
          <button
            onClick={onCompare}
            disabled={variants.length < 2}
            className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            对比
          </button>
        </div>
      </div>

      {variants.length === 0 ? (
        <p className="text-xs text-neutral-500">
          编辑颜色 / 字体后点「另存为」保存当前 token 集为一个变体。
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const active = v.id === activeId;
            const dots = v.colors.slice(0, 6);
            return (
              <li
                key={v.id}
                className={`group flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-1 text-xs transition ${
                  active
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
                }`}
              >
                <span className="flex">
                  {dots.map((c) => (
                    <span
                      key={c.id}
                      className="-ml-1 h-4 w-4 rounded-full border border-white/50 first:ml-0 dark:border-black/50"
                      style={{ background: computedHex(c, v.globals) }}
                    />
                  ))}
                </span>
                {renamingId === v.id ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="w-24 rounded bg-transparent px-1 outline-none ring-1 ring-neutral-400"
                  />
                ) : (
                  <button
                    onClick={() => loadVariant(v.id)}
                    onDoubleClick={() => startRename(v)}
                    title="点击加载,双击重命名"
                    className="px-0.5"
                  >
                    {v.name}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(v)}
                  className="ml-1 rounded-full px-1.5 text-neutral-500 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  title="删除"
                  aria-label="删除变体"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
