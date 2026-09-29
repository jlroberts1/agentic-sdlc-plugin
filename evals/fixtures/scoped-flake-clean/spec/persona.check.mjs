import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchPersona, personaGreeting } from '../src/persona.mjs'

const fakeFetch = (status, body) => async () => ({ ok: status === 200, json: async () => body })

// FR-002 AC-2.1
test('appends a known tagline (FR-002 AC-2.1)', () => {
  assert.equal(personaGreeting('Ada', 'Countess of computing'), 'Hello, Ada! Countess of computing')
})

// FR-002 AC-2.2
test('blank or missing tagline falls back to the plain greeting (FR-002 AC-2.2)', () => {
  assert.equal(personaGreeting('Ada', '   '), 'Hello, Ada!')
  assert.equal(personaGreeting('Ada', null), 'Hello, Ada!')
})

// FR-002 AC-2.3
test('API failure yields null so the greeting still works (FR-002 AC-2.3)', async () => {
  process.env.PERSONA_API_KEY = 'test-key'
  assert.equal(await fetchPersona('Ada', fakeFetch(500, {})), null)
  assert.equal(await fetchPersona('Ada', async () => { throw new Error('network down') }), null)
  assert.equal(await fetchPersona('Ada', fakeFetch(200, { tagline: 'Countess' })), 'Countess')
  delete process.env.PERSONA_API_KEY
})
