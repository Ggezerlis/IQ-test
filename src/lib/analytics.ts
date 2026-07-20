/**
 * Optional, privacy-respecting funnel beacons — OFF by default.
 *
 * When VITE_ANALYTICS_URL is unset (the default, including all current
 * builds), this module does nothing and no network request is ever made:
 * the "everything stays in your browser" promise holds. To turn on funnel
 * visibility, point VITE_ANALYTICS_URL at a collection endpoint you control
 * (a Cloudflare Worker, GoatCounter, Plausible events API, …) at build
 * time.
 *
 * What is sent when enabled: a bare event name and optional step number.
 * No user IDs, no cookies, no fingerprinting, no timestamps beyond the
 * request itself, and answers/scores are never included.
 */
const ENDPOINT: string | undefined = import.meta.env?.VITE_ANALYTICS_URL

export type FunnelEvent =
  | 'test_start'
  | 'section_reached'
  | 'test_complete'
  | 'practice_start'
  | 'share_used'
  | 'donate_click'

export function track(event: FunnelEvent, step?: number): void {
  if (!ENDPOINT) return
  try {
    const payload = JSON.stringify(step === undefined ? { e: event } : { e: event, step })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }))
    } else {
      fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true }).catch(() => {})
    }
  } catch {
    // Analytics must never break the product.
  }
}
