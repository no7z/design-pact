"use client";
import { useState } from "react";
import { Uploader } from "./Uploader";
import { UrlFetcher } from "./UrlFetcher";

type Tab = "image" | "url";

export function InputSource() {
  const [tab, setTab] = useState<Tab>("image");
  return (
    <section className="space-y-3">
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {(
          [
            ["image", "图片"],
            ["url", "网址"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tab === key
                ? "border-neutral-900 font-medium dark:border-white"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "image" ? <Uploader /> : <UrlFetcher />}
    </section>
  );
}
