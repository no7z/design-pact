// Extract the canonical blocks from a design.md file.
//
// The file (produced by the web app's designSystemMarkdown) carries:
//  - one fenced ```css block whose body is the verbatim `:root { … }` contract
//  - one fenced ```json block whose body is the W3C Design Tokens set
// Both are byte-for-byte what the web app emitted, so extracting them keeps the
// CLI's css/json output zero-drift from the source of truth.

import { t } from "./locale";

export type ParsedDesignSystem = {
  /** Verbatim `:root { … }` (+ optional @media dark) CSS, ready as tokens.css. */
  rootCss: string;
  /** Parsed W3C Design Tokens object (the ```json block). */
  w3c: Record<string, unknown>;
  /** Raw ```json text, ready as design-tokens.json. */
  w3cText: string;
};

function fence(md: string, lang: string): string | null {
  // Match the first ```<lang> … ``` block. [\s\S] so it spans newlines.
  const re = new RegExp("```" + lang + "\\s*\\n([\\s\\S]*?)\\n```", "i");
  const m = md.match(re);
  return m ? m[1] : null;
}

export function parseDesignSystem(md: string): ParsedDesignSystem {
  if (!/^---\s*\ndesign-pact:/m.test(md) && !md.includes("# Design system")) {
    throw new Error(
      t(
        "This does not look like a design.md (missing the design-pact frontmatter / Design system heading).",
        "这看起来不是 design.md（缺少 design-pact frontmatter / Design system 标题）。",
      ),
    );
  }

  const rootCss = fence(md, "css");
  if (!rootCss || !rootCss.includes(":root")) {
    throw new Error(t("No :root CSS contract block (```css) found.", "未找到 :root CSS 契约块（```css）。"));
  }

  const w3cText = fence(md, "json");
  if (!w3cText) {
    throw new Error(t("No machine-readable tokens block (```json) found.", "未找到机器可读 tokens 块（```json）。"));
  }
  let w3c: Record<string, unknown>;
  try {
    w3c = JSON.parse(w3cText);
  } catch {
    throw new Error(t("The machine-readable tokens block is not valid JSON.", "机器可读 tokens 块不是有效 JSON。"));
  }

  return { rootCss: rootCss.trim() + "\n", w3c, w3cText: w3cText.trim() + "\n" };
}
