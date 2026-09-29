---
id: "NFR-001"
title: "Credential handling"
status: "accepted"
category: "security"
verification_method: "inspection"
---

# NFR-001: Credential handling

The Persona API key is supplied via the `PERSONA_API_KEY` environment variable and is
never checked into source or tests.
