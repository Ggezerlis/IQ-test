import { useEffect } from 'react'
import { useScrollTop } from '../lib/useScrollTop'
import { SECTION_LABEL, TEST_PLAN, type Section } from '../engine/testPlan'

const INTRO: Record<Section, { what: string; tip: string }> = {
  abstract: {
    what: 'Each puzzle is a 3×3 grid that follows one or more rules across its rows and columns. Work out what belongs in the empty bottom-right cell.',
    tip: 'Compare the rows first: what changes from cell to cell, and what stays the same?',
  },
  numerical: {
    what: 'You\'ll see a number sequence with the last term missing. Work out the rule and pick the next number.',
    tip: 'Check the differences between terms first; if those aren\'t constant, look at ratios, growing gaps, or an alternating pattern.',
  },
  spatial: {
    what: 'One option shows the exact same figure as the target, only rotated. The others are mirror images or have a square moved.',
    tip: 'Rotate the target in your head — a mirror image can never be produced by turning alone.',
  },
  logical: {
    what: 'The example scales at the top balance. Use them to deduce which set of shapes must balance the bottom scale.',
    tip: 'Treat each scale as an equation and substitute one shape for another.',
  },
}

export default function SectionIntro({
  section, position, onBegin,
}: {
  section: Section
  position: number
  onBegin: () => void
}) {
  const count = TEST_PLAN.filter(s => s.section === section).length
  const sectionNumber = [...new Set(TEST_PLAN.map(s => s.section))].indexOf(section) + 1

  useScrollTop()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onBegin()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBegin])

  return (
    <main className="screen-enter mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-5 px-4 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-blue-700 dark:text-blue-400">
        Section {sectionNumber} of 4 · items {position + 1}–{position + count} of 30
      </p>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{SECTION_LABEL[section]}</h1>
      <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">{INTRO[section].what}</p>
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <strong className="text-slate-800 dark:text-slate-200">Tip:</strong> {INTRO[section].tip}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        The clock keeps running softly — take a breath, then dive in.
      </p>
      <button
        type="button"
        onClick={onBegin}
        className="btn-press w-full rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Begin
      </button>
    </main>
  )
}
