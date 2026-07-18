import { useMemo, useState } from 'react'
import { difficultyLadder } from './engine/adaptive'
import { replayTest } from './engine/explain'
import { SECTION_LABEL, TEST_PLAN, TOTAL_ITEMS, itemAt } from './engine/testPlan'
import type { Difficulty, ItemType } from './lib/types'
import { clearSession, loadSession, saveSession } from './lib/session'
import { encodeShare, parseShare } from './lib/share'
import Home from './screens/Home'
import Question from './screens/Question'
import Results from './screens/Results'

const SOFT_CAP_MS = 20 * 60 * 1000

export interface AnswerRecord {
  itemId: string
  optionIndex: number
  correct: boolean
  difficulty: Difficulty
}

type Phase =
  | { name: 'home'; challengeSeed?: number }
  | { name: 'test'; seed: number; startedAt: number; answers: AnswerRecord[] }
  | { name: 'finished'; seed: number; choices: number[]; elapsedMs?: number }

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

/** Dev-only component harness: /?preview=matrix|series|spatial|weights */
function previewType(): ItemType | null {
  const p = new URLSearchParams(window.location.search).get('preview')
  return p === 'matrix' || p === 'series' || p === 'spatial' || p === 'weights' ? p : null
}

export default function App() {
  const [phase, setPhase] = useState<Phase>(initialPhase)
  // Read once on mount; cleared or overwritten as the test progresses.
  const [saved, setSaved] = useState(() => loadSession())
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
                  answers: reviews.map(r => ({
                    itemId: r.item.id,
                    optionIndex: r.chosenIndex,
                    correct: r.correct,
                    difficulty: r.difficulty,
                  })),
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
        onStart={() => {
          clearSession()
          setSaved(null)
          setPhase({
            name: 'test',
            seed: phase.challengeSeed ?? Math.floor(Math.random() * 0xffffffff),
            startedAt: Date.now(),
            answers: [],
          })
        }}
      />
    )
  }

  if (phase.name === 'test' && item) {
    const onConfirm = (optionIndex: number) => {
      const answers: AnswerRecord[] = [
        ...phase.answers,
        {
          itemId: item.id,
          optionIndex,
          correct: optionIndex === item.correctIndex,
          difficulty: item.difficulty,
        },
      ]
      if (answers.length >= TOTAL_ITEMS) {
        const choices = answers.map(a => a.optionIndex)
        clearSession()
        setSaved(null)
        // Make the address bar shareable/bookmarkable right away.
        window.history.replaceState(null, '', encodeShare({ seed: phase.seed, choices }))
        setPhase({
          name: 'finished',
          seed: phase.seed,
          choices,
          elapsedMs: Date.now() - phase.startedAt,
        })
      } else {
        saveSession({
          seed: phase.seed,
          choices: answers.map(a => a.optionIndex),
          elapsedMs: Date.now() - phase.startedAt,
        })
        setPhase({ ...phase, answers })
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
      />
    )
  }

  if (phase.name === 'finished') {
    return (
      <Results
        seed={phase.seed}
        choices={phase.choices}
        elapsedMs={phase.elapsedMs}
        onRestart={() => {
          window.history.replaceState(null, '', window.location.pathname)
          setPhase({ name: 'home' })
        }}
      />
    )
  }

  return null
}
