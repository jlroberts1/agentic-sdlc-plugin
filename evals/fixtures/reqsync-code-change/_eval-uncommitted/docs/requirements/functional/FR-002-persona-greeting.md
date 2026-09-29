---
id: "FR-002"
title: "Persona-enriched greeting"
status: "accepted"
source_files: ["src/persona.mjs"]
test_files: ["spec/persona.check.mjs"]
---

# FR-002: Persona-enriched greeting

## Acceptance Criteria
- **AC-2.1:** a known tagline is appended to the greeting
- **AC-2.2:** a blank or missing tagline falls back to the plain greeting
- **AC-2.3:** an API failure (non-200 or network error) yields `null` so the greeting still works
