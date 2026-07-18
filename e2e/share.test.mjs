// Share links: finishing a test produces working challenge + results URLs;
// a results link reproduces the identical band, a challenge link the
// identical test.
import { assert } from './helpers.mjs'

export default async function shareTest(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 950 } })
  await page.goto(baseUrl)
  await page.getByRole('button', { name: 'Start the test' }).first().click()
  for (let i = 0; i < 30; i++) {
    await page.waitForSelector(`text=Item ${i + 1} of 30`)
    await page.locator('[role=radio]').nth((i * 3) % 6).click()
    await page.getByRole('button', { name: 'Confirm' }).click()
  }
  await page.waitForSelector('text=Your results')

  const band = await page.locator('main .text-4xl').first().textContent()
  const challengeUrl = await page.getByLabel('Challenge a friend URL').inputValue()
  const resultsUrl = await page.getByLabel('Share these results URL').inputValue()
  assert(/\?s=[0-9a-z]+$/.test(challengeUrl), `bad challenge url: ${challengeUrl}`)
  assert(/\?s=[0-9a-z]+&a=[0-5]{30}$/.test(resultsUrl), `bad results url: ${resultsUrl}`)
  assert(page.url() === resultsUrl, 'address bar did not become the results url')
  await page.close()

  const viewer = await browser.newPage({ viewport: { width: 1100, height: 950 } })
  await viewer.goto(resultsUrl)
  await viewer.waitForSelector('text=Your results')
  assert((await viewer.locator('main .text-4xl').first().textContent()) === band, 'shared results band differs')
  assert((await viewer.locator('details').count()) === 30, 'shared results missing cards')
  await viewer.close()

  const descOf = async () => {
    const friend = await browser.newPage({ viewport: { width: 1100, height: 950 } })
    await friend.goto(challengeUrl)
    await friend.waitForSelector('text=Challenge accepted?')
    await friend.getByRole('button', { name: 'Start the test' }).first().click()
    await friend.waitForSelector('text=Item 1 of 30')
    const d = await friend.locator('main svg desc').first().textContent()
    await friend.close()
    return d
  }
  assert((await descOf()) === (await descOf()), 'same challenge link produced different first items')

  return 'share: challenge + results links round-trip'
}
