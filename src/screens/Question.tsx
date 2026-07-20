import { useEffect, useState } from 'react'
import { useScrollTop } from '../lib/useScrollTop'
import OptionGrid from '../components/OptionGrid'
import ProgressBar from '../components/ProgressBar'
import Timer from '../components/Timer'
import type { Item, ItemType } from '../lib/types'
import SvgItem from '../render/SvgItem'

const INSTRUCTION: Record<ItemType, string> = {
  matrix: 'Which option completes the 3×3 pattern?',
  series: 'What number comes next?',
  spatial: 'Which option shows the same figure, only rotated?',
  weights: 'The top scales balance. What must the bottom scale hold on the right to balance?',
}

export default function Question({
  item, position, total, sectionLabel, startedAt, softCapMs, onConfirm, onPause,
}: {
  item: Item
  position: number
  total: number
  sectionLabel: string
  startedAt: number
  softCapMs: number
  onConfirm: (optionIndex: number) => void
  onPause?: () => void
}) {
  const [selected, setSelected] = useState<number | null>(null)
  // Remounted per item (key={item.id}), so each question starts at the top
  // and replays the entry animation.
  useScrollTop()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selected !== null) {
        e.preventDefault()
        onConfirm(selected)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, onConfirm])

  return (
    <>
      <main className="screen-enter mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 pb-36 pt-5">
        <header className="flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar position={position} total={total} sectionLabel={sectionLabel} />
          </div>
          <Timer startedAt={startedAt} softCapMs={softCapMs} />
          {onPause && (
            <button
              type="button"
              onClick={onPause}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Pause
            </button>
          )}
        </header>

        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{INSTRUCTION[item.type]}</h1>

        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          {typeof item.prompt === 'string' ? (
            <p className="shrink-0 py-4 text-3xl tracking-wide text-slate-900 tabular-nums md:max-w-xs dark:text-slate-100">
              {item.prompt}
            </p>
          ) : (
            <SvgItem
              spec={item.prompt}
              uid={`${item.id}p`}
              title={INSTRUCTION[item.type]}
              className="w-full max-w-xs shrink-0 sm:max-w-sm"
            />
          )}
          <div className="flex-1">
            <OptionGrid options={item.options} uid={item.id} selected={selected} onSelect={setSelected} />
          </div>
        </div>
      </main>

      {/* Fixed to the viewport so Confirm is always reachable, however tall the item is. */}
      <footer className="footer-enter fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div
          className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Arrow keys or 1–6 to select · Enter to confirm
          </p>
          <button
            type="button"
            disabled={selected === null}
            onClick={() => selected !== null && onConfirm(selected)}
            className="btn-press w-full rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
          >
            Confirm
          </button>
        </div>
      </footer>
    </>
  )
}
