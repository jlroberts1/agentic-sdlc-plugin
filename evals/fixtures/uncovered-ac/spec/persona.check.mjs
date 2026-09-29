import test from 'node:test'
import assert from 'node:assert/strict'
import { personaGreeting } from '../src/persona.mjs'

// FR-002 AC-2.1
test('appends a known tagline (FR-002 AC-2.1)', () => {
  assert.equal(personaGreeting('Ada', 'Countess of computing'), 'Hello, Ada! Countess of computing')
})

// FR-002 AC-2.2
test('blank or missing tagline falls back to the plain greeting (FR-002 AC-2.2)', () => {
  assert.equal(personaGreeting('Ada', '   '), 'Hello, Ada!')
  assert.equal(personaGreeting('Ada', null), 'Hello, Ada!')
})
