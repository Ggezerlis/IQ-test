// Shared plumbing for the e2e suite: browser launch (local sandbox or CI)
// and a vite preview server managed for the duration of the run.
import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'

export async function launchBrowser() {
  // Local/sandbox runs use the preinstalled Chromium; CI installs a matching
  // browser via `playwright install`, which playwright-core then resolves.
  const preinstalled = '/opt/pw-browsers/chromium'
  const executablePath =
    process.env.CHROMIUM_PATH ?? (existsSync(preinstalled) ? preinstalled : undefined)
  return chromium.launch({ executablePath, args: ['--no-sandbox'] })
}

export async function startPreview(port) {
  const child = spawn(
    'npx',
    ['vite', 'preview', '--config', 'vite.config.e2e.ts', '--port', String(port), '--strictPort'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const url = `http://localhost:${port}/`
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return { url, stop: () => child.kill() }
    } catch {
      // not up yet
    }
    await new Promise(r => setTimeout(r, 500))
  }
  child.kill()
  throw new Error('vite preview did not come up')
}

export function assert(cond, message) {
  if (!cond) throw new Error(message)
}
