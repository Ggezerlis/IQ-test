/**
 * The fixed 5-question practice round: 2 matrices, 1 series, 1 spatial,
 * 1 weights. Frozen JSON baked by scripts/make-practice.ts — identical for
 * every visitor and completely separate from the seeded items real tests
 * draw, which also means future generator changes can never silently alter
 * it.
 */
import type { Item } from '../lib/types'
import rawItems from './items.json'

export interface PracticeEntry {
  item: Item
  ruleExplanations: string[]
  answerExplanation: string
}

export const PRACTICE_ITEMS = rawItems as unknown as PracticeEntry[]
