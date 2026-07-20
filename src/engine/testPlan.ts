/**
 * Fixed 30-item section sequencing: 12 abstract matrices, 6 number series,
 * 6 spatial rotations, 6 figure weights. The difficulty of each slot is
 * decided at runtime by the adaptive engine; the item itself is derived
 * deterministically from (test seed, position), so a shared seed replays
 * the identical test.
 */
import { generateItem as matrixItem } from '../generators/matrix'
import { generateItem as seriesItem } from '../generators/series'
import { generateItem as spatialItem } from '../generators/spatial'
import { generateItem as weightsItem } from '../generators/weights'
import type { Difficulty, Item, ItemType } from '../lib/types'

export type Section = 'abstract' | 'numerical' | 'spatial' | 'logical'

export interface PlanSlot {
  section: Section
  type: ItemType
}

const LAYOUT: { section: Section; type: ItemType; count: number }[] = [
  { section: 'abstract', type: 'matrix', count: 12 },
  { section: 'numerical', type: 'series', count: 6 },
  { section: 'spatial', type: 'spatial', count: 6 },
  { section: 'logical', type: 'weights', count: 6 },
]

export const TEST_PLAN: PlanSlot[] = LAYOUT.flatMap(({ section, type, count }) =>
  Array.from({ length: count }, () => ({ section, type })),
)

export const TOTAL_ITEMS = TEST_PLAN.length

export const SECTION_LABEL: Record<Section, string> = {
  abstract: 'Abstract patterns',
  numerical: 'Number series',
  spatial: 'Spatial rotation',
  logical: 'Figure weights',
}

/** Per-position item seed; distinct positions always get distinct seeds within a test. */
export function itemSeed(testSeed: number, position: number): number {
  return ((testSeed >>> 0) + position * 101) >>> 0
}

function generate(type: ItemType, difficulty: Difficulty, seed: number): Item {
  switch (type) {
    case 'matrix': return matrixItem(difficulty, seed)
    case 'series': return seriesItem(difficulty, seed)
    case 'spatial': return spatialItem(difficulty, seed)
    case 'weights': return weightsItem(difficulty, seed)
  }
}

/**
 * The seed actually used at this position: normally itemSeed, but if a
 * generator throws on it (an edge case the retry budget inside the
 * generator couldn't solve), deterministically step to the next variant.
 * Deterministic fallback keeps share links and replays consistent — every
 * client that hits the same bad seed lands on the same replacement.
 */
export function safeItemSeed(testSeed: number, position: number, difficulty: Difficulty): number {
  const base = itemSeed(testSeed, position)
  for (let k = 0; k < 10; k++) {
    const seed = (base + k * 0x9e3779b1) >>> 0
    try {
      generate(TEST_PLAN[position].type, difficulty, seed)
      return seed
    } catch {
      // try the next variant
    }
  }
  // Ten dead seeds in a row would mean a systemic generator bug; the
  // error boundary is the right place for that.
  throw new Error(`no generatable item at position ${position}, difficulty ${difficulty}`)
}

export function itemAt(testSeed: number, position: number, difficulty: Difficulty): Item {
  return generate(TEST_PLAN[position].type, difficulty, safeItemSeed(testSeed, position, difficulty))
}
