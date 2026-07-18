/**
 * Generates public/og.png (1200×630 social preview card) by rendering a
 * composed HTML card — featuring a real generated matrix item — in headless
 * Chromium. Run `npm run og` after changing branding, then commit the PNG.
 */
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { generateMatrixItem } from '../src/generators/matrix'
import { matrixToSvg } from '../src/render/shapes'

const demo = generateMatrixItem(3, 4)
const prompt = demo.item.prompt
if (typeof prompt === 'string' || prompt.kind !== 'matrix') throw new Error('unexpected prompt')

const html = `<meta charset="utf-8">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; display: flex; align-items: center; gap: 70px;
    padding: 0 80px; font-family: system-ui, sans-serif;
    background: linear-gradient(135deg, #eff6ff 0%, #ffffff 55%); }
  .text { flex: 1; }
  h1 { font-size: 92px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a; }
  h1 span { color: #2563eb; }
  p.tag { margin-top: 18px; font-size: 34px; line-height: 1.35; color: #475569; }
  ul { margin-top: 26px; display: flex; gap: 14px; list-style: none; flex-wrap: wrap; }
  li { font-size: 24px; font-weight: 600; color: #1d4ed8; background: #dbeafe;
    border-radius: 999px; padding: 8px 20px; }
  .art { flex: 0 0 400px; }
  .art svg { width: 400px; height: 400px; filter: drop-shadow(0 18px 35px rgba(37, 99, 235, 0.18)); }
</style>
<div class="text">
  <h1>Free<span>IQ</span></h1>
  <p class="tag">30 generated puzzles · instant score · every item explained</p>
  <ul><li>No email</li><li>No payment</li><li>~20 minutes</li></ul>
</div>
<div class="art">${matrixToSvg(prompt.cells, 'og', 'Sample matrix puzzle')}</div>`

const tmp = join(tmpdir(), 'freeiq-og.html')
writeFileSync(tmp, html)

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.goto(`file://${tmp}`)
const out = resolve('public/og.png')
await page.screenshot({ path: out })
await browser.close()
console.log(`wrote ${out}`)
