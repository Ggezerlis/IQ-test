import { generateMatrixItem } from '../generators/matrix'
import { generateSeriesItem } from '../generators/series'
import { generateSpatialItem } from '../generators/spatial'
import { generateWeightsItem } from '../generators/weights'
import { APP_NAME } from '../lib/config'
import type { Figure, SVGSpec } from '../lib/types'
import Disclaimer from '../components/Disclaimer'
import { describeFigure } from '../render/shapes'
import SvgItem from '../render/SvgItem'

function figureIcon(fig: Figure): SVGSpec {
  return { kind: 'figure', figure: fig, describe: describeFigure(fig) }
}

// Fixed seeds: real generator output picked once for a clean-looking icon —
// purely decorative, unrelated to any actual test session.
const abstractDemo = generateMatrixItem(2, 7)
const seriesDemo = generateSeriesItem(1, 3)
const spatialDemo = generateSpatialItem(1, 6)
const weightsDemo = generateWeightsItem(1, 9)

const SECTIONS: { name: string; detail: string; preview?: SVGSpec; sample?: string }[] = [
  { name: 'Abstract patterns', detail: '12 items — complete the 3×3 matrix', preview: figureIcon(abstractDemo.grid[0]) },
  { name: 'Number series', detail: '6 items — find the next number', sample: seriesDemo.item.prompt as string },
  { name: 'Spatial rotation', detail: '6 items — spot the rotated figure', preview: spatialDemo.item.prompt as SVGSpec },
  { name: 'Figure weights', detail: '6 items — balance the scales', preview: weightsDemo.item.options[0] as SVGSpec },
]

const FAQS = [
  {
    q: 'Is this a real IQ test?',
    a: "No. It's an entertainment estimate of pattern-recognition ability. A real IQ score requires a licensed psychologist administering a standardized battery in person.",
  },
  {
    q: 'Do you store my answers anywhere?',
    a: 'No account and no server. The test runs entirely in your browser — a share link just encodes your seed and answers directly in the URL.',
  },
  {
    q: 'Will I get the same puzzles if I take it again?',
    a: 'No — each run picks a fresh random seed, so you get a new set of 30 puzzles every time.',
  },
  {
    q: 'Can I send someone the exact same test I took?',
    a: 'Yes. Your results page has a "challenge a friend" link that carries your seed, so they solve the identical 30 items.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <summary className="cursor-pointer list-none font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
        {q}
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p>
    </details>
  )
}

export default function Home({
  onStart, challenge = false, resumeAt, onResume, onDiscard,
}: {
  onStart: () => void
  challenge?: boolean
  /** 1-based item number an interrupted test would continue at. */
  resumeAt?: number
  onResume?: () => void
  onDiscard?: () => void
}) {
  return (
    <div className="min-h-screen bg-white">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14">
        {challenge && (
          <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
            <strong>Challenge accepted?</strong> This link carries a seed — you'll get the exact
            same 30 puzzles as the person who sent it.
          </div>
        )}
        {resumeAt !== undefined && onResume && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
            <span className="min-w-0 flex-1">
              <strong>Test in progress.</strong> You were on item {resumeAt} of 30 — your answers
              and the clock are saved in this browser.
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={onResume}
                className="rounded-lg bg-blue-600 px-4 py-1.5 font-medium text-white hover:bg-blue-700"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={onDiscard}
                className="rounded-lg border border-blue-300 px-4 py-1.5 font-medium text-blue-800 hover:bg-blue-100"
              >
                Discard
              </button>
            </span>
          </div>
        )}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">{APP_NAME}</h1>
          <p className="mt-2 text-lg text-slate-600">
            A free pattern-reasoning test. 30 items, about 20 minutes. Your score is shown
            immediately — no email, no account, no payment, ever.
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 sm:w-fit"
        >
          Start the test
        </button>
        <Disclaimer />
      </section>

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-14">
          <h2 className="text-2xl font-bold text-slate-900">What you'll solve</h2>
          <p className="mt-2 text-slate-600">
            Four sections, each generated fresh from published relation rules — these previews
            are real generator output, not mockups.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {SECTIONS.map(s => (
              <li key={s.name} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  {s.preview && (
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                      <SvgItem spec={s.preview} uid={`home-${s.name}`} title={s.name} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="block font-medium text-slate-900">{s.name}</span>
                    <span className="text-sm text-slate-600">{s.detail}</span>
                  </div>
                </div>
                {s.sample && <p className="mt-2 text-xs tabular-nums text-slate-500">e.g. {s.sample}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-14">
          <h2 className="text-2xl font-bold text-slate-900">See a real item</h2>
          <p className="mt-2 text-slate-600">
            This is an actual generated puzzle, not a mockup — the same code that builds it built
            your test.
          </p>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
            <SvgItem
              spec={abstractDemo.item.prompt as SVGSpec}
              uid="home-demo-prompt"
              title="Sample matrix item"
              className="w-full max-w-[220px] shrink-0"
            />
            <div className="grid flex-1 grid-cols-3 gap-2">
              {abstractDemo.item.options.map((opt, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white p-1">
                  <SvgItem
                    spec={opt as SVGSpec}
                    uid={`home-demo-opt-${i}`}
                    title={`Option ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            We won't spoil the answer here — every item gets a full explanation on your results
            page.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-14">
          <h2 className="text-2xl font-bold text-slate-900">How it's scored</h2>
          <ul className="mt-4 flex flex-col gap-3 text-slate-700">
            <li>
              <strong className="text-slate-900">Adaptive difficulty.</strong> You start at a
              medium level; each correct answer raises the bar, each miss lowers it, so you're
              tested near your actual ceiling.
            </li>
            <li>
              <strong className="text-slate-900">An honestly-labeled estimate.</strong> Your raw
              score maps to a percentile through an assumed normal distribution — not a norming
              study — and the results page says so.
            </li>
            <li>
              <strong className="text-slate-900">A range, never a point.</strong> The
              IQ-equivalent is shown as a range, because a 20-minute test can't responsibly claim
              more precision than that.
            </li>
            <li>
              <strong className="text-slate-900">Every item explained.</strong> Afterward, open
              any of the 30 items to see the rule, why the right answer is right, and why your
              pick was wrong.
            </li>
          </ul>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-14">
          <h2 className="text-2xl font-bold text-slate-900">Questions</h2>
          <div className="mt-4 flex flex-col gap-2">
            {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-14 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Ready?</h2>
          <p className="mt-2 text-slate-600">
            30 items, about 20 minutes, your score the moment you finish.
          </p>
          <button
            type="button"
            onClick={onStart}
            className="mt-6 rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Start the test
          </button>
          <p className="mt-4 text-xs text-slate-500">Entertainment only — not a clinical assessment.</p>
        </div>
      </section>
    </div>
  )
}
