import { describe, expect, it } from 'vitest'
import { TOTAL_ITEMS } from '../engine/testPlan'
import { encodeShare, parseShare } from './share'

describe('share codec', () => {
  it('round-trips a challenge link (seed only)', () => {
    for (const seed of [0, 1, 42, 987654321, 0xffffffff]) {
      expect(parseShare(encodeShare({ seed }))).toEqual({ seed })
    }
  })

  it('round-trips a results link (seed + choices)', () => {
    const choices = Array.from({ length: TOTAL_ITEMS }, (_, i) => (i * 7) % 6)
    const seed = 123456789
    expect(parseShare(encodeShare({ seed, choices }))).toEqual({ seed, choices })
  })

  it('rejects malformed input', () => {
    expect(parseShare('')).toBeNull()
    expect(parseShare('?s=')).toBeNull()
    expect(parseShare('?s=UPPER')).toBeNull()
    expect(parseShare('?s=!!!')).toBeNull()
    expect(parseShare('?s=zzzzzzzz')).toBeNull() // > 32 bits
    expect(parseShare('?a=000')).toBeNull() // no seed
  })

  it('drops invalid choices but keeps a valid seed', () => {
    expect(parseShare('?s=zz&a=012345')).toEqual({ seed: parseInt('zz', 36) }) // wrong length
    expect(parseShare(`?s=zz&a=${'6'.repeat(TOTAL_ITEMS)}`)).toEqual({ seed: parseInt('zz', 36) }) // digit out of range
    expect(parseShare(`?s=zz&a=${'0'.repeat(TOTAL_ITEMS)}`)).toEqual({
      seed: parseInt('zz', 36),
      choices: Array(TOTAL_ITEMS).fill(0),
    })
  })
})
