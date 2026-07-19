import { describe, expect, it } from 'vitest'
import { TOTAL_ITEMS } from '../engine/testPlan'
import { clearSession, loadSession, saveSession } from './session'

function fakeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  }
}

describe('session persistence', () => {
  it('round-trips a valid in-progress session', () => {
    const storage = fakeStorage()
    const session = { seed: 123456, choices: [0, 3, 5], elapsedMs: 84500, itemMs: [30000, 24500, 30000] }
    saveSession(session, storage)
    expect(loadSession(storage)).toEqual(session)
  })

  it('clearSession removes it', () => {
    const storage = fakeStorage()
    saveSession({ seed: 1, choices: [2], elapsedMs: 100, itemMs: [100] }, storage)
    clearSession(storage)
    expect(loadSession(storage)).toBeNull()
  })

  it('rejects corrupt or invalid saved data', () => {
    const storage = fakeStorage()
    const bad = [
      'not json{',
      JSON.stringify({ seed: -1, choices: [0], elapsedMs: 5, itemMs: [5] }),
      JSON.stringify({ seed: 1.5, choices: [0], elapsedMs: 5, itemMs: [5] }),
      JSON.stringify({ seed: 1, choices: [], elapsedMs: 5, itemMs: [] }), // nothing answered
      JSON.stringify({ seed: 1, choices: Array(TOTAL_ITEMS).fill(0), elapsedMs: 5, itemMs: Array(TOTAL_ITEMS).fill(1) }), // complete test
      JSON.stringify({ seed: 1, choices: [7], elapsedMs: 5, itemMs: [5] }), // option out of range
      JSON.stringify({ seed: 1, choices: [0], elapsedMs: -3, itemMs: [5] }),
      JSON.stringify({ seed: 1, choices: [0], elapsedMs: 5 }), // missing itemMs
      JSON.stringify({ seed: 1, choices: [0, 1], elapsedMs: 5, itemMs: [5] }), // length mismatch
      JSON.stringify({ seed: 1, choices: [0], elapsedMs: 5, itemMs: [-1] }),
    ]
    for (const raw of bad) {
      storage.setItem('freeiq-session-v2', raw)
      expect(loadSession(storage), raw).toBeNull()
    }
  })

  it('handles absent storage without throwing', () => {
    expect(loadSession(null)).toBeNull()
    expect(() => saveSession({ seed: 1, choices: [0], elapsedMs: 1, itemMs: [1] }, null)).not.toThrow()
    expect(() => clearSession(null)).not.toThrow()
  })
})
