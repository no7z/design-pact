// Load a palette straight from the URL, so an agent can hand off its colors by
// just opening a link — no manual import. The agent (via the design-system
// skill) opens:
//
//   http://localhost:3000/?p=<bg>-<fg>-<primary>-<accent>-<muted>-<border>
//
// where each segment is a 6-digit hex without the leading '#'. On load the
// colors drop straight into the editor. Roles are positional in the order
// below; 3–6 colors are accepted (missing trailing roles are simply absent).

import { useTokens, type ColorToken, type SemanticRole } from "./store";

const ROLE_ORDER: SemanticRole[] = [
  "background",
  "foreground",
  "primary",
  "accent",
  "muted",
  "border",
];

const HEX = /^#?[0-9a-fA-F]{6}$/;

export function applyPaletteFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("p") ?? params.get("palette");
  if (!raw) return false;

  const hexes = raw
    .split(/[,\-\s]+/)
    .map((s) => s.trim())
    .filter((s) => HEX.test(s))
    .map((s) => (s.startsWith("#") ? s : `#${s}`).toLowerCase())
    .slice(0, ROLE_ORDER.length);

  if (hexes.length < 3) return false; // need at least background / foreground / primary

  const tokens: ColorToken[] = hexes.map((hex, i) => ({
    id: `c${i}`,
    hex,
    baseHex: hex,
    proportion: 1,
    role: ROLE_ORDER[i] ?? "unassigned",
  }));
  useTokens.getState().loadTokens(tokens, null);

  // Strip the query so a refresh uses the now-persisted state.
  window.history.replaceState(null, "", window.location.pathname + window.location.hash);

  // Jump to the editor once WorkArea has mounted with the new colors.
  setTimeout(
    () => document.getElementById("step-edit")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    350,
  );
  return true;
}
