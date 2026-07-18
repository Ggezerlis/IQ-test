// Orchestrator: builds if needed, serves dist on a dedicated port, runs
// every *.test.mjs in this directory against it. Exits non-zero on the
// first failure. Usage: npm run e2e
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { launchBrowser, startPreview } from './helpers.mjs'

const PORT = 4174

if (!existsSync('dist/index.html')) {
  console.log('dist missing — building first')
  execSync('npm run build', { stdio: 'inherit' })
}

const preview = await startPreview(PORT)
const browser = await launchBrowser()
let failed = false

try {
  const files = (await readdir('e2e')).filter(f => f.endsWith('.test.mjs')).sort()
  for (const file of files) {
    const { default: test } = await import(`./${file}`)
    const started = Date.now()
    try {
      const summary = await test(browser, preview.url)
      console.log(`✓ ${file} (${((Date.now() - started) / 1000).toFixed(1)}s) — ${summary}`)
    } catch (err) {
      failed = true
      console.error(`✗ ${file}: ${err.message}`)
      break
    }
  }
} finally {
  await browser.close()
  preview.stop()
}

process.exit(failed ? 1 : 0)
