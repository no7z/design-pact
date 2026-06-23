#!/usr/bin/env node
// ui-generator — install the design-system skill and launch the local studio.
//
//   npx ui-generator init [--global]      install the skill into .claude/skills
//   npx ui-generator open ["p=…&p=…"]     serve the bundled app locally + open it
//
// Zero dependencies (Node built-ins only). The static app + SKILL.md are bundled
// in this package, so there's nothing to clone, no dev server, no account.

import { createServer, get as httpGet } from "node:http";
import { mkdir, copyFile } from "node:fs/promises";
import { createReadStream, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import { spawn } from "node:child_process";
import { homedir } from "node:os";

const PKG = dirname(dirname(fileURLToPath(import.meta.url))); // package root
const WEB_DIR = join(PKG, "web");
const SKILL_SRC = join(PKG, "SKILL.md");
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
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

// ── init ────────────────────────────────────────────────────────────────────

async function cmdInit(args) {
  const global = args.includes("--global");
  const base = global ? join(homedir(), ".claude") : join(process.cwd(), ".claude");
  const dir = join(base, "skills", "design-system");
  if (!existsSync(SKILL_SRC)) {
    console.error("✗ 包内缺少 SKILL.md（发布前需先运行 npm run bundle）。");
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
  console.log("它会问清产品方向、产出配色，并用 `npx ui-generator open` 在本地打开配色工具。");
}

// ── static server ─────────────────────────────────────────────────────────────

function fileForUrl(urlPath) {
  let p = decodeURIComponent((urlPath || "/").split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  const full = normalize(join(WEB_DIR, p));
  if (!full.startsWith(WEB_DIR)) return null; // path-traversal guard
  if (existsSync(full) && statSync(full).isFile()) return full;
  // Single-page app: unknown non-asset paths fall back to index.html.
  if (!extname(full)) return join(WEB_DIR, "index.html");
  return null;
}

function startServer(port) {
  const server = createServer((req, res) => {
    const file = fileForUrl(req.url);
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
    server.listen(port, () => resolve(server));
  });
}

function probe(port) {
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

function openBrowser(url) {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    /* headless / no browser — the printed URL is the fallback */
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── open ──────────────────────────────────────────────────────────────────────

async function cmdOpen(args) {
  if (!existsSync(join(WEB_DIR, "index.html"))) {
    console.error("✗ 包内缺少静态网页（发布前需先运行 npm run bundle）。");
    process.exit(1);
  }
  const raw = args.find((a) => !a.startsWith("-")) || "";
  const q = raw ? (raw.startsWith("?") ? raw : "?" + raw) : "";
  const url = `http://localhost:${PORT}/${q}`;

  // Reuse an instance already serving on PORT (this command is safe to call
  // repeatedly during a session).
  if (await probe(PORT)) {
    console.log(`↻ 复用本地实例\n打开（已带配色）: ${url}`);
    openBrowser(url);
    return;
  }

  // Spawn the server detached so this command returns immediately and the studio
  // keeps running in the background.
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

// ── help ────────────────────────────────────────────────────────────────────

function help() {
  console.log(`ui-generator — 本地设计系统工具 + Claude Code / Cursor skill

  npx ui-generator init [--global]     把 design-system skill 装进 .claude/skills
  npx ui-generator open ["p=…&p=…"]    本地起静态服务并打开配色工具（带上 ?p= 参数）

零后端、零账户：静态网页和 skill 都打包在本包内，无需克隆仓库或 dev server。`);
}

// ── dispatch ──────────────────────────────────────────────────────────────────

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case "init":
    await cmdInit(rest);
    break;
  case "open":
    await cmdOpen(rest);
    break;
  case "__serve": {
    // Internal: the detached background server.
    const port = Number(rest[0]) || PORT;
    await startServer(port).catch(() => process.exit(1));
    break;
  }
  case "help":
  case "--help":
  case "-h":
  case undefined:
    help();
    break;
  default:
    console.error(`未知命令: ${cmd}\n`);
    help();
    process.exit(1);
}
