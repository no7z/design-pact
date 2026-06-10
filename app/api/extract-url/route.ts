import { NextRequest } from "next/server";
import { chromium } from "playwright";
import { pageExtractionScript, type PageExtraction } from "@/lib/extractFromPage";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

type Mode = "auto" | "computed" | "screenshot";

type ExtractResponse = {
  mode: "computed" | "screenshot";
  fallbackTriggered: boolean;
  fallbackReason?: string;
  extraction: PageExtraction | null;
  screenshotDataUrl: string | null;
  meta: { title: string };
};

const CHALLENGE_TITLE_PATTERNS = [
  /just a moment/i,
  /checking your browser/i,
  /access denied/i,
  /attention required/i,
  /verify you are human/i,
  /请稍候/,
  /人机验证/,
];

function isPrivateHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "0.0.0.0") return true;
  if (/^127\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  if (/^::1$/.test(hostname) || /^fc/i.test(hostname) || /^fe80/i.test(hostname)) return true;
  return false;
}

function classifyExtraction(
  ext: PageExtraction | null,
): { degenerate: boolean; reason?: string } {
  if (!ext) return { degenerate: true, reason: "无法运行 DOM 提取脚本" };
  if (ext.colors.length === 0) return { degenerate: true, reason: "未提取到任何颜色" };
  if (ext.colors.length === 1)
    return { degenerate: true, reason: "只提取到 1 个颜色,可能是反爬 / 空白页" };
  if (CHALLENGE_TITLE_PATTERNS.some((re) => re.test(ext.meta.title)))
    return { degenerate: true, reason: `疑似反爬挑战页 (title: ${ext.meta.title})` };
  // sanity: total proportion sum should be ~1; first color shouldn't dominate everything
  const top = ext.colors[0];
  if (top && top.proportion >= 0.97)
    return { degenerate: true, reason: "主色占比近 100%,内容几乎全空" };
  return { degenerate: false };
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "extract-url", 5);
  if (limited) return limited;

  let body: { url?: string; mode?: Mode };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const raw = body.url?.trim();
  if (!raw) return Response.json({ error: "missing url" }, { status: 400 });
  const mode: Mode = body.mode ?? "auto";

  let parsed: URL;
  try {
    parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return Response.json({ error: "invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return Response.json({ error: "only http/https allowed" }, { status: 400 });
  }
  if (isPrivateHost(parsed.hostname)) {
    return Response.json({ error: "private hosts not allowed" }, { status: 400 });
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    });
    const page = await ctx.newPage();
    page.setDefaultNavigationTimeout(25000);
    await page.goto(parsed.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

    let extraction: PageExtraction | null = null;
    let extractionError: string | undefined;
    if (mode !== "screenshot") {
      try {
        extraction = await page.evaluate(pageExtractionScript);
      } catch (e) {
        extractionError = e instanceof Error ? e.message : String(e);
      }
    }

    const verdict = classifyExtraction(extraction);
    const shouldScreenshot =
      mode === "screenshot" || (mode === "auto" && verdict.degenerate);

    let screenshotDataUrl: string | null = null;
    if (shouldScreenshot) {
      const buf = await page.screenshot({ type: "jpeg", quality: 80, fullPage: false });
      screenshotDataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
    }

    const title = await page.title().catch(() => "");

    const response: ExtractResponse = {
      mode: shouldScreenshot ? "screenshot" : "computed",
      fallbackTriggered: mode === "auto" && shouldScreenshot,
      fallbackReason: mode === "auto" && shouldScreenshot
        ? extractionError ?? verdict.reason
        : undefined,
      extraction,
      screenshotDataUrl,
      meta: { title },
    };

    return Response.json(response);
  } catch (e) {
    return Response.json(
      { error: `extract failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  } finally {
    await browser.close().catch(() => {});
  }
}
