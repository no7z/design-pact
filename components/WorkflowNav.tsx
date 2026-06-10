"use client";
import { Fragment, useEffect, useState } from "react";
import { useLenis } from "lenis/react";
import { useTokens } from "@/lib/store";

type Step = { id: string; label: string };

const ALL_STEPS: Step[] = [
  { id: "step-describe", label: "描述" },
  { id: "step-edit", label: "调色" },
  { id: "step-typography", label: "字体" },
  { id: "step-tokens", label: "细节" },
  { id: "step-motion", label: "动效" },
  { id: "step-export", label: "导出" },
];

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
    if (lenis) lenis.scrollTo(`#${id}`, { duration: 1.2 });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="工作流导航"
      className="fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
    >
      <ul className="flex flex-col">
        {steps.map((step, i) => {
          const isActive = active === step.id;
          const isLast = i === steps.length - 1;
          return (
            <Fragment key={step.id}>
              <li className="flex items-center gap-3">
                <button
                  onClick={() => handleClick(step.id)}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={step.label}
                  className={`h-3 w-3 shrink-0 rounded-full border transition ${
                    isActive
                      ? "border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white"
                      : "border-neutral-400 bg-white hover:border-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:border-neutral-300"
                  }`}
                />
                <button
                  onClick={() => handleClick(step.id)}
                  className={`text-xs leading-none transition ${
                    isActive
                      ? "font-semibold text-neutral-900 dark:text-white"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  {step.label}
                </button>
              </li>
              {!isLast && (
                <li aria-hidden className="ml-1.5 h-10 w-px bg-neutral-300 dark:bg-neutral-700" />
              )}
            </Fragment>
          );
        })}
      </ul>
    </nav>
  );
}
