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

export function itemAt(testSeed: number, position: number, difficulty: Difficulty): Item {
  const slot = TEST_PLAN[position]
  const seed = itemSeed(testSeed, position)
  switch (slot.type) {
    case 'matrix': return matrixItem(difficulty, seed)
    case 'series': return seriesItem(difficulty, seed)
    case 'spatial': return spatialItem(difficulty, seed)
    case 'weights': return weightsItem(difficulty, seed)
  }
}
