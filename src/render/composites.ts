/**
 * SVG renderers for the non-matrix item types (polyomino cell figures,
 * balance scales, shape multisets), plus a dispatcher over every SVGSpec
 * kind. Same string-based approach as shapes.ts: one code path for tests,
 * the gallery script, and the app.
 */
import type { FillId, ShapeId, SVGSpec } from '../lib/types'
import { figureToSvg, glyphSvg, matrixToSvg, patternDefs } from './shapes'

const STROKE = '#0f172a'

/**
 * Weights items identify each unknown by shape AND fill pattern together,
 * never color alone.
 */
export const WEIGHT_SHAPE_FILL: Record<string, FillId> = {
  circle: 'solid',
  square: 'hatch',
  triangle: 'dots',
  pentagon: 'cross',
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function svgWrap(viewBox: string, uid: string, title: string, desc: string, body: string): string {
  return `<svg viewBox="${viewBox}" role="img" aria-labelledby="${uid}-t ${uid}-d">` +
    `<title id="${uid}-t">${esc(title)}</title><desc id="${uid}-d">${esc(desc)}</desc>` +
    patternDefs(uid) + body + `</svg>`
}

/** Polyomino-style figure: unit squares on a grid, centered in a 100×100 box. */
export function cellsToSvg(cells: [number, number][], uid: string, title: string, desc: string): string {
  const xs = cells.map(c => c[0])
  const ys = cells.map(c => c[1])
  const w = Math.max(...xs) - Math.min(...xs) + 1
  const h = Math.max(...ys) - Math.min(...ys) + 1
  const unit = Math.min(84 / Math.max(w, h), 22)
  const ox = 50 - (w * unit) / 2 - Math.min(...xs) * unit
  const oy = 50 - (h * unit) / 2 - Math.min(...ys) * unit
  const body = [`<rect x="1" y="1" width="98" height="98" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>`]
  for (const [x, y] of cells) {
    body.push(`<rect x="${(ox + x * unit).toFixed(2)}" y="${(oy + y * unit).toFixed(2)}" width="${unit.toFixed(2)}" height="${unit.toFixed(2)}" fill="#0072B2" stroke="${STROKE}" stroke-width="2"/>`)
  }
  return svgWrap('0 0 100 100', uid, title, desc, body.join(''))
}

/** Row of glyphs for a shape multiset (a weights answer option). */
export function shapesetToSvg(
  shapeKinds: ShapeId[], counts: number[], uid: string, title: string, desc: string,
): string {
  const glyphs: { shape: ShapeId; fill: FillId }[] = []
  shapeKinds.forEach((s, i) => {
    for (let n = 0; n < counts[i]; n++) glyphs.push({ shape: s, fill: WEIGHT_SHAPE_FILL[s] })
  })
  const spacing = 24
  const x0 = 50 - ((glyphs.length - 1) * spacing) / 2
  const body = [`<rect x="1" y="21" width="98" height="58" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>`]
  glyphs.forEach((g, i) => {
    body.push(glyphSvg(g.shape, g.fill, x0 + i * spacing, 50, 10, uid))
  })
  return svgWrap('0 0 100 100', uid, title, desc, body.join(''))
}

function pan(shapeKinds: ShapeId[], counts: number[] | null, cx: number, y: number, uid: string): string {
  const parts: string[] = []
  parts.push(`<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + 12}" stroke="${STROKE}" stroke-width="2"/>`)
  parts.push(`<path d="M${cx - 44} ${y + 30} Q${cx} ${y + 44} ${cx + 44} ${y + 30}" fill="none" stroke="${STROKE}" stroke-width="2.5"/>`)
  if (counts === null) {
    parts.push(`<text x="${cx}" y="${y + 30}" text-anchor="middle" font-size="26" font-family="system-ui, sans-serif" fill="#64748b">?</text>`)
    return parts.join('')
  }
  const glyphs: { shape: ShapeId; fill: FillId }[] = []
  shapeKinds.forEach((s, i) => {
    for (let n = 0; n < counts[i]; n++) glyphs.push({ shape: s, fill: WEIGHT_SHAPE_FILL[s] })
  })
  const spacing = 21
  const x0 = cx - ((glyphs.length - 1) * spacing) / 2
  glyphs.forEach((g, i) => parts.push(glyphSvg(g.shape, g.fill, x0 + i * spacing, y + 22, 9, uid)))
  return parts.join('')
}

function scale(shapeKinds: ShapeId[], left: number[], right: number[] | null, cx: number, y: number, uid: string): string {
  const parts: string[] = []
  const beamHalf = 78
  parts.push(`<line x1="${cx - beamHalf}" y1="${y}" x2="${cx + beamHalf}" y2="${y}" stroke="${STROKE}" stroke-width="3"/>`)
  parts.push(`<polygon points="${cx - 9},${y + 46} ${cx + 9},${y + 46} ${cx},${y + 2}" fill="#94a3b8" stroke="${STROKE}" stroke-width="2"/>`)
  parts.push(pan(shapeKinds, left, cx - beamHalf + 24, y, uid))
  parts.push(pan(shapeKinds, right, cx + beamHalf - 24, y, uid))
  return parts.join('')
}

/** Prompt for a weights item: example balances stacked above the target scale. */
export function scalesToSvg(
  spec: Extract<SVGSpec, { kind: 'scales' }>, uid: string, title: string,
): string {
  const rowH = 62
  const rows = spec.equations.length + 1
  const height = rows * rowH + 26
  const body: string[] = [`<rect x="1" y="1" width="318" height="${height - 2}" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>`]
  spec.equations.forEach((eq, i) => {
    body.push(scale(spec.shapeKinds, eq.left, eq.right, 160, 18 + i * rowH, uid))
  })
  body.push(`<line x1="14" y1="${12 + spec.equations.length * rowH}" x2="306" y2="${12 + spec.equations.length * rowH}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="5 4"/>`)
  body.push(scale(spec.shapeKinds, spec.targetLeft, null, 160, 24 + spec.equations.length * rowH, uid))
  return svgWrap(`0 0 320 ${height}`, uid, title, spec.describe, body.join(''))
}

/** Render any SVGSpec. */
export function specToSvg(spec: SVGSpec, uid: string, title: string): string {
  switch (spec.kind) {
    case 'figure': return figureToSvg(spec.figure, uid, title)
    case 'matrix': return matrixToSvg(spec.cells, uid, title)
    case 'cells': return cellsToSvg(spec.cells, uid, title, spec.describe)
    case 'shapeset': return shapesetToSvg(spec.shapeKinds, spec.counts, uid, title, spec.describe)
    case 'scales': return scalesToSvg(spec, uid, title)
  }
}
