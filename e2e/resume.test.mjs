// Resume-on-refresh: an interrupted test can be continued from the home
// screen with answers and the clock intact, or discarded.
import { assert } from './helpers.mjs'

export default async function resumeTest(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 950 } })
  const page = await context.newPage()
  await page.goto(baseUrl)
  await page.getByRole('button', { name: 'Start the test' }).first().click()
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector(`text=Item ${i + 1} of 30`)
    await page.locator('[role=radio]').nth(i).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
  }
  await page.waitForSelector('text=Item 4 of 30')

  // Refresh mid-test → resume banner names the right item.
  await page.reload()
  await page.waitForSelector('text=Test in progress')
  assert(await page.locator('text=item 4 of 30').first().isVisible(), 'resume banner missing item number')
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.waitForSelector('text=Item 4 of 30')

  // Finish one more item, refresh again, discard this time.
  await page.locator('[role=radio]').nth(0).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await page.waitForSelector('text=Item 5 of 30')
  await page.reload()
  await page.waitForSelector('text=Test in progress')
  await page.getByRole('button', { name: 'Discard' }).click()
  assert((await page.locator('text=Test in progress').count()) === 0, 'discard did not clear the banner')

  // A fresh start after discard begins at item 1.
  await page.getByRole('button', { name: 'Start the test' }).first().click()
  await page.waitForSelector('text=Item 1 of 30')

  await context.close()
  return 'resume: refresh mid-test, resume at saved item, discard'
}
