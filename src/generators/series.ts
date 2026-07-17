/**
 * Number-series items: find the next term. Recipes cover arithmetic,
 * geometric, second-order (accelerating), fibonacci-like, alternating-
 * operation, and interleaved sequences.
 *
 * Distractors are principled wrong continuations: each one is the result of
 * a specific misreading of the rule (continuing with the wrong delta,
 * treating a geometric series as arithmetic, forgetting the acceleration,
 * summing the wrong pair, applying the other operation of an alternating
 * pair, continuing the wrong interleaved thread), padded with near-miss
 * calculation slips (answer ± 1..3) only when a recipe cannot supply five.
 */
import { Rng } from '../lib/prng'
import type { Difficulty, Item } from '../lib/types'

export type Op = { op: '+' | '-' | '*'; v: number }

export type SeriesRecipe =
  | { kind: 'arithmetic'; start: number; d: number }
  | { kind: 'geometric'; start: number; r: number }
  | { kind: 'second-order'; start: number; d0: number; e: number }
  | { kind: 'fibonacci'; a: number; b: number }
  | { kind: 'alternating'; start: number; opA: Op; opB: Op }
  | { kind: 'interleaved'; startA: number; dA: number; startB: number; dB: number }

function applyOp(x: number, op: Op): number {
  switch (op.op) {
    case '+': return x + op.v
    case '-': return x - op.v
    case '*': return x * op.v
  }
}

/** Total sequence length including the hidden final term. */
export function seriesLength(recipe: SeriesRecipe): number {
  return recipe.kind === 'interleaved' ? 8 : 6
}

export function computeTerms(recipe: SeriesRecipe): number[] {
  const n = seriesLength(recipe)
  const t: number[] = []
  switch (recipe.kind) {
    case 'arithmetic':
      for (let i = 0; i < n; i++) t.push(recipe.start + i * recipe.d)
      break
    case 'geometric':
      for (let i = 0; i < n; i++) t.push(recipe.start * recipe.r ** i)
      break
    case 'second-order': {
      let v = recipe.start
      let d = recipe.d0
      for (let i = 0; i < n; i++) {
        t.push(v)
        v += d
        d += recipe.e
      }
      break
    }
    case 'fibonacci':
      t.push(recipe.a, recipe.b)
      while (t.length < n) t.push(t[t.length - 1] + t[t.length - 2])
      break
    case 'alternating': {
      let v = recipe.start
      for (let i = 0; i < n; i++) {
        t.push(v)
        v = applyOp(v, i % 2 === 0 ? recipe.opA : recipe.opB)
      }
      break
    }
    case 'interleaved':
      for (let i = 0; i < n; i++) {
        t.push(i % 2 === 0
          ? recipe.startA + (i / 2) * recipe.dA
          : recipe.startB + ((i - 1) / 2) * recipe.dB)
      }
      break
  }
  return t
}

export function ruleLabelForSeries(recipe: SeriesRecipe): string {
  switch (recipe.kind) {
    case 'arithmetic': return `arithmetic ${recipe.d > 0 ? '+' : ''}${recipe.d}`
    case 'geometric': return `geometric ×${recipe.r}`
    case 'second-order': return `second-order: increments grow by ${recipe.e} (starting ${recipe.d0 > 0 ? '+' : ''}${recipe.d0})`
    case 'fibonacci': return 'fibonacci-like: each term is the sum of the previous two'
    case 'alternating': {
      const f = (o: Op) => `${o.op === '*' ? '×' : o.op}${o.v}`
      return `alternating operations: ${f(recipe.opA)}, ${f(recipe.opB)}`
    }
    case 'interleaved':
      return `interleaved sequences: odd positions ${recipe.dA > 0 ? '+' : ''}${recipe.dA}, even positions ${recipe.dB > 0 ? '+' : ''}${recipe.dB}`
  }
}

function pickRecipe(difficulty: Difficulty, rng: Rng): SeriesRecipe {
  switch (difficulty) {
    case 1:
      return { kind: 'arithmetic', start: rng.int(1, 15), d: rng.int(2, 9) }
    case 2:
      switch (rng.int(0, 2)) {
        case 0: return { kind: 'arithmetic', start: rng.int(40, 90), d: -rng.int(2, 9) }
        case 1: return { kind: 'arithmetic', start: rng.int(3, 20), d: rng.int(11, 19) }
        default: return { kind: 'geometric', start: rng.int(2, 6), r: 2 }
      }
    case 3:
      switch (rng.int(0, 2)) {
        case 0: {
          const r = rng.pick([2, 3])
          return { kind: 'geometric', start: r === 2 ? rng.int(2, 9) : rng.int(2, 4), r }
        }
        case 1: return { kind: 'second-order', start: rng.int(1, 10), d0: rng.int(1, 4), e: rng.int(1, 3) }
        default: {
          const p = rng.int(3, 9)
          return { kind: 'alternating', start: rng.int(10, 30), opA: { op: '+', v: p }, opB: { op: '-', v: rng.int(2, p - 1) } }
        }
      }
    case 4:
      switch (rng.int(0, 2)) {
        case 0: return { kind: 'fibonacci', a: rng.int(1, 6), b: rng.int(2, 9) }
        case 1: return { kind: 'alternating', start: rng.int(1, 5), opA: { op: '+', v: rng.int(2, 7) }, opB: { op: '*', v: 2 } }
        default: return { kind: 'second-order', start: rng.int(1, 8), d0: rng.int(2, 5), e: rng.int(2, 4) }
      }
    case 5:
      switch (rng.int(0, 2)) {
        case 0: {
          const dA = rng.int(2, 9)
          let dB = rng.int(2, 9)
          if (dB === dA) dB = dA === 9 ? 2 : dA + 1
          return { kind: 'interleaved', startA: rng.int(1, 20), dA, startB: rng.int(1, 20), dB }
        }
        case 1: return { kind: 'alternating', start: rng.int(4, 7), opA: { op: '*', v: 2 }, opB: { op: '-', v: rng.int(1, 2) } }
        // Seed range disjoint from difficulty 4's so the two levels can never
        // emit the same sequence.
        default: return { kind: 'fibonacci', a: rng.int(7, 12), b: rng.int(8, 15) }
      }
  }
}

/** Wrong continuations, most tempting first. */
function wrongContinuations(recipe: SeriesRecipe, terms: number[]): number[] {
  const n = terms.length
  const last = terms[n - 2] // last SHOWN term
  const prev = terms[n - 3]
  const answer = terms[n - 1]
  switch (recipe.kind) {
    case 'arithmetic':
      return [last + recipe.d + 1, last + recipe.d - 1, last + 2 * recipe.d, last - recipe.d, last, answer + 2]
    case 'geometric':
      return [last + (last - prev), last * (recipe.r + 1), last * (recipe.r - 1), answer + recipe.r, answer - recipe.r, answer + 1]
    case 'second-order':
      return [last + (last - prev), last + (last - prev) + 2 * recipe.e, last + (last - prev) - recipe.e, last + recipe.d0, answer + 1, answer - 1]
    case 'fibonacci':
      return [last + terms[n - 4], 2 * last, answer + 1, answer - 1, last + prev + 2, 2 * last - prev]
    case 'alternating': {
      // The op producing term i+1 from term i is opA when i is even; the
      // answer (index n-1) comes from index n-2.
      const nextOp = (n - 2) % 2 === 0 ? recipe.opA : recipe.opB
      const otherOp = nextOp === recipe.opA ? recipe.opB : recipe.opA
      return [applyOp(last, otherOp), applyOp(last, { ...nextOp, op: nextOp.op === '+' ? '-' : nextOp.op === '-' ? '+' : '*' }),
        answer + 1, answer - 1, applyOp(applyOp(last, nextOp), otherOp), last]
    }
    case 'interleaved': {
      // n = 8, so the answer (index 7) continues thread B. Last shown values:
      const lastA = terms[n - 2] // index 6, thread A
      const lastB = terms[n - 3] // index 5, thread B
      return [lastA + recipe.dA, lastB + recipe.dA, lastA + recipe.dB, answer + 1, answer - 1, answer + 2]
    }
  }
}

export interface SeriesGeneration {
  item: Item
  recipe: SeriesRecipe
  terms: number[]
}

export function generateSeriesItem(difficulty: Difficulty, seed: number): SeriesGeneration {
  const rng = new Rng(`series-${difficulty}-${seed}`)

  for (let attempt = 0; attempt < 50; attempt++) {
    const recipe = pickRecipe(difficulty, rng)
    const terms = computeTerms(recipe)
    if (terms.some(t => !Number.isInteger(t) || Math.abs(t) > 9999)) continue
    const answer = terms[terms.length - 1]

    const distractors: number[] = []
    const seen = new Set<number>([answer])
    for (const c of wrongContinuations(recipe, terms)) {
      if (distractors.length >= 5) break
      if (!Number.isInteger(c) || Math.abs(c) > 9999 || seen.has(c)) continue
      seen.add(c)
      distractors.push(c)
    }
    // Near-miss slips as padding when the recipe's misreadings collide.
    for (const delta of [1, -1, 2, -2, 3, -3, 4, -4]) {
      if (distractors.length >= 5) break
      const c = answer + delta
      if (seen.has(c)) continue
      seen.add(c)
      distractors.push(c)
    }
    if (distractors.length < 5) continue

    const options = rng.shuffle([answer, ...distractors])
    const item: Item = {
      id: `series-d${difficulty}-s${seed}`,
      type: 'series',
      difficulty,
      prompt: `${terms.slice(0, -1).join(', ')}, ?`,
      options: options.map(String),
      correctIndex: options.indexOf(answer),
      rulesUsed: [ruleLabelForSeries(recipe)],
    }
    return { item, recipe, terms }
  }
  throw new Error(`series generation failed for difficulty ${difficulty}, seed ${seed}`)
}

export function generateItem(difficulty: Difficulty, seed: number): Item {
  return generateSeriesItem(difficulty, seed).item
}
