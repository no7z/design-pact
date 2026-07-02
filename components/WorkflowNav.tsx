"use client";
import { useEffect, useState } from "react";
import { useLenis } from "lenis/react";
import { useTokens } from "@/lib/store";
import { useTr } from "@/lib/i18n";

type Step = { id: string; en: string; zh: string };

const ALL_STEPS: Step[] = [
  { id: "step-describe", en: "Start", zh: "开始" },
  { id: "step-edit", en: "Colors", zh: "调色" },
  { id: "step-typography", en: "Type", zh: "字体" },
  { id: "step-tokens", en: "Details", zh: "细节" },
  { id: "step-motion", en: "Motion", zh: "动效" },
  { id: "step-export", en: "Export", zh: "导出" },
];

// Offset so a clicked section lands clear of the scheme bar that slides in at
// the top while scrolling.
const NAV_OFFSET = -64;

export function WorkflowNav() {
  const hasColors = useTokens((s) => s.colors.length > 0);
  const tr = useTr();
  const lenis = useLenis();
  const [active, setActive] = useState<string>("step-describe");
  const [hovered, setHovered] = useState<string | null>(null);

  const steps = hasColors ? ALL_STEPS : ALL_STEPS.slice(0, 1);

  // Position-based active tracking: the active step is the LAST section whose
  // top has scrolled above a line near the top of the viewport. Monotonic with
  // scroll position, so it never flickers between two competing sections.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const LINE = 96;
    let raf = 0;

    const compute = () => {
      raf = 0;
      let current = steps[0].id;
      for (const s of steps) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - LINE <= 0) current = s.id;
        else break; // sections are in document order — stop at the first below the line
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = steps[steps.length - 1].id;
      }
      setActive(current);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [steps]);

  const handleClick = (id: string) => {
    if (lenis) {
      lenis.scrollTo(`#${id}`, { duration: 1.2, offset: NAV_OFFSET });
    } else {
      const el = document.getElementById(id);
      if (el) window.scrollTo({ top: el.offsetTop + NAV_OFFSET, behavior: "smooth" });
    }
  };

  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.id === active),
  );
  const activeStep = steps[activeIndex];
  const activeLabel = activeStep ? tr(activeStep.en, activeStep.zh) : "";

  return (
    <>
      {/* Narrower than the right rail's threshold (< 1600, i.e. whenever the
          rail would overlap the 1440-max content): a thin bottom progress bar —
          segments fill as you go, the current step name fades in on change.
          Bottom so it clears the top scheme bar and stays in the thumb zone. */}
      <nav
        aria-label={tr("Workflow navigation", "工作流导航")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/90 backdrop-blur min-[1600px]:hidden dark:border-neutral-800 dark:bg-black/85"
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex flex-1 items-center gap-1.5">
            {steps.map((step, i) => {
              const isActive = active === step.id;
              const isPast = i < activeIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => handleClick(step.id)}
                  aria-label={tr(step.en, step.zh)}
                  aria-current={isActive ? "step" : undefined}
                  className="flex-1 cursor-pointer py-1.5"
                >
                  <span
                    className={`block h-1 rounded-full transition-all duration-300 ease-out ${
                      isActive
                        ? "bg-neutral-900 dark:bg-white"
                        : isPast
                          ? "bg-neutral-400 dark:bg-neutral-500"
                          : "bg-neutral-200 dark:bg-neutral-700"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <span
            key={active}
            className="animate-nav-label shrink-0 text-xs font-medium text-neutral-900 tabular-nums dark:text-white"
          >
            {activeLabel}
            <span className="ml-1 text-neutral-400">
              {activeIndex + 1}/{steps.length}
            </span>
          </span>
        </div>
      </nav>

      {/* Wide screens only (≥1600 so the rail sits in the margin, never over the
          1440-max content). Minimal vertical rail on the right: the ACTIVE step
          shows its label (replacing the dash); the rest are short dashes that
          lengthen + reveal their label on hover. */}
      <nav
        aria-label={tr("Workflow navigation", "工作流导航")}
        onMouseLeave={() => setHovered(null)}
        className="fixed right-6 top-24 z-40 hidden flex-col items-end gap-3 min-[1600px]:flex"
      >
      {steps.map((step) => {
        const isActive = active === step.id;
        const showLabel = isActive || hovered === step.id;
        return (
          <button
            key={step.id}
            onClick={() => handleClick(step.id)}
            onMouseEnter={() => setHovered(step.id)}
            aria-current={isActive ? "step" : undefined}
            aria-label={tr(step.en, step.zh)}
            className="group relative flex h-4 cursor-pointer items-center justify-end"
          >
            {/* Both rendered and cross-faded by opacity so the dash↔label swap
                (on hover or when the active step changes) is a smooth fade. The
                label is in flow (defines the row width, no layout shift); the
                dash is absolute at the right edge. */}
            <span
              className={`whitespace-nowrap text-xs leading-none transition-opacity duration-200 ${
                showLabel ? "opacity-100" : "opacity-0"
              } ${
                isActive
                  ? "font-semibold text-neutral-900 dark:text-white"
                  : "text-neutral-700 dark:text-neutral-200"
              }`}
            >
              {tr(step.en, step.zh)}
            </span>
            <span
              aria-hidden
              className={`pointer-events-none absolute right-0 top-1/2 h-0.5 w-3.5 -translate-y-1/2 rounded-full bg-neutral-300 transition-opacity duration-200 dark:bg-neutral-600 ${
                showLabel ? "opacity-0" : "opacity-100"
              }`}
            />
          </button>
        );
      })}
      </nav>
    </>
  );
}
