// tailwind.config.js is the one format not embedded verbatim in the md, so we
// regenerate it — reusing the web app's own tailwindConfig() so it can never
// drift. The W3C json block is parsed back into token objects (partials merged
// over the shared defaults), then fed to the same function the web UI uses.

import { tailwindConfig, type ResolvedToken } from "../../../lib/export";
import { parseW3CTokens } from "../../../lib/importTokens";
import {
  defaultTypography,
  defaultSpacing,
  defaultRadius,
  defaultMotion,
  defaultBorder,
  defaultOpacity,
  defaultShadow,
} from "../../../lib/tokens-core";

export function tailwindFromW3C(jsonText: string): string {
  const p = parseW3CTokens(jsonText);
  // The exported tokens are already resolved, so displayHex === hex.
  const resolved: ResolvedToken[] = p.colors.map((c) => ({ ...c, displayHex: c.hex }));
  return tailwindConfig(
    resolved,
    { ...defaultTypography, ...p.typography },
    { ...defaultSpacing, ...p.spacing },
    { ...defaultRadius, ...p.radius },
    p.shadow ?? defaultShadow,
    { ...defaultMotion, ...p.motion },
    { ...defaultBorder, ...p.border },
    { ...defaultOpacity, ...p.opacity },
  );
}
