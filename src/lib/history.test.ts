import { describe, expect, it } from 'vitest'
import { TOTAL_ITEMS } from '../engine/testPlan'
import { addHistoryEntry, clearHistory, loadHistory, type HistoryEntry } from './history'

function fakeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  }
}

function entry(seed: number): HistoryEntry {
  return {
    seed,
    choices: Array(TOTAL_ITEMS).fill(0),
    finishedAt: 1700000000000 + seed,
    elapsedMs: 60000,
    itemMs: Array(TOTAL_ITEMS).fill(2000),
    summary: { band: 'top 40%', correct: 15, raw: 33, iqLo: 90, iqHi: 105 },
  }
}

describe('score history', () => {
  it('adds entries newest-first and round-trips', () => {
    const storage = fakeStorage()
    addHistoryEntry(entry(1), storage)
    const list = addHistoryEntry(entry(2), storage)
    expect(list.map(e => e.seed)).toEqual([2, 1])
    expect(loadHistory(storage)).toEqual(list)
  })

  it('caps at 20 entries', () => {
    const storage = fakeStorage()
    for (let i = 0; i < 25; i++) addHistoryEntry(entry(i), storage)
    const list = loadHistory(storage)
    expect(list).toHaveLength(20)
    expect(list[0].seed).toBe(24)
  })

  it('drops corrupt entries instead of failing', () => {
    const storage = fakeStorage()
    addHistoryEntry(entry(5), storage)
    const raw = JSON.parse(storage.getItem('freeiq-history-v1')!)
    raw.push({ seed: 'nope' }, { ...entry(6), choices: [1, 2] })
    storage.setItem('freeiq-history-v1', JSON.stringify(raw))
    expect(loadHistory(storage).map(e => e.seed)).toEqual([5])
    storage.setItem('freeiq-history-v1', 'not json{')
    expect(loadHistory(storage)).toEqual([])
  })

  it('clears', () => {
    const storage = fakeStorage()
    addHistoryEntry(entry(1), storage)
    clearHistory(storage)
    expect(loadHistory(storage)).toEqual([])
  })

  it('tolerates absent storage', () => {
    expect(loadHistory(null)).toEqual([])
    expect(() => addHistoryEntry(entry(1), null)).not.toThrow()
    expect(() => clearHistory(null)).not.toThrow()
  })
})
