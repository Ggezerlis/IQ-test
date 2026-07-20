import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * og:image, og:url, JSON-LD, and the sitemap need ABSOLUTE URLs, so the
 * deploy workflow passes VITE_SITE_URL (trailing slash). Locally it's empty
 * and everything degrades to root-relative paths, which is harmless.
 * Also emits robots.txt and sitemap.xml into the build (a single-page app
 * has exactly one canonical URL, so the sitemap is one entry).
 */
export function siteUrlPlugin(): Plugin {
  const siteUrl = process.env.VITE_SITE_URL ?? '/'
  return {
    name: 'site-url',
    transformIndexHtml: html => html.replaceAll('__SITE_URL__', siteUrl),
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n${siteUrl.startsWith('http') ? `Sitemap: ${siteUrl}sitemap.xml\n` : ''}`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}</loc><changefreq>monthly</changefreq></url>\n</urlset>\n`,
      })
    },
  }
}

// base is '/' for local dev; the GitHub Pages workflow (step 6) sets
// VITE_BASE_PATH to '/<repo>/' at build time.
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), siteUrlPlugin()],
})
