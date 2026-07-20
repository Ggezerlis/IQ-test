// Practice round, pause, score history, and dark mode.
import { answerAll } from './flow.test.mjs'
import { assert } from './helpers.mjs'

export default async function featuresTest(browser, baseUrl) {
  // --- Practice: 5 fixed questions with feedback, never scored.
  const p = await browser.newPage({ viewport: { width: 1100, height: 950 } })
  await p.goto(baseUrl)
  await p.getByRole('button', { name: 'Practice first — 5 quick questions' }).click()
  for (let q = 1; q <= 5; q++) {
    await p.waitForSelector(`text=Practice · question ${q} of 5`)
    await p.locator('[role=radio]').nth(0).click()
    await p.getByRole('button', { name: 'Check answer' }).click()
    // Feedback reveals the correct option and the rule.
    assert((await p.locator('text=✓ correct').count()) === 1, `q${q}: no correct-option marker`)
    assert(await p.locator('text=The rule').first().isVisible().catch(() => false) ||
      (await p.locator('li').count()) > 0, `q${q}: no rule explanation`)
    await p.getByRole('button', { name: q === 5 ? 'Start the real test' : 'Next question' }).click()
  }
  // Finishing practice lands on the real test's first section intro.
  await p.waitForSelector('text=Section 1 of 4')
  await p.close()

  // --- Pause: clock stops, item hidden, resume returns to the same item.
  const context = await browser.newContext({ viewport: { width: 1100, height: 950 } })
  const t = await context.newPage()
  await t.goto(baseUrl)
  await t.getByRole('button', { name: 'Start the test' }).first().click()
  await t.getByRole('button', { name: 'Begin' }).click()
  await t.waitForSelector('text=Item 1 of 30')
  await t.getByRole('button', { name: 'Pause' }).click()
  await t.waitForSelector('text=Paused')
  assert((await t.locator('[role=radio]').count()) === 0, 'item not hidden while paused')
  await t.getByRole('button', { name: 'Resume' }).click()
  await t.waitForSelector('text=Item 1 of 30')

  // --- History: finish the test, return home, entry is listed and opens.
  for (let i = 0; i < 30; i++) {
    if ([12, 18, 24].includes(i)) await t.getByRole('button', { name: 'Begin' }).click()
    await t.waitForSelector(`text=Item ${i + 1} of 30`)
    await t.locator('[role=radio]').nth(0).click()
    await t.getByRole('button', { name: 'Confirm' }).click()
  }
  await t.waitForSelector('text=Your results')

  // --- Result card: the PNG download really happens, drawn client-side.
  const downloadPromise = t.waitForEvent('download')
  await t.getByRole('button', { name: 'Save result card' }).click()
  const download = await downloadPromise
  assert(download.suggestedFilename() === 'freeiq-result.png',
    `unexpected card filename: ${download.suggestedFilename()}`)

  await t.getByRole('button', { name: 'Take a fresh test' }).click()
  await t.waitForSelector('text=Your previous runs')
  const entries = t.locator('section[aria-label="Previous runs"] ul > li')
  assert((await entries.count()) === 1, `expected 1 history entry, got ${await entries.count()}`)
  await entries.first().locator('button').click()
  await t.waitForSelector('text=Your results')
  // Own history keeps timings.
  assert((await t.locator('text=longest').count()) === 1, 'history results missing timings')
  await t.getByRole('button', { name: 'Take a fresh test' }).click()
  await t.getByRole('button', { name: 'Clear history' }).click()
  assert((await t.locator('text=Your previous runs').count()) === 0, 'clear history failed')
  await context.close()

  // --- Animations + scroll reset: entry animation on every screen, and a
  // confirm from a scrolled position starts the next item at the top.
  const small = await browser.newContext({ viewport: { width: 480, height: 460 } })
  const s = await small.newPage()
  await s.goto(baseUrl)
  const animOf = el => getComputedStyle(el).animationName
  assert(await s.locator('.screen-enter').first().evaluate(animOf) === 'screen-in', 'home screen not animated')
  await s.getByRole('button', { name: 'Start the test' }).first().click()
  await s.waitForSelector('text=Section 1 of 4')
  assert(await s.locator('main').evaluate(animOf) === 'screen-in', 'section intro not animated')
  await s.getByRole('button', { name: 'Begin' }).click()
  await s.waitForSelector('text=Item 1 of 30')
  assert(await s.locator('main').evaluate(animOf) === 'screen-in', 'question screen not animated')
  assert(await s.locator('[role=radio]').first().evaluate(animOf) === 'rise-in', 'options not animated')
  // Scroll deep into the item, answer, and the next one must start at the top.
  await s.mouse.wheel(0, 600)
  await s.waitForTimeout(150)
  assert(await s.evaluate(() => window.scrollY) > 100, 'test setup: page did not scroll')
  await s.locator('[role=radio]').nth(0).click()
  await s.getByRole('button', { name: 'Confirm' }).click()
  await s.waitForSelector('text=Item 2 of 30')
  await s.waitForTimeout(100)
  assert((await s.evaluate(() => window.scrollY)) === 0, 'next question did not start at the top')
  await small.close()

  // --- Dark mode follows the system setting.
  const darkCtx = await browser.newContext({ colorScheme: 'dark', viewport: { width: 800, height: 700 } })
  const d = await darkCtx.newPage()
  await d.goto(baseUrl)
  const bg = await d.evaluate(() => getComputedStyle(document.body).backgroundColor)
  assert(bg !== 'rgb(255, 255, 255)', `dark scheme still renders white body: ${bg}`)
  const lightCtx = await browser.newContext({ colorScheme: 'light', viewport: { width: 800, height: 700 } })
  const l = await lightCtx.newPage()
  await l.goto(baseUrl)
  const lightBg = await l.evaluate(() => getComputedStyle(document.body).backgroundColor)
  assert(lightBg === 'rgb(255, 255, 255)', `light scheme body should be white: ${lightBg}`)
  await darkCtx.close()
  await lightCtx.close()

  return 'features: practice feedback, pause/resume, history, animations + scroll reset, dark mode'
}
