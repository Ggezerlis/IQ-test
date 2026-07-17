/**
 * Scoring.
 *
 * IMPORTANT — THE DISTRIBUTION BELOW IS AN ASSUMPTION, NOT NORMED DATA.
 * This test has never been administered to a normative sample, so it has no
 * real norming table, and we refuse to fake one. Instead we ASSUME raw
 * scores are normally distributed with the mean/SD constants below (chosen
 * so that mid-range performance lands near the 50th percentile and chance-
 * level guessing lands in the low single digits) and say so on the results
 * page. Percentiles and IQ-equivalents derived from this assumption are
 * entertainment estimates only.
 */
import type { Difficulty } from '../lib/types'
import { TEST_PLAN, type Section } from './testPlan'

export const ASSUMED_RAW_MEAN = 40
export const ASSUMED_RAW_SD = 20

export interface AnswerLike {
  correct: boolean
  difficulty: Difficulty
}

export interface SectionScore {
  section: Section
  correct: number
  total: number
  /** Sum of difficulties of correctly answered items in this section. */
  raw: number
  /** Sum of difficulties of all attempted items in this section. */
  attemptedRaw: number
}

export interface ScoreReport {
  /** Sum of difficulty over correct items — the only directly measured number here. */
  raw: number
  /** 1–99, from the ASSUMED normal distribution above. */
  percentile: number
  /** e.g. "top 15%" */
  band: string
  /** Qualitative position relative to the assumed average. */
  comparative: string
  /** IQ-equivalent shown as a range, never a point estimate. */
  iqRange: [number, number]
  sections: SectionScore[]
}

/** Abramowitz–Stegun approximation of the standard normal CDF. */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2)
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return z >= 0 ? 1 - p : p
}

/** Short label; every place it is shown must carry the "assumed" qualifier. */
function band(percentile: number): string {
  return percentile >= 50 ? `top ${100 - percentile}%` : `bottom ${percentile}%`
}

function comparative(percentile: number): string {
  if (percentile >= 91) return 'well above the assumed average'
  if (percentile >= 75) return 'above the assumed average'
  if (percentile >= 25) return 'around the assumed average'
  if (percentile >= 9) return 'below the assumed average'
  return 'well below the assumed average'
}

export function scoreTest(answers: AnswerLike[]): ScoreReport {
  const raw = answers.reduce((s, a) => s + (a.correct ? a.difficulty : 0), 0)

  const z = (raw - ASSUMED_RAW_MEAN) / ASSUMED_RAW_SD
  const percentile = Math.min(99, Math.max(1, Math.round(normalCdf(z) * 100)))

  // IQ scale: mean 100, SD 15 — under the SAME assumption as the percentile.
  // Shown as a range whose width grows away from the mean, because a short
  // un-normed test measures extremes even less precisely than the middle.
  const iqPoint = 100 + 15 * z
  const half = Math.min(12, 5 + 2 * Math.abs(z))
  const clamp = (v: number) => Math.min(145, Math.max(55, Math.round(v)))
  let lo = clamp(iqPoint - half)
  let hi = clamp(iqPoint + half)
  // Keep a real range even when the display ceiling/floor saturates both
  // ends — the band then reads e.g. "137–145" rather than a fake point.
  if (hi - lo < 8) {
    if (hi >= 145) lo = 145 - 8
    else if (lo <= 55) hi = 55 + 8
  }
  const iqRange: [number, number] = [lo, hi]

  const sections: SectionScore[] = []
  answers.forEach((a, i) => {
    const section = TEST_PLAN[i].section
    let s = sections.find(x => x.section === section)
    if (!s) {
      s = { section, correct: 0, total: 0, raw: 0, attemptedRaw: 0 }
      sections.push(s)
    }
    s.total++
    s.attemptedRaw += a.difficulty
    if (a.correct) {
      s.correct++
      s.raw += a.difficulty
    }
  })

  return { raw, percentile, band: band(percentile), comparative: comparative(percentile), iqRange, sections }
}
