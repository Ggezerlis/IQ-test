/**
 * Spatial items: 2D mental rotation with odd-one-out foils. The prompt shows
 * a procedurally grown polyomino; exactly one option is a true rotation of
 * it, and the five foils are mirror images (at various rotations) and/or
 * one-cell alterations. The base figure is required to be rotationally
 * asymmetric (all four rotations distinct) and chiral (no mirror image is a
 * rotation), both verified computationally, so the task is well-posed.
 */
import { Rng } from '../lib/prng'
import type { Difficulty, Item } from '../lib/types'

export type Cell = [number, number]

export function normalize(cells: Cell[]): Cell[] {
  const minX = Math.min(...cells.map(c => c[0]))
  const minY = Math.min(...cells.map(c => c[1]))
  return cells
    .map(([x, y]) => [x - minX, y - minY] as Cell)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

export function cellKey(cells: Cell[]): string {
  return normalize(cells).map(c => c.join(',')).join(';')
}

export function rotate90(cells: Cell[]): Cell[] {
  return normalize(cells.map(([x, y]) => [y, -x] as Cell))
}

export function rotateBy(cells: Cell[], quarterTurns: number): Cell[] {
  let out = normalize(cells)
  for (let i = 0; i < ((quarterTurns % 4) + 4) % 4; i++) out = rotate90(out)
  return out
}

export function mirror(cells: Cell[]): Cell[] {
  return normalize(cells.map(([x, y]) => [-x, y] as Cell))
}

/** Keys of all four rotations. */
function rotationKeys(cells: Cell[]): Set<string> {
  const keys = new Set<string>()
  let cur = normalize(cells)
  for (let i = 0; i < 4; i++) {
    keys.add(cellKey(cur))
    cur = rotate90(cur)
  }
  return keys
}

export function isRotationOf(a: Cell[], b: Cell[]): boolean {
  return rotationKeys(b).has(cellKey(a))
}

export function isMirrorOf(a: Cell[], b: Cell[]): boolean {
  return rotationKeys(mirror(b)).has(cellKey(a))
}

function isConnected(cells: Cell[]): boolean {
  const set = new Set(cells.map(c => c.join(',')))
  const queue: Cell[] = [cells[0]]
  const seen = new Set<string>([cells[0].join(',')])
  while (queue.length > 0) {
    const [x, y] = queue.pop()!
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]) {
      const k = `${nx},${ny}`
      if (set.has(k) && !seen.has(k)) {
        seen.add(k)
        queue.push([nx, ny])
      }
    }
  }
  return seen.size === cells.length
}

function bboxWithin(cells: Cell[], maxDim: number): boolean {
  const n = normalize(cells)
  return Math.max(...n.map(c => c[0])) < maxDim && Math.max(...n.map(c => c[1])) < maxDim
}

/**
 * Random connected polyomino of n cells that is rotationally asymmetric and
 * chiral, with bounding box within maxDim × maxDim.
 */
function randomPolyomino(n: number, rng: Rng, maxDim = 4): Cell[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const cells: Cell[] = [[0, 0]]
    const occupied = new Set(['0,0'])
    while (cells.length < n) {
      const [x, y] = rng.pick(cells)
      const [nx, ny] = rng.pick([[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[])
      const k = `${nx},${ny}`
      if (occupied.has(k)) continue
      const next = [...cells, [nx, ny] as Cell]
      if (!bboxWithin(next, maxDim)) continue
      occupied.add(k)
      cells.push([nx, ny])
    }
    if (rotationKeys(cells).size !== 4) continue // rotationally symmetric
    if (isRotationOf(mirror(cells), cells)) continue // achiral
    return normalize(cells)
  }
  throw new Error(`could not grow a chiral asymmetric ${n}-omino`)
}

/** Move one cell somewhere else; result stays connected, same size, and is NOT congruent to the base under rotation. */
function alterOneCell(base: Cell[], rng: Rng, maxDim = 4): Cell[] | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const cells = normalize(base)
    const removeIdx = rng.int(0, cells.length - 1)
    const remaining = cells.filter((_, i) => i !== removeIdx)
    if (!isConnected(remaining)) continue
    const occupied = new Set(remaining.map(c => c.join(',')))
    const candidates: Cell[] = []
    for (const [x, y] of remaining) {
      for (const nb of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]) {
        if (!occupied.has(nb.join(','))) candidates.push(nb)
      }
    }
    const added = rng.pick(candidates)
    const next = [...remaining, added]
    if (!bboxWithin(next, maxDim)) continue
    if (isRotationOf(next, base)) continue
    return normalize(next)
  }
  return null
}

const PARAMS: Record<Difficulty, { n: number; mirrors: number; altered: number }> = {
  1: { n: 4, mirrors: 1, altered: 4 },
  2: { n: 5, mirrors: 2, altered: 3 },
  3: { n: 5, mirrors: 3, altered: 2 },
  4: { n: 6, mirrors: 4, altered: 1 },
  5: { n: 7, mirrors: 4, altered: 1 },
}

export interface SpatialGeneration {
  item: Item
  target: Cell[]
  correctRotation: number
  foils: { kind: 'mirror' | 'altered'; cells: Cell[] }[]
}

export function generateSpatialItem(difficulty: Difficulty, seed: number): SpatialGeneration {
  const rng = new Rng(`spatial-${difficulty}-${seed}`)
  const { n, mirrors, altered } = PARAMS[difficulty]
  const maxDim = n >= 6 ? 4 : 3

  for (let attempt = 0; attempt < 50; attempt++) {
    const target = randomPolyomino(n, rng, maxDim)
    const correctRotation = rng.pick([1, 2, 3])
    const correct = rotateBy(target, correctRotation)

    const seen = new Set<string>([cellKey(correct)])
    const foils: { kind: 'mirror' | 'altered'; cells: Cell[] }[] = []

    const m = mirror(target)
    for (const turns of rng.shuffle([0, 1, 2, 3]).slice(0, mirrors)) {
      const cells = rotateBy(m, turns)
      if (seen.has(cellKey(cells))) continue
      seen.add(cellKey(cells))
      foils.push({ kind: 'mirror', cells })
    }
    let guard = 0
    while (foils.length < mirrors + altered && guard++ < 60) {
      const cells = alterOneCell(target, rng, maxDim)
      if (!cells || seen.has(cellKey(cells))) continue
      // An altered figure must not be a rotation of the target (checked in
      // alterOneCell) — being a mirror of it is fine, it is still "not a
      // rotation", but keep the tag honest.
      seen.add(cellKey(cells))
      foils.push({ kind: isMirrorOf(cells, target) ? 'mirror' : 'altered', cells })
    }
    if (foils.length < 5) continue

    const optionCells = rng.shuffle([correct, ...foils.map(f => f.cells)])
    const correctIndex = optionCells.findIndex(c => cellKey(c) === cellKey(correct))

    const describeCells = (cells: Cell[]) =>
      `a connected figure of ${cells.length} squares occupying grid positions ${normalize(cells).map(c => `(${c[0]},${c[1]})`).join(' ')}`

    const item: Item = {
      id: `spatial-d${difficulty}-s${seed}`,
      type: 'spatial',
      difficulty,
      prompt: {
        kind: 'cells',
        cells: target,
        describe: `Target: ${describeCells(target)}. Exactly one answer option shows this same figure rotated; the others are mirrored or altered.`,
      },
      options: optionCells.map(cells => ({ kind: 'cells' as const, cells, describe: describeCells(cells) })),
      correctIndex,
      rulesUsed: [
        `mental rotation (${correctRotation * 90}°)`,
        ...(foils.some(f => f.kind === 'mirror') ? ['mirror discrimination'] : []),
        ...(foils.some(f => f.kind === 'altered') ? ['part-change detection'] : []),
      ],
    }
    return { item, target, correctRotation, foils }
  }
  throw new Error(`spatial generation failed for difficulty ${difficulty}, seed ${seed}`)
}

export function generateItem(difficulty: Difficulty, seed: number): Item {
  return generateSpatialItem(difficulty, seed).item
}
