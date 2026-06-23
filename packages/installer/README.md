# ui-generator

Local design-system studio + a Claude Code / Cursor **skill**, set up with one
command. Zero backend, zero account — the static app and the skill are bundled
in this package and run on your machine.

## Install the skill

```bash
npx ui-generator init            # → ./.claude/skills/design-system/SKILL.md (this project)
npx ui-generator init --global   # → ~/.claude/skills/design-system/SKILL.md (all projects)
```

Then, in Claude Code / Cursor, say **"use the design-system skill"**. The agent
clarifies the product direction, proposes a few palettes, and opens the studio
locally to pick and tune them — exporting a single `design-system.md`.

## Open the studio directly

The skill calls this for you, but you can run it too:

```bash
npx ui-generator open                       # open the studio
npx ui-generator open "p=ffffff-1a1a1a-2f6df6-7c3aed-6b7280-e5e7eb"   # …pre-loaded with a palette
```

It serves the bundled static app on `http://localhost:3000` (set `PORT` to
change) and opens your browser. Repeated calls reuse the running instance.

## How it works

- **No backend / no account.** The app is a pure client-side SPA; palettes are
  passed via URL params (`?p=…`), the design system is carried by the exported
  `design-system.md` file, and your working state lives in the browser.
- **The agent is the AI.** Palette ideas come from your own agent (Claude Code /
  Cursor); the studio only does the deterministic part — scales, contrast, dark
  pairing, the `:root` contract — and lets you tune it visually.
