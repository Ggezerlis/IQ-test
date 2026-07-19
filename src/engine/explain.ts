/**
 * Replays a finished test purely from (seed, chosen option indexes) and
 * produces, for every item: the rules in words, why the correct option is
 * right, and why the taker's wrong pick (or, if they were right, a
 * representative distractor) is wrong. Because generation is seeded, this
 * needs no stored state beyond seed + choices — which is exactly what the
 * share link encodes.
 */
import { attributeDiff, type FigureAttribute } from '../generators/distractors'
import { generateMatrixItem, type MatrixGeneration, type MatrixRule } from '../generators/matrix'
import {
  computeTerms, generateSeriesItem, wrongContinuations, type SeriesGeneration, type SeriesRecipe,
} from '../generators/series'
import { cellKey, generateSpatialItem, type SpatialGeneration } from '../generators/spatial'
import { describePan, generateWeightsItem, type WeightsGeneration } from '../generators/weights'
import type { Difficulty, Figure, Item } from '../lib/types'
import { canonicalRotation, describeFigure, fillWord } from '../render/shapes'
import { difficultyLadder, INITIAL_DIFFICULTY, PINNED_ITEMS, nextDifficulty } from './adaptive'
import { scoreTest, type AnswerLike, type ScoreReport } from './scoring'
import { itemSeed, TEST_PLAN, type Section } from './testPlan'

export interface ItemReview {
  position: number
  section: Section
  item: Item
  difficulty: Difficulty
  chosenIndex: number
  correct: boolean
  /** What the rules were. */
  ruleExplanations: string[]
  /** Why the correct option is right. */
  answerExplanation: string
  /** Why the taker's wrong pick — or a representative distractor — is wrong. */
  distractorExplanation: string
}

export interface Replay {
  reviews: ItemReview[]
  report: ScoreReport
}

const letter = (i: number) => String.fromCharCode(65 + i)
const SIZE_WORD = { 1: 'small', 2: 'medium', 3: 'large' } as const

// ---------- matrix ----------

function matrixRuleText(rule: MatrixRule): string {
  switch (rule.kind) {
    case 'constant-row': {
      const vals = rule.slot === 'fill' ? rule.values.map(v => fillWord(v as never)) : rule.values
      return `Within each row the ${rule.slot} stays the same — ${vals.join(', then ')} from top row to bottom.`
    }
    case 'dist3': {
      const vals = rule.slot === 'fill'
        ? (rule.values as string[]).map(v => fillWord(v as never))
        : rule.slot === 'size'
          ? (rule.values as (1 | 2 | 3)[]).map(v => SIZE_WORD[v])
          : rule.values
      return `Every row and every column contains each ${rule.slot} exactly once (${vals.join(', ')}).`
    }
    case 'progression':
      if (rule.slot === 'rotation') return `Each cell is rotated ${rule.delta}° further than the cell to its left.`
      return `The ${rule.slot} ${rule.delta > 0 ? 'increases' : 'decreases'} by ${Math.abs(rule.delta)} from cell to cell across each row.`
    case 'overlay':
      switch (rule.op) {
        case 'and': return 'A corner dot appears in the third cell of a row only where BOTH of the first two cells have it (logical AND).'
        case 'or': return 'A corner dot appears in the third cell wherever EITHER of the first two cells has it (logical OR).'
        case 'xor': return 'A corner dot appears in the third cell where exactly ONE of the first two cells has it (XOR — shared dots cancel).'
        case 'add': return 'The third cell combines all corner dots of the first two cells (figure addition).'
        case 'sub': return "The third cell keeps the first cell's corner dots minus the second cell's (figure subtraction)."
      }
      break
    case 'dist2':
      return 'Each row and each column has one cell with a ring marker, one with a bar marker, and one with no marker.'
  }
  return ''
}

const ATTR_WORD: Record<FigureAttribute, string> = {
  shape: 'shape', count: 'count', size: 'size', fill: 'fill',
  rotation: 'rotation', overlay: 'corner dots', decoration: 'marker',
}

function matrixAttrValue(f: Figure, attr: FigureAttribute): string {
  switch (attr) {
    case 'shape': return f.shape
    case 'count': return String(f.count)
    case 'size': return SIZE_WORD[f.size]
    case 'fill': return fillWord(f.fill)
    case 'rotation': return `${canonicalRotation(f.shape, f.rotation)}°`
    case 'overlay': return 'a different dot pattern'
    case 'decoration': return f.decoration ? `a ${f.decoration} marker` : 'no marker'
  }
}

export function explainMatrix(gen: MatrixGeneration, chosen: number): Pick<ItemReview, 'ruleExplanations' | 'answerExplanation' | 'distractorExplanation'> {
  const { item, grid, rules } = gen
  const answer = grid[8]
  const wrongIdx = chosen !== item.correctIndex ? chosen : [0, 1, 2, 3, 4, 5].find(i => i !== item.correctIndex)!
  const wrongFig = (item.options[wrongIdx] as Extract<Item['options'][number], { kind: 'figure' }>).figure
  const attr = attributeDiff(wrongFig, answer)[0]

  const governing = rules.find(r =>
    (r.kind === 'overlay' && attr === 'overlay') ||
    (r.kind === 'dist2' && attr === 'decoration') ||
    (r.kind !== 'overlay' && r.kind !== 'dist2' && r.slot === attr))

  const wrongText = attr === 'overlay'
    ? `Option ${letter(wrongIdx)} shows the wrong corner dots`
    : `Option ${letter(wrongIdx)} shows the wrong ${ATTR_WORD[attr]} (${matrixAttrValue(wrongFig, attr)} instead of ${matrixAttrValue(answer, attr)})`

  return {
    ruleExplanations: rules.map(matrixRuleText),
    answerExplanation: `Applying every rule to the bottom row pins the missing cell down to exactly one figure: ${describeFigure(answer)}. Option ${letter(item.correctIndex)} matches it.`,
    distractorExplanation: `${wrongText} — it breaks ${governing ? 'that rule' : 'the regularity (this attribute never varies in the puzzle)'} while getting everything else right.`,
  }
}

// ---------- series ----------

function seriesNarrative(recipe: SeriesRecipe, terms: number[]): { rule: string; answer: string } {
  const n = terms.length
  const answer = terms[n - 1]
  const last = terms[n - 2]
  switch (recipe.kind) {
    case 'arithmetic':
      return {
        rule: `Each term ${recipe.d > 0 ? 'grows' : 'shrinks'} by ${Math.abs(recipe.d)}: ${terms[0]} → ${terms[1]} → ${terms[2]} …`,
        answer: `${last} ${recipe.d > 0 ? '+' : '−'} ${Math.abs(recipe.d)} = ${answer}.`,
      }
    case 'geometric':
      return {
        rule: `Each term is the previous one ×${recipe.r}: ${terms[0]} → ${terms[1]} → ${terms[2]} …`,
        answer: `${last} × ${recipe.r} = ${answer}.`,
      }
    case 'second-order': {
      const gaps = terms.slice(1, -1).map((t, i) => t - terms[i])
      return {
        rule: `The gaps between terms grow by ${recipe.e} each time: ${gaps.map(g => (g > 0 ? `+${g}` : `${g}`)).join(', ')} …`,
        answer: `The next gap is ${answer - last > 0 ? '+' : ''}${answer - last}, so ${last} → ${answer}.`,
      }
    }
    case 'fibonacci':
      return {
        rule: `Each term is the sum of the two before it: ${terms[0]} + ${terms[1]} = ${terms[2]}, ${terms[1]} + ${terms[2]} = ${terms[3]} …`,
        answer: `${terms[n - 3]} + ${last} = ${answer}.`,
      }
    case 'alternating': {
      const f = (o: { op: string; v: number }) => `${o.op === '*' ? '×' : o.op}${o.v}`
      const nextOp = (n - 2) % 2 === 0 ? recipe.opA : recipe.opB
      return {
        rule: `Two operations alternate: ${f(recipe.opA)}, then ${f(recipe.opB)}, then ${f(recipe.opA)} again …`,
        answer: `The next operation is ${f(nextOp)}: ${last} ${f(nextOp)} = ${answer}.`,
      }
    }
    case 'interleaved':
      return {
        rule: `Two sequences are interleaved: the 1st, 3rd, 5th … terms step by ${recipe.dA > 0 ? '+' : ''}${recipe.dA}; the 2nd, 4th, 6th … terms step by ${recipe.dB > 0 ? '+' : ''}${recipe.dB}.`,
        answer: `The ? continues the second thread: ${terms[n - 3]} + ${recipe.dB} = ${answer}.`,
      }
  }
}

export function explainSeries(gen: SeriesGeneration, chosen: number): Pick<ItemReview, 'ruleExplanations' | 'answerExplanation' | 'distractorExplanation'> {
  const { item, recipe, terms } = gen
  const narrative = seriesNarrative(recipe, terms)
  const wrongIdx = chosen !== item.correctIndex ? chosen : [0, 1, 2, 3, 4, 5].find(i => i !== item.correctIndex)!
  const wrongValue = Number(item.options[wrongIdx])
  const labeled = wrongContinuations(recipe, terms).find(w => w.value === wrongValue)
  const why = labeled?.why ?? `does not fit — the rule gives ${terms[terms.length - 1]}`
  return {
    ruleExplanations: [narrative.rule],
    answerExplanation: narrative.answer,
    distractorExplanation: `Option ${letter(wrongIdx)} (${wrongValue}) ${why}.`,
  }
}

// ---------- spatial ----------

export function explainSpatial(gen: SpatialGeneration, chosen: number): Pick<ItemReview, 'ruleExplanations' | 'answerExplanation' | 'distractorExplanation'> {
  const { item, correctRotation, foils } = gen
  const rules = [
    `Exactly one option is the target figure turned by a multiple of 90° — here ${correctRotation * 90}°.`,
  ]
  if (foils.some(f => f.kind === 'mirror')) {
    rules.push('The traps are mirror images: a flipped figure can look right, but no amount of turning produces it.')
  }
  if (foils.some(f => f.kind === 'altered')) {
    rules.push('Some options also move one square to a different position.')
  }
  const wrongIdx = chosen !== item.correctIndex ? chosen : [0, 1, 2, 3, 4, 5].find(i => i !== item.correctIndex)!
  const wrongCells = (item.options[wrongIdx] as Extract<Item['options'][number], { kind: 'cells' }>).cells
  const foil = foils.find(f => cellKey(f.cells) === cellKey(wrongCells))
  const why = foil?.kind === 'mirror'
    ? 'is a mirror image of the target — it matches only after flipping, which rotation can never do'
    : 'has one square in a different position than the target'
  return {
    ruleExplanations: rules,
    answerExplanation: `Option ${letter(item.correctIndex)} is the target rotated ${correctRotation * 90}° clockwise — every square lines up.`,
    distractorExplanation: `Option ${letter(wrongIdx)} ${why}.`,
  }
}

// ---------- weights ----------

export function explainWeights(gen: WeightsGeneration, chosen: number): Pick<ItemReview, 'ruleExplanations' | 'answerExplanation' | 'distractorExplanation'> {
  const { item, shapeKinds, weights, equations, targetLeft, optionVecs } = gen
  const dot = (v: number[]) => v.reduce((s, x, i) => s + x * weights[i], 0)
  const rules = [
    ...equations.map((eq, i) => `Scale ${i + 1}: ${describePan(shapeKinds, eq.left)} balance ${describePan(shapeKinds, eq.right)}.`),
    `One weight assignment consistent with every scale: ${shapeKinds.map((s, i) => `${s} = ${weights[i]}`).join(', ')} (any consistent assignment gives the same answer).`,
  ]
  const targetSum = dot(targetLeft)
  const wrongIdx = chosen !== item.correctIndex ? chosen : [0, 1, 2, 3, 4, 5].find(i => i !== item.correctIndex)!
  return {
    ruleExplanations: rules,
    answerExplanation: `With those weights the left pan (${describePan(shapeKinds, targetLeft)}) totals ${targetSum}; option ${letter(item.correctIndex)} (${describePan(shapeKinds, optionVecs[item.correctIndex])}) totals ${targetSum} too — and that balance follows from the scales alone, no matter which consistent weights you pick.`,
    distractorExplanation: `Option ${letter(wrongIdx)} (${describePan(shapeKinds, optionVecs[wrongIdx])}) totals ${dot(optionVecs[wrongIdx])}, not ${targetSum} — the scale would tip.`,
  }
}

// ---------- replay ----------

export function replayTest(seed: number, choices: number[]): Replay {
  const reviews: ItemReview[] = []
  const answers: AnswerLike[] = []
  let difficulty = INITIAL_DIFFICULTY

  choices.forEach((chosen, position) => {
    const slot = TEST_PLAN[position]
    const s = itemSeed(seed, position)
    let item: Item
    let parts: Pick<ItemReview, 'ruleExplanations' | 'answerExplanation' | 'distractorExplanation'>
    switch (slot.type) {
      case 'matrix': {
        const gen = generateMatrixItem(difficulty, s)
        item = gen.item
        parts = explainMatrix(gen, chosen)
        break
      }
      case 'series': {
        const gen = generateSeriesItem(difficulty, s)
        item = gen.item
        parts = explainSeries(gen, chosen)
        break
      }
      case 'spatial': {
        const gen = generateSpatialItem(difficulty, s)
        item = gen.item
        parts = explainSpatial(gen, chosen)
        break
      }
      case 'weights': {
        const gen = generateWeightsItem(difficulty, s)
        item = gen.item
        parts = explainWeights(gen, chosen)
        break
      }
    }
    const correct = chosen === item.correctIndex
    reviews.push({ position, section: slot.section, item, difficulty, chosenIndex: chosen, correct, ...parts })
    answers.push({ correct, difficulty })
    if (position >= PINNED_ITEMS - 1) difficulty = nextDifficulty(difficulty, correct)
  })

  return { reviews, report: scoreTest(answers) }
}

/** Sanity helper for tests: the ladder the replay walked. */
export function replayLadder(seed: number, choices: number[]): Difficulty[] {
  return difficultyLadder(replayTest(seed, choices).reviews.map(r => r.correct)).slice(0, choices.length)
}

// computeTerms is re-exported for tests that recheck series narratives.
export { computeTerms }
