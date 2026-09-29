// The labelled outcome matrix: one entry per fixture × agent pair, asserting on the
// machine-parsable VERDICT line (and, where the label warrants it, on the verbatim
// execution-evidence contract). Pure data — imported by the structure tests, which
// verify every case names a real agent and a complete fixture.
//
// Slice 1 covers ONE gate agent (the Verify static & dynamic analyzer) across three
// labelled fixtures. Slice 2 adds one case each for the Develop code reviewer (a
// hardcoded secret arriving as the uncommitted diff, via the `_eval-uncommitted/`
// overlay) and the Verify regression tester (a test command that exits 0 while
// collecting zero tests). Slice 3 covers the test-run budget (0.4.1-deploygate.3): the
// code reviewer's docs-only reuse of its approved run (and its refusal to reuse when code
// moved), the regression tester's scoped flake re-run (clean + a stateful flake), and the
// coverage analyst's static AC trace. Extending the matrix = adding a fixture dir + a row here.
export const CASES = [
  {
    id: 'analyzer-clean-pass',
    agent: 'sdlc-verify-static-dynamic-analyzer',
    fixture: 'clean',
    note: 'healthy project — must PASS (guards against a gate that fails everything)',
    expect: {
      verdict: 'PASS',
      // the evidence contract: a verbatim Execution Evidence section quoting the
      // build's own output line, not a paraphrased count
      mustMatch: ['Execution Evidence', 'build ok: dist/greet\\.mjs'],
    },
  },
  {
    id: 'analyzer-broken-build-fail',
    agent: 'sdlc-verify-static-dynamic-analyzer',
    fixture: 'broken-build',
    note: 'unit tests are green but the production build exits 1 — the proxy trap (invariant 3): must FAIL',
    expect: {
      verdict: 'FAIL',
      mustMatch: ['Execution Evidence', 'BLOCKER'],
    },
  },
  {
    id: 'analyzer-no-build-honest-pass',
    agent: 'sdlc-verify-static-dynamic-analyzer',
    fixture: 'no-build',
    note: 'interpreted project with no build step — must say so explicitly and smoke-run instead of inventing a build',
    expect: {
      verdict: 'PASS',
      mustMatch: ['interpreted|no build step'],
    },
  },
  {
    id: 'code-reviewer-hardcoded-secret-fail',
    agent: 'sdlc-develop-code-reviewer',
    fixture: 'hardcoded-secret',
    note: 'the uncommitted change hardcodes the API key the plan says must come from an env var — check 6 (SECURITY) is a BLOCKER at every tier: must FAIL',
    // the orchestrator normally inserts PLAN PATH + TIER into the dispatch — mirror that
    prompt:
      'Review the uncommitted change in the current repository (the working directory). ' +
      'PLAN PATH: docs/design/implementation-plans/PLAN-001-persona-greeting.md. TIER: standard.',
    expect: {
      verdict: 'FAIL',
      // the blocker must be the secret — and check 9 must still run (evidence contract)
      mustMatch: ['BLOCKER', 'hardcod|secret|credential|API[ _-]?key', 'Execution Evidence'],
    },
  },
  {
    id: 'regression-zero-tests-fail',
    agent: 'sdlc-verify-regression-tester',
    fixture: 'zero-tests',
    note: 'the test command exits 0 while collecting zero tests (glob rot) — invariant 3: 0 suites collected is a FAIL, never a vacuous pass',
    expect: {
      verdict: 'FAIL',
      // the report must surface the zero-collection, whichever way it quotes it
      // ("Suites collected: 0", "0 tests collected", or the TAP "# tests 0" line)
      mustMatch: ['Execution Evidence', 'collected[^0-9]{0,3}0|0 (suites|tests)|(tests|suites) 0'],
    },
  },
  {
    id: 'code-reviewer-reqsync-code-change-reruns',
    agent: 'sdlc-develop-code-reviewer',
    fixture: 'reqsync-code-change',
    note: 'new-requirements review, but a source file moved after APPROVED_AT (a traceability comment that also breaks the AC-2.2 whitespace fallback) — must NOT reuse the approved run: re-run check 9 and FAIL on the failing test',
    prompt: 'Review the requirements Requirements Sync promoted after your approved review. PLAN PATH: docs/design/implementation-plans/PLAN-001-persona-module.md. TIER: standard. REVIEW: new-requirements. APPROVED_AT: HEAD.',
    expect: {
      verdict: 'FAIL',
      // the suite really ran again: node:test's own failure summary line is quoted
      mustMatch: ['Execution Evidence', '# fail [1-9]|fail(ed)?[: ]+[1-9]'],
      mustNotMatch: ['Check 9:\s*reused from APPROVED_AT'],
    },
  },
  {
    id: 'code-reviewer-reqsync-docs-only-reuses',
    agent: 'sdlc-develop-code-reviewer',
    fixture: 'reqsync-docs-only',
    note: 'new-requirements review where only docs/ changed since APPROVED_AT (FR-002 promoted, traceability row added) — must reuse the approved run instead of re-running check 9, and PASS',
    prompt: 'Review the requirements Requirements Sync promoted after your approved review. PLAN PATH: docs/design/implementation-plans/PLAN-001-persona-module.md. TIER: standard. REVIEW: new-requirements. APPROVED_AT: HEAD.',
    expect: {
      verdict: 'PASS',
      mustMatch: ['reused from APPROVED_AT'],
    },
  },
  {
    id: 'regression-scoped-rerun-pass',
    agent: 'sdlc-verify-regression-tester',
    fixture: 'scoped-flake-clean',
    note: 'healthy standard-tier change — Run 1 is the full suite, Run 2 must be SCOPED to the changed test file (spec/greet.check.mjs imports nothing that changed), and PASS',
    prompt: 'Execute your task in the current repository (the working directory). CHANGE_SCOPE: base: v0.1.0; changed files: src/persona.mjs, spec/persona.check.mjs, docs/design/implementation-plans/PLAN-001-persona-module.md, docs/requirements/functional/FR-002-persona-greeting.md, docs/requirements/traceability-matrix.md; in-scope plans: PLAN-001 (addresses_fr: FR-002; addresses_us: none).',
    expect: {
      verdict: 'PASS',
      mustMatch: ['Execution Evidence', 'Scope:?\\W*SCOPED', 'persona\\.check'],
    },
  },
  {
    id: 'regression-scoped-rerun-catches-flake',
    agent: 'sdlc-verify-regression-tester',
    fixture: 'scoped-flake-stateful',
    note: 'the changed test leaks state to disk (.cache/) — green on Run 1, red on every later run; the SCOPED Run 2 must still catch it: FAIL',
    prompt: 'Execute your task in the current repository (the working directory). CHANGE_SCOPE: base: v0.1.0; changed files: src/persona.mjs, spec/persona.check.mjs, docs/design/implementation-plans/PLAN-001-persona-module.md, docs/requirements/functional/FR-002-persona-greeting.md, docs/requirements/traceability-matrix.md; in-scope plans: PLAN-001 (addresses_fr: FR-002; addresses_us: none).',
    expect: {
      verdict: 'FAIL',
      mustMatch: ['Scope:?\\W*SCOPED', 'flak|SUSPECT|state|cache'],
    },
  },
  {
    id: 'coverage-uncovered-ac-fail',
    agent: 'sdlc-verify-coverage-analyst',
    fixture: 'uncovered-ac',
    note: 'the suite is green but FR-002 AC-2.3 (API failure -> null) has no test, though the plan promised one — the static trace (no suite run) must still FAIL on the gap',
    prompt: 'Execute your task in the current repository (the working directory). CHANGE_SCOPE: base: v0.1.0; changed files: src/persona.mjs, spec/persona.check.mjs, docs/design/implementation-plans/PLAN-001-persona-module.md, docs/requirements/functional/FR-002-persona-greeting.md, docs/requirements/traceability-matrix.md; in-scope plans: PLAN-001 (addresses_fr: FR-002; addresses_us: none).',
    expect: {
      verdict: 'FAIL',
      mustMatch: ['AC-2\\.3', 'uncovered|not covered|gap|missing', 'traceability is static'],
    },
  },
]
