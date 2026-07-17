import { useEffect, useRef } from 'react'
import type { SVGSpec } from '../lib/types'
import SvgItem from '../render/SvgItem'

const COLS = 3

/**
 * The six answer options as a radiogroup with full keyboard support:
 * arrow keys move the selection (left/right steps, up/down jumps a row),
 * digits 1–6 select directly. Enter is handled by the parent (confirm).
 */
export default function OptionGrid({
  options, uid, selected, onSelect,
}: {
  options: (SVGSpec | string)[]
  uid: string
  selected: number | null
  onSelect: (i: number) => void
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      const n = options.length
      let next: number | null = null
      const cur = selected ?? -1
      switch (e.key) {
        case 'ArrowRight': next = cur === -1 ? 0 : (cur + 1) % n; break
        case 'ArrowLeft': next = cur === -1 ? 0 : (cur + n - 1) % n; break
        case 'ArrowDown': next = cur === -1 ? 0 : (cur + COLS) % n; break
        case 'ArrowUp': next = cur === -1 ? 0 : (cur + n - COLS) % n; break
        default:
          if (/^[1-6]$/.test(e.key)) next = Number(e.key) - 1
      }
      if (next !== null && next < n) {
        e.preventDefault()
        onSelect(next)
        refs.current[next]?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options.length, selected, onSelect])

  return (
    <div role="radiogroup" aria-label="Answer options" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((opt, i) => {
        const letter = String.fromCharCode(65 + i)
        const isSel = selected === i
        const label = typeof opt === 'string' ? `Option ${letter}: ${opt}` : `Option ${letter}: ${opt.describe}`
        return (
          <button
            key={i}
            ref={el => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={isSel}
            aria-label={label}
            tabIndex={isSel || (selected === null && i === 0) ? 0 : -1}
            onClick={() => onSelect(i)}
            className={`rounded-xl border-2 bg-white p-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isSel ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-400'
            }`}
          >
            <span className={`mb-0.5 block px-1 text-xs font-semibold ${isSel ? 'text-blue-700' : 'text-slate-500'}`}>
              {letter}
            </span>
            {typeof opt === 'string' ? (
              <span className="block py-3 text-center text-xl tabular-nums text-slate-900">{opt}</span>
            ) : (
              <SvgItem spec={opt} uid={`${uid}o${i}`} title={`Option ${letter}`} />
            )}
          </button>
        )
      })}
    </div>
  )
}
