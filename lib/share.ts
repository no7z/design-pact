// URL-hash sharing: the whole token set serializes into `#s=<base64url(JSON)>`
// so a design system can be sent as a plain link with zero backend.

import { useTokens } from "./store";
import type {
  ColorToken,
  Typography,
  Globals,
  Spacing,
  Radius,
  Shadow,
  Motion,
  Border,
  Opacity,
} from "./store";

const VERSION = 1;

type SharePayload = {
  v: number;
  colors: ColorToken[];
  typography: Typography;
  globals: Globals;
  spacing: Spacing;
  radius: Radius;
  shadow: Shadow;
  motion: Motion;
  border: Border;
  opacity: Opacity;
  description: string;
  activeBrand: string | null;
};

export function buildShareUrl(): string {
  const s = useTokens.getState();
  const payload: SharePayload = {
    v: VERSION,
    colors: s.colors,
    typography: s.typography,
    globals: s.globals,
    spacing: s.spacing,
    radius: s.radius,
    shadow: s.shadow,
    motion: s.motion,
    border: s.border,
    opacity: s.opacity,
    description: s.description,
    activeBrand: s.activeBrand,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${location.origin}${location.pathname}#s=${encoded}`;
}

/**
 * If the current URL carries a share payload, load it into the store
 * (overriding persisted state) and strip the hash. Returns whether a
 * payload was applied.
 */
export function applyShareFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const m = /[#&]s=([A-Za-z0-9_-]+)/.exec(window.location.hash);
  if (!m) return false;

  let payload: SharePayload;
  try {
    payload = JSON.parse(base64UrlDecode(m[1])) as SharePayload;
  } catch {
    return false;
  }
  if (payload?.v !== VERSION || !Array.isArray(payload.colors)) return false;

  const hexRe = /^#[0-9a-fA-F]{6}$/;
  const colors = payload.colors.filter(
    (c) => c && typeof c === "object" && hexRe.test(c.hex) && hexRe.test(c.baseHex),
  );
  if (colors.length === 0) return false;

  const obj = (x: unknown) => (x && typeof x === "object" ? (x as object) : undefined);
  const cur = useTokens.getState();
  useTokens.setState({
    colors,
    typography: { ...cur.typography, ...obj(payload.typography) },
    globals: { ...cur.globals, ...obj(payload.globals) },
    spacing: { ...cur.spacing, ...obj(payload.spacing) },
    radius: { ...cur.radius, ...obj(payload.radius) },
    shadow: { ...cur.shadow, ...obj(payload.shadow) },
    motion: { ...cur.motion, ...obj(payload.motion) },
    border: { ...cur.border, ...obj(payload.border) },
    opacity: { ...cur.opacity, ...obj(payload.opacity) },
    description: typeof payload.description === "string" ? payload.description : cur.description,
    activeBrand: typeof payload.activeBrand === "string" ? payload.activeBrand : null,
  });

  // Strip the hash so subsequent refreshes use the (now persisted) local state.
  history.replaceState(null, "", window.location.pathname + window.location.search);
  return true;
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(b64: string): string {
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
