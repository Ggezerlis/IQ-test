import { donateUrl } from '../lib/monetization'
import { track } from '../lib/analytics'

/** Renders nothing unless VITE_DONATE_URL is configured — see monetization.ts. */
export default function DonateButton({ className }: { className?: string }) {
  const url = donateUrl()
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('donate_click')}
      className={
        className ??
        'inline-flex w-fit items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900'
      }
    >
      ☕ Buy me a coffee
    </a>
  )
}
