import { APP_NAME } from './lib/config'

// Placeholder shell; the test flow UI lands in step 3.
export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold">{APP_NAME}</h1>
        <p className="mt-2 text-slate-600">Under construction — generators first.</p>
      </div>
    </main>
  )
}
