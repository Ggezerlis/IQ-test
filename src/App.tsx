import { useMemo, useState } from 'react'
import { SECTION_LABEL, TEST_PLAN, TOTAL_ITEMS, itemAt } from './engine/testPlan'
import type { Difficulty, ItemType } from './lib/types'
import Home from './screens/Home'
import Question from './screens/Question'
import Disclaimer from './components/Disclaimer'

const SOFT_CAP_MS = 20 * 60 * 1000

export interface AnswerRecord {
  itemId: string
  optionIndex: number
  correct: boolean
  difficulty: Difficulty
}

type Phase =
  | { name: 'home' }
  | { name: 'test'; seed: number; startedAt: number; answers: AnswerRecord[] }
  | { name: 'finished'; seed: number; answers: AnswerRecord[] }

/**
 * Difficulty for the next item. Placeholder: fixed at 2 until the adaptive
 * engine lands in step 4 (items 1-3 at difficulty 2, then ±1 per answer).
 */
function difficultyFor(_answers: AnswerRecord[]): Difficulty {
  return 2
}

/** Dev-only component harness: /?preview=matrix|series|spatial|weights */
function previewType(): ItemType | null {
  const p = new URLSearchParams(window.location.search).get('preview')
  return p === 'matrix' || p === 'series' || p === 'spatial' || p === 'weights' ? p : null
}

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: 'home' })
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
        onStart={() =>
          setPhase({
            name: 'test',
            seed: Math.floor(Math.random() * 0xffffffff),
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
      if (answers.length >= TOTAL_ITEMS) setPhase({ name: 'finished', seed: phase.seed, answers })
      else setPhase({ ...phase, answers })
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
    // Placeholder until the results page lands in step 5.
    const correct = phase.answers.filter(a => a.correct).length
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-5 px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Test complete</h1>
        <p className="text-slate-700">
          You answered {phase.answers.length} items ({correct} correct — provisional count;
          scoring and the full results page arrive in the next build steps).
        </p>
        <button
          type="button"
          onClick={() => setPhase({ name: 'home' })}
          className="w-fit rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
        >
          Back to start
        </button>
        <Disclaimer />
      </main>
    )
  }

  return null
}
