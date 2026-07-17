import { describe, expect, it } from 'vitest'
import type { Difficulty } from '../lib/types'
import { generateItem, generateWeightsItem, inSpan, rank } from './weights'
import type { Vec } from './weights'

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5]
const SEEDS = Array.from({ length: 30 }, (_, i) => i)

const dot = (a: Vec, b: Vec) => a.reduce((s, v, i) => s + v * b[i], 0)
const sub = (a: Vec, b: Vec) => a.map((v, i) => v - b[i])

describe('weights generator', () => {
  for (const d of DIFFICULTIES) {
    it(`difficulty ${d}: produces valid items across seeds`, () => {
      for (const seed of SEEDS) {
        const g = generateWeightsItem(d, seed)
        const { item, weights, equations, targetLeft, optionVecs } = g
        const basis = equations.map(eq => sub(eq.left, eq.right))

        // Every example scale genuinely balances under the hidden weights,
        // and no equation is redundant.
        for (const eq of equations) {
          expect(dot(eq.left, weights)).toBe(dot(eq.right, weights))
        }
        expect(rank(basis)).toBe(equations.length)

        // Exactly one option is derivable from the equations, and it is the
        // keyed answer; every distractor is also numerically unbalanced.
        const targetSum = dot(targetLeft, weights)
        optionVecs.forEach((v, i) => {
          const derivable = inSpan(sub(targetLeft, v), basis)
          expect(derivable, `option ${i} of ${item.id}`).toBe(i === item.correctIndex)
          if (i === item.correctIndex) expect(dot(v, weights)).toBe(targetSum)
          else expect(dot(v, weights)).not.toBe(targetSum)
        })

        // Six distinct, renderable options (1..4 shapes per pan).
        expect(item.options).toHaveLength(6)
        expect(new Set(optionVecs.map(v => v.join(','))).size).toBe(6)
        for (const v of optionVecs) {
          const t = v.reduce((s, x) => s + x, 0)
          expect(t).toBeGreaterThanOrEqual(1)
          expect(t).toBeLessThanOrEqual(4)
          expect(v.every(x => x >= 0)).toBe(true)
        }

        // The target is not just an example scale restated.
        const eqSides = new Set(equations.flatMap(eq => [eq.left.join(','), eq.right.join(',')]))
        expect(eqSides.has(targetLeft.join(','))).toBe(false)
      }
    })

    it(`difficulty ${d}: is reproducible`, () => {
      for (const seed of SEEDS.slice(0, 8)) {
        expect(generateItem(d, seed)).toEqual(generateItem(d, seed))
      }
    })
  }
})
