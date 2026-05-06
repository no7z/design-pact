import { InputSource } from "@/components/InputSource";
import { PaletteView } from "@/components/PaletteView";
import { Editor } from "@/components/Editor";
import { Export } from "@/components/Export";
import { Preview } from "@/components/Preview";
import { StoreHydration } from "@/components/StoreHydration";
import { VariantsBar } from "@/components/VariantsBar";
import { Warnings } from "@/components/Warnings";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900 dark:bg-black dark:text-neutral-100">
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">UI Generator · Design Tokens</h1>
          <p className="text-sm text-neutral-500">
            上传图片 / 输入网址 → 提取主色与比例 → 编辑 OKLCH / 字体规模 → 导出 W3C tokens / Tailwind / CSS / AI prompt
          </p>
        </header>

        <StoreHydration>
          <VariantsBar />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="space-y-6">
              <InputSource />
              <PaletteView />
              <Preview />
              <Export />
            </div>
            <div className="space-y-6">
              {/* <Warnings /> */}
              <Editor />
            </div>
          </div>
        </StoreHydration>
      </main>
    </div>
  );
}
