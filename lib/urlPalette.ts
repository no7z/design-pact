// Hand off palettes from the URL, so an agent can pass its colors by just
// opening a link — no manual import. The agent (via the design-system skill)
// opens one or more `?p=` sets:
//
//   one set  → http://localhost:3000/?p=<bg>-<fg>-<primary>-<accent>-<muted>-<border>
//   several  → http://localhost:3000/?p=<setA>&p=<setB>&p=<setC>
//
// where each segment is a 6-digit hex without the leading '#', in role order
// below (3–6 colors; missing trailing roles are simply absent).
//
// One set → loaded straight into the editor. Several → surfaced on the first
// screen as candidates to pick visually (mockup preview), since you can't judge
// a palette from hex codes alone.

import { useTokens, type ColorToken, type SemanticRole } from "./store";
import { useCandidates } from "./candidates";

const ROLE_ORDER: SemanticRole[] = [
  "background",
  "foreground",
  "primary",
  "accent",
  "muted",
  "border",
];

const HEX = /^#?[0-9a-fA-F]{6}$/;

function parseSet(raw: string): ColorToken[] | null {
  const hexes = raw
    .split(/[,\-\s]+/)
    .map((s) => s.trim())
    .filter((s) => HEX.test(s))
    .map((s) => (s.startsWith("#") ? s : `#${s}`).toLowerCase())
    .slice(0, ROLE_ORDER.length);
  if (hexes.length < 3) return null; // need at least background / foreground / primary
  return hexes.map((hex, i) => ({
    id: `c${i}`,
    hex,
    baseHex: hex,
    proportion: 1,
    role: ROLE_ORDER[i] ?? "unassigned",
  }));
}

export function applyPaletteFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  let raws = params.getAll("p");
  if (raws.length === 0) {
    const legacy = params.get("palette");
    if (legacy) raws = [legacy];
  }
  if (raws.length === 0) return false;

  const palettes = raws.map(parseSet).filter((p): p is ColorToken[] => p !== null);
  if (palettes.length === 0) return false;

  // Strip the query so a refresh uses the picked / persisted state.
  window.history.replaceState(null, "", window.location.pathname + window.location.hash);

  if (palettes.length === 1) {
    useTokens.getState().loadTokens(palettes[0], null);
    setTimeout(
      () => document.getElementById("step-edit")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      350,
    );
  } else {
    // Several candidates — let the user pick one visually on the first screen.
    useCandidates.getState().setPalettes(palettes);
  }
  return true;
}
