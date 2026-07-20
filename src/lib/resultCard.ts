/**
 * Client-side PNG result card (1200×630) drawn on canvas — for saving or
 * sharing to image-first channels where a URL is dead weight. All drawing
 * is local; nothing leaves the browser.
 */
import type { ScoreReport } from '../engine/scoring'
import { SECTION_LABEL } from '../engine/testPlan'
import { APP_NAME } from './config'

export const CARD_W = 1200
export const CARD_H = 630

export function drawResultCard(
  canvas: HTMLCanvasElement,
  report: ScoreReport,
  correct: number,
): void {
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')

  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  grad.addColorStop(0, '#eff6ff')
  grad.addColorStop(0.55, '#ffffff')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  const font = (px: number, weight = 400) => `${weight} ${px}px system-ui, sans-serif`

  // Brand
  ctx.fillStyle = '#0f172a'
  ctx.font = font(56, 800)
  ctx.fillText('Free', 80, 110)
  const freeW = ctx.measureText('Free').width
  ctx.fillStyle = '#2563eb'
  ctx.fillText('IQ', 80 + freeW, 110)

  // Band headline + IQ range
  ctx.fillStyle = '#1d4ed8'
  ctx.font = font(110, 800)
  ctx.fillText(report.band, 80, 265)
  ctx.fillStyle = '#334155'
  ctx.font = font(44, 600)
  ctx.fillText(`IQ-equivalent ≈ ${report.iqRange[0]}–${report.iqRange[1]}`, 80, 335)
  ctx.fillStyle = '#64748b'
  ctx.font = font(30)
  ctx.fillText(`${correct} of 30 puzzles solved · raw score ${report.raw}`, 80, 385)

  // Section bars
  const barX = 80
  let y = 432
  ctx.font = font(23, 600)
  for (const s of report.sections) {
    const pct = s.attemptedRaw > 0 ? s.raw / s.attemptedRaw : 0
    ctx.fillStyle = '#334155'
    ctx.fillText(SECTION_LABEL[s.section], barX, y)
    ctx.fillStyle = '#e2e8f0'
    roundRect(ctx, barX + 250, y - 15, 370, 15, 7.5)
    ctx.fill()
    if (pct > 0) {
      ctx.fillStyle = '#2563eb'
      roundRect(ctx, barX + 250, y - 15, Math.max(15, 370 * pct), 15, 7.5)
      ctx.fill()
    }
    ctx.fillStyle = '#64748b'
    ctx.font = font(21)
    ctx.fillText(`${s.correct}/${s.total}`, barX + 640, y)
    ctx.font = font(23, 600)
    y += 38
  }

  // 3×3 motif with a "?" cell
  const gx = 830
  const gy = 90
  const cell = 96
  const gap = 12
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const x = gx + c * (cell + gap)
      const yy = gy + r * (cell + gap)
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 2.5
      roundRect(ctx, x, yy, cell, cell, 12)
      ctx.fill()
      ctx.stroke()
      if (r === 2 && c === 2) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = font(52, 700)
        ctx.fillText('?', x + cell / 2 - 15, yy + cell / 2 + 20)
      } else {
        ctx.fillStyle = '#2563eb'
        ctx.beginPath()
        const n = (r * 3 + c) % 3
        const cx = x + cell / 2
        const cy = yy + cell / 2
        if (n === 0) ctx.arc(cx, cy, 22, 0, Math.PI * 2)
        else if (n === 1) ctx.rect(cx - 20, cy - 20, 40, 40)
        else {
          ctx.moveTo(cx, cy - 24)
          ctx.lineTo(cx + 22, cy + 18)
          ctx.lineTo(cx - 22, cy + 18)
          ctx.closePath()
        }
        ctx.fill()
      }
    }
  }

  // Honest footer
  ctx.fillStyle = '#94a3b8'
  ctx.font = font(20)
  ctx.fillText(
    `${APP_NAME} — free pattern-reasoning test · entertainment estimate, not a clinical IQ`,
    80,
    CARD_H - 28,
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export async function resultCardBlob(report: ScoreReport, correct: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  drawResultCard(canvas, report, correct)
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}
