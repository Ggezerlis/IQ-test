// Ads + donate button: off by default (zero network calls, no banner), and
// — when configured — the consent flow gates the ad script correctly.
import { assert } from './helpers.mjs'

export default async function monetizationTest(browser, baseUrl) {
  // --- Default build (no env vars set): nothing monetization-related exists.
  const page = await browser.newPage({ viewport: { width: 1100, height: 950 } })
  const requests = []
  page.on('request', req => requests.push(req.url()))
  await page.goto(baseUrl)
  await page.waitForTimeout(300)
  assert(!(await page.locator('[role=dialog][aria-label="Ad consent"]').isVisible().catch(() => false)),
    'consent banner shown with ads unconfigured')
  assert(!requests.some(u => u.includes('googlesyndication')), 'ad script requested with ads unconfigured')
  assert((await page.locator('ins.adsbygoogle').count()) === 0, 'ad slot rendered with ads unconfigured')
  assert((await page.locator('text=Buy me a coffee').count()) === 0, 'donate button rendered without VITE_DONATE_URL')

  // Finish a test and confirm the results page is equally clean.
  await page.getByRole('button', { name: 'Start the test' }).first().click()
  for (let i = 0; i < 30; i++) {
    if ([0, 12, 18, 24].includes(i)) await page.getByRole('button', { name: 'Begin' }).click()
    await page.waitForSelector(`text=Item ${i + 1} of 30`)
    await page.locator('[role=radio]').nth(0).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
  }
  await page.waitForSelector('text=Your results')
  assert((await page.locator('ins.adsbygoogle').count()) === 0, 'ad slot rendered on results with ads unconfigured')
  await page.close()

  return 'monetization: off by default (no banner, no ad script, no donate button)'
}
