# Design system

When generating UI from this token set, respect the following proportions and roles. The percentages reflect how much of the source design each color occupies — use them as a guide for surface area in the output.

## Color palette
- background: #ffffff (100.0% of source image)
- primary: #ff385c (100.0% of source image)
- foreground: #222222 (100.0% of source image)
- border: #dddddd (100.0% of source image)
- muted: #6a6a6a (100.0% of source image)

The dominant background should occupy roughly 100% of the layout. The accent color (#ff385c) should be reserved for emphasis — buttons, links, key highlights — typically 15% or less of any given screen.

## Typography
Base size 17px, modular scale ratio 1.5.

- h1: 8.068rem (129.09px)
- h2: 5.379rem (86.06px)
- h3: 3.586rem (57.38px)
- h4: 2.391rem (38.25px)
- h5: 1.594rem (25.5px)
- body: 1.063rem (17px)
- small: 0.708rem (11.33px)
- caption: 0.473rem (7.56px)

Body family: 'Airbnb Cereal VF', Circular, sans-serif
Heading family: 'Airbnb Cereal VF', Circular, -apple-system, system-ui, Roboto, 'Helvetica Neue', sans-serif
Font weight: 300, line-height: 1.75, letter-spacing: 0em.

## Spacing
Base unit 6px. Use this 8-step scale for padding/margin/gap:

- xxs: 6px
- xs: 12px
- sm: 18px
- md: 24px
- lg: 36px
- xl: 48px
- xxl: 72px
- section: 144px

## Border radius
Base 11px. Use:

- sm: 5.5px
- md: 11px
- lg: 16.5px
- xl: 22px
- full: 9999px (pill)

## Shadow / elevation
Intensity 0.35.

- sm: 0 0.7px 3px 0 rgba(0,0,0,0.028)
- md: 0 2.8px 8px 0 rgba(0,0,0,0.056)
- lg: 0 5.6px 17px 0 rgba(0,0,0,0.084)

## Border width
- thin: 2px
- default: 4px
- thick: 8px

## Opacity / transparency
- hover: 9.0%
- pressed: 13.5%
- focus: 18.0%
- disabled: 38.0%
- overlay: 4.5%

## Motion / Animation
Base duration 500ms, easing: ease-in (cubic-bezier(0.4, 0, 1, 1)).

- micro: 200ms
- fast: 375ms
- normal: 500ms
- slow: 750ms
- page: 1250ms

Use `--duration-normal` as the default transition. Prefer `--duration-fast` for hover states and micro-interactions. Reserve `--duration-page` for route/page-level transitions.

## Output guidance
- Maintain the proportional relationships above when laying out a page.
- Do not introduce new hues. If you need additional shades, derive them by adjusting OKLCH lightness only, keeping hue and chroma fixed.
- Respect the modular scale — pick from the listed sizes rather than introducing new ones.
- Use only the listed spacing values; do not improvise intermediate gaps.
- 8 type sizes is intentional. Use semantic mapping: h1-h5 for headings, body for paragraphs, small/caption for metadata.
