import { useMemo } from 'react'
import Disclaimer from '../components/Disclaimer'
import { replayTest, type ItemReview } from '../engine/explain'
import { SECTION_LABEL } from '../engine/testPlan'
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
      <span className={`mb-0.5 block text-xs font-medium ${good ? 'text-green-700' : 'text-red-700'}`}>
        {label}: {letter(index)}
      </span>
      {typeof opt === 'string' ? (
        <span className={`block rounded-lg border-2 py-2 text-center text-lg tabular-nums ${good ? 'border-green-600' : 'border-red-400'}`}>
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

function ReviewCard({ review }: { review: ItemReview }) {
  const r = review
  return (
    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${r.correct ? 'bg-green-600' : 'bg-red-500'}`}>
          {r.correct ? '✓' : '✗'}
        </span>
        <span className="font-medium text-slate-900">Item {r.position + 1}</span>
        <span className="text-sm text-slate-500">
          {SECTION_LABEL[r.section]} · difficulty {r.difficulty}
        </span>
        <span className="ml-auto text-sm text-slate-400">details</span>
      </summary>
      <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 md:flex-row">
        <div className="shrink-0">
          {typeof r.item.prompt === 'string' ? (
            <p className="text-xl tabular-nums text-slate-900">{r.item.prompt}</p>
          ) : (
            <SvgItem spec={r.item.prompt} uid={`r${r.position}p`} title={`Item ${r.position + 1}`} className="w-48" />
          )}
          <div className="mt-3 flex gap-3">
            <OptionThumb review={r} index={r.item.correctIndex} label="Correct" good />
            {!r.correct && <OptionThumb review={r} index={r.chosenIndex} label="Your pick" good={false} />}
          </div>
        </div>
        <div className="min-w-0 text-sm leading-relaxed text-slate-700">
          <p className="font-semibold text-slate-900">The rule{r.ruleExplanations.length > 1 ? 's' : ''}</p>
          <ul className="mb-2 list-disc pl-5">
            {r.ruleExplanations.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
          <p><span className="font-semibold text-slate-900">Why {letter(r.item.correctIndex)} is right: </span>{r.answerExplanation}</p>
          <p className="mt-1"><span className="font-semibold text-slate-900">{r.correct ? 'The closest trap' : 'Why your pick fails'}: </span>{r.distractorExplanation}</p>
        </div>
      </div>
    </details>
  )
}

export default function Results({
  seed, choices, elapsedMs, onRestart,
}: {
  seed: number
  choices: number[]
  elapsedMs: number
  onRestart: () => void
}) {
  const { reviews, report } = useMemo(() => replayTest(seed, choices), [seed, choices])
  const correct = reviews.filter(r => r.correct).length

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Headline + disclaimer stay above the fold on mobile. */}
      <h1 className="text-2xl font-bold text-slate-900">Your results</h1>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-4xl font-bold text-blue-700">{report.band}</span>
        <span className="text-lg text-slate-700">IQ-equivalent ≈ {report.iqRange[0]}–{report.iqRange[1]}</span>
      </div>
      <p className="mb-3 mt-1 text-sm text-slate-600">
        {correct} of {reviews.length} correct · raw score {report.raw} (difficulty-weighted) ·{' '}
        {fmtTime(elapsedMs)} · {report.comparative} — percentile and IQ range are computed from an{' '}
        <strong>assumed</strong> normal distribution, not from norming data.
      </p>
      <Disclaimer />

      <section className="mt-6" aria-label="Score by section">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">By section</h2>
        <div className="flex flex-col gap-3">
          {report.sections.map(s => {
            const pct = s.attemptedRaw > 0 ? Math.round((s.raw / s.attemptedRaw) * 100) : 0
            return (
              <div key={s.section}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-slate-800">{SECTION_LABEL[s.section]}</span>
                  <span className="text-slate-600">
                    {s.correct}/{s.total} correct · {s.raw} of {s.attemptedRaw} difficulty points
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200" role="img"
                  aria-label={`${SECTION_LABEL[s.section]}: ${pct}% of attempted difficulty points`}>
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-8" aria-label="Every item explained">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Every item, explained</h2>
        <p className="mb-3 text-sm text-slate-600">
          Open any item to see the rule, why the right answer is right, and why the tempting
          wrong option is wrong.
        </p>
        <div className="flex flex-col gap-2">
          {reviews.map(r => <ReviewCard key={r.position} review={r} />)}
        </div>
      </section>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
        >
          Take a fresh test
        </button>
      </div>
    </main>
  )
}
