"use client";
import { useCallback } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import { StoreHydration } from "@/components/StoreHydration";
import { DescribeStep } from "@/components/DescribeStep";
import { WorkflowNav } from "@/components/WorkflowNav";
import { Editor } from "@/components/Editor";
import { Preview } from "@/components/Preview";
import { TypographyStep } from "@/components/TypographyStep";
import { StyleStep } from "@/components/StyleStep";
import { MotionStep } from "@/components/MotionStep";
import { Export } from "@/components/Export";
import { useTokens } from "@/lib/store";

export default function Home() {
  return (
    <StoreHydration>
      <ReactLenis root options={{ duration: 1.2, smoothWheel: true, wheelMultiplier: 1 }}>
        <Workflow />
      </ReactLenis>
    </StoreHydration>
  );
}

function Workflow() {
  const lenis = useLenis();
  const scrollToStep = useCallback(
    (id: string) => {
      // Defer to next frame so newly-rendered sections (e.g. WorkArea after colors load)
      // are mounted before we resolve the selector.
      requestAnimationFrame(() => {
        if (lenis) lenis.scrollTo(`#${id}`, { duration: 1.2 });
        else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [lenis],
  );
  const goToEditor = useCallback(() => scrollToStep("step-edit"), [scrollToStep]);

  return (
    <main className="min-h-screen bg-neutral-50 font-sans text-neutral-900 dark:bg-black dark:text-neutral-100">
      <WorkflowNav />
      <DescribeStep onLoaded={goToEditor} />
      <WorkArea />
    </main>
  );
}

function WorkArea() {
  const hasColors = useTokens((s) => s.colors.length > 0);
  if (!hasColors) return null;

  return (
    <>
      <section
        id="step-edit"
        className="border-t border-neutral-200 px-6 py-16 dark:border-neutral-800"
      >
        <div className="mx-auto w-full max-w-[1440px] lg:pl-28">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
            Step 2 / 5
          </p>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <header className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">调色</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  色轮做整体协调，点击色块编辑单色。
                </p>
              </header>
              <Editor />
            </div>
            <div className="space-y-4">
              <header className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">预览</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  切换 mockup 类型查看不同场景效果。
                </p>
              </header>
              <Preview />
            </div>
          </div>
        </div>
      </section>

      <section
        id="step-typography"
        className="border-t border-neutral-200 px-6 py-16 dark:border-neutral-800"
      >
        <div className="mx-auto w-full max-w-[1440px] lg:pl-28">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
            Step 3 / 5
          </p>
          <header className="mb-6 space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">字体</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              模板里的字号阶梯已自动载入。拖动 base 改正文字号，ratio 控制 H1→Caption 的递增比。
            </p>
          </header>
          <TypographyStep />
        </div>
      </section>

      <section
        id="step-tokens"
        className="border-t border-neutral-200 px-6 py-16 dark:border-neutral-800"
      >
        <div className="mx-auto w-full max-w-[1440px] lg:pl-28">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
            Step 4 / 5
          </p>
          <header className="mb-6 space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">细节</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              调节间距阶梯、圆角和阴影深度。base 滑条统一缩放整套 spacing；圆角统一从 sm 派生到 full；阴影默认按 intensity 缩放，可展开高级独立调三档。
            </p>
          </header>
          <StyleStep />
        </div>
      </section>

      <section
        id="step-motion"
        className="border-t border-neutral-200 px-6 py-16 dark:border-neutral-800"
      >
        <div className="mx-auto w-full max-w-[1440px] lg:pl-28">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
            Step 5 / 5
          </p>
          <header className="mb-6 space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">动效</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              base 滑条控制整套时长阶梯（micro → page），缓动曲线统一应用到所有过渡。
            </p>
          </header>
          <MotionStep />
        </div>
      </section>

      <section
        id="step-export"
        className="border-t border-neutral-200 px-6 py-16 dark:border-neutral-800"
      >
        <div className="mx-auto w-full max-w-[1440px] space-y-6 lg:pl-28">
          <header className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">导出</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              4 种格式：W3C JSON、Tailwind 配置、CSS 变量、AI prompt。
            </p>
          </header>
          <Export />
        </div>
      </section>
    </>
  );
}
