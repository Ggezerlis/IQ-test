import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { siteUrlPlugin } from './vite.config'

// Dev-only: bundles the whole app into one self-contained HTML file, for
// quick preview hosting (e.g. as a Claude Artifact) before a real deploy.
// Not used by the GitHub Pages workflow — see vite.config.ts for that.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile(), siteUrlPlugin()],
  build: {
    outDir: 'dist-artifact',
  },
})
