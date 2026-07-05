// Hand off palettes from the URL, so an agent can pass its colors by just
// opening a link — no manual import. The agent (via the design-pact skill)
// opens one or more `?p=` sets:
//
//   one set  → http://localhost:3000/?p=<bg>-<fg>-<primary>-<accent>-<muted>-<border>
//   several  → http://localhost:3000/?p=<setA>&p=<setB>&p=<setC>
//
// Each set is 3–6 hex colors (no leading '#') in the role order below, joined
// by '-'. A set may carry a human-readable name and description, appended with
// '~' and URL-encoded:
//
//   p=<hexes>~<name>~<description>
//   e.g. p=ffffff-1a1a1a-2f6df6-7c3aed-6b7280-e5e7eb~%E6%B5%B7%E6%B4%8B%E8%93%9D~%E5%86%B7%E9%9D%99%E4%B8%93%E4%B8%9A
//
// One set → loaded straight into the editor. Several → surfaced on the first
// screen as candidates to pick visually (mockup preview + name/description),
// since you can't judge a palette from hex codes alone.

import { useTokens, type ColorToken, type SemanticRole } from "./store";
import { useCandidates, type Candidate } from "./candidates";
import { BRANDS } from "./templates";

// Same-category real products the agent matched, passed as ?m=brand1,brand2,…
// (slugs from BRANDS). Validated against the known list — unknown slugs dropped.
function parseMatches(params: URLSearchParams): string[] {
  const raw = [...params.getAll("m"), ...params.getAll("match")].join(",");
  if (!raw) return [];
  const known = new Set<string>(BRANDS);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw.split(/[,\s]+/)) {
    const slug = s.trim().toLowerCase();
    if (slug && known.has(slug) && !seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

const ROLE_ORDER: SemanticRole[] = [
  "background",
  "foreground",
  "primary",
  "accent",
  "muted",
  "border",
];

const HEX = /^#?[0-9a-fA-F]{6}$/;

function parseSet(raw: string): Candidate | null {
  // `<hexes>~<name>~<description>` — name/description are optional. URLSearchParams
  // has already percent-decoded the value, so split on the literal '~'.
  const [colorsPart, namePart, ...descParts] = raw.split("~");
  const name = namePart?.trim() || undefined;
  const description = descParts.join("~").trim() || undefined;

  const hexes = colorsPart
    .split(/[,\-\s]+/)
    .map((s) => s.trim())
    .filter((s) => HEX.test(s))
    .map((s) => (s.startsWith("#") ? s : `#${s}`).toLowerCase())
    .slice(0, ROLE_ORDER.length);
  if (hexes.length < 3) return null; // need at least background / foreground / primary

  const palette: ColorToken[] = hexes.map((hex, i) => ({
    id: `c${i}`,
    hex,
    baseHex: hex,
    proportion: 1,
    role: ROLE_ORDER[i] ?? "unassigned",
  }));
  return { palette, name, description };
}

export function applyPaletteFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  let raws = params.getAll("p");
  if (raws.length === 0) {
    const legacy = params.get("palette");
    if (legacy) raws = [legacy];
  }
  const matches = parseMatches(params);
  if (raws.length === 0 && matches.length === 0) return false;

  const candidates = raws.map(parseSet).filter((c): c is Candidate => c !== null);
  if (candidates.length === 0 && matches.length === 0) return false;

  // Strip the query so a refresh uses the picked / persisted state.
  window.history.replaceState(null, "", window.location.pathname + window.location.hash);

  // Same-category real products — shown on the first screen regardless of how
  // many palettes were handed off.
  if (matches.length > 0) useCandidates.getState().setMatches(matches);

  if (candidates.length === 1) {
    const { palette } = candidates[0];
    useTokens.getState().loadTokens(palette, null);
    // Only auto-scroll to the editor when nothing else (matches) is worth
    // showing on the first screen.
    if (matches.length === 0) {
      setTimeout(
        () => document.getElementById("step-edit")?.scrollIntoView({ behavior: "smooth", block: "start" }),
        350,
      );
    }
  } else if (candidates.length > 1) {
    // Several candidates — let the user pick one visually on the first screen.
    useCandidates.getState().setPalettes(candidates);
  }
  return true;
}
