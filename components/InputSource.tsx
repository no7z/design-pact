"use client";
import { useState } from "react";
import { Uploader } from "./Uploader";
import { UrlFetcher } from "./UrlFetcher";
import { AllTemplatesBrowser } from "./AllTemplatesBrowser";

type Tab = "template" | "image" | "url";

export function InputSource({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [tab, setTab] = useState<Tab>("template");

  return (
    <section className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-3 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {(
          [
            ["template", "模板"],
            ["image", "图片"],
            ["url", "网址"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${
              tab === key
                ? "border-neutral-900 font-medium dark:border-white"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "template" ? (
        <AllTemplatesBrowser onPicked={() => onSuccess?.()} />
      ) : tab === "image" ? (
        <Uploader onSuccess={() => onSuccess?.()} />
      ) : (
        <UrlFetcher onSuccess={() => onSuccess?.()} />
      )}
    </section>
  );
}
