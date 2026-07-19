import { describe, expect, it } from 'vitest'
import type { Difficulty } from '../lib/types'
import { computeTerms, generateItem, generateSeriesItem, lawfulContinuations, seriesLength } from './series'

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5]
const SEEDS = Array.from({ length: 40 }, (_, i) => i)

describe('series generator', () => {
  for (const d of DIFFICULTIES) {
    it(`difficulty ${d}: produces valid items across seeds`, () => {
      for (const seed of SEEDS) {
        const { item, recipe, terms } = generateSeriesItem(d, seed)

        // The stored terms genuinely come from the recipe.
        expect(terms).toEqual(computeTerms(recipe))
        expect(terms).toHaveLength(seriesLength(recipe))

        // Prompt shows every term but the last, then a question mark.
        expect(item.prompt).toBe(`${terms.slice(0, -1).join(', ')}, ?`)

        // Exactly six unique options, exactly one of which is the true next term.
        expect(item.options).toHaveLength(6)
        expect(new Set(item.options).size).toBe(6)
        const answer = terms[terms.length - 1]
        expect(item.options[item.correctIndex]).toBe(String(answer))
        expect(item.options.filter(o => o === String(answer))).toHaveLength(1)

        // All options are integers of sane magnitude.
        for (const o of item.options) {
          const v = Number(o)
          expect(Number.isInteger(v)).toBe(true)
          expect(Math.abs(v)).toBeLessThanOrEqual(9999)
        }

        expect(item.rulesUsed).toHaveLength(1)
      }
    })

    it(`difficulty ${d}: is reproducible`, () => {
      for (const seed of SEEDS.slice(0, 10)) {
        expect(generateItem(d, seed)).toEqual(generateItem(d, seed))
      }
    })
  }

  it('varies across seeds', () => {
    const prompts = new Set(SEEDS.map(s => generateItem(3, s).prompt))
    expect(prompts.size).toBeGreaterThan(SEEDS.length * 0.75)
  })

  it('never offers a distractor that is a lawful continuation under another rule', () => {
    for (const d of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const { item, terms } = generateSeriesItem(d, seed)
        const lawful = lawfulContinuations(terms.slice(0, -1))
        expect(lawful.has(terms[terms.length - 1]), item.id).toBe(true)
        item.options.forEach((o, i) => {
          if (i === item.correctIndex) return
          expect(lawful.has(Number(o)), `${item.id}: option ${o} is ambiguous`).toBe(false)
        })
      }
    }
  })

  it('lawfulContinuations recognizes the classic families', () => {
    expect(lawfulContinuations([2, 5, 8, 11, 14])).toContain(17) // arithmetic
    expect(lawfulContinuations([3, 6, 12, 24, 48])).toContain(96) // geometric
    expect(lawfulContinuations([1, 2, 4, 7, 11])).toContain(16) // second-order
    expect(lawfulContinuations([2, 3, 5, 8, 13])).toContain(21) // fibonacci
    expect(lawfulContinuations([10, 15, 12, 17, 14])).toContain(19) // alternating +5, -3
    expect(lawfulContinuations([1, 20, 4, 27, 7, 34, 10])).toContain(41) // interleaved
    // A sequence with no consistent rule yields nothing.
    expect(lawfulContinuations([3, 14, 8, 1, 90]).size).toBe(0)
  })
})
