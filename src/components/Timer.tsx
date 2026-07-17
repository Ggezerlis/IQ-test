import { useEffect, useState } from 'react'

function fmt(ms: number): string {
  const s = Math.floor(Math.abs(ms) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Soft-cap countdown: reaching zero never ends the test, the display just
 * switches to counting overtime.
 */
export default function Timer({ startedAt, softCapMs }: { startedAt: number; softCapMs: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const remaining = softCapMs - (now - startedAt)
  const over = remaining < 0
  return (
    <div
      aria-label={over ? `${fmt(remaining)} over the suggested time` : `${fmt(remaining)} remaining`}
      className={`rounded-md px-2.5 py-1 font-mono text-sm tabular-nums ${
        over ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
      }`}
    >
      {over ? `+${fmt(remaining)}` : fmt(remaining)}
    </div>
  )
}
