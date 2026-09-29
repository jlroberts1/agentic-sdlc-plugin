---
id: "PLAN-001"
title: "Persona-enriched greeting module"
type: "implementation-plan"
status: "approved"
tier: "standard"
version: "1.0"
created: "2026-09-20"
author: "architect-planner-agent"
change_request: "Greet returning users with their persona tagline"
addresses_fr: ["FR-002"]
addresses_nfr: ["NFR-001"]
addresses_us: []
constrained_by_adrs: []
proposes_new_adrs: []
proposes_new_requirements: []
supersedes: ""
superseded_by: ""
---

# PLAN-001: Persona-enriched greeting module

## Summary
Add `src/persona.mjs`: an Acme Persona API client (`fetchPersona`) and a pure formatter
(`personaGreeting`) that appends the tagline to `greet()` output, falling back to the plain
greeting whenever no tagline is available. `src/greet.mjs` is unchanged.

## Security Considerations
| Concern | Control | Where it lands |
|---------|---------|----------------|
| Persona API credential | read from `process.env.PERSONA_API_KEY` at call time; never hardcoded | `src/persona.mjs` |
| Untrusted `name` in the URL | `encodeURIComponent` before interpolation | `src/persona.mjs` |

## Source File Changes
### src/persona.mjs (new)
- add `fetchPersona(name, fetchImpl)` and `personaGreeting(name, tagline)`

## New Test Scenarios
### spec/persona.check.mjs (new)
- **FR reference:** FR-002
- **ACs to cover:** AC-2.1 (happy path), AC-2.2 (blank/missing fallback), AC-2.3 (API failure → null)
- The fetch implementation is injected — no real network in tests.

## Build & Test Verification
- Build command: `npm run build`
- Test command: `npm test`
- Expected: 3 greet tests + 3 persona tests pass, build exits 0

## Clarifications
<!-- none -->
