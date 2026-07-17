/**
 * Shared distractor machinery. The invariant every generator must satisfy —
 * "each wrong option differs from the answer in exactly one attribute" — is
 * enforced here, and the vitest suites assert it through the very same
 * functions the generators use.
 */
import type { Figure } from '../lib/types'
import { canonicalRotation } from '../render/shapes'

export const FIGURE_ATTRIBUTES = [
  'shape', 'count', 'size', 'fill', 'rotation', 'overlay', 'decoration',
] as const
export type FigureAttribute = (typeof FIGURE_ATTRIBUTES)[number]

/**
 * Stable identity key. Rotation is compared modulo the shape's symmetry so
 * that e.g. a square rotated 90° never counts as "different" from the same
 * square unrotated.
 */
export function canonicalKey(f: Figure): string {
  return [
    f.shape, f.count, f.size, f.fill,
    canonicalRotation(f.shape, f.rotation),
    f.overlay, f.decoration ?? 'none',
  ].join('|')
}

/** List of attributes on which two figures visibly differ. */
export function attributeDiff(a: Figure, b: Figure): FigureAttribute[] {
  const out: FigureAttribute[] = []
  if (a.shape !== b.shape) out.push('shape')
  if (a.count !== b.count) out.push('count')
  if (a.size !== b.size) out.push('size')
  if (a.fill !== b.fill) out.push('fill')
  // Compare each rotation canonicalized under its own shape: if shapes match
  // this is the visible-rotation test; if shapes differ, an identical raw
  // rotation should not double-count as a rotation change.
  if (canonicalRotation(a.shape, a.rotation) !== canonicalRotation(b.shape, b.rotation)) out.push('rotation')
  if (a.overlay !== b.overlay) out.push('overlay')
  if ((a.decoration ?? null) !== (b.decoration ?? null)) out.push('decoration')
  return out
}

/**
 * Greedy round-robin selection of `n` distractors from per-attribute
 * candidate lists. Guarantees: every kept candidate differs from the answer
 * in exactly one attribute, and all kept candidates are pairwise distinct
 * (canonically) and distinct from the answer. Candidate lists are consumed
 * in order, cycling across attributes so wrong options spread over several
 * rule-breaks instead of clustering on one.
 */
export function selectDistractors(
  answer: Figure,
  candidatesByAttribute: Figure[][],
  n: number,
  exclude: Figure[] = [],
): Figure[] {
  const chosen: Figure[] = []
  const seen = new Set<string>([canonicalKey(answer), ...exclude.map(canonicalKey)])
  const queues = candidatesByAttribute.map(list => list.slice())
  let progressed = true
  while (chosen.length < n && progressed) {
    progressed = false
    for (const q of queues) {
      if (chosen.length >= n) break
      while (q.length > 0) {
        const cand = q.shift()!
        const key = canonicalKey(cand)
        if (seen.has(key)) continue
        if (attributeDiff(cand, answer).length !== 1) continue
        seen.add(key)
        chosen.push(cand)
        progressed = true
        break
      }
    }
  }
  return chosen
}
