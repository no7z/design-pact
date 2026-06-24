"use client";
import { Fragment, useEffect, useState } from "react";
import { useLenis } from "lenis/react";
import { useTokens } from "@/lib/store";

type Step = { id: string; label: string };

const ALL_STEPS: Step[] = [
  { id: "step-describe", label: "开始" },
  { id: "step-edit", label: "调色" },
  { id: "step-typography", label: "字体" },
  { id: "step-tokens", label: "细节" },
  { id: "step-motion", label: "动效" },
  { id: "step-export", label: "导出" },
];

// Offset so a clicked section lands below the fixed top bar, not under it.
const NAV_OFFSET = -64;

export function WorkflowNav() {
  const hasColors = useTokens((s) => s.colors.length > 0);
  const lenis = useLenis();
  const [active, setActive] = useState<string>("step-describe");

  const steps = hasColors ? ALL_STEPS : ALL_STEPS.slice(0, 1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { threshold: [0.3, 0.5, 0.7] },
    );
    steps.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [steps]);

  const handleClick = (id: string) => {
    if (lenis) {
      lenis.scrollTo(`#${id}`, { duration: 1.2, offset: NAV_OFFSET });
    } else {
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.offsetTop + NAV_OFFSET, behavior: "smooth" });
    }
  };

  return (
    <nav
      aria-label="工作流导航"
      className="fixed inset-x-0 top-0 z-40 border-b border-neutral-200 bg-white/85 backdrop-blur dark:border-neutral-800 dark:bg-black/80"
    >
      <ol className="scrollbar-subtle mx-auto flex max-w-[1440px] items-center gap-1 overflow-x-auto px-6 py-2.5">
        {steps.map((step, i) => {
          const isActive = active === step.id;
          const isLast = i === steps.length - 1;
          return (
            <Fragment key={step.id}>
              <li>
                <button
                  onClick={() => handleClick(step.id)}
                  aria-current={isActive ? "step" : undefined}
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs leading-none transition ${
                    isActive
                      ? "bg-neutral-900 font-semibold text-white dark:bg-white dark:text-black"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition ${
                      isActive ? "bg-white dark:bg-black" : "bg-neutral-400 dark:bg-neutral-600"
                    }`}
                  />
                  {step.label}
                </button>
              </li>
              {!isLast && (
                <li aria-hidden className="h-px w-4 shrink-0 bg-neutral-300 dark:bg-neutral-700" />
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
