import { describe, expect, it } from 'vitest'
import type { Difficulty } from '../lib/types'
import { difficultyLadder } from './adaptive'
import { normalCdf, scoreTest } from './scoring'
import { TOTAL_ITEMS } from './testPlan'

function answersFromResults(results: boolean[]) {
  const ladder = difficultyLadder(results)
  return results.map((correct, i) => ({ correct, difficulty: ladder[i] as Difficulty }))
}

describe('scoring', () => {
  it('raw score is the sum of difficulties of correct items', () => {
    const report = scoreTest([
      { correct: true, difficulty: 2 },
      { correct: false, difficulty: 3 },
      { correct: true, difficulty: 5 },
    ])
    expect(report.raw).toBe(7)
  })

  it('a perfect adaptive run scores raw 138 and lands at the ceiling', () => {
    const report = scoreTest(answersFromResults(Array(TOTAL_ITEMS).fill(true)))
    // Ladder 2,2,2,3,4,5,5,... → 6 + 3 + 4 + 5×26... verified: 2+2+2+3+4+25×5
    expect(report.raw).toBe(2 + 2 + 2 + 3 + 4 + 25 * 5)
    expect(report.percentile).toBe(99)
    expect(report.iqRange[1]).toBeLessThanOrEqual(145)
  })

  it('an all-wrong run lands in the bottom percentiles', () => {
    const report = scoreTest(answersFromResults(Array(TOTAL_ITEMS).fill(false)))
    expect(report.raw).toBe(0)
    expect(report.percentile).toBeLessThanOrEqual(3)
    expect(report.percentile).toBeGreaterThanOrEqual(1)
    expect(report.iqRange[0]).toBeGreaterThanOrEqual(55)
  })

  it('percentile is monotone in raw score and always within 1-99', () => {
    let prev = 0
    for (let correct = 0; correct <= TOTAL_ITEMS; correct++) {
      const results = Array.from({ length: TOTAL_ITEMS }, (_, i) => i < correct)
      const report = scoreTest(answersFromResults(results))
      expect(report.percentile).toBeGreaterThanOrEqual(Math.max(1, prev))
      expect(report.percentile).toBeLessThanOrEqual(99)
      prev = report.percentile
    }
  })

  it('IQ is always a proper range, never a point', () => {
    for (const n of [0, 5, 15, 25, 30]) {
      const results = Array.from({ length: TOTAL_ITEMS }, (_, i) => i < n)
      const [lo, hi] = scoreTest(answersFromResults(results)).iqRange
      expect(lo).toBeLessThan(hi)
      expect(hi - lo).toBeGreaterThanOrEqual(8)
    }
  })

  it('splits sections correctly and consistently', () => {
    const results = Array.from({ length: TOTAL_ITEMS }, (_, i) => i % 2 === 0)
    const report = scoreTest(answersFromResults(results))
    expect(report.sections.map(s => [s.section, s.total])).toEqual([
      ['abstract', 12], ['numerical', 6], ['spatial', 6], ['logical', 6],
    ])
    const totalCorrect = report.sections.reduce((s, x) => s + x.correct, 0)
    expect(totalCorrect).toBe(results.filter(Boolean).length)
    const totalRaw = report.sections.reduce((s, x) => s + x.raw, 0)
    expect(totalRaw).toBe(report.raw)
    for (const s of report.sections) {
      expect(s.raw).toBeLessThanOrEqual(s.attemptedRaw)
    }
  })

  it('normalCdf behaves like a CDF', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6)
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3)
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3)
    expect(normalCdf(4)).toBeGreaterThan(0.9999)
  })
})
