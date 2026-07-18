---
design-pact: 1
generated: 2026-07-18
---

# Design system

## Machine-readable tokens — COPY THIS BLOCK VERBATIM
Paste the `:root` below into your `<style>` exactly as written, then reference
every value through `var(--…)`. This block is the single source of truth.

Hard rules:
- Do NOT redefine, round, rescale, or re-derive any value. Copy it character for character.
- Do NOT introduce colors, fonts, font-sizes, spacing, radii, or shadows that are not declared here.
- If you need a lighter/darker shade of a color, derive it in OKLCH by changing lightness only — keep hue and chroma fixed. Do not invent a new hue.
- Every length in your CSS must be a `var(--…)` reference. Do NOT convert a `px` token to `rem` (or any other unit) — reference it as-is. Spacing, radius, and border vars are in `px`; font sizes are in `rem`; keep each as declared.

```css
:root {
  --color-background: #ffffff;
  --color-foreground: #16181d;
  --color-primary: #2f6df6;
  --color-accent: #7c3aed;
  --color-muted: #6b7280;
  --color-border: #e5e7eb;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-info: #2563eb;
  --font-family-body: Inter, system-ui, sans-serif;
  --font-family-heading: Inter, system-ui, sans-serif;
  --font-weight: 400;
  --font-weight-heading: 600;
  --font-weight-bold: 700;
  --line-height: 1.5;
  --letter-spacing: 0em;
  --font-size-h1: 3.052rem;
  --font-size-h2: 2.441rem;
  --font-size-h3: 1.953rem;
  --font-size-h4: 1.563rem;
  --font-size-h5: 1.25rem;
  --font-size-body: 1rem;
  --font-size-small: 0.8rem;
  --font-size-caption: 0.64rem;
  --spacing-xxs: 4px;
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-xxl: 48px;
  --spacing-section: 96px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  --border-default: 1px;
  --border-strong: 2px;
  --shadow-sm: 0 1px 4px 0 rgba(0,0,0,0.040);
  --shadow-md: 0 4px 12px 0 rgba(0,0,0,0.080);
  --shadow-lg: 0 8px 24px 0 rgba(0,0,0,0.120);
  --duration-micro: 80ms;
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-page: 500ms;
  --easing-standard: cubic-bezier(0.0, 0, 0.2, 1);
  --opacity-hover: 0.08;
  --opacity-pressed: 0.12;
  --opacity-focus: 0.16;
  --opacity-disabled: 0.38;
  --opacity-overlay: 0.5;
}
```

The prose below explains the intent behind these tokens. When prose and the `:root` block disagree, the block wins.

---

When generating UI from this token set, respect the following proportions and roles. The percentages reflect how much of the source design each color occupies — use them as a guide for surface area in the output.

## Color palette
- background: #ffffff (60.0% of source image)
- foreground: #16181d (20.0% of source image)
- primary: #2f6df6 (8.0% of source image)
- accent: #7c3aed (5.0% of source image)
- muted: #6b7280 (4.0% of source image)
- border: #e5e7eb (3.0% of source image)

The dominant background should occupy roughly 60% of the layout.

Bind colors to roles exactly as the design tool renders them — do NOT swap primary and accent:

- **primary (#2f6df6)** is the main interactive fill: primary buttons / CTAs, active nav item, key links, the logo mark. This is the button color.
- **accent (#7c3aed)** is for SECONDARY emphasis only: badges/chips, chart & graphic accents, small highlights — typically 5% or less of any screen. Do not use accent as the primary button fill.
- **muted** for secondary/placeholder text, **border** for hairlines and dividers.

## Typography
Base size 16px, modular scale ratio 1.25.

- h1: 3.052rem (48.83px)
- h2: 2.441rem (39.06px)
- h3: 1.953rem (31.25px)
- h4: 1.563rem (25px)
- h5: 1.25rem (20px)
- body: 1rem (16px)
- small: 0.8rem (12.8px)
- caption: 0.64rem (10.24px)

Body family: Inter, system-ui, sans-serif
Heading family: Inter, system-ui, sans-serif
Line-height: 1.5, letter-spacing: 0em. There are three explicit font weights — bind them by role, and never let the browser default an element's weight:

- **`--font-weight` (400)** → body text, labels, and any non-heading copy.
- **`--font-weight-heading` (600)** → all headings h1–h5. Set this on every heading; do NOT leave headings at the body weight.
- **`--font-weight-bold` (700)** → emphasis only: primary CTA labels, `<strong>`, badges.

## Spacing
Base unit 4px. Use this 8-step scale for padding/margin/gap:

- xxs: 4px
- xs: 8px
- sm: 12px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px
- section: 96px

Bind padding & gaps to these steps exactly as the design tool renders them —
padding is written as `vertical horizontal`:

- **Primary / prominent CTA button** → `--spacing-sm` `--spacing-lg` (e.g. `padding: var(--spacing-sm) var(--spacing-lg)`) — a taller, comfortable target.
- **Compact buttons / inputs / chips** → `--spacing-xxs` `--spacing-sm`.
- **List rows / nav items / card header & footer** → `--spacing-xs` `--spacing-md`.
- **Card / panel / modal body** → `--spacing-md` on all sides.
- **Gap between sibling controls, grid/flex gaps** → `--spacing-sm`.
- **Vertical rhythm between page sections** → `--spacing-xl` … `--spacing-section`.

Only use listed values; never improvise an intermediate gap.

## Border radius
Base 8px. Use:

- sm: 4px
- md: 8px
- lg: 12px
- xl: 16px
- full: 9999px (pill)

Bind components to these steps exactly as the design tool renders them — do NOT
pick a step freely (e.g. do not make buttons pill-shaped unless `--radius-md`
resolves to a pill):

- **Buttons / controls / nav items** → `--radius-md`
- **Inputs / text fields / selects** → `--radius-sm`
- **Cards / panels / modals / larger surfaces** → `--radius-lg`
- **Badges / chips / avatars / toggles (intentionally pill)** → `--radius-full`
- Bigger containers may use `--radius-xl`; `--radius-full` is reserved for
  circles/pills, never for standard buttons or cards.

## Shadow / elevation
Intensity 0.50.

- sm: 0 1px 4px 0 rgba(0,0,0,0.040)
- md: 0 4px 12px 0 rgba(0,0,0,0.080)
- lg: 0 8px 24px 0 rgba(0,0,0,0.120)

Bind each level to an elevation exactly as the design tool renders them — do NOT
pick a level freely:

- **sm** → resting surfaces: cards, panels, subtle raise (the default for a raised element).
- **md** → hovered / lifted state: a card or button on hover, raised popovers.
- **lg** → floating overlays: modals, drawers, dropdowns, menus above the page.

Flat elements (nav bar, page background, inline controls) get NO shadow. On hover, step a card up one level (sm → md), don't jump straight to lg.

## Border width
- default: 1px
- strong: 2px

Bind each width as the design tool renders them:

- **default** → all resting borders: card outlines, input borders, dividers.
- **strong** → focused / active / selected emphasis (e.g. an input grows from `default` to `strong` on focus). Do not use `strong` for ordinary resting borders.

## Opacity / transparency
These drive interactive states — wire them up, don't leave them unused. Apply each via `var(--opacity-…)` (or an rgba/overlay at that alpha):

- hover (8.0%): tint/overlay on hover (e.g. button or row background)
- pressed (12.0%): active/pressed feedback
- focus (16.0%): focus ring or focused-row background
- disabled (38.0%): opacity of disabled controls
- overlay (50.0%): modal/drawer backdrop scrim

Every clickable element (buttons, links, cards) should show a hover state and a disabled state using these values. Use `overlay` for scrims behind modals/drawers.

## Motion / Animation
Base duration 200ms, easing: ease-out (cubic-bezier(0.0, 0, 0.2, 1)).

- micro: 80ms
- fast: 150ms
- normal: 200ms
- slow: 300ms
- page: 500ms

Use `--duration-normal` as the default transition. Prefer `--duration-fast` for hover states and micro-interactions. Reserve `--duration-page` for route/page-level transitions.

## Status colors
Use these for feedback only — never as brand/UI surface colors. `--color-success` #16a34a (confirmations), `--color-warning` #d97706 (cautions), `--color-error` #dc2626 (errors/destructive), `--color-info` #2563eb (informational). Reference via `var(--color-…)`.

## Output guidance
- Maintain the proportional relationships above when laying out a page.
- Do not introduce new hues. If you need additional shades, derive them by adjusting OKLCH lightness only, keeping hue and chroma fixed.
- Respect the modular scale — pick from the listed sizes rather than introducing new ones.
- Use only the listed spacing values; do not improvise intermediate gaps.
- 8 type sizes is intentional. Use semantic mapping: h1-h5 for headings, body for paragraphs, small/caption for metadata.

---

## Machine-readable tokens (W3C Design Tokens)

Humans and AI can read the prose above. The JSON below lets tools (the companion CLI) reconstruct the design system precisely and deterministically, and convert it to CSS / Tailwind / etc.

```json
{
  "color": {
    "background": {
      "$value": "#ffffff",
      "$type": "color",
      "$extensions": {
        "design-pact": {
          "proportion": 0.6,
          "oklch": "oklch(1.0000000000000002 0 0)"
        }
      }
    },
    "foreground": {
      "$value": "#16181d",
      "$type": "color",
      "$extensions": {
        "design-pact": {
          "proportion": 0.2,
          "oklch": "oklch(0.20912329068388968 0.010375451880849594 268.1867219197829)"
        }
      }
    },
    "primary": {
      "$value": "#2f6df6",
      "$type": "color",
      "$extensions": {
        "design-pact": {
          "proportion": 0.08,
          "oklch": "oklch(0.5771345465633725 0.2153338403146287 263.04033284465817)"
        }
      }
    },
    "accent": {
      "$value": "#7c3aed",
      "$type": "color",
      "$extensions": {
        "design-pact": {
          "proportion": 0.05,
          "oklch": "oklch(0.5413370870268791 0.24658594545285942 293.00896749248056)"
        }
      }
    },
    "muted": {
      "$value": "#6b7280",
      "$type": "color",
      "$extensions": {
        "design-pact": {
          "proportion": 0.04,
          "oklch": "oklch(0.5510191075146065 0.02336091733217706 264.36374727266286)"
        }
      }
    },
    "border": {
      "$value": "#e5e7eb",
      "$type": "color",
      "$extensions": {
        "design-pact": {
          "proportion": 0.03,
          "oklch": "oklch(0.9275823098127417 0.005813542372075684 264.5313231484507)"
        }
      }
    }
  },
  "semantic": {
    "success": {
      "$value": "#16a34a",
      "$type": "color"
    },
    "warning": {
      "$value": "#d97706",
      "$type": "color"
    },
    "error": {
      "$value": "#dc2626",
      "$type": "color"
    },
    "info": {
      "$value": "#2563eb",
      "$type": "color"
    }
  },
  "typography": {
    "fontFamily": {
      "body": {
        "$value": "Inter, system-ui, sans-serif",
        "$type": "fontFamily"
      },
      "heading": {
        "$value": "Inter, system-ui, sans-serif",
        "$type": "fontFamily"
      }
    },
    "fontSize": {
      "h1": {
        "$value": "3.052rem",
        "$type": "dimension"
      },
      "h2": {
        "$value": "2.441rem",
        "$type": "dimension"
      },
      "h3": {
        "$value": "1.953rem",
        "$type": "dimension"
      },
      "h4": {
        "$value": "1.563rem",
        "$type": "dimension"
      },
      "h5": {
        "$value": "1.25rem",
        "$type": "dimension"
      },
      "body": {
        "$value": "1rem",
        "$type": "dimension"
      },
      "small": {
        "$value": "0.8rem",
        "$type": "dimension"
      },
      "caption": {
        "$value": "0.64rem",
        "$type": "dimension"
      }
    },
    "fontWeight": {
      "$value": 400,
      "$type": "fontWeight"
    },
    "fontWeightHeading": {
      "$value": 600,
      "$type": "fontWeight"
    },
    "fontWeightBold": {
      "$value": 700,
      "$type": "fontWeight"
    },
    "lineHeight": {
      "$value": 1.5,
      "$type": "number"
    },
    "letterSpacing": {
      "$value": "0em",
      "$type": "dimension"
    },
    "$extensions": {
      "design-pact": {
        "base": 16,
        "ratio": 1.25
      }
    }
  },
  "spacing": {
    "xxs": {
      "$value": "4px",
      "$type": "dimension"
    },
    "xs": {
      "$value": "8px",
      "$type": "dimension"
    },
    "sm": {
      "$value": "12px",
      "$type": "dimension"
    },
    "md": {
      "$value": "16px",
      "$type": "dimension"
    },
    "lg": {
      "$value": "24px",
      "$type": "dimension"
    },
    "xl": {
      "$value": "32px",
      "$type": "dimension"
    },
    "xxl": {
      "$value": "48px",
      "$type": "dimension"
    },
    "section": {
      "$value": "96px",
      "$type": "dimension"
    }
  },
  "borderRadius": {
    "sm": {
      "$value": "4px",
      "$type": "dimension"
    },
    "md": {
      "$value": "8px",
      "$type": "dimension"
    },
    "lg": {
      "$value": "12px",
      "$type": "dimension"
    },
    "xl": {
      "$value": "16px",
      "$type": "dimension"
    },
    "full": {
      "$value": "9999px",
      "$type": "dimension"
    }
  },
  "borderWidth": {
    "default": {
      "$value": "1px",
      "$type": "dimension"
    },
    "strong": {
      "$value": "2px",
      "$type": "dimension"
    }
  },
  "shadow": {
    "sm": {
      "$value": "0 1px 4px 0 rgba(0,0,0,0.040)",
      "$type": "shadow"
    },
    "md": {
      "$value": "0 4px 12px 0 rgba(0,0,0,0.080)",
      "$type": "shadow"
    },
    "lg": {
      "$value": "0 8px 24px 0 rgba(0,0,0,0.120)",
      "$type": "shadow"
    }
  },
  "motion": {
    "duration-micro": {
      "$value": "80ms",
      "$type": "duration"
    },
    "duration-fast": {
      "$value": "150ms",
      "$type": "duration"
    },
    "duration-normal": {
      "$value": "200ms",
      "$type": "duration"
    },
    "duration-slow": {
      "$value": "300ms",
      "$type": "duration"
    },
    "duration-page": {
      "$value": "500ms",
      "$type": "duration"
    },
    "easing": {
      "$value": "cubic-bezier(0.0, 0, 0.2, 1)",
      "$type": "cubicBezier"
    }
  },
  "opacity": {
    "hover": {
      "$value": 0.08,
      "$type": "number"
    },
    "pressed": {
      "$value": 0.12,
      "$type": "number"
    },
    "focus": {
      "$value": 0.16,
      "$type": "number"
    },
    "disabled": {
      "$value": 0.38,
      "$type": "number"
    },
    "overlay": {
      "$value": 0.5,
      "$type": "number"
    }
  }
}
```
