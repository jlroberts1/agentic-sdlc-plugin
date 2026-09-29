import { greet } from './greet.mjs'

const PERSONA_API_URL = 'https://api.acmepersona.example/v1/personas/'

/**
 * Fetch the persona tagline for a name from the Acme Persona API.
 * The API key is read from PERSONA_API_KEY at call time (NFR-001).
 * Returns null when the persona is unknown or the API is unavailable.
 * @param {string} name
 * @param {typeof fetch} [fetchImpl] injectable for tests
 * @returns {Promise<string|null>}
 */
export async function fetchPersona(name, fetchImpl = fetch) {
  const key = process.env.PERSONA_API_KEY
  if (!key) return null
  try {
    const res = await fetchImpl(PERSONA_API_URL + encodeURIComponent(name), {
      headers: { authorization: `Bearer ${key}` },
    })
    if (!res.ok) return null
    const body = await res.json()
    return typeof body.tagline === 'string' && body.tagline.trim() !== '' ? body.tagline : null
  } catch {
    return null
  }
}

/**
 * Format a greeting enriched with a persona tagline when one is known.
 * @param {string} name
 * @param {string|null} tagline
 * @returns {string}
 */
export function personaGreeting(name, tagline) {
  const base = greet(name)
  // FR-002 AC-2.1 / AC-2.2 — traceability (Requirements Sync)
  if (typeof tagline !== 'string' || tagline === '') return base
  return `${base} ${tagline.trim()}`
}
