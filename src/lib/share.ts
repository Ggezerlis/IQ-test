/**
 * Share-link codec. Two link flavors, both pure URL params (no backend):
 *   ?s=<seed36>              — challenge: a friend takes the identical test
 *   ?s=<seed36>&a=<choices>  — results: replay a finished test, explanations included
 * choices is a fixed-length string of digits 0-5, one per item in test order.
 */
import { TOTAL_ITEMS } from '../engine/testPlan'

export interface ShareState {
  seed: number
  choices?: number[]
}

export function encodeShare(state: ShareState): string {
  const s = `?s=${state.seed.toString(36)}`
  return state.choices ? `${s}&a=${state.choices.join('')}` : s
}

export function parseShare(search: string): ShareState | null {
  const params = new URLSearchParams(search)
  const sRaw = params.get('s')
  if (!sRaw || !/^[0-9a-z]{1,7}$/.test(sRaw)) return null
  const seed = parseInt(sRaw, 36)
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return null
  const aRaw = params.get('a')
  if (aRaw && new RegExp(`^[0-5]{${TOTAL_ITEMS}}$`).test(aRaw)) {
    return { seed, choices: aRaw.split('').map(Number) }
  }
  return { seed }
}
