import { describe, expect, it } from 'vitest'
import type { Difficulty, SVGSpec } from '../lib/types'
import {
  cellKey, generateItem, generateSpatialItem, isMirrorOf, isRotationOf, mirror, rotateBy,
} from './spatial'
import type { Cell } from './spatial'

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5]
const SEEDS = Array.from({ length: 40 }, (_, i) => i)

function optionCells(opt: SVGSpec | string): Cell[] {
  if (typeof opt === 'string' || opt.kind !== 'cells') throw new Error('expected cells option')
  return opt.cells
}

describe('spatial generator', () => {
  for (const d of DIFFICULTIES) {
    it(`difficulty ${d}: produces valid items across seeds`, () => {
      for (const seed of SEEDS) {
        const { item, target, correctRotation, foils } = generateSpatialItem(d, seed)

        // The base figure is asymmetric (all four rotations distinct) and
        // chiral (its mirror is not any rotation) — the task is well-posed.
        expect(new Set([0, 1, 2, 3].map(t => cellKey(rotateBy(target, t)))).size).toBe(4)
        expect(isRotationOf(mirror(target), target)).toBe(false)

        expect(item.options).toHaveLength(6)
        const cells = item.options.map(optionCells)

        // Exactly one option is a true rotation of the target, at the stated angle.
        cells.forEach((c, i) => {
          expect(isRotationOf(c, target), `option ${i} of ${item.id}`).toBe(i === item.correctIndex)
        })
        expect(cellKey(cells[item.correctIndex])).toBe(cellKey(rotateBy(target, correctRotation)))
        expect(correctRotation).toBeGreaterThanOrEqual(1)

        // No duplicate options.
        expect(new Set(cells.map(cellKey)).size).toBe(6)

        // Foil tags are honest.
        expect(foils).toHaveLength(5)
        for (const foil of foils) {
          expect(isRotationOf(foil.cells, target)).toBe(false)
          if (foil.kind === 'mirror') expect(isMirrorOf(foil.cells, target)).toBe(true)
          else {
            expect(isMirrorOf(foil.cells, target)).toBe(false)
            expect(foil.cells).toHaveLength(target.length)
          }
        }
      }
    })

    it(`difficulty ${d}: is reproducible`, () => {
      for (const seed of SEEDS.slice(0, 10)) {
        expect(generateItem(d, seed)).toEqual(generateItem(d, seed))
      }
    })
  }
})
