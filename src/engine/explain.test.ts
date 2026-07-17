import { describe, expect, it } from 'vitest'
import { replayTest } from './explain'
import { TOTAL_ITEMS } from './testPlan'

const SEEDS = [1, 7, 42, 987654321]

/** Choices that answer every item correctly, discovered by replaying incrementally. */
function perfectChoices(seed: number): number[] {
  const choices: number[] = []
  for (let i = 0; i < TOTAL_ITEMS; i++) {
    choices.push(0)
    const { reviews } = replayTest(seed, choices)
    choices[i] = reviews[i].item.correctIndex
  }
  return choices
}

describe('explanation engine', () => {
  it('replays a full test with complete explanations for every item', () => {
    for (const seed of SEEDS) {
      const choices = Array.from({ length: TOTAL_ITEMS }, (_, i) => i % 6)
      const { reviews, report } = replayTest(seed, choices)
      expect(reviews).toHaveLength(TOTAL_ITEMS)
      for (const r of reviews) {
        expect(r.ruleExplanations.length).toBeGreaterThan(0)
        for (const t of r.ruleExplanations) expect(t.length).toBeGreaterThan(10)
        expect(r.answerExplanation.length).toBeGreaterThan(5)
        expect(r.distractorExplanation.length).toBeGreaterThan(10)
        expect(r.correct).toBe(r.chosenIndex === r.item.correctIndex)
      }
      expect(report.raw).toBe(reviews.reduce((s, r) => s + (r.correct ? r.difficulty : 0), 0))
    }
  })

  it('is deterministic', () => {
    const choices = Array.from({ length: TOTAL_ITEMS }, (_, i) => (i * 5) % 6)
    const a = replayTest(42, choices)
    const b = replayTest(42, choices)
    expect(a.reviews.map(r => r.item)).toEqual(b.reviews.map(r => r.item))
    expect(a.report).toEqual(b.report)
  })

  it('walks the adaptive ladder: pinned start, ±1 afterwards', () => {
    const choices = perfectChoices(11)
    const { reviews, report } = replayTest(11, choices)
    expect(reviews.every(r => r.correct)).toBe(true)
    expect(reviews.slice(0, 3).map(r => r.difficulty)).toEqual([2, 2, 2])
    expect(reviews.slice(6).every(r => r.difficulty === 5)).toBe(true)
    expect(report.percentile).toBe(99)
  })

  it('explains the taker`s wrong pick specifically', () => {
    const choices = perfectChoices(7)
    const { reviews: right } = replayTest(7, choices)
    // Deliberately answer item 5 wrong.
    const wrongIdx = right[4].item.correctIndex === 0 ? 1 : 0
    const altered = [...choices]
    altered[4] = wrongIdx
    const { reviews } = replayTest(7, altered)
    expect(reviews[4].correct).toBe(false)
    expect(reviews[4].distractorExplanation).toContain(`Option ${String.fromCharCode(65 + wrongIdx)}`)
  })

  it('sections line up with the plan layout', () => {
    const { reviews } = replayTest(3, Array(TOTAL_ITEMS).fill(0))
    expect(reviews.slice(0, 12).every(r => r.item.type === 'matrix')).toBe(true)
    expect(reviews.slice(12, 18).every(r => r.item.type === 'series')).toBe(true)
    expect(reviews.slice(18, 24).every(r => r.item.type === 'spatial')).toBe(true)
    expect(reviews.slice(24, 30).every(r => r.item.type === 'weights')).toBe(true)
  })
})
