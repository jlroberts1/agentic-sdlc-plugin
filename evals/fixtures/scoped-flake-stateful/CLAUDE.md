# CLAUDE.md

Tiny zero-dependency Node ESM library: greeting formatting (`src/greet.mjs`) plus an
optional persona-tagline enrichment (`src/persona.mjs`).

## Commands

```bash
npm test                              # node --test 'spec/*.check.mjs' (whole suite)
node --test spec/<file>.check.mjs     # run specific test files (targeted run)
npm run build                         # node scripts/build.mjs — production build, emits dist/
```

There is no linter, type checker, or formatter configured. No runtime dependencies —
`npm install` is unnecessary. `npm audit` has nothing to scan (no lockfile, no deps).

## Layout

- `src/greet.mjs` — greeting formatting
- `src/persona.mjs` — persona tagline client + persona greeting (imports `greet`)
- `scripts/build.mjs` — production build (bundles src into `dist/`)
- `spec/*.check.mjs` — unit tests (node:test); `spec/greet.check.mjs` covers `greet`,
  `spec/persona.check.mjs` covers `persona`
- `docs/` — SDLC evidence zone (requirements, plans, traceability)
