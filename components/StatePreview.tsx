"use client";
import { useMemo, useState } from "react";
import { useTokens } from "@/lib/store";
import { resolvePalette, hexA } from "@/lib/mockup";
import {
  buildRadius,
  buildDurations,
  buildOpacityScale,
  buildBorderScale,
  shadowToCss,
  EASING_PRESETS,
} from "@/lib/scales";
import { relativeLuminance } from "@/lib/color";

/**
 * Live interactive state demo: real hover / pressed / focus / disabled driven
 * by the actual opacity + motion + radius + shadow + border tokens, rendered
 * on the palette's own background. The "try it" counterpart to the static
 * opacity ladder above it.
 */
export function StatePreview() {
  const colors = useTokens((s) => s.colors);
  const globals = useTokens((s) => s.globals);
  const radius = useTokens((s) => s.radius);
  const shadow = useTokens((s) => s.shadow);
  const border = useTokens((s) => s.border);
  const opacity = useTokens((s) => s.opacity);
  const motion = useTokens((s) => s.motion);

  const palette = useMemo(() => resolvePalette(colors, globals), [colors, globals]);
  const ops = useMemo(() => {
    const scale = buildOpacityScale(opacity.base);
    const get = (name: string, fb: number) => scale.find((o) => o.name === name)?.value ?? fb;
    return {
      hover: get("hover", 0.08),
      pressed: get("pressed", 0.12),
      focus: get("focus", 0.16),
      disabled: get("disabled", 0.38),
    };
  }, [opacity.base]);

  const fastMs = useMemo(
    () => buildDurations(motion.base).find((d) => d.name === "fast")?.ms ?? 150,
    [motion.base],
  );
  const easing = EASING_PRESETS[motion.easing];
  const transition = `all ${fastMs}ms ${easing}`;
  const rd = useMemo(() => {
    const scale = buildRadius(radius.base);
    const get = (name: string, fb: number) => scale.find((r) => r.name === name)?.px ?? fb;
    return { sm: get("sm", 4), md: get("md", 8), lg: get("lg", 12) };
  }, [radius.base]);
  const bw = useMemo(() => {
    const scale = buildBorderScale(border.base);
    const get = (name: string, fb: number) => scale.find((b) => b.name === name)?.px ?? fb;
    return { default: get("default", 1), strong: get("strong", 2) };
  }, [border.base]);

  // Overlay tint direction follows the surface: dark button → lighten, light → darken.
  const primaryIsDark = relativeLuminance(palette.primary) < 0.45;
  const overlayColor = primaryIsDark ? "#ffffff" : "#000000";

  const [btn, setBtn] = useState<"idle" | "hover" | "pressed">("idle");
  const [cardHover, setCardHover] = useState(false);
  const [focused, setFocused] = useState(false);

  if (colors.length === 0) return null;

  const overlayOpacity = btn === "pressed" ? ops.pressed : btn === "hover" ? ops.hover : 0;

  return (
    <div>
      <div
        className="flex flex-wrap items-start gap-5 rounded-xl p-6"
        style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
      >
        {/* Primary button: hover / pressed overlay at token opacity */}
        <div className="flex flex-col items-start gap-1.5">
          <button
            onMouseEnter={() => setBtn("hover")}
            onMouseLeave={() => setBtn("idle")}
            onMouseDown={() => setBtn("pressed")}
            onMouseUp={() => setBtn("hover")}
            className="relative overflow-hidden text-xs font-medium"
            style={{
              background: palette.primary,
              color: primaryIsDark ? "#ffffff" : "#111111",
              borderRadius: rd.md,
              padding: "7px 18px",
              border: "none",
              cursor: "pointer",
              transition,
              transform: btn === "pressed" ? "scale(0.97)" : "scale(1)",
              boxShadow: btn === "hover" ? shadowToCss(shadow.sm) : "none",
            }}
          >
            主操作
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: overlayColor,
                opacity: overlayOpacity,
                transition,
                pointerEvents: "none",
              }}
            />
          </button>
          <span className="font-mono text-[10px]" style={{ color: palette.muted }}>
            {btn === "pressed"
              ? `pressed ${(ops.pressed * 100).toFixed(0)}%`
              : btn === "hover"
                ? `hover ${(ops.hover * 100).toFixed(0)}%`
                : "idle"}
          </span>
        </div>

        {/* Disabled twin */}
        <div className="flex flex-col items-start gap-1.5">
          <button
            disabled
            className="text-xs font-medium"
            style={{
              background: palette.primary,
              color: primaryIsDark ? "#ffffff" : "#111111",
              borderRadius: rd.md,
              padding: "7px 18px",
              border: "none",
              opacity: ops.disabled,
              cursor: "not-allowed",
            }}
          >
            主操作
          </button>
          <span className="font-mono text-[10px]" style={{ color: palette.muted }}>
            disabled {(ops.disabled * 100).toFixed(0)}%
          </span>
        </div>

        {/* Input: real focus ring at token opacity, border default→strong */}
        <div className="flex min-w-[160px] flex-col gap-1.5">
          <input
            placeholder="点击聚焦…"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full text-xs outline-none"
            style={{
              background: palette.surface,
              color: palette.fg,
              border: `${focused ? bw.strong : bw.default}px solid ${focused ? palette.primary : palette.border}`,
              borderRadius: rd.sm,
              padding: "7px 12px",
              transition,
              boxShadow: focused ? `0 0 0 3px ${hexA(palette.primary, ops.focus)}` : "none",
            }}
          />
          <span className="font-mono text-[10px]" style={{ color: palette.muted }}>
            {focused ? `focus ring ${(ops.focus * 100).toFixed(0)}%` : "blur"}
          </span>
        </div>

        {/* Card: hover elevation sm→md + lift */}
        <div className="flex min-w-[150px] flex-col gap-1.5">
          <div
            onMouseEnter={() => setCardHover(true)}
            onMouseLeave={() => setCardHover(false)}
            style={{
              background: palette.surface,
              border: `${bw.default}px solid ${palette.border}`,
              borderRadius: rd.lg,
              padding: "12px 14px",
              transition,
              cursor: "pointer",
              boxShadow: shadowToCss(cardHover ? shadow.md : shadow.sm),
              transform: cardHover ? "translateY(-2px)" : "translateY(0)",
            }}
          >
            <div className="text-xs font-medium" style={{ color: palette.fg }}>
              卡片悬停
            </div>
            <div className="mt-1 text-[10px]" style={{ color: palette.muted }}>
              阴影 sm → md
            </div>
          </div>
          <span className="font-mono text-[10px]" style={{ color: palette.muted }}>
            {cardHover ? "elevation md" : "elevation sm"}
          </span>
        </div>
      </div>
    </div>
  );
}
