#!/usr/bin/env node
// design-system CLI — turn a design-system.md (exported from the design-system
// web app) into project token files. Pure/deterministic: no AI, no network.
//
//   npx <pkg> add design-system.md [--format css|tailwind|w3c|all] [--out .]
//   npx <pkg> inspect design-system.md

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseDesignSystem } from "./parse";
import { tailwindFromW3C } from "./tailwind";

type Format = "css" | "tailwind" | "w3c" | "all";
const FORMATS: Format[] = ["css", "tailwind", "w3c"];

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const opts: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) opts[a.slice(2)] = argv[++i] ?? "";
    else positional.push(a);
  }
  return { positional, opts };
}

function readMd(file: string | undefined): string {
  if (!file) fail("用法：design-system <add|inspect> <design-system.md> [选项]");
  try {
    return readFileSync(resolve(file), "utf8");
  } catch {
    return fail(`读不到文件：${file}`);
  }
}

function cmdInspect(file: string | undefined) {
  const { w3c } = parseDesignSystem(readMd(file));
  const color = (w3c.color ?? {}) as Record<string, { $value?: string }>;
  const typo = (w3c.typography ?? {}) as Record<string, unknown>;
  const ext = ((typo.$extensions as Record<string, Record<string, unknown>>)?.["design-system"]) ?? {};
  console.log("设计系统摘要");
  console.log("  颜色：");
  for (const [role, v] of Object.entries(color)) console.log(`    ${role.padEnd(12)} ${v.$value}`);
  if (ext.base) console.log(`  字号 base ${ext.base} · ratio ${ext.ratio}`);
  const fam = (typo.fontFamily as Record<string, { $value?: string }>) ?? {};
  if (fam.body) console.log(`  正文字体 ${fam.body.$value}`);
  if (fam.heading) console.log(`  标题字体 ${fam.heading.$value}`);
}

function cmdAdd(file: string | undefined, opts: Record<string, string>) {
  const ds = parseDesignSystem(readMd(file));
  const fmt = (opts.format || "all") as Format;
  if (fmt !== "all" && !FORMATS.includes(fmt)) fail(`未知格式：${fmt}（css|tailwind|w3c|all）`);
  const want = fmt === "all" ? FORMATS : [fmt];

  const outDir = resolve(opts.out || ".");
  mkdirSync(outDir, { recursive: true });

  const written: string[] = [];
  const write = (name: string, content: string) => {
    writeFileSync(join(outDir, name), content, "utf8");
    written.push(name);
  };

  for (const f of want) {
    if (f === "css") write("tokens.css", ds.rootCss);
    else if (f === "w3c") write("design-tokens.json", ds.w3cText);
    else if (f === "tailwind") write("tailwind.config.js", tailwindFromW3C(ds.w3cText));
  }
  console.log(`✓ 写入 ${outDir}：${written.join(", ")}`);
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { positional, opts } = parseArgs(rest);
  switch (cmd) {
    case "add":
      return cmdAdd(positional[0], opts);
    case "inspect":
      return cmdInspect(positional[0]);
    case undefined:
    case "-h":
    case "--help":
      console.log(
        [
          "design-system — 把 design-system.md 转成项目 token 文件",
          "",
          "  add <file> [--format css|tailwind|w3c|all] [--out .]   生成 token 文件",
          "  inspect <file>                                         打印设计系统摘要",
          "",
          "design-system.md 由 design-system 网页「下载 design-system.md」导出。",
        ].join("\n"),
      );
      return;
    default:
      fail(`未知命令：${cmd}（add|inspect）`);
  }
}

try {
  main();
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
