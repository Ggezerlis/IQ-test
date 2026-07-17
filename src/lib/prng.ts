/**
 * Seeded PRNG so every test item is reproducible from (difficulty, seed).
 * mulberry32 core + xmur3 string hasher for deriving independent sub-streams.
 */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Rng {
  private next32: () => number

  constructor(seed: number | string) {
    const n = typeof seed === 'number' ? seed >>> 0 : xmur3(seed)()
    this.next32 = mulberry32(n)
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.next32()
  }

  /** Uniform integer in [min, max], inclusive on both ends. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array')
    return arr[this.int(0, arr.length - 1)]
  }

  /** Fisher–Yates; returns a new array, input untouched. */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  bool(p = 0.5): boolean {
    return this.next() < p
  }

  /** Independent sub-stream, deterministic in (this stream's state, label). */
  fork(label: string): Rng {
    return new Rng(`${label}:${Math.floor(this.next() * 0xffffffff)}`)
  }
}
