// Re-export: the shadcn mapping lives in lib/ so the studio's Export step and
// the CLI share one implementation (same pattern as tailwind's zero-drift rule).
export { shadcnFromW3C, hexToHslTriplet } from "../../../lib/shadcn";
