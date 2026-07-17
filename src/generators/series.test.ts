import { describe, expect, it } from 'vitest'
import type { Difficulty } from '../lib/types'
import { computeTerms, generateItem, generateSeriesItem, seriesLength } from './series'

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
})
