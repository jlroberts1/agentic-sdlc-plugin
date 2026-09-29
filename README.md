# Agentic SDLC — Claude Code Plugin

A standards-anchored, agent-driven Software Development Lifecycle for Claude Code.
Run one command — `/agentic-sdlc:sdlc` (short: `/sdlc`) — and the wizard detects your
project state and drives seven phases (Prepare → Define → Design → Develop → Verify →
Release → Operate) with a roster of **35 specialized subagents**.

📖 **[How it works — visual guide](https://orchestratedbyalex.github.io/agentic-sdlc-plugin/)** —
the seven phases, install, and model routing on one page.

## Requirements

- **Claude Code** (CLI, desktop, web, or IDE extension).
- **Node.js 18+** — the plugin's only executable (`scripts/sdlc-state.mjs`) is zero-dependency
  ESM and uses the built-in `node:test` runner. No `npm install` step.

## Install (from the marketplace)

This is the **deploygate fork** (`jlroberts1/agentic-sdlc-plugin`); its marketplace is
`agentic-sdlc-deploygate`. The upstream plugin lives at `orchestratedbyalex/agentic-sdlc-plugin`.

```text
# inside Claude Code:
/plugin marketplace add jlroberts1/agentic-sdlc-plugin
/plugin install agentic-sdlc@agentic-sdlc-deploygate
/agentic-sdlc:sdlc
```

Or from a shell:

```bash
claude plugin marketplace add jlroberts1/agentic-sdlc-plugin
claude plugin install agentic-sdlc@agentic-sdlc-deploygate
```

The install is user-scoped by default, so one install covers every repository on the
machine. Confirm with `/plugin` (it lists the installed version), then `/reload-plugins`.

**Updates:** Claude Code delivers a new version only when `version` in
`.claude-plugin/plugin.json` changes on `main` — a push alone is not enough. Third-party
marketplaces don't auto-update by default: turn it on for `agentic-sdlc-deploygate` in
`/plugin` → Marketplaces, or run `/plugin marketplace update agentic-sdlc-deploygate`.

**Sharing with a repository's collaborators:** commit this to the repo's
`.claude/settings.json`. It enables the plugin but doesn't download it, so each collaborator
still runs the install once (`claude plugin install agentic-sdlc@agentic-sdlc-deploygate --scope project`):

```json
{
  "extraKnownMarketplaces": {
    "agentic-sdlc-deploygate": {
      "source": { "source": "github", "repo": "jlroberts1/agentic-sdlc-plugin" }
    }
  },
  "enabledPlugins": { "agentic-sdlc@agentic-sdlc-deploygate": true }
}
```

## Install (local development)

```bash
claude --plugin-dir /ABSOLUTE/PATH/TO/agentic-sdlc-plugin
# inside Claude Code:
/reload-plugins
/agentic-sdlc:sdlc
```

## Quick start

Run `/sdlc` in any repository. The wizard:

1. **Detects state** — `greenfield` (empty folder), `existing` (code, no SDLC metadata), or
   `resume` (metadata present) — and prints a seven-phase status board.
2. **Routes you** — scaffolds a greenfield skeleton, sets up an existing repo, or resumes
   exactly where you left off (down to the specific agent).
3. **Drives each phase** by dispatching its subagents (in parallel where independent), runs a
   validation **gate** after each group, and routes failures back to the responsible author.
4. **Records evidence** in *your* repo — requirements under `docs/requirements/`, design under
   `docs/design/`, operations under `docs/operate/`, and all state in
   `docs/requirements/sdlc-metadata.yml`.

State is deterministic and resumable: every status change goes through `sdlc-state.mjs`, never
an ad-hoc edit, so you can stop and resume any time — including mid-loop: gate strike counts,
the Verify cycle, the active implementation plan, and a full gate-verdict log persist in the
metadata, so an interruption never resets a review loop's bounds. Route-backs are transitions
too: when Verify demands rework (or Release uncovers a Verify miss), the earlier phase is
deterministically **reopened** — only the responsible agents reset, and resume lands on the
rework, not on the phase that sent it back. Completing a phase records an **evidence
attestation** citing the gate verdict that proved it.

## Model routing

Each subagent runs under a model **profile**, so you can trade cost against wall-clock without
touching the gates. Switch any time (persisted deterministically in `sdlc-metadata.yml`):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/sdlc-state.mjs" config --model-profile <quality|balanced|economy>
```

- **quality** — every agent runs on the session model. Most thorough, most expensive.
- **balanced** (default) — mechanical agents (build/lint analysis, the regression run, the
  dependency/telemetry monitors) drop to a small fast model, analysis/doc agents to a mid
  model, and the code/test authors run on Sonnet. Cheaper and faster, same gates.
- **economy** — pushes the analysis and mechanical tiers to the smallest model; the code/test
  authors stay on Sonnet.

Whatever the profile, the **full tier always inherits the session model** — every reviewer and
validator, the planner, the clarifier, and the feedback-loop. The code/test/implementer authors
are a separate **author** tier: whatever they write is judged by a full-tier reviewer on the
session model. Model routing never downgrades a gate.

## The seven phases

| Phase | Purpose | Anchored in |
|-------|---------|-------------|
| **Prepare** | Map the project; produce a CLAUDE.md the agents can rely on | ISO/IEC/IEEE 12207:2026 |
| **Define** | Functional / non-functional requirements + user stories, gated | IEEE 12207:2026 |
| **Design** | Architecture, component specs, ADRs, STRIDE-lite threat model | IEEE 1016, Microsoft SDL, Nygard ADRs |
| **Develop** | Plan → implement + test (proportionate to change tier) → review | Microsoft SDL |
| **Verify** | Coverage, independent review, real production build, regression | IEEE 1012, ISO/IEC 25010 |
| **Release** | Changelog, version bump, release commit + local tag + rollback plan (push/publish human-gated) | ITIL 4 |
| **Operate** | Triage, dependency/telemetry monitoring, post-release health, feedback + accreted lessons into the next cycle | ITIL 4, ISO/IEC 27001, DORA |

## How it's built (the two-zone model)

The plugin carries the **process** ("how"); your target repository receives the **evidence**
("what" — requirements, design docs, `sdlc-metadata.yml`). That separation is load-bearing:
the plugin stays generic, your repo accumulates the lifecycle record.

- The `/sdlc` wizard (`commands/sdlc.md`) — the orchestrator entry point.
- **35 subagents** (`agents/`), dispatched via the Task tool, honoring parallelism and a strict
  **reviewer ≠ author** rule (reviewers are read-only).
- **7 machine-readable phase playbooks** (`phases/`) — groups, modes, gates, post-phase state.
- **Deterministic, tested state** (`scripts/sdlc-state.mjs`) — the single source of metadata truth.
- **Deterministic guardrails** (`hooks/hooks.json` → `scripts/sdlc-guard.mjs`) — a PreToolUse
  hook turns deploy and publish commands (a `git push` to `main`/`master` or your
  `SDLC_DEPLOY_BRANCHES`, force/tag/delete pushes, `gh release`, `npm publish`) into an
  explicit permission **ask** (the human approving the prompt *is* the gate; commits, local
  tags, and feature-branch pushes pass through) and **denies** direct edits of `sdlc-metadata.yml`, pointing back at the state script. Hooks fire
  session-wide wherever the plugin is enabled — the ask-not-deny design keeps that safe.
- **Human checkpoints at exactly three altitudes** — Define completes only after your
  requirements sign-off; Design completes only after you decide the ADR trade-offs
  (new-decision ADRs enter `proposed`; your approval accepts them); and a new Operate cycle
  starts only on your explicit go (go / defer / override) — never on an agent's say-so.
- Artifact templates (`templates/`) and two skills (`sdlc-conventions`, `sdlc-feature-intake`).
- **Configurable model routing** (`quality` / `balanced` / `economy`) that never downgrades the
  judgment-bearing agents or the gates.
- **Agent evals** (`evals/`) — the gate agents are themselves tested: labelled golden fixtures
  (clean ⇒ PASS, tests-green-but-build-broken ⇒ FAIL, no-build-step ⇒ honest PASS, a hardcoded
  API key arriving as the uncommitted diff ⇒ security-blocker FAIL, a test command that exits 0
  collecting zero tests ⇒ FAIL) run headless through the real plugin and asserted on the
  machine-parsable `VERDICT:` line. Billed and opt-in (`SDLC_EVALS=1 node evals/run.mjs`),
  never part of `node --test`.

## Test

```bash
node --test          # 161 tests, all green (state logic + hook guard + evals lib + plugin structure)
```

The model-free suite above always runs clean on CI and contributor machines. The billed agent
evals are separate and explicit — see [evals/README.md](evals/README.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the design invariants, agent conventions, and the
version-bump policy. Contributor guidance for working *in* this repo lives in
[CLAUDE.md](CLAUDE.md).

## License

[GNU AGPL-3.0-or-later](LICENSE.md) © 2026 [@orchestratedbyalex](https://github.com/orchestratedbyalex).

Free to use, run, and modify — including inside companies. If you distribute it or a modified
version (or run a modified version as a network service), you must release your source under the
same AGPL license. You can build on it; you can't close it up and resell it as proprietary.
