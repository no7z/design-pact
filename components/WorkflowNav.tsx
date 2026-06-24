"use client";
import { useEffect, useState } from "react";
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

// Offset so a clicked section lands clear of the scheme bar that slides in at
// the top while scrolling.
const NAV_OFFSET = -64;

export function WorkflowNav() {
  const hasColors = useTokens((s) => s.colors.length > 0);
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

  return (
    <nav
      aria-label="工作流导航"
      onMouseLeave={() => setHovered(null)}
      className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 md:flex"
    >
      {steps.map((step) => {
        const isActive = active === step.id;
        const reveal = isActive || hovered === step.id;
        return (
          <button
            key={step.id}
            onClick={() => handleClick(step.id)}
            onMouseEnter={() => setHovered(step.id)}
            aria-current={isActive ? "step" : undefined}
            aria-label={step.label}
            className="group relative flex h-4 cursor-pointer items-center justify-end"
          >
            {/* label floats to the LEFT of the dash, only when active or hovered */}
            <span
              className={`absolute right-full mr-2.5 whitespace-nowrap text-xs leading-none transition-all duration-200 ${
                reveal ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-1 opacity-0"
              } ${
                isActive
                  ? "font-semibold text-neutral-900 dark:text-white"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {step.label}
            </span>
            <span
              className={`h-0.5 rounded-full transition-all duration-200 ${
                isActive
                  ? "w-7 bg-neutral-900 dark:bg-white"
                  : "w-3.5 bg-neutral-300 group-hover:w-5 group-hover:bg-neutral-500 dark:bg-neutral-600 dark:group-hover:bg-neutral-400"
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
