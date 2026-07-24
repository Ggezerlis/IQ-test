import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/**
 * Used only by the e2e suite (npm run e2e). Always base '/', always its own
 * dist-e2e output — fully decoupled from the production build, which sets
 * VITE_BASE_PATH to GitHub Pages' /<repo>/ subpath. Without this isolation,
 * e2e could silently reuse a dist/ built with a different base: every asset
 * 404s behind a blank page, and no Playwright locator ever finds anything —
 * which is exactly what broke the first deploy (see git history).
 */
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist-e2e',
  },
})
