/**
 * In-progress test persistence so a refresh or accidental tab close doesn't
 * discard progress. localStorage only — still no backend, and the saved
 * blob is just (seed, choices so far, elapsed time), the same data a share
 * link would carry.
 */
import { TOTAL_ITEMS } from '../engine/testPlan'

const KEY = 'freeiq-session-v1'

export interface SavedSession {
  seed: number
  choices: number[]
  elapsedMs: number
}

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null // storage access can throw in some privacy modes
  }
}

export function saveSession(session: SavedSession, storage = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(session))
  } catch {
    // Quota/privacy-mode failures just mean no resume — never break the test.
  }
}

export function clearSession(storage = defaultStorage()): void {
  try {
    storage?.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function loadSession(storage = defaultStorage()): SavedSession | null {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<SavedSession>
    if (
      typeof data.seed !== 'number' ||
      !Number.isInteger(data.seed) ||
      data.seed < 0 ||
      data.seed > 0xffffffff
    ) return null
    if (
      !Array.isArray(data.choices) ||
      data.choices.length === 0 ||
      data.choices.length >= TOTAL_ITEMS ||
      !data.choices.every(c => Number.isInteger(c) && c >= 0 && c <= 5)
    ) return null
    if (typeof data.elapsedMs !== 'number' || !Number.isFinite(data.elapsedMs) || data.elapsedMs < 0) return null
    return { seed: data.seed, choices: data.choices, elapsedMs: data.elapsedMs }
  } catch {
    return null
  }
}
