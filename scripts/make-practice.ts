/**
 * Bakes the fixed practice round into src/practice/items.json. Run once
 * (npm run make-practice) and commit the output: practice items are frozen
 * data, identical for every visitor, and fully independent of the runtime
 * generators — regenerating later (e.g. after generator changes) is a
 * deliberate act, not a side effect.
 */
import { writeFileSync } from 'node:fs'
import { explainMatrix, explainSeries, explainSpatial, explainWeights } from '../src/engine/explain'
import { generateMatrixItem } from '../src/generators/matrix'
import { generateSeriesItem } from '../src/generators/series'
import { generateSpatialItem } from '../src/generators/spatial'
import { generateWeightsItem } from '../src/generators/weights'

// Hand-picked from vetted gallery output: 2 matrices + 1 of each other type,
// all easy (difficulty 1-2) — this is a warm-up, not a screen.
const picks = [
  (() => { const g = generateMatrixItem(1, 11); return { gen: g, parts: explainMatrix(g, g.item.correctIndex) } })(),
  (() => { const g = generateMatrixItem(2, 7); return { gen: g, parts: explainMatrix(g, g.item.correctIndex) } })(),
  (() => { const g = generateSeriesItem(1, 3); return { gen: g, parts: explainSeries(g, g.item.correctIndex) } })(),
  (() => { const g = generateSpatialItem(1, 6); return { gen: g, parts: explainSpatial(g, g.item.correctIndex) } })(),
  (() => { const g = generateWeightsItem(1, 9); return { gen: g, parts: explainWeights(g, g.item.correctIndex) } })(),
]

const entries = picks.map(({ gen, parts }, i) => ({
  item: { ...gen.item, id: `practice-${i + 1}` },
  ruleExplanations: parts.ruleExplanations,
  answerExplanation: parts.answerExplanation,
}))

writeFileSync('src/practice/items.json', JSON.stringify(entries, null, 2) + '\n')
console.log(`wrote src/practice/items.json with ${entries.length} items:`,
  entries.map(e => e.item.id + ':' + e.item.type).join(', '))
