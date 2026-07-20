import { useEffect, useRef } from 'react'
import { adConfig } from '../lib/monetization'
import AdConsent, { useAdConsent } from './AdConsent'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

let scriptLoading: Promise<void> | null = null

function loadAdsenseScript(client: string): Promise<void> {
  if (document.querySelector(`script[data-adsbygoogle="${client}"]`)) return Promise.resolve()
  if (scriptLoading) return scriptLoading
  scriptLoading = new Promise(resolve => {
    const s = document.createElement('script')
    s.async = true
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
    s.crossOrigin = 'anonymous'
    s.dataset.adsbygoogle = client
    s.onload = () => resolve()
    s.onerror = () => resolve() // a blocked/failed ad script must never break the page
    document.head.appendChild(s)
  })
  return scriptLoading
}

/**
 * One ad placement — entirely self-contained. Renders nothing, and loads
 * nothing from Google, unless ads are configured (VITE_ADSENSE_CLIENT plus
 * a slot for this position). If consent hasn't been decided yet it shows
 * the consent banner in place of the ad; the actual ad only appears after
 * "Allow ads". Declining renders nothing, permanently (until localStorage
 * is cleared).
 */
export default function AdSlot({ position }: { position: 'home' | 'results' }) {
  const [consent, setConsent] = useAdConsent()
  const ref = useRef<HTMLModElement>(null)
  const cfg = adConfig()
  const slot = cfg && (position === 'home' ? cfg.slotHome : cfg.slotResults)

  useEffect(() => {
    if (!cfg || !slot || consent !== 'accepted') return
    loadAdsenseScript(cfg.client).then(() => {
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch {
        // AdSense not ready / blocked — leave the reserved space empty.
      }
    })
  }, [cfg, slot, consent])

  if (!cfg || !slot) return null
  if (consent === null) return <AdConsent onDecide={setConsent} />
  if (consent === 'declined') return null

  return (
    <div className="rise-in flex flex-col items-center gap-1">
      <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Advertisement</span>
      <ins
        ref={ref}
        className="adsbygoogle block w-full"
        style={{ display: 'block', minHeight: 90 }}
        data-ad-client={cfg.client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
