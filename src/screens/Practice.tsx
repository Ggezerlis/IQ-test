import { useEffect, useState } from 'react'
import { useScrollTop } from '../lib/useScrollTop'
import OptionGrid from '../components/OptionGrid'
import type { ItemType } from '../lib/types'
import { PRACTICE_ITEMS } from '../practice'
import SvgItem from '../render/SvgItem'

const INSTRUCTION: Record<ItemType, string> = {
  matrix: 'Which option completes the 3×3 pattern?',
  series: 'What number comes next?',
  spatial: 'Which option shows the same figure, only rotated?',
  weights: 'The top scales balance. What must the bottom scale hold on the right to balance?',
}

/**
 * The fixed 5-question warm-up: untimed, unscored, immediate feedback with
 * the rule explained after each answer. Items come from frozen JSON — the
 * same five for everyone, never drawn from the real test's item space.
 */
export default function Practice({ onExit }: { onExit: (startTest: boolean) => void }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  // Back to the top on every question change.
  useScrollTop(index)
  const entry = PRACTICE_ITEMS[index]
  const item = entry.item
  const last = index === PRACTICE_ITEMS.length - 1
  const correct = confirmed && selected === item.correctIndex

  const advance = () => {
    if (last) return onExit(true)
    setIndex(index + 1)
    setSelected(null)
    setConfirmed(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      if (!confirmed && selected !== null) setConfirmed(true)
      else if (confirmed) advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <main key={item.id} className="screen-enter mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 pb-40 pt-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Practice · question {index + 1} of {PRACTICE_ITEMS.length}
          </p>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            Warm-up — doesn't count
          </span>
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
          <div className="flex flex-1 flex-col gap-4">
            <OptionGrid
              options={item.options}
              uid={item.id}
              selected={selected}
              onSelect={setSelected}
              reveal={confirmed ? { correctIndex: item.correctIndex, chosenIndex: selected } : undefined}
            />
            {confirmed && (
              <div
                className={`rise-in rounded-xl border p-4 text-sm leading-relaxed ${
                  correct
                    ? 'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
                    : 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
                }`}
              >
                <p className="font-semibold">
                  {correct
                    ? 'Correct!'
                    : `Not quite — the answer is ${String.fromCharCode(65 + item.correctIndex)}.`}
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {entry.ruleExplanations.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                <p className="mt-1">{entry.answerExplanation}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer-enter fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div
          className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            {confirmed ? 'Enter to continue' : 'Arrow keys or 1–6 to select · Enter to check'}
          </p>
          {confirmed ? (
            <button
              type="button"
              onClick={advance}
              className="btn-press w-full rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {last ? 'Start the real test' : 'Next question'}
            </button>
          ) : (
            <button
              type="button"
              disabled={selected === null}
              onClick={() => selected !== null && setConfirmed(true)}
              className="btn-press w-full rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              Check answer
            </button>
          )}
          <button
            type="button"
            onClick={() => onExit(false)}
            className="text-center text-xs text-slate-400 underline-offset-2 hover:underline dark:text-slate-500"
          >
            Exit practice
          </button>
        </div>
      </footer>
    </>
  )
}
