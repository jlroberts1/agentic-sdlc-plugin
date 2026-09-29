import test from 'node:test'
import assert from 'node:assert/strict'
import { greet } from '../src/greet.mjs'

// FR-001 AC-1.1
test('greets a name (FR-001 AC-1.1)', () => {
  assert.equal(greet('Ada'), 'Hello, Ada!')
})

// FR-001 AC-1.2
test('trims surrounding whitespace (FR-001 AC-1.2)', () => {
  assert.equal(greet('  Ada '), 'Hello, Ada!')
})

// FR-001 AC-1.3
test('rejects empty or non-string names (FR-001 AC-1.3)', () => {
  assert.throws(() => greet(''), TypeError)
  assert.throws(() => greet(42), TypeError)
})
