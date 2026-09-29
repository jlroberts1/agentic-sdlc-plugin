# Model routing — tier table

Read by the /sdlc wizard before the first agent dispatch of a run; apply on EVERY dispatch.
`modelProfile` from Step 0 selects how much model to spend per agent. Each agent belongs to
one tier; pass the tier's model alias as the Task tool's `model` parameter ("inherit" =
omit the parameter, i.e. the session model). **No profile ever downgrades the full tier** —
every reviewer, validator and gate keeps the session model (invariant 9). Code-writing is
its own **author** tier: it is gated by a full-tier reviewer (reviewer ≠ author), so in
`balanced`/`economy` it may run on `sonnet` while the gate that judges it stays on the
session model.

Agent names below are the file names minus the `sdlc-` prefix; every agent belongs to
exactly one tier (a structure test pins the roster coverage).

| Tier | Agents | quality | balanced (default) | economy |
|------|--------|---------|--------------------|---------|
| **full** — judgment & gates | `define-requirement-reviewer` `design-reviewer` `develop-code-reviewer` `verify-independent-code-reviewer` `verify-validation-reviewer` `release-reviewer` `develop-architect-planner` `develop-architect-clarifier` `operate-feedback-loop` | inherit | inherit | inherit |
| **author** — code & test writing | `develop-code-author` `develop-test-author` `develop-implementer` | inherit | sonnet | sonnet |
| **standard** — analysis & doc authoring | `prepare-explorer` `prepare-claude-md` `define-source-analyst` `define-test-analyst` `define-nfr-analyst` `define-fr-author` `define-nfr-author` `define-us-author` `design-architecture-explorer` `design-decisions-explorer` `design-architecture-author` `design-component-spec-author` `design-adr-traceability-author` `develop-reqs-sync` `verify-coverage-analyst` `release-planner` `release-author` `operate-issue-triager` `operate-incident-responder` | inherit | sonnet | haiku |
| **fast** — mechanical tool-running | `verify-static-dynamic-analyzer` `verify-regression-tester` `operate-dependency-monitor` `operate-telemetry-monitor` | inherit | haiku | haiku |

If a dispatch fails because the alias is unavailable on the user's plan, re-dispatch that
one agent with inherit. To change the profile (persisted deterministically — never
hand-edit the YAML):

    node "${CLAUDE_PLUGIN_ROOT}/scripts/sdlc-state.mjs" config --model-profile <quality|balanced|economy>
