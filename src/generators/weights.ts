/**
 * Figure-weights items (balance scales). Each item is built from a solvable
 * linear system: hidden integer weights per shape, example scales that
 * balance under those weights, and a target scale whose right pan must be
 * chosen.
 *
 * Correctness is not "sums happen to match": the correct option's balance
 * must be DERIVABLE from the shown equations (the difference vector lies in
 * the span of the equation vectors), and every distractor is verifiably
 * not-derivable AND numerically unbalanced under the generating weights, so
 * the item has exactly one defensible answer.
 */
import { Rng } from '../lib/prng'
import type { Difficulty, Item, ShapeId } from '../lib/types'

export type Vec = number[]

const SHAPE_ORDER: ShapeId[] = ['circle', 'square', 'triangle', 'pentagon']

function sub(a: Vec, b: Vec): Vec {
  return a.map((v, i) => v - b[i])
}

function dot(a: Vec, b: Vec): number {
  return a.reduce((s, v, i) => s + v * b[i], 0)
}

function total(v: Vec): number {
  return v.reduce((s, x) => s + x, 0)
}

/** Integer-preserving Gaussian elimination; exact for our tiny matrices. */
export function rank(rows: Vec[]): number {
  const m = rows.map(r => r.slice())
  let r = 0
  const cols = m[0]?.length ?? 0
  for (let c = 0; c < cols && r < m.length; c++) {
    const pivot = m.findIndex((row, i) => i >= r && row[c] !== 0)
    if (pivot === -1) continue
    ;[m[r], m[pivot]] = [m[pivot], m[r]]
    for (let i = 0; i < m.length; i++) {
      if (i === r || m[i][c] === 0) continue
      const p = m[r][c]
      const q = m[i][c]
      m[i] = m[i].map((v, j) => v * p - m[r][j] * q)
    }
    r++
  }
  return r
}

export function inSpan(v: Vec, basis: Vec[]): boolean {
  if (v.every(x => x === 0)) return true
  if (basis.length === 0) return false
  return rank(basis) === rank([...basis, v])
}

/** All count vectors of dimension k with total items in [1, maxTotal]. */
function allVecs(k: number, maxTotal: number): Vec[] {
  const out: Vec[] = []
  const cur: number[] = new Array(k).fill(0)
  const walk = (i: number, remaining: number) => {
    if (i === k) {
      if (total(cur) >= 1) out.push(cur.slice())
      return
    }
    for (let c = 0; c <= remaining; c++) {
      cur[i] = c
      walk(i + 1, remaining - c)
      cur[i] = 0
    }
  }
  walk(0, maxTotal)
  return out
}

const PARAMS: Record<Difficulty, { shapes: number; eqs: number; maxPan: number; pureSides: boolean }> = {
  1: { shapes: 2, eqs: 1, maxPan: 4, pureSides: true },
  2: { shapes: 2, eqs: 1, maxPan: 4, pureSides: true },
  3: { shapes: 3, eqs: 2, maxPan: 4, pureSides: true },
  4: { shapes: 3, eqs: 2, maxPan: 4, pureSides: false },
  5: { shapes: 4, eqs: 3, maxPan: 4, pureSides: false },
}

export interface WeightsGeneration {
  item: Item
  shapeKinds: ShapeId[]
  /** Hidden weights used to construct the system (never shown). */
  weights: number[]
  equations: { left: Vec; right: Vec }[]
  targetLeft: Vec
  optionVecs: Vec[]
}

function describePan(shapeKinds: ShapeId[], v: Vec): string {
  const parts = shapeKinds
    .map((s, i) => (v[i] > 0 ? `${v[i]} ${s}${v[i] > 1 ? 's' : ''}` : ''))
    .filter(Boolean)
  return parts.join(' and ')
}

export function generateWeightsItem(difficulty: Difficulty, seed: number): WeightsGeneration {
  const rng = new Rng(`weights-${difficulty}-${seed}`)
  const { shapes: k, eqs, maxPan, pureSides } = PARAMS[difficulty]
  const shapeKinds = SHAPE_ORDER.slice(0, k)
  const vecs = allVecs(k, maxPan)
  const isPure = (v: Vec) => v.filter(x => x > 0).length === 1

  for (let attempt = 0; attempt < 400; attempt++) {
    const weights = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, k)

    // Example balances: each must be true under the weights, non-trivial,
    // and add rank (no equation implied by the previous ones).
    const equations: { left: Vec; right: Vec }[] = []
    const basis: Vec[] = []
    let ok = true
    for (let e = 0; e < eqs; e++) {
      const candidates = rng.shuffle(vecs)
      let found = false
      for (const left of candidates) {
        if (pureSides && !isPure(left)) continue
        if (total(left) < 2) continue
        for (const right of candidates) {
          if (pureSides && !isPure(right)) continue
          const diff = sub(left, right)
          if (diff.every(x => x === 0)) continue
          if (dot(left, weights) !== dot(right, weights)) continue
          if (inSpan(diff, basis)) continue
          equations.push({ left, right })
          basis.push(diff)
          found = true
          break
        }
        if (found) break
      }
      if (!found) { ok = false; break }
    }
    if (!ok) continue

    // Target: a left pan and the one derivably balancing right pan.
    const eqSides = new Set(equations.flatMap(eq => [eq.left.join(','), eq.right.join(',')]))
    let target: { left: Vec; right: Vec } | null = null
    for (const left of rng.shuffle(vecs)) {
      if (eqSides.has(left.join(','))) continue
      const rights = rng.shuffle(vecs).filter(right => {
        const diff = sub(left, right)
        return !diff.every(x => x === 0) && inSpan(diff, basis)
      })
      if (rights.length > 0) {
        target = { left, right: rights[0] }
        break
      }
    }
    if (!target) continue
    const { left: targetLeft, right: answer } = target
    const targetSum = dot(targetLeft, weights)

    // Distractors: not derivably balanced AND numerically unbalanced, so no
    // consistent reading of the scales makes two options defensible.
    const distractorPool = vecs
      .filter(v => {
        const key = v.join(',')
        if (key === answer.join(',') || key === targetLeft.join(',')) return false
        if (inSpan(sub(targetLeft, v), basis)) return false
        return dot(v, weights) !== targetSum
      })
      .sort((a, b) => Math.abs(dot(a, weights) - targetSum) - Math.abs(dot(b, weights) - targetSum))
    if (distractorPool.length < 5) continue
    // Near-misses first, with a little seeded variety among equally-close ones.
    const distractors = rng
      .shuffle(distractorPool.slice(0, 10))
      .slice(0, 5)

    const optionVecs = rng.shuffle([answer, ...distractors])
    const correctIndex = optionVecs.findIndex(v => v.join(',') === answer.join(','))

    const describe =
      equations.map((eq, i) =>
        `Scale ${i + 1} balances: ${describePan(shapeKinds, eq.left)} weigh the same as ${describePan(shapeKinds, eq.right)}.`)
        .join(' ') +
      ` Target scale: ${describePan(shapeKinds, targetLeft)} on the left; choose what balances it.`

    const item: Item = {
      id: `weights-d${difficulty}-s${seed}`,
      type: 'weights',
      difficulty,
      prompt: { kind: 'scales', shapeKinds, equations, targetLeft, describe },
      options: optionVecs.map(v => ({
        kind: 'shapeset' as const,
        shapeKinds,
        counts: v,
        describe: describePan(shapeKinds, v),
      })),
      correctIndex,
      rulesUsed: [`linear system: ${eqs} balance${eqs > 1 ? 's' : ''}, ${k} unknown weights`],
    }
    return { item, shapeKinds, weights, equations, targetLeft, optionVecs }
  }
  throw new Error(`weights generation failed for difficulty ${difficulty}, seed ${seed}`)
}

export function generateItem(difficulty: Difficulty, seed: number): Item {
  return generateWeightsItem(difficulty, seed).item
}
