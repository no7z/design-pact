import type { ColorToken, Typography } from "./store";
import { buildScale, SCALE_STEPS } from "./typography";

export type GenerateKind = "landing" | "card" | "form" | "dashboard" | "article";

export const KIND_BRIEFS: Record<GenerateKind, string> = {
  landing:
    "Marketing landing page for a fictional product that fits the palette mood. Include a hero (headline + subhead + primary CTA), a 3-up feature row, social proof / stats strip, and a footer.",
  card:
    "A grid of 3 product or content cards on a page background. Each card has an image placeholder area (CSS gradient using the palette), title, body copy, metadata row, and a secondary CTA.",
  form:
    "A focused signup or settings form: title, descriptive subhead, 4-6 fields with labels and placeholders, validation states demonstrated on one field, and a primary submit button. Show a success state hint.",
  dashboard:
    "A compact analytics dashboard panel: top bar with title and date range pills, 3 KPI tiles with delta indicators, a chart area filled with a CSS gradient or stripe pattern (no JS), and a recent-activity list.",
  article:
    "A long-form article layout: small kicker, large headline, byline, hero image placeholder, then 3-4 paragraphs with one inline pull quote and one figure with caption.",
};

export function buildSystemPrompt(): string {
  return `You are a senior product designer and frontend engineer generating a single, self-contained HTML mockup that demonstrates a design token system in use.

OUTPUT CONTRACT (strict):
- Return exactly ONE HTML document, no surrounding prose, no markdown fences.
- The document must start with <!doctype html> and end with </html>.
- Inline all CSS in a single <style> block in <head>. No <script>, no <link rel="stylesheet">, no external fonts unless the token set asks for them by name (and even then, do not <link> Google Fonts — fall back gracefully via the system stack listed in the tokens).
- Use only HTML and CSS. No JavaScript. No external network resources. No <img src="..."> to remote URLs — fake imagery with CSS gradients, geometric shapes, or unicode glyphs.
- Use semantic HTML (<header>, <main>, <section>, <article>, <footer>, etc.) and proper heading hierarchy.

TOKEN FIDELITY (the whole point):
- The user message contains a "tokens" object with colors (each carrying a hex value and proportion in [0,1]) and typography (base size, modular scale ratio, and per-step rem sizes).
- Colors may have pre-assigned semantic roles OR all be "unassigned". When all are unassigned, YOU must infer roles from proportion and color character:
  · Highest proportion → background (the canvas color)
  · If a color has very low lightness (L < 0.25 in OKLCH) or very high lightness (L > 0.85), treat it as foreground candidate
  · Strong chroma mid-proportion color → primary or accent
  · Second-highest proportion that reads well on the background → foreground/text
  · Low-proportion, desaturated → muted or border
  · Low-proportion, high-chroma → accent (use sparingly for CTAs, highlights)
- The proportion field is the primary layout signal: the dominant color occupies roughly that fraction of total visible surface area. A 0.5 background should fill ~half the page, a 0.05 accent should appear only on interactive elements.
- Pick font sizes from the provided modular scale only — do not invent new sizes. Use h1=largest, body=base, caption/small=smallest.
- Apply the listed font families verbatim.

VISUAL QUALITY (avoid AI slop):
- NEVER reach for generic AI defaults: warm cream/beige backgrounds, italic-accent serif word callouts, generic Inter/Roboto stacks unless the tokens specify them, predictable purple gradients, "lorem ipsum" copy, or stock-feeling badge clusters at the top.
- Honor the palette literally — if it is cool and dark, the page is cool and dark; if it is high-chroma, the page is high-chroma. Do not soften the brief into a beige editorial.
- Use real-feeling product copy (a fictional but plausible product name and value prop). Pick a name that fits the palette mood. Avoid: "Acme", "Lorem", "Your brand here".
- Spacing should follow a consistent rhythm derived from the typography base (e.g., multiples of 0.5rem / 1rem / 1.5rem / 2rem).
- Buttons and interactive elements should have visible affordance (clear contrast, generous padding, subtle radius). Demonstrate at least one hover state via :hover.
- Border-radius and shadow choices should be consistent across the document. Pick one radius value and one shadow elevation, reuse them.

ACCESSIBILITY:
- Body text must meet WCAG AA contrast against its background. If the supplied palette pairs would fall below 4.5:1, derive a slightly tinted variant of the foreground from OKLCH-adjacent values rather than introducing a brand-new color.
- Form fields must have associated <label> elements.

Return only the HTML document.`;
}

export function buildUserMessage(
  colors: ColorToken[],
  typography: Typography,
  kind: GenerateKind,
): string {
  const scale = buildScale(typography);
  const tokens = {
    color: colors.map((c) => ({
      role: c.role === "unassigned" ? c.id : c.role,
      hex: c.hex,
      proportion: Math.round(c.proportion * 1000) / 1000,
    })),
    typography: {
      base_px: typography.base,
      ratio: typography.ratio,
      font_family_body: typography.fontFamily,
      font_family_heading: typography.headingFamily,
      scale: scale.map((s) => ({ name: s.name, rem: s.rem })),
    },
  };
  return `Generate a "${kind}" mockup using these design tokens:

\`\`\`json
${JSON.stringify(tokens, null, 2)}
\`\`\`

Brief:
${KIND_BRIEFS[kind]}

Reminders:
- Single self-contained HTML document with inline CSS. No JS. No external requests.
- Respect color proportions: dominant ≈ ${(tokens.color[0]?.proportion ?? 0) * 100}% of the layout, accent reserved for emphasis.
- Pick sizes from the ${SCALE_STEPS.length}-step scale only.
- Make it visually distinctive — let the palette character drive the look.`;
}
