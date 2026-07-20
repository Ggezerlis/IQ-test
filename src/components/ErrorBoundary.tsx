import { Component, type ReactNode } from 'react'

/**
 * Last-resort catch. For a mostly single-visit product, a white screen is a
 * permanently lost user — any uncaught render/generation error lands here
 * with a way back instead.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Something broke</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Sorry — an unexpected error stopped the page. Nothing you did caused it, and your
          in-progress test (if any) is saved in this browser.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = window.location.pathname
          }}
          className="text-sm text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
        >
          Start over from the home page
        </button>
      </main>
    )
  }
}
