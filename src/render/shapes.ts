/**
 * Pure Figure → SVG-string rendering. String-based (not JSX) so the exact
 * same code path serves vitest assertions, the node gallery script, and the
 * React app (which wraps the string in a container).
 *
 * Colorblind safety: each FillId is a fixed (pattern, color) pair from the
 * Okabe–Ito palette — a rule expressed through fill always co-varies pattern
 * and color, never color alone.
 */
import type { DecorationId, Figure, ShapeId } from '../lib/types'

/** Rotational symmetry period in degrees; rotating by a multiple is a no-op. */
export const SYMMETRY_PERIOD: Record<ShapeId, number> = {
  circle: 1, // any rotation is invisible
  square: 90,
  triangle: 120,
  pentagon: 72,
  star: 72,
  arrow: 360,
}

/** Rotation reduced to the visually meaningful range for this shape. */
export function canonicalRotation(shape: ShapeId, rotation: number): number {
  const p = SYMMETRY_PERIOD[shape]
  return ((rotation % p) + p) % p
}

/** Shapes on which a 45° rotation step is always visibly distinct. */
export const ROTATION_SAFE_SHAPES: ShapeId[] = ['triangle', 'pentagon', 'arrow']

export const OVERLAY_POSITIONS: { x: number; y: number; name: string }[] = [
  { x: 9, y: 9, name: 'top-left' },
  { x: 91, y: 9, name: 'top-right' },
  { x: 9, y: 91, name: 'bottom-left' },
  { x: 91, y: 91, name: 'bottom-right' },
]
export const OVERLAY_BITS = OVERLAY_POSITIONS.length // 4 → masks 0..15

const GLYPH_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[31, 50], [69, 50]],
  3: [[50, 31], [31, 69], [69, 69]],
  4: [[31, 31], [69, 31], [31, 69], [69, 69]],
  5: [[29, 29], [71, 29], [29, 71], [71, 71], [50, 50]],
}

const SIZE_RADIUS: Record<1 | 2 | 3, number> = { 1: 9, 2: 13.5, 3: 19 }
const COUNT_SCALE: Record<number, number> = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.68, 5: 0.6 }

const STROKE = '#0f172a'

const FILL_INFO: Record<string, { paint: (uid: string) => string; word: string }> = {
  outline: { paint: () => '#ffffff', word: 'white outlined' },
  solid: { paint: () => '#0072B2', word: 'solid blue' },
  hatch: { paint: uid => `url(#${uid}-hatch)`, word: 'orange-striped' },
  dots: { paint: uid => `url(#${uid}-dots)`, word: 'green-dotted' },
  cross: { paint: uid => `url(#${uid}-cross)`, word: 'pink-crosshatched' },
}

function patternDefs(uid: string): string {
  return `<defs>
<pattern id="${uid}-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#ffffff"/><line x1="0" y1="0" x2="0" y2="7" stroke="#E69F00" stroke-width="3"/></pattern>
<pattern id="${uid}-dots" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#ffffff"/><circle cx="3.5" cy="3.5" r="1.7" fill="#009E73"/></pattern>
<pattern id="${uid}-cross" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#ffffff"/><path d="M0 3.5H7M3.5 0V7" stroke="#CC79A7" stroke-width="1.8"/></pattern>
</defs>`
}

function polygonPoints(cx: number, cy: number, r: number, n: number): string {
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.45
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function arrowPoints(cx: number, cy: number, r: number): string {
  // Upward arrow at rotation 0; fully asymmetric so any rotation is visible.
  const rel: [number, number][] = [
    [0, -1], [0.62, -0.05], [0.26, -0.05], [0.26, 0.95],
    [-0.26, 0.95], [-0.26, -0.05], [-0.62, -0.05],
  ]
  return rel.map(([x, y]) => `${(cx + x * r).toFixed(2)},${(cy + y * r).toFixed(2)}`).join(' ')
}

function glyph(shape: ShapeId, cx: number, cy: number, r: number, rotation: number, paint: string): string {
  const style = `fill="${paint}" stroke="${STROKE}" stroke-width="2.5" stroke-linejoin="round"`
  const rot = canonicalRotation(shape, rotation)
  const transform = rot !== 0 ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''
  switch (shape) {
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" ${style}/>`
    case 'square': {
      const s = r * 1.6
      return `<rect x="${(cx - s / 2).toFixed(2)}" y="${(cy - s / 2).toFixed(2)}" width="${s.toFixed(2)}" height="${s.toFixed(2)}" ${style}${transform}/>`
    }
    case 'triangle':
      return `<polygon points="${polygonPoints(cx, cy, r * 1.15, 3)}" ${style}${transform}/>`
    case 'pentagon':
      return `<polygon points="${polygonPoints(cx, cy, r * 1.05, 5)}" ${style}${transform}/>`
    case 'star':
      return `<polygon points="${starPoints(cx, cy, r * 1.15)}" ${style}${transform}/>`
    case 'arrow':
      return `<polygon points="${arrowPoints(cx, cy, r)}" ${style}${transform}/>`
  }
}

function decorationSvg(d: DecorationId): string {
  if (d === 'ring') return `<circle cx="50" cy="9" r="5" fill="none" stroke="${STROKE}" stroke-width="2.2"/>`
  return `<rect x="43" y="6.5" width="14" height="5" rx="1" fill="${STROKE}"/>`
}

/** Inner markup of one cell (no <svg> wrapper) in a 100×100 coordinate space. */
export function figureBody(f: Figure, uid: string): string {
  const parts: string[] = []
  const r = SIZE_RADIUS[f.size] * (COUNT_SCALE[f.count] ?? 0.6)
  const paint = FILL_INFO[f.fill].paint(uid)
  for (const [cx, cy] of GLYPH_LAYOUTS[f.count] ?? GLYPH_LAYOUTS[1]) {
    parts.push(glyph(f.shape, cx, cy, r, f.rotation, paint))
  }
  OVERLAY_POSITIONS.forEach((p, i) => {
    if (f.overlay & (1 << i)) parts.push(`<circle cx="${p.x}" cy="${p.y}" r="4" fill="${STROKE}"/>`)
  })
  if (f.decoration) parts.push(decorationSvg(f.decoration))
  return parts.join('')
}

const SIZE_WORD = { 1: 'small', 2: 'medium', 3: 'large' } as const
const COUNT_WORD = ['zero', 'one', 'two', 'three', 'four', 'five']

/** Factual, rule-neutral description for <desc> / screen readers. */
export function describeFigure(f: Figure): string {
  const parts: string[] = []
  const plural = f.count > 1 ? 's' : ''
  parts.push(`${COUNT_WORD[f.count]} ${SIZE_WORD[f.size]} ${FILL_INFO[f.fill].word} ${f.shape}${plural}`)
  const rot = canonicalRotation(f.shape, f.rotation)
  if (rot !== 0) parts.push(`rotated ${rot} degrees`)
  const dots = OVERLAY_POSITIONS.filter((_, i) => f.overlay & (1 << i)).map(p => p.name)
  if (dots.length > 0) parts.push(`corner dots at ${dots.join(', ')}`)
  if (f.decoration) parts.push(`${f.decoration} marker at top`)
  return parts.join('; ')
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Standalone SVG for a single figure (an answer option). */
export function figureToSvg(f: Figure, uid: string, title: string): string {
  const desc = describeFigure(f)
  return `<svg viewBox="0 0 100 100" role="img" aria-labelledby="${uid}-t ${uid}-d">` +
    `<title id="${uid}-t">${esc(title)}</title><desc id="${uid}-d">${esc(desc)}</desc>` +
    patternDefs(uid) +
    `<rect x="1" y="1" width="98" height="98" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>` +
    figureBody(f, uid) +
    `</svg>`
}

/** Standalone SVG for the 3×3 matrix prompt; cells[8] === null renders as "?". */
export function matrixToSvg(cells: (Figure | null)[], uid: string, title: string): string {
  const CELL = 104
  const PAD = 2
  const total = CELL * 3 + PAD * 2
  const body: string[] = []
  cells.forEach((cell, i) => {
    const gx = PAD + (i % 3) * CELL
    const gy = PAD + Math.floor(i / 3) * CELL
    body.push(`<g transform="translate(${gx + 2} ${gy + 2})">`)
    body.push(`<rect x="0" y="0" width="100" height="100" rx="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>`)
    if (cell) body.push(figureBody(cell, uid))
    else body.push(`<text x="50" y="62" text-anchor="middle" font-size="40" font-family="system-ui, sans-serif" fill="#64748b">?</text>`)
    body.push(`</g>`)
  })
  const desc = cells
    .map((c, i) => `cell ${i + 1}: ${c ? describeFigure(c) : 'empty, to be filled in'}`)
    .join('. ')
  return `<svg viewBox="0 0 ${total} ${total}" role="img" aria-labelledby="${uid}-t ${uid}-d">` +
    `<title id="${uid}-t">${esc(title)}</title><desc id="${uid}-d">${esc(desc)}</desc>` +
    patternDefs(uid) + body.join('') + `</svg>`
}
