import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * og:image and og:url need ABSOLUTE URLs to work in link previews, so the
 * deploy workflow passes VITE_SITE_URL (trailing slash). Locally it's empty
 * and the tags degrade to root-relative paths, which is harmless.
 */
export function siteUrlPlugin(): Plugin {
  const siteUrl = process.env.VITE_SITE_URL ?? '/'
  return {
    name: 'site-url',
    transformIndexHtml: html => html.replaceAll('__SITE_URL__', siteUrl),
  }
}

// base is '/' for local dev; the GitHub Pages workflow (step 6) sets
// VITE_BASE_PATH to '/<repo>/' at build time.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), siteUrlPlugin()],
})
