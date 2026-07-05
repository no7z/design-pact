# Contributing

Thanks for your interest! This project is small and fast-moving — the best
first step for anything non-trivial is to open an issue and talk it through.

## Dev setup

No API key, no env vars:

```bash
npm install
npm run dev          # studio at http://localhost:3000
```

For CLI work:

```bash
npm ci --prefix packages/cli
npm --prefix packages/cli run build   # or: npm --prefix packages/cli run dev -- <cmd>
```

## Before you open a PR

CI runs these three; green locally means green in CI:

```bash
npx tsc --noEmit
npm run lint
npm test
```

If you touch the token derivation (`lib/scales.ts`, `lib/typography.ts`,
`lib/export.ts`) or the CLI parser, please add or extend a test in `tests/` —
the design.md round-trip in `tests/export-roundtrip.test.ts` is the contract
the whole tool rests on.

## Project shape (60-second tour)

- `app/` + `components/` — the studio (Next.js static export, no server routes)
- `lib/` — all pure logic: token types, scale derivation, exports, color math.
  UI-independent; this is where most interesting changes land.
- `packages/cli` — `design-pact` (`init` / `open` / `add` / `inspect` / `check`)
- `skills/design-pact/SKILL.md` — the agent-facing instructions

Two conventions worth knowing:

- **Determinism is the product.** Nothing in `lib/` or the CLI may depend on
  network, time (except the export date stamp), or randomness. The same
  palette must always derive the same design system.
- **Bilingual output.** The studio uses `tr("English", "中文")` in place
  (English default); the CLI uses `t(en, zh)` from `packages/cli/src/locale.ts`
  keyed off `LANG`. New user-facing strings should provide both.

## Releasing (maintainers)

Bump `packages/cli/package.json`, tag `vX.Y.Z`, push the tag — the Release
workflow builds the studio bundle and publishes to npm (needs the `NPM_TOKEN`
secret).
