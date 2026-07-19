// Full test flow: landing page → section intros → 30 items (keyboard and
// mouse) → results page with 30 explained cards and per-item timings;
// mobile keeps the disclaimer above the fold.
import { assert } from './helpers.mjs'

const SECTION_STARTS = [0, 12, 18, 24]

export async function answerAll(page, pick) {
  for (let i = 0; i < 30; i++) {
    if (SECTION_STARTS.includes(i)) {
      await page.getByRole('button', { name: 'Begin' }).click()
    }
    await page.waitForSelector(`text=Item ${i + 1} of 30`)
    if (pick === 'mixed' && i % 2 === 0) {
      await page.keyboard.press(String((i % 6) + 1))
      await page.keyboard.press('Enter')
    } else {
      await page.locator('[role=radio]').nth(pick === 'mixed' ? i % 6 : 0).click()
      await page.getByRole('button', { name: 'Confirm' }).click()
    }
  }
}

export default async function flowTest(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 950 } })
  await page.goto(baseUrl)

  // Landing page essentials.
  for (const text of ['What you\'ll solve', 'How it\'s scored', 'for entertainment']) {
    assert(await page.locator(`text=${text}`).first().isVisible(), `landing page missing: ${text}`)
  }
  await page.getByRole('button', { name: 'Start the test' }).first().click()

  // First section intro appears, then item 1.
  await page.waitForSelector('text=Section 1 of 4')
  await page.getByRole('button', { name: 'Begin' }).click()
  await page.waitForSelector('text=Item 1 of 30')

  // Arrow-key navigation works.
  await page.keyboard.press('1')
  await page.keyboard.press('ArrowRight')
  const label = await page.locator('[role=radio][aria-checked=true]').getAttribute('aria-label')
  assert(label?.startsWith('Option B'), `arrow nav broken, selected: ${label}`)

  // Confirm bar is fixed to the viewport.
  const confirmBox = await page.getByRole('button', { name: 'Confirm' }).boundingBox()
  assert(confirmBox && confirmBox.y + confirmBox.height <= 950 + 1, 'confirm bar not within viewport')

  // Answer the rest (intro at item 1 already dismissed above).
  for (let i = 0; i < 30; i++) {
    if (i > 0 && SECTION_STARTS.includes(i)) {
      await page.waitForSelector(`text=Section ${SECTION_STARTS.indexOf(i) + 1} of 4`)
      await page.getByRole('button', { name: 'Begin' }).click()
    }
    await page.waitForSelector(`text=Item ${i + 1} of 30`)
    await page.locator('[role=radio]').nth(i % 6).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
  }

  await page.waitForSelector('text=Your results')
  for (const text of ['for entertainment', 'IQ-equivalent ≈', 'assumed', 'By section', 'Every item, explained']) {
    assert(await page.locator(`text=${text}`).first().isVisible(), `results missing: ${text}`)
  }
  assert((await page.locator('details').count()) === 30, 'expected 30 review cards')

  // Per-item timings are shown, exactly one card marked longest.
  assert((await page.locator('text=longest').count()) === 1, 'expected exactly one longest-time marker')

  const wrong = page.locator('details', { has: page.locator('text=✗') }).first()
  await wrong.click()
  for (const text of ['The rule', 'is right:', 'Why your pick fails']) {
    assert(await wrong.locator(`text=${text}`).first().isVisible(), `review card missing: ${text}`)
  }
  await page.close()

  // Mobile: disclaimer above the fold on the results page.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(baseUrl)
  await mobile.getByRole('button', { name: 'Start the test' }).first().click()
  await answerAll(mobile, 'first')
  await mobile.waitForSelector('text=Your results')
  const box = await mobile.locator('[role=note]').boundingBox()
  assert(box && box.y + 40 <= 844, `disclaimer below the fold on mobile: y=${box?.y}`)
  await mobile.close()

  return 'flow: landing, intros, 30 items, results, timings, mobile fold'
}
