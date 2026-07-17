/**
 * Procedural 3×3 matrix items. No item is copied from any published test:
 * every matrix is composed at runtime from relation rules described in the
 * literature on matrix-reasoning structure (Matzen et al. 2010; Wang & Su,
 * IJCAI 2015):
 *
 *   constant-in-row            attribute fixed across a row, differs by row
 *   quantitative progression   attribute steps by ±1/±2 (or ±45°) across a row
 *   distribution-of-three      three values Latin-squared over rows/columns
 *   distribution-of-two        two values + "absent" Latin-squared
 *   logical AND/OR/XOR         third column = op(col1, col2) on corner dots
 *   addition / subtraction     third column = col1 ∪ col2 (disjoint) / col1 ∖ col2
 *
 * Each rule governs exactly one Figure attribute, so rules compose
 * independently and a distractor can break exactly one of them.
 */
import { Rng } from '../lib/prng'
import type { DecorationId, Difficulty, Figure, FillId, Item, ShapeId } from '../lib/types'
import { ROTATION_SAFE_SHAPES, canonicalRotation, describeFigure } from '../render/shapes'
import { selectDistractors } from './distractors'

export type OverlayOp = 'and' | 'or' | 'xor' | 'add' | 'sub'

export type MatrixRule =
  | { kind: 'constant-row'; slot: 'shape' | 'fill'; values: string[] }
  | { kind: 'dist3'; slot: 'shape' | 'fill' | 'count' | 'size'; values: (string | number)[]; latin: number[][] }
  | { kind: 'progression'; slot: 'count' | 'size' | 'rotation'; delta: number; rowStarts: number[] }
  | { kind: 'overlay'; op: OverlayOp; rows: [number, number, number][] }
  | { kind: 'dist2'; values: (DecorationId | null)[]; latin: number[][] }

const ALL_SHAPES: ShapeId[] = ['circle', 'square', 'triangle', 'pentagon', 'star', 'arrow']
const ALL_FILLS: FillId[] = ['outline', 'solid', 'hatch', 'dots', 'cross']

/**
 * Difficulty → number of simultaneous rules (spec: 1 rule = difficulty 1,
 * 4 rules = difficulty 5). Levels 3 and 4 both use 3 rules; level 4 swaps
 * one easy rule for a hard one (a logical/figure-set rule), and level 5
 * uses 4 rules including one from the hardest families (XOR, subtraction,
 * distribution-of-two).
 */
const RULE_PLAN: Record<Difficulty, { easy: number; hardOps: (OverlayOp | 'dist2')[] }> = {
  1: { easy: 1, hardOps: [] },
  2: { easy: 2, hardOps: [] },
  3: { easy: 3, hardOps: [] },
  4: { easy: 2, hardOps: ['and', 'or', 'add', 'dist2'] },
  5: { easy: 3, hardOps: ['xor', 'sub', 'dist2'] },
}

const DEFAULT_FIGURE: Omit<Figure, 'shape' | 'fill'> = {
  count: 1,
  size: 2,
  rotation: 0,
  overlay: 0,
  decoration: null,
}

function latinSquare(rng: Rng): number[][] {
  const base = [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
  ]
  const rp = rng.shuffle([0, 1, 2])
  const cp = rng.shuffle([0, 1, 2])
  return [0, 1, 2].map(r => [0, 1, 2].map(c => base[rp[r]][cp[c]]))
}

export function applyOverlayOp(op: OverlayOp, a: number, b: number): number {
  switch (op) {
    case 'and': return a & b
    case 'or': return a | b
    case 'xor': return a ^ b
    case 'add': return a | b
    case 'sub': return a & ~b
  }
}

/**
 * One row of overlay bit patterns [a, b, op(a,b)], constrained so the rule
 * is identifiable: results are non-empty, neither operand is redundant, and
 * ops that only differ when operands overlap (or/xor) or are disjoint (add)
 * get that property enforced.
 */
function overlayRow(op: OverlayOp, rng: Rng): [number, number, number] {
  for (let i = 0; i < 200; i++) {
    const a = rng.int(1, 15)
    const b = rng.int(1, 15)
    const c = applyOverlayOp(op, a, b)
    switch (op) {
      case 'and':
        if (c === 0 || c === a || c === b) continue
        break
      case 'or':
        if (c === a || c === b || (a & b) === 0) continue
        break
      case 'xor':
        if (c === 0 || (a & b) === 0) continue
        break
      case 'add':
        if ((a & b) !== 0) continue
        break
      case 'sub':
        if ((b & a) !== b || b === a) continue // require b ⊂ a strictly
        break
    }
    return [a, b, c]
  }
  throw new Error(`could not build overlay row for op ${op}`)
}

interface RuleSet {
  rules: MatrixRule[]
  /** Fixed values for slots no rule touches. */
  defaultShape: ShapeId
  defaultFill: FillId
}

function pickRules(difficulty: Difficulty, rng: Rng): RuleSet {
  const plan = RULE_PLAN[difficulty]
  const rules: MatrixRule[] = []

  const easyPool: ('shape' | 'fill' | 'count' | 'size' | 'rotation')[] =
    difficulty === 1 ? ['shape', 'fill', 'count', 'size'] : ['shape', 'fill', 'count', 'size', 'rotation']
  const slots = rng.shuffle(easyPool).slice(0, plan.easy)

  // Rotation rules restrict the shape pool to shapes where 45° steps are
  // always visibly distinct.
  const rotationActive = slots.includes('rotation')
  const shapePool = rotationActive ? ROTATION_SAFE_SHAPES : ALL_SHAPES

  for (const slot of slots) {
    switch (slot) {
      case 'shape': {
        const values = rng.shuffle(shapePool).slice(0, 3)
        rules.push(rng.bool()
          ? { kind: 'constant-row', slot, values }
          : { kind: 'dist3', slot, values, latin: latinSquare(rng) })
        break
      }
      case 'fill': {
        const values = rng.shuffle(ALL_FILLS).slice(0, 3)
        rules.push(rng.bool()
          ? { kind: 'constant-row', slot, values }
          : { kind: 'dist3', slot, values, latin: latinSquare(rng) })
        break
      }
      case 'count': {
        if (rng.bool()) {
          const delta = rng.pick([1, -1, 2, -2])
          const startRange: Record<number, [number, number]> = { 1: [1, 3], [-1]: [3, 5], 2: [1, 1], [-2]: [5, 5] }
          const [lo, hi] = startRange[delta]
          rules.push({ kind: 'progression', slot, delta, rowStarts: [0, 1, 2].map(() => rng.int(lo, hi)) })
        } else {
          rules.push({ kind: 'dist3', slot, values: rng.shuffle([1, 2, 3, 4]).slice(0, 3), latin: latinSquare(rng) })
        }
        break
      }
      case 'size': {
        if (rng.bool()) {
          const delta = rng.pick([1, -1])
          const start = delta === 1 ? 1 : 3
          rules.push({ kind: 'progression', slot, delta, rowStarts: [start, start, start] })
        } else {
          rules.push({ kind: 'dist3', slot, values: rng.shuffle([1, 2, 3]), latin: latinSquare(rng) })
        }
        break
      }
      case 'rotation': {
        const delta = rng.pick([45, -45])
        rules.push({ kind: 'progression', slot, delta, rowStarts: [0, 1, 2].map(() => rng.int(0, 7) * 45) })
        break
      }
    }
  }

  if (plan.hardOps.length > 0) {
    const hard = rng.pick(plan.hardOps)
    if (hard === 'dist2') {
      rules.push({ kind: 'dist2', values: rng.shuffle<DecorationId | null>(['ring', 'bar', null]), latin: latinSquare(rng) })
    } else {
      let rows: [number, number, number][]
      do {
        rows = [overlayRow(hard, rng), overlayRow(hard, rng), overlayRow(hard, rng)]
      } while (rows[0][0] === rows[1][0] && rows[0][1] === rows[1][1] && rows[1][0] === rows[2][0] && rows[1][1] === rows[2][1])
      rules.push({ kind: 'overlay', op: hard, rows })
    }
  }

  return {
    rules,
    defaultShape: rng.pick(shapePool),
    defaultFill: rng.pick(ALL_FILLS),
  }
}

function buildGrid(rs: RuleSet): Figure[] {
  const grid: Figure[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const f: Figure = { ...DEFAULT_FIGURE, shape: rs.defaultShape, fill: rs.defaultFill }
      for (const rule of rs.rules) {
        switch (rule.kind) {
          case 'constant-row':
            if (rule.slot === 'shape') f.shape = rule.values[r] as ShapeId
            else f.fill = rule.values[r] as FillId
            break
          case 'dist3': {
            const v = rule.values[rule.latin[r][c]]
            if (rule.slot === 'shape') f.shape = v as ShapeId
            else if (rule.slot === 'fill') f.fill = v as FillId
            else if (rule.slot === 'count') f.count = v as number
            else f.size = v as 1 | 2 | 3
            break
          }
          case 'progression': {
            const v = rule.rowStarts[r] + rule.delta * c
            if (rule.slot === 'count') f.count = v
            else if (rule.slot === 'size') f.size = v as 1 | 2 | 3
            else f.rotation = ((v % 360) + 360) % 360
            break
          }
          case 'overlay':
            f.overlay = rule.rows[r][c]
            break
          case 'dist2':
            f.decoration = rule.values[rule.latin[r][c]]
            break
        }
      }
      grid.push(f)
    }
  }
  return grid
}

/** True iff the completed 9-cell grid satisfies the rule. Used by tests and the explanation screen. */
export function verifyRule(grid: Figure[], rule: MatrixRule): boolean {
  const at = (r: number, c: number) => grid[r * 3 + c]
  const slotValue = (f: Figure, slot: string): string | number =>
    slot === 'shape' ? f.shape
    : slot === 'fill' ? f.fill
    : slot === 'count' ? f.count
    : slot === 'size' ? f.size
    : f.rotation

  switch (rule.kind) {
    case 'constant-row':
      if (new Set(rule.values).size !== 3) return false
      return [0, 1, 2].every(r => [0, 1, 2].every(c => slotValue(at(r, c), rule.slot) === rule.values[r]))
    case 'dist3': {
      if (new Set(rule.values).size !== 3) return false
      const rowOk = [0, 1, 2].every(r =>
        new Set([0, 1, 2].map(c => slotValue(at(r, c), rule.slot))).size === 3)
      const colOk = [0, 1, 2].every(c =>
        new Set([0, 1, 2].map(r => slotValue(at(r, c), rule.slot))).size === 3)
      return rowOk && colOk
    }
    case 'progression':
      return [0, 1, 2].every(r => [0, 1, 2].every(c => {
        const expected = rule.rowStarts[r] + rule.delta * c
        const actual = slotValue(at(r, c), rule.slot)
        return rule.slot === 'rotation'
          ? canonicalRotation(at(r, c).shape, actual as number) === canonicalRotation(at(r, c).shape, expected)
          : actual === expected
      }))
    case 'overlay':
      return [0, 1, 2].every(r =>
        at(r, 0).overlay === rule.rows[r][0] &&
        at(r, 1).overlay === rule.rows[r][1] &&
        at(r, 2).overlay === applyOverlayOp(rule.op, rule.rows[r][0], rule.rows[r][1]))
    case 'dist2': {
      const rowOk = [0, 1, 2].every(r =>
        new Set([0, 1, 2].map(c => at(r, c).decoration ?? 'none')).size === 3)
      const colOk = [0, 1, 2].every(c =>
        new Set([0, 1, 2].map(r => at(r, c).decoration ?? 'none')).size === 3)
      return rowOk && colOk
    }
  }
}

export function ruleLabel(rule: MatrixRule): string {
  switch (rule.kind) {
    case 'constant-row': return `constant-in-row (${rule.slot})`
    case 'dist3': return `distribution-of-three (${rule.slot})`
    case 'progression':
      return rule.slot === 'rotation'
        ? `progression ${rule.delta > 0 ? '+' : ''}${rule.delta}° (rotation)`
        : `progression ${rule.delta > 0 ? '+' : ''}${rule.delta} (${rule.slot})`
    case 'overlay': {
      const name = { and: 'AND', or: 'OR', xor: 'XOR', add: 'addition', sub: 'subtraction' }[rule.op]
      return `${name} (corner dots)`
    }
    case 'dist2': return 'distribution-of-two (marker)'
  }
}

/**
 * Distractor candidates: for every active rule, plausible single-attribute
 * violations of that rule, most-tempting first (values that appear elsewhere
 * in the matrix before out-of-matrix values).
 */
function activeCandidates(rs: RuleSet, answer: Figure, rng: Rng): Figure[][] {
  const queues: Figure[][] = []
  for (const rule of rs.rules) {
    switch (rule.kind) {
      case 'constant-row':
      case 'dist3': {
        if (rule.kind === 'dist3' && (rule.slot === 'count' || rule.slot === 'size')) {
          const current = rule.slot === 'count' ? answer.count : answer.size
          const inMatrix = (rule.values as number[]).filter(v => v !== current)
          const pool = rule.slot === 'count' ? [1, 2, 3, 4, 5] : [1, 2, 3]
          const outside = rng.shuffle(pool.filter(v => v !== current && !inMatrix.includes(v)))
          queues.push([...inMatrix, ...outside].map(v =>
            rule.slot === 'count' ? { ...answer, count: v } : { ...answer, size: v as 1 | 2 | 3 }))
        } else {
          const slot = rule.slot as 'shape' | 'fill'
          const current = slot === 'shape' ? answer.shape : answer.fill
          const pool: string[] = slot === 'shape' ? ALL_SHAPES : ALL_FILLS
          const inMatrix = (rule.values as string[]).filter(v => v !== current)
          const outside = rng.shuffle(pool.filter(v => v !== current && !inMatrix.includes(v)))
          queues.push([...inMatrix, ...outside].map(v =>
            slot === 'shape' ? { ...answer, shape: v as ShapeId } : { ...answer, fill: v as FillId }))
        }
        break
      }
      case 'progression': {
        if (rule.slot === 'rotation') {
          const cands = [answer.rotation - rule.delta, answer.rotation + rule.delta,
            answer.rotation + 90, answer.rotation - 90]
            .map(v => ((v % 360) + 360) % 360)
          queues.push(cands.map(v => ({ ...answer, rotation: v })))
        } else if (rule.slot === 'count') {
          const cands = [answer.count - rule.delta, answer.count + rule.delta, answer.count - 2 * rule.delta]
            .filter(v => v >= 1 && v <= 5 && v !== answer.count)
          const rest = rng.shuffle([1, 2, 3, 4, 5].filter(v => v !== answer.count && !cands.includes(v)))
          queues.push([...cands, ...rest].map(v => ({ ...answer, count: v })))
        } else {
          const cands = [answer.size - rule.delta, answer.size + rule.delta, 1, 2, 3]
            .filter((v, i, arr) => v >= 1 && v <= 3 && v !== answer.size && arr.indexOf(v) === i)
          queues.push(cands.map(v => ({ ...answer, size: v as 1 | 2 | 3 })))
        }
        break
      }
      case 'overlay': {
        const [a, b] = [rule.rows[2][0], rule.rows[2][1]]
        const correct = answer.overlay
        const raw = [a | b, a & b, a ^ b, a & ~b, b & ~a, a, b,
          correct ^ 1, correct ^ 2, correct ^ 4, correct ^ 8]
        const cands = raw.filter((v, i, arr) => v > 0 && v !== correct && arr.indexOf(v) === i)
        queues.push(cands.map(v => ({ ...answer, overlay: v })))
        break
      }
      case 'dist2': {
        const others = rule.values.filter(v => v !== answer.decoration)
        queues.push(others.map(v => ({ ...answer, decoration: v })))
        break
      }
    }
  }
  return queues
}

/**
 * Fallback perturbations of attributes no rule touches — they break the
 * implicit "constant everywhere" regularity. Only drawn on when the active
 * rules cannot supply five distinct single-attribute violations.
 */
function fallbackCandidates(rs: RuleSet, answer: Figure, rng: Rng): Figure[][] {
  const activeSlots = new Set<string>()
  for (const rule of rs.rules) {
    if (rule.kind === 'overlay') activeSlots.add('overlay')
    else if (rule.kind === 'dist2') activeSlots.add('decoration')
    else activeSlots.add(rule.slot)
  }
  const queues: Figure[][] = []
  if (!activeSlots.has('fill')) {
    queues.push(rng.shuffle(ALL_FILLS.filter(v => v !== answer.fill)).map(v => ({ ...answer, fill: v })))
  }
  if (!activeSlots.has('shape')) {
    queues.push(rng.shuffle(ALL_SHAPES.filter(v => v !== answer.shape)).map(v => ({ ...answer, shape: v })))
  }
  if (!activeSlots.has('size')) {
    queues.push(rng.shuffle(([1, 2, 3] as const).filter(v => v !== answer.size)).map(v => ({ ...answer, size: v })))
  }
  if (!activeSlots.has('count')) {
    queues.push(rng.shuffle([1, 2, 3, 4, 5].filter(v => v !== answer.count && Math.abs(v - answer.count) <= 2))
      .map(v => ({ ...answer, count: v })))
  }
  return queues
}

export interface MatrixGeneration {
  item: Item
  /** Full 9-cell grid including the answer at index 8. */
  grid: Figure[]
  rules: MatrixRule[]
}

export function generateMatrixItem(difficulty: Difficulty, seed: number): MatrixGeneration {
  const rng = new Rng(`matrix-${difficulty}-${seed}`)

  for (let attempt = 0; attempt < 50; attempt++) {
    const rs = pickRules(difficulty, rng)
    const grid = buildGrid(rs)
    const answer = grid[8]

    const active = activeCandidates(rs, answer, rng)
    let distractors = selectDistractors(answer, active, 5)
    if (distractors.length < 5) {
      distractors = distractors.concat(
        selectDistractors(answer, fallbackCandidates(rs, answer, rng), 5 - distractors.length, distractors),
      )
    }
    if (distractors.length < 5) continue
    if (!rs.rules.every(rule => verifyRule(grid, rule))) continue

    const shuffled = rng.shuffle([answer, ...distractors])
    const correctIndex = shuffled.indexOf(answer)

    const item: Item = {
      id: `matrix-d${difficulty}-s${seed}`,
      type: 'matrix',
      difficulty,
      prompt: {
        kind: 'matrix',
        cells: [...grid.slice(0, 8), null],
        describe: 'A 3 by 3 grid of figures following one or more pattern rules; the bottom-right cell is missing.',
      },
      options: shuffled.map(f => ({ kind: 'figure' as const, figure: f, describe: describeFigure(f) })),
      correctIndex,
      rulesUsed: rs.rules.map(ruleLabel),
    }
    return { item, grid, rules: rs.rules }
  }
  throw new Error(`matrix generation failed for difficulty ${difficulty}, seed ${seed}`)
}

export function generateItem(difficulty: Difficulty, seed: number): Item {
  return generateMatrixItem(difficulty, seed).item
}
