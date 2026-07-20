import { useEffect } from 'react'

/**
 * Jump the viewport back to the top when a screen mounts (or `dep` changes —
 * e.g. the practice question index). Instant, not smooth: a new question
 * must START at the top, not scroll toward it.
 */
export function useScrollTop(dep?: unknown) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [dep])
}
