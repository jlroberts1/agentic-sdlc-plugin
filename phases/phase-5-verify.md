---
phase: verify
phase_number: 5
setup: ""
groups:
  - { mode: parallel, agents: [sdlc-verify-coverage-analyst, sdlc-verify-independent-code-reviewer, sdlc-verify-static-dynamic-analyzer, sdlc-verify-regression-tester] }
  - { mode: sequential, agents: [sdlc-verify-validation-reviewer] }
gate_after_each_group: true
post_phase: "READY FOR RELEASE → set verify.status + agent statuses completed; REWORK REQUIRED → do NOT update Verify's status, reopen Phase 4 via the state script (reopen --phase develop --agent <authors>) and route the blockers back"
---

# Phase 5 — Verify (Verification + Validation, IEEE 1012)

Prerequisite: the Develop phase has completed the change(s) under verification.

0. **Establish the CHANGE_SCOPE (orchestrator, once per Verify run):** the change-set is
   everything since the last release tag — the same base Release uses:

       BASE=$(git describe --tags --abbrev=0 2>/dev/null)
       git diff --name-only "$BASE"..HEAD; git status --porcelain

   Pass every verifier and the validation-reviewer a `CHANGE_SCOPE` block: `base: <tag>`,
   the changed files, and the in-scope PLAN ids (plans added or modified in that diff) with
   their `addresses_fr` / `addresses_us`. Requirements, stories and plans untouched since
   the last release were verified by the Verify that released them; re-checking them every
   run is what makes Verify slow as a project grows. Send `CHANGE_SCOPE: full` instead
   (verify the whole project) when there is no tag yet, the repo is not git, the diff
   touches an ADR or `architecture-overview.md` (a design change can invalidate anything),
   or this is re-verify **cycle 3**. Scoping narrows only which requirements are
   traced — the test suite, production build, lint and security checks always run in full.

1. **Verification group (parallel):** coverage-analyst, independent-code-reviewer,
   static-dynamic-analyzer, regression-tester — dispatch all four in one message. They
   answer "are we building it right?" (read-only; the independent reviewer did NOT author
   the code). The static-dynamic-analyzer MUST run the project's **production build** (the
   deployable artifact, not the unit-test toolchain — they can differ) and the
   regression-tester must confirm the suite actually **executed** (0 suites collected =
   FAIL, not a pass). The Regression Tester's full Run 1 is this group's one full suite
   run: the coverage analyst traces ACs statically and does not run the suite, and the
   flake re-run covers only the changed tests unless the change is 🔴 complex. A failing build, or a runner that errored out, is a gate BLOCKER even
   when types + unit assertions are green. Every command-running verifier must quote
   **verbatim execution evidence** in its report — the exact command, exit code, and the
   runner's own summary lines; counts without a verbatim block are claims, not evidence.
2. **Validation group (sequential):** validation-reviewer — consumes the four reports, runs
   UAT against the user stories, and is the release gate ("are we building the right thing?").
   It does not merely trust the reports: it independently re-runs the test command once and
   cross-checks the totals against the Regression Tester's runs (condition d2), and a report
   whose counts lack a verbatim evidence block cannot PASS its gate condition. The gate fails
   (REWORK REQUIRED) if the release build did not exit 0 and produce its artifact
   (condition c2).
   - **READY FOR RELEASE:** set every `verify.agents.*.status` and `verify.status` to `"completed"`.
   - **Gate FAIL (REWORK REQUIRED):** do NOT update Verify's status. Record the FAIL via
     `gate-log --phase verify`, then **reopen Develop deterministically** —
     `reopen --phase develop --agent <the responsible author(s), e.g. code_author test_author>`
     via the state script — so a resumed session lands on the rework, not on Verify; the
     persisted verify strikes survive the route-back (they carry the re-verify cycle bound
     below). Then route the blockers to Phase 4 and re-run Verify after they're fixed, per
     the bounded protocol below.
3. **Re-verification after REWORK (bounded; cycle 1 = the initial run):** the cycle count
   is persisted, not remembered — the wizard records each validation verdict via
   `gate-log --phase verify`, and the detector's `verifyCycle` reports which cycle the
   next run (including a resumed one) enters.
   - **Cycle 2** (first re-run after the Phase 4 fixes): re-run **static-dynamic-analyzer +
     regression-tester IN FULL** (the mechanical safety net — a fix can break anything), and
     re-dispatch **coverage-analyst + independent-code-reviewer in RE-VERIFY mode**: pass each a
     `REVERIFY_SCOPE` block containing the rework diff (files changed since the failed verdict)
     and the prior blocker list, so they verify the fix and its blast radius rather than the
     whole change-set from scratch. The validation-reviewer always re-runs over the four fresh
     reports and must confirm every prior blocker is explicitly FIXED.
   - **Cycle 3:** FULL re-verification — all four agents from scratch, no scoping, `CHANGE_SCOPE: full` (repeated
     rework means the blast radius is not well understood; do not scope twice in a row).
   - **Still REWORK REQUIRED after cycle 3:** STOP and emit `HUMAN_REVIEW_REQUIRED` to the
     user — do not keep looping.
