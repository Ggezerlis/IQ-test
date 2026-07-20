import { useEffect, useState } from 'react'

const KEY = 'freeiq-ad-consent'

export type Consent = 'accepted' | 'declined' | null

function readConsent(): Consent {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'accepted' || v === 'declined' ? v : null
  } catch {
    return null
  }
}

function writeConsent(v: 'accepted' | 'declined') {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    // ignore — worst case the banner reappears next visit
  }
}

/** Consent state for ad personalization cookies; only relevant when ads are configured. */
export function useAdConsent(): [Consent, (v: 'accepted' | 'declined') => void] {
  const [consent, setConsentState] = useState<Consent>(() => readConsent())
  const setConsent = (v: 'accepted' | 'declined') => {
    writeConsent(v)
    setConsentState(v)
  }
  return [consent, setConsent]
}

/**
 * Bottom banner asking permission before any ad script (and its cookies)
 * loads. Only rendered when ads are actually configured — see AdSlot.
 */
export default function AdConsent({ onDecide }: { onDecide: (v: 'accepted' | 'declined') => void }) {
  useEffect(() => {
    // Keyboard users can dismiss with Escape → decline, the safer default.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDecide('declined')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDecide])

  return (
    <div
      role="dialog"
      aria-label="Ad consent"
      className="footer-enter fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-slate-700 dark:text-slate-300">
          This page can show ads to help cover hosting costs — never during the test, never
          blocking your score. Allowing them lets your browser load ad scripts, which set cookies.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onDecide('declined')}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={() => onDecide('accepted')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Allow ads
          </button>
        </div>
      </div>
    </div>
  )
}
