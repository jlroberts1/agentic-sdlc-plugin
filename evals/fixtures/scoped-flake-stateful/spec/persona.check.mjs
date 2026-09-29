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

// FR-002 AC-2.1 — a fetched tagline is reused instead of re-fetching
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
test('reuses a fetched tagline instead of calling the API again (FR-002 AC-2.1)', async () => {
  const cachePath = '.cache/persona-tagline.json'
  let calls = 0
  const fetchImpl = async () => { calls++; return { ok: true, json: async () => ({ tagline: 'Countess' }) } }
  process.env.PERSONA_API_KEY = 'test-key'
  let tagline
  if (existsSync(cachePath)) {
    tagline = JSON.parse(readFileSync(cachePath, 'utf8')).tagline
  } else {
    tagline = await fetchPersona('Ada', fetchImpl)
    mkdirSync('.cache', { recursive: true })
    writeFileSync(cachePath, JSON.stringify({ tagline }))
  }
  delete process.env.PERSONA_API_KEY
  assert.equal(tagline, 'Countess')
  assert.equal(calls, 1, 'the API is called exactly once per run')
})
