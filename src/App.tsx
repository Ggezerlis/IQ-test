import { useMemo, useState } from 'react'
import { difficultyLadder } from './engine/adaptive'
import { replayTest } from './engine/explain'
import { scoreTest } from './engine/scoring'
import { SECTION_LABEL, TEST_PLAN, TOTAL_ITEMS, itemAt } from './engine/testPlan'
import type { Difficulty, ItemType } from './lib/types'
import { addHistoryEntry, clearHistory, loadHistory, type HistoryEntry } from './lib/history'
import { clearSession, loadSession, saveSession } from './lib/session'
import { encodeShare, parseShare } from './lib/share'
import { useScrollTop } from './lib/useScrollTop'
import Home from './screens/Home'
import Practice from './screens/Practice'
import Question from './screens/Question'
import Results from './screens/Results'
import SectionIntro from './screens/SectionIntro'

const SOFT_CAP_MS = 20 * 60 * 1000

export interface AnswerRecord {
  itemId: string
  optionIndex: number
  correct: boolean
  difficulty: Difficulty
  /** Time spent on this item (pause-adjusted). */
  ms: number
}

type Phase =
  | { name: 'home'; challengeSeed?: number }
  | { name: 'practice' }
  | {
      name: 'test'
      seed: number
      startedAt: number
      answers: AnswerRecord[]
      /** When the current item was presented; shifts with pauses. */
      itemStartedAt: number
      /** Set while paused; the item is hidden and the clock stopped. */
      pausedAt?: number
      /** Show the section interstitial before the current item. */
      intro: boolean
    }
  | { name: 'finished'; seed: number; choices: number[]; elapsedMs?: number; itemMs?: number[] }

/** Shared links land directly on the right screen. */
function initialPhase(): Phase {
  const shared = parseShare(window.location.search)
  if (shared?.choices) return { name: 'finished', seed: shared.seed, choices: shared.choices }
  if (shared) return { name: 'home', challengeSeed: shared.seed }
  return { name: 'home' }
}

/** Adaptive difficulty for the next item: items 1-3 at 2, then ±1 per answer. */
function difficultyFor(answers: AnswerRecord[]): Difficulty {
  const ladder = difficultyLadder(answers.map(a => a.correct))
  return ladder[ladder.length - 1]
}

function isSectionStart(position: number): boolean {
  return position === 0 || TEST_PLAN[position].section !== TEST_PLAN[position - 1].section
}

/** Dev-only component harness: /?preview=matrix|series|spatial|weights */
function previewType(): ItemType | null {
  const p = new URLSearchParams(window.location.search).get('preview')
  return p === 'matrix' || p === 'series' || p === 'spatial' || p === 'weights' ? p : null
}

function PausedScreen({ position, onResume }: { position: number; onResume: () => void }) {
  useScrollTop()
  return (
    <main className="screen-enter mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-5 px-4 py-10 text-center">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Paused</h1>
      <p className="text-slate-600 dark:text-slate-400">
        The clock is stopped and the current puzzle is hidden. Item {position + 1} of{' '}
        {TOTAL_ITEMS} is waiting.
      </p>
      <button
        type="button"
        onClick={onResume}
        className="btn-press w-full rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Resume
      </button>
    </main>
  )
}

export default function App() {
  const [phase, setPhase] = useState<Phase>(initialPhase)
  // Read once on mount; cleared or overwritten as the test progresses.
  const [saved, setSaved] = useState(() => loadSession())
  const [history, setHistory] = useState(() => loadHistory())
  const preview = previewType()

  const position = phase.name === 'test' ? phase.answers.length : 0
  const item = useMemo(() => {
    if (preview) {
      const pos = { matrix: 0, series: 12, spatial: 18, weights: 24 }[preview]
      return itemAt(1, pos, 3)
    }
    if (phase.name !== 'test') return null
    return itemAt(phase.seed, position, difficultyFor(phase.answers))
  }, [preview, phase, position])

  const startTest = (seed?: number) => {
    clearSession()
    setSaved(null)
    setPhase({
      name: 'test',
      seed: seed ?? Math.floor(Math.random() * 0xffffffff),
      startedAt: Date.now(),
      answers: [],
      itemStartedAt: Date.now(),
      intro: true,
    })
  }

  if (preview && item) {
    return (
      <Question
        item={item}
        position={0}
        total={TOTAL_ITEMS}
        sectionLabel={SECTION_LABEL[TEST_PLAN[{ matrix: 0, series: 12, spatial: 18, weights: 24 }[preview]].section]}
        startedAt={Date.now()}
        softCapMs={SOFT_CAP_MS}
        onConfirm={() => window.location.reload()}
      />
    )
  }

  if (phase.name === 'home') {
    return (
      <Home
        challenge={phase.challengeSeed !== undefined}
        resumeAt={saved ? saved.choices.length + 1 : undefined}
        history={history}
        onOpenHistoryEntry={(entry: HistoryEntry) =>
          setPhase({
            name: 'finished',
            seed: entry.seed,
            choices: entry.choices,
            elapsedMs: entry.elapsedMs,
            itemMs: entry.itemMs,
          })
        }
        onClearHistory={() => {
          clearHistory()
          setHistory([])
        }}
        onPractice={() => setPhase({ name: 'practice' })}
        onResume={
          saved
            ? () => {
                // Rebuild the in-progress state by replaying the saved
                // choices — same regeneration path the results page uses.
                const { reviews } = replayTest(saved.seed, saved.choices)
                setPhase({
                  name: 'test',
                  seed: saved.seed,
                  startedAt: Date.now() - saved.elapsedMs,
                  answers: reviews.map((r, i) => ({
                    itemId: r.item.id,
                    optionIndex: r.chosenIndex,
                    correct: r.correct,
                    difficulty: r.difficulty,
                    ms: saved.itemMs[i],
                  })),
                  itemStartedAt: Date.now(),
                  intro: isSectionStart(saved.choices.length),
                })
              }
            : undefined
        }
        onDiscard={
          saved
            ? () => {
                clearSession()
                setSaved(null)
              }
            : undefined
        }
        onStart={() => startTest(phase.challengeSeed)}
      />
    )
  }

  if (phase.name === 'practice') {
    return <Practice onExit={startNow => (startNow ? startTest() : setPhase({ name: 'home' }))} />
  }

  if (phase.name === 'test' && phase.pausedAt !== undefined) {
    const pausedAt = phase.pausedAt
    return (
      <PausedScreen
        position={position}
        onResume={() => {
          const pauseMs = Date.now() - pausedAt
          setPhase({
            ...phase,
            startedAt: phase.startedAt + pauseMs,
            itemStartedAt: phase.itemStartedAt + pauseMs,
            pausedAt: undefined,
          })
        }}
      />
    )
  }

  if (phase.name === 'test' && phase.intro) {
    return (
      <SectionIntro
        section={TEST_PLAN[position].section}
        position={position}
        onBegin={() => setPhase({ ...phase, intro: false, itemStartedAt: Date.now() })}
      />
    )
  }

  if (phase.name === 'test' && item) {
    const onConfirm = (optionIndex: number) => {
      const now = Date.now()
      const answers: AnswerRecord[] = [
        ...phase.answers,
        {
          itemId: item.id,
          optionIndex,
          correct: optionIndex === item.correctIndex,
          difficulty: item.difficulty,
          ms: Math.max(0, now - phase.itemStartedAt),
        },
      ]
      if (answers.length >= TOTAL_ITEMS) {
        const choices = answers.map(a => a.optionIndex)
        const itemMs = answers.map(a => a.ms)
        const elapsedMs = now - phase.startedAt
        clearSession()
        setSaved(null)
        const report = scoreTest(answers)
        setHistory(
          addHistoryEntry({
            seed: phase.seed,
            choices,
            finishedAt: now,
            elapsedMs,
            itemMs,
            summary: {
              band: report.band,
              correct: answers.filter(a => a.correct).length,
              raw: report.raw,
              iqLo: report.iqRange[0],
              iqHi: report.iqRange[1],
            },
          }),
        )
        // Make the address bar shareable/bookmarkable right away.
        window.history.replaceState(null, '', encodeShare({ seed: phase.seed, choices }))
        setPhase({ name: 'finished', seed: phase.seed, choices, elapsedMs, itemMs })
      } else {
        saveSession({
          seed: phase.seed,
          choices: answers.map(a => a.optionIndex),
          elapsedMs: now - phase.startedAt,
          itemMs: answers.map(a => a.ms),
        })
        setPhase({
          ...phase,
          answers,
          itemStartedAt: now,
          intro: isSectionStart(answers.length),
        })
      }
    }
    return (
      <Question
        key={item.id}
        item={item}
        position={position}
        total={TOTAL_ITEMS}
        sectionLabel={SECTION_LABEL[TEST_PLAN[position].section]}
        startedAt={phase.startedAt}
        softCapMs={SOFT_CAP_MS}
        onConfirm={onConfirm}
        onPause={() => {
          const now = Date.now()
          if (phase.answers.length > 0) {
            saveSession({
              seed: phase.seed,
              choices: phase.answers.map(a => a.optionIndex),
              elapsedMs: now - phase.startedAt,
              itemMs: phase.answers.map(a => a.ms),
            })
          }
          setPhase({ ...phase, pausedAt: now })
        }}
      />
    )
  }

  if (phase.name === 'finished') {
    return (
      <Results
        seed={phase.seed}
        choices={phase.choices}
        elapsedMs={phase.elapsedMs}
        timings={phase.itemMs}
        onRestart={() => {
          window.history.replaceState(null, '', window.location.pathname)
          setHistory(loadHistory())
          setPhase({ name: 'home' })
        }}
      />
    )
  }

  return null
}
