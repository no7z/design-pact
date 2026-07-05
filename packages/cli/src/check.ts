// design-pact check — verify source files honor the design.md contract.
//
// The agent workflow's closing loop: an agent generates UI against design.md,
// then `check` proves the output introduced no colors outside the token set.
// Deterministic, offline, no AI — same philosophy as the rest of the tool.
//
// v1 checks color literals only (hex + rgb()/rgba()). Length/scale checking is
// deliberately out of scope: px values legitimately appear in layout code, so
// flagging them would drown real violations in noise.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { t } from "./locale";

export type Violation = {
  file: string; // relative to the scanned root
  line: number; // 1-based
  literal: string; // as written in the source
  hex: string; // normalized #rrggbb
};

/** Lowercase #rrggbb; expands #rgb/#rgba, strips the alpha of #rrggbbaa. */
export function normalizeHex(raw: string): string | null {
  const h = raw.replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3,4}$/.test(h)) {
    return "#" + h.slice(0, 3).split("").map((c) => c + c).join("");
  }
  if (/^[0-9a-f]{6}$/.test(h)) return "#" + h;
  if (/^[0-9a-f]{8}$/.test(h)) return "#" + h.slice(0, 6);
  return null;
}

function rgbToHex(r: number, g: number, b: number): string | null {
  if ([r, g, b].some((v) => !Number.isInteger(v) || v < 0 || v > 255)) return null;
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Every color the contract declares: $type:"color" values plus their dark pairs. */
export function tokenHexes(w3c: unknown): Set<string> {
  const out = new Set<string>();
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (obj.$type === "color" && typeof obj.$value === "string") {
      const hex = normalizeHex(obj.$value);
      if (hex) out.add(hex);
      const dark = (
        (obj.$extensions as Record<string, unknown> | undefined)?.["design-pact"] as
          | Record<string, unknown>
          | undefined
      )?.dark;
      if (typeof dark === "string") {
        const dh = normalizeHex(dark);
        if (dh) out.add(dh);
      }
    }
    for (const v of Object.values(obj)) visit(v);
  };
  visit(w3c);
  // Pure black/white in shadows & scrims come from the shadow tokens
  // (rgba(0,0,0,…) serialization), so black is always contract-legal.
  out.add("#000000");
  return out;
}

const HEX_LITERAL = /#[0-9a-fA-F]{3,8}\b/g;
const RGB_LITERAL = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)/g;

/** Scan one file's text; returns violations with 1-based line numbers. */
export function scanText(
  text: string,
  allowed: Set<string>,
): { line: number; literal: string; hex: string }[] {
  const found: { line: number; literal: string; hex: string }[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    for (const m of lineText.matchAll(HEX_LITERAL)) {
      const hex = normalizeHex(m[0]);
      if (hex && !allowed.has(hex)) found.push({ line: i + 1, literal: m[0], hex });
    }
    for (const m of lineText.matchAll(RGB_LITERAL)) {
      const hex = rgbToHex(Number(m[1]), Number(m[2]), Number(m[3]));
      if (hex && !allowed.has(hex)) found.push({ line: i + 1, literal: m[0], hex });
    }
  }
  return found;
}

const SCAN_EXT = new Set([
  "css", "scss", "sass", "less",
  "tsx", "jsx", "ts", "js", "mjs", "cjs",
  "html", "vue", "svelte", "astro",
]);

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out",
  "coverage", "vendor", ".vercel", ".turbo",
]);

export function collectFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name.startsWith(".") && name !== ".") continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (!SKIP_DIRS.has(name)) walk(full);
      } else if (st.isFile()) {
        const ext = name.split(".").pop() ?? "";
        if (SCAN_EXT.has(ext) && st.size < 2 * 1024 * 1024) files.push(full);
      }
    }
  };
  const st = statSync(root);
  if (st.isFile()) return [root];
  walk(root);
  return files;
}

export function runCheck(
  w3c: unknown,
  targets: string[],
  allowExtra: string[] = [],
): { violations: Violation[]; filesScanned: number; tokens: Set<string> } {
  const allowed = tokenHexes(w3c);
  for (const raw of allowExtra) {
    const hex = normalizeHex(raw.trim());
    if (hex) allowed.add(hex);
  }
  const violations: Violation[] = [];
  let filesScanned = 0;
  for (const target of targets) {
    const root = resolve(target);
    for (const file of collectFiles(root)) {
      filesScanned++;
      let text: string;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const rel = relative(process.cwd(), file) || file;
      for (const v of scanText(text, allowed)) {
        violations.push({ file: rel, ...v });
      }
    }
  }
  return { violations, filesScanned, tokens: allowed };
}

export function reportCheck(result: ReturnType<typeof runCheck>): number {
  const { violations, filesScanned } = result;
  if (violations.length === 0) {
    console.log(
      "✓ " +
        t(
          `${filesScanned} file(s) scanned — every color literal is in the design.md contract.`,
          `扫描 ${filesScanned} 个文件——所有颜色字面量都在 design.md 契约内。`,
        ),
    );
    return 0;
  }
  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }
  console.error(
    "✗ " +
      t(
        `${violations.length} color(s) outside the contract in ${byFile.size} file(s):`,
        `发现 ${violations.length} 个契约外颜色，分布在 ${byFile.size} 个文件：`,
      ),
  );
  for (const [file, list] of byFile) {
    console.error(`\n  ${file}`);
    for (const v of list.slice(0, 20)) {
      console.error(`    ${String(v.line).padStart(4)}  ${v.literal}`);
    }
    if (list.length > 20) {
      console.error("    " + t(`… and ${list.length - 20} more`, `… 另有 ${list.length - 20} 处`));
    }
  }
  console.error(
    "\n" +
      t(
        "Fix: reference tokens via var(--color-…), or derive shades in OKLCH (lightness only). Intentional exceptions: --allow \"#hex,#hex\".",
        "修复：改用 var(--color-…) 引用 token，或在 OKLCH 里只调亮度派生色阶。刻意例外可用 --allow \"#hex,#hex\" 放行。",
      ),
  );
  return 1;
}
