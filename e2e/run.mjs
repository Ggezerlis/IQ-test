// Orchestrator: always builds a fresh, isolated bundle for e2e (see
// vite.config.e2e.ts — base '/', its own dist-e2e), serves it on a
// dedicated port, and runs every *.test.mjs in this directory against it.
// Exits non-zero on the first failure. Usage: npm run e2e
import { readdir } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { launchBrowser, startPreview } from './helpers.mjs'

const PORT = 4174

console.log('building for e2e (dist-e2e, base "/")')
execSync('npx tsc --noEmit && npx vite build --config vite.config.e2e.ts', { stdio: 'inherit' })

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
