import type { Difficulty } from '../lib/types'

/** Items 1–3 are always difficulty 2; adjustment starts after them. */
export const INITIAL_DIFFICULTY: Difficulty = 2
export const PINNED_ITEMS = 3

export function nextDifficulty(prev: Difficulty, correct: boolean): Difficulty {
  const next = prev + (correct ? 1 : -1)
  return Math.min(5, Math.max(1, next)) as Difficulty
}

/**
 * Difficulty for every position given the results so far. Returns
 * `results.length + 1` entries: index i is the difficulty of item i, and the
 * final entry is the difficulty the NEXT item should get. The full ladder is
 * what scoring consumes — a correct answer at difficulty 5 is worth more
 * than one at difficulty 1.
 */
export function difficultyLadder(results: boolean[]): Difficulty[] {
  const ladder: Difficulty[] = []
  let current = INITIAL_DIFFICULTY
  for (let i = 0; i <= results.length; i++) {
    ladder.push(current)
    if (i >= results.length) break
    if (i >= PINNED_ITEMS - 1) current = nextDifficulty(current, results[i])
  }
  return ladder
}
