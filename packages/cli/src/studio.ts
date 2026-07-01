// The local-studio side of the CLI: install the skill (init) and serve the
// bundled static app (open / __serve). Zero external deps — Node built-ins only,
// so a fresh machine needs nothing beyond `npx @no7z/design-system`.

import { createServer, get as httpGet } from "node:http";
import { mkdir, copyFile } from "node:fs/promises";
import { createReadStream, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { spawn } from "node:child_process";
import { homedir } from "node:os";

// dist/cli.js → package root (web/ and SKILL.md ship at the root via `files`).
const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const WEB_DIR = join(PKG, "web");
const SKILL_SRC = join(PKG, "SKILL.md");
const PORT = Number(process.env.PORT) || 3000;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── init ──────────────────────────────────────────────────────────────────────

export async function cmdInit(args: string[]) {
  const global = args.includes("--global");
  const base = global ? join(homedir(), ".claude") : join(process.cwd(), ".claude");
  const dir = join(base, "skills", "design-system");
  if (!existsSync(SKILL_SRC)) {
    console.error("✗ 包内缺少 SKILL.md（发布前需先运行 bundle）。");
    process.exit(1);
  }
  await mkdir(dir, { recursive: true });
  await copyFile(SKILL_SRC, join(dir, "SKILL.md"));
  console.log(`✓ 已安装 design-system skill → ${join(dir, "SKILL.md")}`);
  console.log(
    global
      ? "  （全局：对所有项目可用）"
      : "  （项目级：仅当前项目可用，加 --global 可装到 ~/.claude）",
  );
  console.log("\n下一步：在 Claude Code / Cursor 里说「用 design-system skill」。");
  console.log("它会问清方向、产出配色，并用 `npx @no7z/design-system open` 在本地打开配色工具。");
}

// ── static server ─────────────────────────────────────────────────────────────

function fileForUrl(urlPath: string): string | null {
  let p = decodeURIComponent((urlPath || "/").split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  const full = normalize(join(WEB_DIR, p));
  if (!full.startsWith(WEB_DIR)) return null; // path-traversal guard
  if (existsSync(full) && statSync(full).isFile()) return full;
  if (!extname(full)) return join(WEB_DIR, "index.html"); // SPA fallback
  return null;
}

export function serveStatic(port: number): Promise<void> {
  const server = createServer((req, res) => {
    const file = fileForUrl(req.url || "/");
    if (!file || !existsSync(file)) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("404");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve());
  });
}

function probe(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = httpGet({ host: "localhost", port, path: "/", timeout: 700 }, (r) => {
      r.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser(url: string) {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    /* headless — the printed URL is the fallback */
  }
}

// ── open ──────────────────────────────────────────────────────────────────────

export async function cmdOpen(args: string[]) {
  if (!existsSync(join(WEB_DIR, "index.html"))) {
    console.error("✗ 包内缺少静态网页（发布前需先运行 bundle）。");
    process.exit(1);
  }
  const raw = args.find((a) => !a.startsWith("-")) || "";
  const q = raw ? (raw.startsWith("?") ? raw : "?" + raw) : "";
  const url = `http://localhost:${PORT}/${q}`;

  if (await probe(PORT)) {
    console.log(`↻ 复用本地实例\n打开（已带配色）: ${url}`);
    openBrowser(url);
    return;
  }

  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "__serve", String(PORT)], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  for (let i = 0; i < 40; i++) {
    if (await probe(PORT)) break;
    await sleep(150);
  }
  console.log(`本地配色工具已启动（端口 ${PORT}，后台运行）。`);
  console.log(`打开（已带配色）: ${url}`);
  openBrowser(url);
}
