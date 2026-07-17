import { useMemo, useState } from 'react'
import { difficultyLadder } from './engine/adaptive'
import { SECTION_LABEL, TEST_PLAN, TOTAL_ITEMS, itemAt } from './engine/testPlan'
import type { Difficulty, ItemType } from './lib/types'
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
        onStart={() =>
          setPhase({
            name: 'test',
            seed: phase.challengeSeed ?? Math.floor(Math.random() * 0xffffffff),
            startedAt: Date.now(),
            answers: [],
          })
        }
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
        // Make the address bar shareable/bookmarkable right away.
        window.history.replaceState(null, '', encodeShare({ seed: phase.seed, choices }))
        setPhase({
          name: 'finished',
          seed: phase.seed,
          choices,
          elapsedMs: Date.now() - phase.startedAt,
        })
      } else setPhase({ ...phase, answers })
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
