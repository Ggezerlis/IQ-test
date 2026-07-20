import { useMemo, useState } from 'react'
import { useScrollTop } from '../lib/useScrollTop'
import Disclaimer from '../components/Disclaimer'
import { replayTest, type ItemReview } from '../engine/explain'
import { SECTION_LABEL } from '../engine/testPlan'
import { encodeShare } from '../lib/share'
import SvgItem from '../render/SvgItem'

function fmtTime(ms: number): string {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const letter = (i: number) => String.fromCharCode(65 + i)

function OptionThumb({ review, index, label, good }: { review: ItemReview; index: number; label: string; good: boolean }) {
  const opt = review.item.options[index]
  return (
    <div className="w-24 shrink-0">
      <span className={`mb-0.5 block text-xs font-medium ${good ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
        {label}: {letter(index)}
      </span>
      {typeof opt === 'string' ? (
        <span className={`block rounded-lg border-2 py-2 text-center text-lg tabular-nums text-slate-900 dark:text-slate-100 ${good ? 'border-green-600' : 'border-red-400'}`}>
          {opt}
        </span>
      ) : (
        <SvgItem
          spec={opt}
          uid={`r${review.position}x${index}`}
          title={`Option ${letter(index)}`}
          className={`rounded-lg border-2 ${good ? 'border-green-600' : 'border-red-400'}`}
        />
      )}
    </div>
  )
}

function ReviewCard({ review, timeMs, slowest }: { review: ItemReview; timeMs?: number; slowest: boolean }) {
  const r = review
  return (
    <details className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${r.correct ? 'bg-green-600' : 'bg-red-500'}`}>
          {r.correct ? '✓' : '✗'}
        </span>
        <span className="font-medium text-slate-900 dark:text-slate-100">Item {r.position + 1}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {SECTION_LABEL[r.section]} · difficulty {r.difficulty}
        </span>
        {timeMs !== undefined && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
              slowest
                ? 'bg-amber-100 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {fmtTime(timeMs)}{slowest ? ' · longest' : ''}
          </span>
        )}
        <span className="ml-auto text-sm text-slate-400 dark:text-slate-500">details</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 md:flex-row dark:border-slate-800">
        <div className="shrink-0">
          {typeof r.item.prompt === 'string' ? (
            <p className="text-xl tabular-nums text-slate-900 dark:text-slate-100">{r.item.prompt}</p>
          ) : (
            <SvgItem spec={r.item.prompt} uid={`r${r.position}p`} title={`Item ${r.position + 1}`} className="w-48" />
          )}
          <div className="mt-3 flex gap-3">
            <OptionThumb review={r} index={r.item.correctIndex} label="Correct" good />
            {!r.correct && <OptionThumb review={r} index={r.chosenIndex} label="Your pick" good={false} />}
          </div>
        </div>
        <div className="min-w-0 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-slate-100">The rule{r.ruleExplanations.length > 1 ? 's' : ''}</p>
          <ul className="mb-2 list-disc pl-5">
            {r.ruleExplanations.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
          <p><span className="font-semibold text-slate-900 dark:text-slate-100">Why {letter(r.item.correctIndex)} is right: </span>{r.answerExplanation}</p>
          <p className="mt-1"><span className="font-semibold text-slate-900 dark:text-slate-100">{r.correct ? 'The closest trap' : 'Why your pick fails'}: </span>{r.distractorExplanation}</p>
        </div>
      </div>
    </details>
  )
}

function ShareRow({ label, note, url }: { label: string; note: string; url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{note}</span>
      </div>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          aria-label={`${label} URL`}
          onFocus={e => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(url).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            })
          }}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function Results({
  seed, choices, elapsedMs, timings, onRestart,
}: {
  seed: number
  choices: number[]
  /** Unknown when viewing someone else's shared results. */
  elapsedMs?: number
  /** Per-item time; present for your own runs, absent on shared links. */
  timings?: number[]
  onRestart: () => void
}) {
  useScrollTop()
  const { reviews, report } = useMemo(() => replayTest(seed, choices), [seed, choices])
  const correct = reviews.filter(r => r.correct).length
  const slowestIndex = useMemo(() => {
    if (!timings || timings.length === 0) return -1
    return timings.indexOf(Math.max(...timings))
  }, [timings])

  return (
    <main className="screen-enter mx-auto w-full max-w-3xl px-4 py-8">
      {/* Headline + disclaimer stay above the fold on mobile. */}
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Your results</h1>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-4xl font-bold text-blue-700 dark:text-blue-400">{report.band}</span>
        <span className="text-lg text-slate-700 dark:text-slate-300">IQ-equivalent ≈ {report.iqRange[0]}–{report.iqRange[1]}</span>
      </div>
      <p className="mb-3 mt-1 text-sm text-slate-600 dark:text-slate-400">
        {correct} of {reviews.length} correct · raw score {report.raw} (difficulty-weighted)
        {elapsedMs !== undefined && <> · {fmtTime(elapsedMs)}</>} · {report.comparative} —
        percentile and IQ range are computed from an <strong>assumed</strong> normal
        distribution, not from norming data.
      </p>
      <Disclaimer />

      <section className="mt-6" aria-label="Score by section">
        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">By section</h2>
        <div className="flex flex-col gap-3">
          {report.sections.map(s => {
            const pct = s.attemptedRaw > 0 ? Math.round((s.raw / s.attemptedRaw) * 100) : 0
            return (
              <div key={s.section}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{SECTION_LABEL[s.section]}</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {s.correct}/{s.total} correct · {s.raw} of {s.attemptedRaw} difficulty points
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700" role="img"
                  aria-label={`${SECTION_LABEL[s.section]}: ${pct}% of attempted difficulty points`}>
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8" aria-label="Every item explained">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Every item, explained</h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          Open any item to see the rule, why the right answer is right, and why the tempting
          wrong option is wrong.
        </p>
        <div className="flex flex-col gap-2">
          {reviews.map(r => (
            <ReviewCard
              key={r.position}
              review={r}
              timeMs={timings?.[r.position]}
              slowest={r.position === slowestIndex}
            />
          ))}
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" aria-label="Share">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Share</h2>
        <ShareRow
          label="Challenge a friend"
          note="they get the identical 30 puzzles, unanswered"
          url={`${window.location.origin}${window.location.pathname}${encodeShare({ seed })}`}
        />
        <ShareRow
          label="Share these results"
          note="opens this page — including all answers and explanations"
          url={`${window.location.origin}${window.location.pathname}${encodeShare({ seed, choices })}`}
        />
      </section>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="btn-press rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
        >
          Take a fresh test
        </button>
      </div>
    </main>
  )
}
