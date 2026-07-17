import Disclaimer from '../components/Disclaimer'
import { APP_NAME } from '../lib/config'

const SECTIONS = [
  { name: 'Abstract patterns', detail: '12 items — complete the 3×3 matrix' },
  { name: 'Number series', detail: '6 items — find the next number' },
  { name: 'Spatial rotation', detail: '6 items — spot the rotated figure' },
  { name: 'Figure weights', detail: '6 items — balance the scales' },
]

export default function Home({ onStart, challenge = false }: { onStart: () => void; challenge?: boolean }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-6 px-4 py-10">
      {challenge && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
          <strong>Challenge accepted?</strong> This link carries a seed — you'll get the exact
          same 30 puzzles as the person who sent it.
        </div>
      )}
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">{APP_NAME}</h1>
        <p className="mt-2 text-lg text-slate-600">
          A free pattern-reasoning test. 30 items, about 20 minutes. Your score is shown
          immediately — no email, no account, no payment, ever.
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {SECTIONS.map(s => (
          <li key={s.name} className="rounded-lg border border-slate-200 bg-white p-3">
            <span className="block font-medium text-slate-900">{s.name}</span>
            <span className="text-sm text-slate-600">{s.detail}</span>
          </li>
        ))}
      </ul>

      <div className="text-sm text-slate-600">
        <p>
          Every puzzle is generated on the spot — no two tests are identical, and difficulty
          adapts to how you're doing. The 20-minute cap is soft: going over just gets noted,
          nothing locks.
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Start the test
      </button>

      <Disclaimer />
    </main>
  )
}
