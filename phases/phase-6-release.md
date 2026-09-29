---
phase: release
phase_number: 6
setup: ""
groups:
  - { mode: sequential, agents: [sdlc-release-planner] }
  - { mode: sequential, agents: [sdlc-release-author] }
  - { mode: sequential, agents: [sdlc-release-reviewer] }
gate_after_each_group: true
post_phase: "set release.status + agent statuses completed; the release is COMMITTED and TAGGED locally — push and publish are human-gated (do neither); hand the human the rollback plan alongside the publish commands"
---

# Phase 6 — Release (Transition)

Prerequisite: Verify completed with READY FOR RELEASE (which now includes a clean
production build — see Phase 5).

1. **release-planner** — reads the manifest, changelog, metadata, and git log since the last
   tag; produces a release plan (passed forward via context) including a **human-executed
   rollback plan** — trigger conditions plus concrete stage-aware commands (committed /
   pushed / published); agents never roll back, just as they never publish.
2. **release-author** — applies the plan: prepends the changelog entry, bumps the manifest
   version, runs the build, then **commits the release and creates a local tag**. It does
   **NOT push or publish** — both are human-gated.
   - **Build fails?** Triage first: if the build was ALREADY broken before this release's diff
     (pre-existing toolchain rot), that is a **Verify-gate miss**, not a release task. STOP and
     route back: **reopen Verify deterministically** — `reopen --phase verify --agent
     static_dynamic_analyzer --agent validation_reviewer` via the state script — so a resumed
     session lands on the re-verification, and report the finding there. Do NOT rewrite the
     target's dependency tree, add `resolutions`/overrides, pin transitive deps, monkey-patch
     `node_modules`, or add `postinstall` patches. Only fix a break caused by this release's
     own changelog/version/manifest edits, minimally.
3. **release-reviewer** — 8-point gate (version consistency of the release commit + tag, changelog
   accuracy, semver, build artifacts, package exports, sensitive-file exclusion, dependency
   audit, rollback readiness — the plan's undo commands exist and match the committed version).
   An author that pushed or published on its own is a discipline FAIL.
   - **Gate FAIL:** route issues to release-author, re-run, re-review. If the gate FAILs
     **3** times (or a previously-cleared issue reappears), STOP and emit
     `HUMAN_REVIEW_REQUIRED` — do not keep looping.

**On completion:** set every `release.agents.*.status` and `release.status` to `"completed"`.
The release is **committed and tagged locally**. **Pushing the remote and publishing to a
registry are intentionally left to a human** — report the release commit SHA and tag, and
give the exact push/publish commands for the human to run **together with the release plan's rollback plan** (trigger
conditions + the exact human-executed rollback commands for each stage), so the human holds
the undo before running the do.
