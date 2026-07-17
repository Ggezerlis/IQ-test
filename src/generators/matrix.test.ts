import { describe, expect, it } from 'vitest'
import type { Difficulty, Figure, SVGSpec } from '../lib/types'
import { attributeDiff, canonicalKey } from './distractors'
import { generateItem, generateMatrixItem, verifyRule } from './matrix'

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5]
const SEEDS = Array.from({ length: 40 }, (_, i) => i)

/** Rules per difficulty, mirroring RULE_PLAN in matrix.ts. */
const EXPECTED_RULE_COUNT: Record<Difficulty, number> = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4 }

function optionFigure(opt: SVGSpec | string): Figure {
  if (typeof opt === 'string' || opt.kind !== 'figure') throw new Error('expected figure option')
  return opt.figure
}

describe('matrix generator', () => {
  for (const d of DIFFICULTIES) {
    describe(`difficulty ${d}`, () => {
      it('produces valid items across seeds', () => {
        for (const seed of SEEDS) {
          const { item, grid, rules } = generateMatrixItem(d, seed)

          expect(item.options).toHaveLength(6)
          expect(item.correctIndex).toBeGreaterThanOrEqual(0)
          expect(item.correctIndex).toBeLessThan(6)

          const figures = item.options.map(optionFigure)
          const answer = figures[item.correctIndex]

          // The keyed option equals the rule-determined bottom-right cell.
          expect(canonicalKey(answer)).toBe(canonicalKey(grid[8]))

          // Exactly one correct option: no other option matches the answer.
          const keys = figures.map(canonicalKey)
          expect(keys.filter(k => k === canonicalKey(answer))).toHaveLength(1)

          // No duplicate options.
          expect(new Set(keys).size).toBe(6)

          // Every distractor differs from the answer in exactly one attribute.
          figures.forEach((f, i) => {
            if (i === item.correctIndex) return
            expect(attributeDiff(f, answer), `option ${i} of ${item.id}`).toHaveLength(1)
          })

          // The full grid satisfies every rule the item claims to use.
          for (const rule of rules) {
            expect(verifyRule(grid, rule), `${item.id}: ${JSON.stringify(rule)}`).toBe(true)
          }
          expect(item.rulesUsed).toHaveLength(EXPECTED_RULE_COUNT[d])

          // Prompt hides exactly the answer cell.
          if (typeof item.prompt === 'string' || item.prompt.kind !== 'matrix') throw new Error('bad prompt')
          expect(item.prompt.cells).toHaveLength(9)
          expect(item.prompt.cells[8]).toBeNull()
          expect(item.prompt.cells.slice(0, 8).every(c => c !== null)).toBe(true)
        }
      })

      it('is reproducible from (difficulty, seed)', () => {
        for (const seed of SEEDS.slice(0, 10)) {
          expect(generateItem(d, seed)).toEqual(generateItem(d, seed))
        }
      })

      it('varies across seeds', () => {
        const ids = new Set(SEEDS.map(seed => JSON.stringify(generateItem(d, seed).options)))
        expect(ids.size).toBeGreaterThan(SEEDS.length * 0.9)
      })
    })
  }

  it('difficulty 4 and 5 items always include a logical/figure-set rule', () => {
    for (const d of [4, 5] as Difficulty[]) {
      for (const seed of SEEDS) {
        const { item } = generateMatrixItem(d, seed)
        const hard = item.rulesUsed.some(r =>
          /AND|OR|XOR|addition|subtraction|distribution-of-two/.test(r))
        expect(hard, `${item.id}: ${item.rulesUsed.join(', ')}`).toBe(true)
      }
    }
  })
})
