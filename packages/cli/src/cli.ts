#!/usr/bin/env node
// design-pact — one command to set up + use the design system.
//
//   npx design-pact init [--global]                install the skill
//   npx design-pact open ["p=…&p=…"]               open the local studio
//   npx design-pact add design.md [--format css|tailwind|w3c|shadcn|all] [--out .]
//   npx design-pact inspect design.md
//   npx design-pact check design.md [paths…]       audit source colors against the contract
//   npx design-pact import [paths…] [--out design.md]  derive a draft design.md from existing code

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseDesignSystem } from "./parse";
import { tailwindFromW3C } from "./tailwind";
import { shadcnFromW3C } from "./shadcn";
import { cmdInit, cmdOpen, serveStatic } from "./studio";
import { runCheck, reportCheck } from "./check";
import { scanProject, draftToMarkdown, studioQuery } from "./import";
import { auditSummary, renderAuditHtml, runAudit } from "./audit";
import { t } from "./locale";

type Format = "css" | "tailwind" | "w3c" | "shadcn" | "all";
const FORMATS: Format[] = ["css", "tailwind", "w3c", "shadcn"];

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

// Flags that never take a value — without this list they'd swallow the
// following positional argument.
const BOOL_FLAGS = new Set(["force", "global"]);

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const opts: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const name = a.slice(2);
      opts[name] = BOOL_FLAGS.has(name) ? "true" : argv[++i] ?? "";
    } else positional.push(a);
  }
  return { positional, opts };
}

function readMd(file: string | undefined): string {
  if (!file)
    fail(
      t(
        "Usage: design-pact <add|inspect|check|audit> <design.md> [options]",
        "用法：design-pact <add|inspect|check|audit> <design.md> [选项]",
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
    fail(t(`Unknown format: ${fmt} (css|tailwind|w3c|shadcn|all)`, `未知格式：${fmt}（css|tailwind|w3c|shadcn|all）`));
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
    else if (f === "shadcn") write("shadcn-theme.css", shadcnFromW3C(ds.w3cText));
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
    case "audit": {
      const ds = parseDesignSystem(readMd(positional[0]));
      const target = positional[1];
      if (!target) fail(t(
        "Usage: design-pact audit <design.md> <url-or-html> [--out report.html] [--json report.json] [--threshold 90]",
        "用法：design-pact audit <design.md> <网址或HTML> [--out report.html] [--json report.json] [--threshold 90]",
      ));
      const threshold = Number(opts.threshold || 90);
      if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
        fail(t("--threshold must be between 0 and 100.", "--threshold 必须在 0 到 100 之间。"));
      }
      const timeout = Number(opts.timeout || 15_000);
      const result = await runAudit(ds.w3c, target, {
        threshold,
        browserPath: opts.browser,
        timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : 15_000,
      });
      const outPath = resolve(opts.out || "design-pact-audit.html");
      writeFileSync(outPath, renderAuditHtml(result), "utf8");
      if (opts.json) writeFileSync(resolve(opts.json), JSON.stringify(result, null, 2) + "\n", "utf8");
      console.log(auditSummary(result));
      console.log(t(`  HTML report: ${outPath}`, `  HTML 报告：${outPath}`));
      if (opts.json) console.log(t(`  JSON report: ${resolve(opts.json)}`, `  JSON 报告：${resolve(opts.json)}`));
      if (!result.passed) process.exitCode = 1;
      return;
    }
    case "import": {
      const targets = positional.length > 0 ? positional : ["."];
      const outPath = resolve(opts.out || "design.md");
      if (existsSync(outPath) && !opts.force)
        fail(t(`${outPath} already exists — pass --force to overwrite.`, `${outPath} 已存在——用 --force 覆盖。`));
      const draft = scanProject(targets);
      writeFileSync(outPath, draftToMarkdown(draft), "utf8");
      console.log(t(
        `✓ Draft design.md written to ${outPath} (${draft.filesScanned} file(s) scanned)`,
        `✓ design.md 草稿已写入 ${outPath}（扫描 ${draft.filesScanned} 个文件）`,
      ));
      console.log(t("  Detected palette:", "  识别出的色板："));
      const provenanceLabel: Record<string, [string, string]> = {
        named: ["from a named variable", "来自命名变量"],
        heuristic: ["by usage heuristic", "按使用频率推断"],
        derived: ["derived (no signal found)", "派生（未找到信号）"],
      };
      for (const c of draft.colors) {
        const [en, zh] = provenanceLabel[c.provenance];
        console.log(`    ${c.role.padEnd(12)} ${c.hex}  ${t(en, zh)}`);
      }
      const q = studioQuery(draft);
      console.log("\n" + t(
        "Review it visually before adopting — heuristic/derived roles deserve a look:",
        "采用前建议先到 studio 里过目——推断/派生的角色值得确认：",
      ));
      console.log(`  https://design-pact.vercel.app/?${q}`);
      console.log(t(`  or locally: npx design-pact open "${q}"`, `  或本地打开：npx design-pact open "${q}"`));
      return;
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
            "  add <file> [--format css|tailwind|w3c|shadcn|all] [--out .]  convert design.md into token files",
            "  add <file> [--format css|tailwind|w3c|shadcn|all] [--out .]  把 design.md 转成 token 文件",
          ),
          t(
            "  inspect <file>                                         print a design-system summary",
            "  inspect <file>                                         打印设计系统摘要",
          ),
          t(
            '  check <file> [paths…] [--allow "#hex,#hex"]            find color literals outside the contract',
            '  check <file> [paths…] [--allow "#hex,#hex"]            找出契约外的颜色字面量',
          ),
          t(
            "  audit <file> <url|html> [--threshold 90] [--out report.html]  audit runtime styles against the contract",
            "  audit <file> <网址|HTML> [--threshold 90] [--out report.html]  按契约审核运行态样式",
          ),
          t(
            "  import [paths…] [--out design.md] [--force]            derive a draft design.md from existing code",
            "  import [paths…] [--out design.md] [--force]            从现有代码反推 design.md 草稿",
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
      fail(t(`Unknown command: ${cmd} (init|open|add|inspect|check|audit|import)`, `未知命令：${cmd}（init|open|add|inspect|check|audit|import）`));
  }
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
