#!/usr/bin/env node
// design-pact — one command to set up + use the design system.
//
//   npx design-pact init [--global]                install the skill
//   npx design-pact open ["p=…&p=…"]               open the local studio
//   npx design-pact add design.md [--format css|tailwind|w3c|all] [--out .]
//   npx design-pact inspect design.md
//   npx design-pact check design.md [paths…]       audit source colors against the contract

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseDesignSystem } from "./parse";
import { tailwindFromW3C } from "./tailwind";
import { cmdInit, cmdOpen, serveStatic } from "./studio";
import { runCheck, reportCheck } from "./check";
import { t } from "./locale";

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
  if (!file)
    fail(
      t(
        "Usage: design-pact <add|inspect|check> <design.md> [options]",
        "用法：design-pact <add|inspect|check> <design.md> [选项]",
      ),
    );
  try {
    return readFileSync(resolve(file), "utf8");
  } catch {
    return fail(t(`Cannot read file: ${file}`, `读不到文件：${file}`));
  }
}

function cmdInspect(file: string | undefined) {
  const { w3c } = parseDesignSystem(readMd(file));
  const color = (w3c.color ?? {}) as Record<string, { $value?: string }>;
  const typo = (w3c.typography ?? {}) as Record<string, unknown>;
  const ext = ((typo.$extensions as Record<string, Record<string, unknown>>)?.["design-pact"]) ?? {};
  console.log(t("Design system summary", "设计系统摘要"));
  console.log(t("  Colors:", "  颜色："));
  for (const [role, v] of Object.entries(color)) console.log(`    ${role.padEnd(12)} ${v.$value}`);
  if (ext.base) console.log(t(`  Type base ${ext.base} · ratio ${ext.ratio}`, `  字号 base ${ext.base} · ratio ${ext.ratio}`));
  const fam = (typo.fontFamily as Record<string, { $value?: string }>) ?? {};
  if (fam.body) console.log(t(`  Body font ${fam.body.$value}`, `  正文字体 ${fam.body.$value}`));
  if (fam.heading) console.log(t(`  Heading font ${fam.heading.$value}`, `  标题字体 ${fam.heading.$value}`));
}

function cmdAdd(file: string | undefined, opts: Record<string, string>) {
  const ds = parseDesignSystem(readMd(file));
  const fmt = (opts.format || "all") as Format;
  if (fmt !== "all" && !FORMATS.includes(fmt))
    fail(t(`Unknown format: ${fmt} (css|tailwind|w3c|all)`, `未知格式：${fmt}（css|tailwind|w3c|all）`));
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
  console.log(t(`✓ Wrote ${outDir}: ${written.join(", ")}`, `✓ 写入 ${outDir}：${written.join(", ")}`));
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { positional, opts } = parseArgs(rest);
  switch (cmd) {
    case "init":
      return cmdInit(rest);
    case "open":
      return cmdOpen(rest);
    case "__serve": // internal: the detached background static server
      return serveStatic(Number(positional[0]) || 3000);
    case "add":
      return cmdAdd(positional[0], opts);
    case "inspect":
      return cmdInspect(positional[0]);
    case "check": {
      const ds = parseDesignSystem(readMd(positional[0]));
      const targets = positional.slice(1);
      const allow = (opts.allow ?? "").split(",").filter(Boolean);
      const result = runCheck(ds.w3c, targets.length > 0 ? targets : ["."], allow);
      process.exit(reportCheck(result));
    }
    case undefined:
    case "-h":
    case "--help":
      console.log(
        [
          t(
            "design-pact — set up and use your design system (zero backend, zero account)",
            "design-pact — 设置并使用你的设计系统（零后端、零账户）",
          ),
          "",
          t(
            "  init [--global]                                        install the skill into .claude/skills",
            "  init [--global]                                        把 skill 装进 .claude/skills",
          ),
          t(
            '  open ["p=…&p=…"]                                       start the local studio and open the browser',
            '  open ["p=…&p=…"]                                       本地起配色工具并打开浏览器',
          ),
          t(
            "  add <file> [--format css|tailwind|w3c|all] [--out .]   convert design.md into token files",
            "  add <file> [--format css|tailwind|w3c|all] [--out .]   把 design.md 转成 token 文件",
          ),
          t(
            "  inspect <file>                                         print a design-system summary",
            "  inspect <file>                                         打印设计系统摘要",
          ),
          t(
            '  check <file> [paths…] [--allow "#hex,#hex"]            find color literals outside the contract',
            '  check <file> [paths…] [--allow "#hex,#hex"]            找出契约外的颜色字面量',
          ),
          "",
          t(
            'design.md is exported from the studio ("Download design.md").',
            "design.md 由本工具网页「下载 design.md」导出。",
          ),
        ].join("\n"),
      );
      return;
    default:
      fail(t(`Unknown command: ${cmd} (init|open|add|inspect|check)`, `未知命令：${cmd}（init|open|add|inspect|check）`));
  }
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
