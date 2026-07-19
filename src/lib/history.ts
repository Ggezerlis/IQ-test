/**
 * Local score history — finished runs stored in this browser only. Each
 * entry keeps (seed, choices) so its full results page can be reconstructed,
 * plus a precomputed summary so the home-page list renders without
 * regenerating 30 items per entry.
 */
import { TOTAL_ITEMS } from '../engine/testPlan'

const KEY = 'freeiq-history-v1'
const MAX_ENTRIES = 20

export interface HistoryEntry {
  seed: number
  choices: number[]
  finishedAt: number
  elapsedMs: number
  itemMs: number[]
  summary: {
    band: string
    correct: number
    raw: number
    iqLo: number
    iqHi: number
  }
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
    return null
  }
}

function isValid(e: Partial<HistoryEntry>): e is HistoryEntry {
  return (
    typeof e.seed === 'number' && Number.isInteger(e.seed) && e.seed >= 0 && e.seed <= 0xffffffff &&
    Array.isArray(e.choices) && e.choices.length === TOTAL_ITEMS &&
    e.choices.every(c => Number.isInteger(c) && c >= 0 && c <= 5) &&
    typeof e.finishedAt === 'number' && Number.isFinite(e.finishedAt) &&
    typeof e.elapsedMs === 'number' && Number.isFinite(e.elapsedMs) && e.elapsedMs >= 0 &&
    Array.isArray(e.itemMs) && e.itemMs.length === TOTAL_ITEMS &&
    e.itemMs.every(m => typeof m === 'number' && Number.isFinite(m) && m >= 0) &&
    typeof e.summary === 'object' && e.summary !== null &&
    typeof e.summary.band === 'string' &&
    typeof e.summary.correct === 'number' &&
    typeof e.summary.raw === 'number' &&
    typeof e.summary.iqLo === 'number' &&
    typeof e.summary.iqHi === 'number'
  )
}

export function loadHistory(storage = defaultStorage()): HistoryEntry[] {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data.filter(isValid).slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

/** Prepends the entry (newest first) and trims to the cap. Returns the new list. */
export function addHistoryEntry(entry: HistoryEntry, storage = defaultStorage()): HistoryEntry[] {
  const next = [entry, ...loadHistory(storage)].slice(0, MAX_ENTRIES)
  try {
    storage?.setItem(KEY, JSON.stringify(next))
  } catch {
    // Quota failures just mean no history — never break the results flow.
  }
  return next
}

export function clearHistory(storage = defaultStorage()): void {
  try {
    storage?.removeItem(KEY)
  } catch {
    // ignore
  }
}
