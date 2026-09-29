---
id: "FR-001"
title: "Greeting formatting"
status: "accepted"
source_files: ["src/greet.mjs"]
test_files: ["spec/greet.check.mjs"]
---

# FR-001: Greeting formatting

## Acceptance Criteria
- **AC-1.1:** `greet(name)` returns `Hello, <name>!`
- **AC-1.2:** surrounding whitespace in the name is trimmed
- **AC-1.3:** an empty or non-string name throws `TypeError`
