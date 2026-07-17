import { describe, expect, it } from 'vitest'
import { difficultyLadder, nextDifficulty } from './adaptive'

describe('adaptive engine', () => {
  it('pins items 1-3 at difficulty 2 regardless of answers', () => {
    for (const results of [[true, true, true], [false, false, false], [true, false, true]]) {
      const ladder = difficultyLadder(results)
      expect(ladder.slice(0, 3)).toEqual([2, 2, 2])
    }
  })

  it('adjusts +1 on correct, -1 on wrong, starting after item 3', () => {
    expect(difficultyLadder([true, true, true, true])).toEqual([2, 2, 2, 3, 4])
    expect(difficultyLadder([false, false, false, false])).toEqual([2, 2, 2, 1, 1])
    expect(difficultyLadder([true, true, true, false, true])).toEqual([2, 2, 2, 3, 2, 3])
  })

  it('caps at 5 and floors at 1', () => {
    const allRight = difficultyLadder(Array(30).fill(true))
    expect(Math.max(...allRight)).toBe(5)
    expect(allRight.slice(6)).toEqual(Array(25).fill(5))
    const allWrong = difficultyLadder(Array(30).fill(false))
    expect(Math.min(...allWrong)).toBe(1)
    expect(allWrong.slice(3)).toEqual(Array(28).fill(1))
    expect(nextDifficulty(5, true)).toBe(5)
    expect(nextDifficulty(1, false)).toBe(1)
  })

  it('returns one more entry than results (the next difficulty)', () => {
    expect(difficultyLadder([])).toEqual([2])
    expect(difficultyLadder([true])).toHaveLength(2)
    expect(difficultyLadder(Array(30).fill(true))).toHaveLength(31)
  })
})
