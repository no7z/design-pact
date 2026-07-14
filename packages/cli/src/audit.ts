import { accessSync, constants, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeHex } from "./check";

export type AuditCategoryName = "colors" | "typography" | "spacing" | "radii";

export type ElementSnapshot = {
  selector: string;
  styles: Record<string, string>;
};

export type PageSnapshot = {
  url: string;
  title: string;
  rootFontSize: number;
  elements: ElementSnapshot[];
};

export type AuditIssue = {
  selector: string;
  property: string;
  actual: string;
  expected: string[];
};

export type AuditCategory = {
  name: AuditCategoryName;
  checked: number;
  matched: number;
  score: number;
  issues: AuditIssue[];
};

export type AuditResult = {
  version: 1;
  generatedAt: string;
  target: { url: string; title: string; elements: number };
  score: number;
  threshold: number;
  passed: boolean;
  categories: Record<AuditCategoryName, AuditCategory>;
};

type Contract = {
  colors: Set<string>;
  fontFamilies: string[];
  fontSizes: number[];
  fontWeights: number[];
  lineHeights: number[];
  letterSpacings: number[];
  spacing: number[];
  radii: number[];
};

const STYLE_KEYS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "gap",
  "rowGap",
  "columnGap",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius",
] as const;

const COLOR_PROPS = ["color", "backgroundColor"] as const;
const SPACING_PROPS = [
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "gap", "rowGap", "columnGap",
] as const;
const RADIUS_PROPS = [
  "borderTopLeftRadius", "borderTopRightRadius",
  "borderBottomRightRadius", "borderBottomLeftRadius",
] as const;

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function tokenValue(value: unknown): unknown {
  return asObject(value)?.$value;
}

function valuesFromGroup(w3c: unknown, name: string): unknown[] {
  const group = asObject(asObject(w3c)?.[name]);
  if (!group) return [];
  return Object.values(group).map(tokenValue).filter((value) => value !== undefined);
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = /^-?[\d.]+/.exec(value.trim());
  return match ? Number(match[0]) : null;
}

function dimensionPx(value: unknown, rootFontSize: number): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const match = /^(-?[\d.]+)(px|rem)?$/i.exec(value.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return match[2]?.toLowerCase() === "rem" ? n * rootFontSize : n;
}

function uniqueNumbers(values: Array<number | null>): number[] {
  return [...new Set(values.filter((value): value is number => value !== null).map((value) => Math.round(value * 1000) / 1000))];
}

function normalizeFamily(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim().replace(/^['"]|['"]$/g, "").toLowerCase())
    .filter(Boolean);
}

function normalizeCssColor(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw || raw === "transparent") return null;
  if (raw.startsWith("#")) return normalizeHex(raw);
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(raw);
  if (!match) return null;
  const alpha = match[4]?.endsWith("%") ? Number(match[4].slice(0, -1)) / 100 : Number(match[4] ?? 1);
  if (alpha === 0) return null;
  const channels = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (channels.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null;
  return "#" + channels.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
}

export function buildContract(w3c: unknown, rootFontSize = 16): Contract {
  const typography = asObject(asObject(w3c)?.typography) ?? {};
  const family = asObject(typography.fontFamily) ?? {};
  const colors = new Set<string>();
  const visitColors = (node: unknown) => {
    const object = asObject(node);
    if (!object) return;
    if (object.$type === "color" && typeof object.$value === "string") {
      const normalized = normalizeCssColor(object.$value);
      if (normalized) colors.add(normalized);
      const dark = asObject(asObject(object.$extensions)?.["design-pact"])?.dark;
      if (typeof dark === "string") {
        const normalizedDark = normalizeCssColor(dark);
        if (normalizedDark) colors.add(normalizedDark);
      }
    }
    Object.values(object).forEach(visitColors);
  };
  visitColors(w3c);
  // Shadow/scrim tokens serialize through rgba(0,0,0,…), matching the source
  // auditor's treatment of black as contract-legal.
  colors.add("#000000");

  const fontFamilies = [tokenValue(family.body), tokenValue(family.heading)]
    .filter((value): value is string => typeof value === "string")
    .flatMap(normalizeFamily);
  const fontWeights = uniqueNumbers([
    numberValue(tokenValue(typography.fontWeight)),
    numberValue(tokenValue(typography.fontWeightHeading)),
    numberValue(tokenValue(typography.fontWeightBold)),
  ]);

  return {
    colors,
    fontFamilies: [...new Set(fontFamilies)],
    fontSizes: uniqueNumbers(valuesFromGroup(typography, "fontSize").map((value) => dimensionPx(value, rootFontSize))),
    fontWeights,
    lineHeights: uniqueNumbers([numberValue(tokenValue(typography.lineHeight))]),
    letterSpacings: uniqueNumbers([numberValue(tokenValue(typography.letterSpacing))]),
    spacing: uniqueNumbers([0, ...valuesFromGroup(w3c, "spacing").map((value) => dimensionPx(value, rootFontSize))]),
    radii: uniqueNumbers([0, ...valuesFromGroup(w3c, "borderRadius").map((value) => dimensionPx(value, rootFontSize))]),
  };
}

function near(actual: number, expected: number[], tolerance = 0.2): boolean {
  return expected.some((value) => Math.abs(actual - value) <= tolerance);
}

function expectedStrings(values: Array<string | number>, suffix = ""): string[] {
  return values.slice(0, 10).map((value) => `${value}${typeof value === "number" ? suffix : ""}`);
}

function category(name: AuditCategoryName): AuditCategory {
  return { name, checked: 0, matched: 0, score: 100, issues: [] };
}

function record(cat: AuditCategory, ok: boolean, issue: AuditIssue): void {
  cat.checked++;
  if (ok) cat.matched++;
  else if (cat.issues.length < 40) cat.issues.push(issue);
}

function numericStyle(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function scoreSnapshot(snapshot: PageSnapshot, w3c: unknown, threshold = 90): AuditResult {
  const contract = buildContract(w3c, snapshot.rootFontSize || 16);
  const categories = {
    colors: category("colors"),
    typography: category("typography"),
    spacing: category("spacing"),
    radii: category("radii"),
  };

  for (const element of snapshot.elements) {
    const styles = element.styles;
    for (const property of COLOR_PROPS) {
      const actual = normalizeCssColor(styles[property] ?? "");
      if (!actual) continue;
      record(categories.colors, contract.colors.has(actual), {
        selector: element.selector,
        property,
        actual,
        expected: expectedStrings([...contract.colors]),
      });
    }
    for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
      const width = numericStyle(styles[`border${side}Width`] ?? "0") ?? 0;
      if (width <= 0 || styles[`border${side}Style`] === "none") continue;
      const property = `border${side}Color`;
      const actual = normalizeCssColor(styles[property] ?? "");
      if (!actual) continue;
      record(categories.colors, contract.colors.has(actual), {
        selector: element.selector, property, actual, expected: expectedStrings([...contract.colors]),
      });
    }

    const observedFamilies = normalizeFamily(styles.fontFamily ?? "");
    if (observedFamilies.length > 0 && contract.fontFamilies.length > 0) {
      record(categories.typography, observedFamilies.some((name) => contract.fontFamilies.includes(name)), {
        selector: element.selector,
        property: "fontFamily",
        actual: styles.fontFamily,
        expected: contract.fontFamilies,
      });
    }
    const fontSize = numericStyle(styles.fontSize ?? "");
    if (fontSize !== null && contract.fontSizes.length > 0) {
      record(categories.typography, near(fontSize, contract.fontSizes), {
        selector: element.selector, property: "fontSize", actual: styles.fontSize,
        expected: expectedStrings(contract.fontSizes, "px"),
      });
    }
    const fontWeight = numericStyle(styles.fontWeight ?? "");
    if (fontWeight !== null && contract.fontWeights.length > 0) {
      record(categories.typography, near(fontWeight, contract.fontWeights, 1), {
        selector: element.selector, property: "fontWeight", actual: styles.fontWeight,
        expected: expectedStrings(contract.fontWeights),
      });
    }
    const lineHeight = numericStyle(styles.lineHeight ?? "");
    if (lineHeight !== null && fontSize && contract.lineHeights.length > 0) {
      const ratio = lineHeight / fontSize;
      record(categories.typography, near(ratio, contract.lineHeights, 0.04), {
        selector: element.selector, property: "lineHeight", actual: `${ratio.toFixed(2)} (${styles.lineHeight})`,
        expected: expectedStrings(contract.lineHeights),
      });
    }
    const letterSpacing = numericStyle(styles.letterSpacing ?? "");
    if (letterSpacing !== null && fontSize && contract.letterSpacings.length > 0) {
      const ratio = letterSpacing / fontSize;
      record(categories.typography, near(ratio, contract.letterSpacings, 0.01), {
        selector: element.selector, property: "letterSpacing", actual: `${ratio.toFixed(3)}em`,
        expected: expectedStrings(contract.letterSpacings, "em"),
      });
    }

    for (const property of SPACING_PROPS) {
      const actual = numericStyle(styles[property] ?? "");
      if (actual === null) continue;
      record(categories.spacing, near(Math.abs(actual), contract.spacing), {
        selector: element.selector, property, actual: styles[property],
        expected: expectedStrings(contract.spacing, "px"),
      });
    }
    for (const property of RADIUS_PROPS) {
      const actual = numericStyle(styles[property] ?? "");
      if (actual === null) continue;
      record(categories.radii, near(actual, contract.radii), {
        selector: element.selector, property, actual: styles[property],
        expected: expectedStrings(contract.radii, "px"),
      });
    }
  }

  for (const cat of Object.values(categories)) {
    cat.score = cat.checked === 0 ? 100 : Math.round((cat.matched / cat.checked) * 100);
  }
  const score = Math.round(Object.values(categories).reduce((sum, cat) => sum + cat.score, 0) / 4);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    target: { url: snapshot.url, title: snapshot.title, elements: snapshot.elements.length },
    score,
    threshold,
    passed: score >= threshold,
    categories,
  };
}

function executable(pathname: string): boolean {
  try {
    accessSync(pathname, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function findBrowser(explicit?: string): string {
  if (explicit) {
    const resolved = path.resolve(explicit);
    if (executable(resolved)) return resolved;
    throw new Error(`Browser executable is not usable: ${resolved}`);
  }
  const candidates = [
    process.env.CHROME_PATH,
    ...(process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
      : process.platform === "win32"
        ? [
            path.join(process.env.PROGRAMFILES ?? "", "Google/Chrome/Application/chrome.exe"),
            path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Microsoft/Edge/Application/msedge.exe"),
          ]
        : []),
  ].filter((value): value is string => Boolean(value));
  const pathNames = process.platform === "win32"
    ? ["chrome.exe", "msedge.exe"]
    : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    for (const name of pathNames) candidates.push(path.join(dir, name));
  }
  const found = candidates.find(executable);
  if (found) return found;
  throw new Error("No Chrome/Chromium browser found. Install Chrome or pass --browser /path/to/executable.");
}

function targetUrl(target: string): string {
  if (/^https?:\/\//i.test(target) || target.startsWith("file://")) return target;
  const resolved = path.resolve(target);
  if (existsSync(resolved)) return pathToFileURL(resolved).href;
  throw new Error(`Target must be an http(s) URL or an existing local HTML file: ${target}`);
}

export async function capturePage(target: string, browserPath?: string, timeout = 15_000): Promise<PageSnapshot> {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ executablePath: findBrowser(browserPath), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(targetUrl(target), { waitUntil: "domcontentloaded", timeout });
    await page.waitForTimeout(250);
    return await page.evaluate((styleKeys) => {
      const selectorFor = (element: Element): string => {
        if ((element as HTMLElement).id) return `#${CSS.escape((element as HTMLElement).id)}`;
        const parts: string[] = [];
        let current: Element | null = element;
        while (current && current !== document.body && parts.length < 4) {
          let part = current.tagName.toLowerCase();
          const classes = [...current.classList].slice(0, 2).map((name) => `.${CSS.escape(name)}`).join("");
          if (classes) part += classes;
          else if (current.parentElement) {
            const siblings = [...current.parentElement.children].filter((sibling) => sibling.tagName === current!.tagName);
            if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
          }
          parts.unshift(part);
          current = current.parentElement;
        }
        return `body > ${parts.join(" > ")}`;
      };
      const elements: ElementSnapshot[] = [];
      for (const element of [...document.body.querySelectorAll("*")].slice(0, 2500)) {
        if (["SCRIPT", "STYLE", "LINK", "META", "HEAD"].includes(element.tagName)) continue;
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        if (computed.display === "none" || computed.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) continue;
        const styles: Record<string, string> = {};
        const styleRecord = computed as unknown as Record<string, string>;
        for (const key of styleKeys) styles[key] = styleRecord[key] ?? "";
        elements.push({ selector: selectorFor(element), styles });
      }
      return {
        url: location.href,
        title: document.title,
        rootFontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
        elements,
      };
    }, STYLE_KEYS);
  } finally {
    await browser.close();
  }
}

export async function runAudit(
  w3c: unknown,
  target: string,
  options: { threshold?: number; browserPath?: string; timeout?: number } = {},
): Promise<AuditResult> {
  const threshold = options.threshold ?? 90;
  const snapshot = await capturePage(target, options.browserPath, options.timeout);
  return scoreSnapshot(snapshot, w3c, threshold);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderAuditHtml(result: AuditResult): string {
  const categoryCards = Object.values(result.categories).map((cat) => `
    <section class="category">
      <div class="category-head"><h2>${escapeHtml(cat.name)}</h2><strong>${cat.score}</strong></div>
      <div class="bar"><span style="width:${cat.score}%"></span></div>
      <p>${cat.matched} / ${cat.checked} runtime values match the contract</p>
      ${cat.issues.length === 0 ? '<div class="ok">No sampled violations.</div>' : `
      <table><thead><tr><th>Element</th><th>Property</th><th>Actual</th><th>Expected tokens</th></tr></thead><tbody>
        ${cat.issues.slice(0, 20).map((issue) => `<tr><td><code>${escapeHtml(issue.selector)}</code></td><td>${escapeHtml(issue.property)}</td><td><code>${escapeHtml(issue.actual)}</code></td><td>${escapeHtml(issue.expected.join(", "))}</td></tr>`).join("")}
      </tbody></table>`}
    </section>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>design-pact audit · ${result.score}/100</title>
<style>
:root{color-scheme:dark;--bg:#0b0d10;--panel:#14171c;--line:#292e36;--text:#f3f5f7;--muted:#9aa3ad;--good:#58d68d;--bad:#ff6b6b;--accent:#8da2fb}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 ui-sans-serif,system-ui,sans-serif;padding:32px}.wrap{max-width:1180px;margin:auto}
header{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;margin-bottom:28px}.score{width:130px;height:130px;border-radius:50%;display:grid;place-items:center;border:10px solid ${result.passed ? "var(--good)" : "var(--bad)"};font-size:38px;font-weight:800}.score small{display:block;font-size:12px;color:var(--muted);text-align:center}.meta h1{margin:0 0 8px;font-size:28px}.meta p{margin:4px 0;color:var(--muted)}.status{color:${result.passed ? "var(--good)" : "var(--bad)"};font-weight:700}
.category{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px;margin:16px 0}.category-head{display:flex;justify-content:space-between;align-items:center}.category h2{margin:0;text-transform:capitalize}.category strong{font-size:24px}.category p,.ok{color:var(--muted)}.bar{height:7px;background:#222730;border-radius:99px;overflow:hidden}.bar span{display:block;height:100%;background:var(--accent)}
table{width:100%;border-collapse:collapse;margin-top:14px}th,td{text-align:left;vertical-align:top;border-top:1px solid var(--line);padding:9px}th{color:var(--muted);font-size:11px;text-transform:uppercase}code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#c5d1ff;overflow-wrap:anywhere}
footer{color:var(--muted);font-size:12px;margin-top:22px}
</style></head><body><div class="wrap">
<header><div class="score"><div>${result.score}<small>/ 100</small></div></div><div class="meta"><h1>Design Pact Compliance</h1><p class="status">${result.passed ? "PASS" : "FAIL"} · threshold ${result.threshold}</p><p>${escapeHtml(result.target.title || result.target.url)}</p><p>${escapeHtml(result.target.url)} · ${result.target.elements} visible elements sampled</p></div></header>
${categoryCards}
<footer>Generated ${escapeHtml(result.generatedAt)}. Runtime computed styles were checked locally; no page data was uploaded.</footer>
</div></body></html>`;
}

export function auditSummary(result: AuditResult): string {
  const categories = Object.values(result.categories)
    .map((cat) => `${cat.name} ${cat.score}`)
    .join(" · ");
  return `${result.passed ? "✓" : "✗"} Design Pact Compliance ${result.score}/100 (threshold ${result.threshold})\n  ${categories}`;
}
