/**
 * Ads and the optional tip button — both OFF by default. Neither ever
 * appears during the test itself (only on Home and after the score is
 * already shown on Results), and neither is required to see your score.
 *
 * Configure at build time:
 *   VITE_ADSENSE_CLIENT     e.g. "ca-pub-1234567890123456"
 *   VITE_ADSENSE_SLOT_HOME  ad unit slot ID for the home-page placement
 *   VITE_ADSENSE_SLOT_RESULTS  ad unit slot ID for the results placement
 *   VITE_DONATE_URL         a Ko-fi / Buy Me a Coffee / PayPal.me link
 * Any left unset simply doesn't render — see README.
 */

export interface AdConfig {
  client: string
  slotHome?: string
  slotResults?: string
}

export function adConfig(env: ImportMetaEnv = import.meta.env): AdConfig | null {
  const client = env.VITE_ADSENSE_CLIENT
  if (!client) return null
  return {
    client,
    slotHome: env.VITE_ADSENSE_SLOT_HOME || undefined,
    slotResults: env.VITE_ADSENSE_SLOT_RESULTS || undefined,
  }
}

export function donateUrl(env: ImportMetaEnv = import.meta.env): string | null {
  return env.VITE_DONATE_URL || null
}

/** AdSense's ads.txt line format, derived from the client ID (drops "ca-"). */
export function adsTxtEntry(client: string): string {
  const pub = client.replace(/^ca-/, '')
  return `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
}
