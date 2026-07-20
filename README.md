# FreeIQ

A free, client-side pattern-reasoning test. 30 procedurally generated items across four
sections (3×3 matrices, number series, spatial rotation, figure weights), adaptive
difficulty, instant results with every item explained — no backend, no accounts, no
email gate, no payments.

**This is entertainment, not psychometrics.** Every item is generated at runtime from
published relation rules (Matzen et al. 2010; Wang & Su, IJCAI 2015) — nothing is copied
from any published test. Scores are mapped through an explicitly *assumed* distribution,
never presented as clinical measurement, and the IQ-equivalent is always a range.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # vitest suites for generators, engine, share codec
npm run gallery    # render sample items of every type to gallery.html
npm run build      # typecheck + production build
```

## Architecture notes

- `src/generators/` — one seeded generator per item type. Distractors are principled:
  each wrong option breaks exactly one rule, enforced by shared machinery in
  `distractors.ts` and asserted by the test suites.
- `src/engine/` — 30-item plan, adaptive ladder (start 2, ±1, clamp 1–5), scoring with
  the assumption clearly labeled, and an explanation engine that replays an entire test
  from `(seed, choices)` alone.
- `src/render/` — string-based SVG rendering shared by the app, tests, and gallery.
  Colors are Okabe–Ito and always paired with a fill pattern (colorblind-safe).
- Share links encode seed + answers in URL params (`?s=…&a=…`); no data leaves the browser.

## Analytics (off by default)

There is no tracking in default builds: no network call is ever made. To get
anonymous funnel visibility (test started / section reached / completed /
share used — no IDs, no cookies, no answers), set `VITE_ANALYTICS_URL` at
build time to a collection endpoint you control (a Cloudflare Worker,
GoatCounter, Plausible's events API, …). See `src/lib/analytics.ts`.

## Monetization (off by default)

Neither ads nor the tip button appear in a default build, and the free,
immediate, ungated score never changes regardless. Both live only on the
home screen and *after* the results are already shown — never on a
Question, Practice, or SectionIntro screen.

**Ads** (Google AdSense). Set at build time:

- `VITE_ADSENSE_CLIENT` — your publisher ID, e.g. `ca-pub-1234567890123456`
- `VITE_ADSENSE_SLOT_HOME` / `VITE_ADSENSE_SLOT_RESULTS` — ad unit slot IDs
  you create in the AdSense dashboard, one per placement

When `VITE_ADSENSE_CLIENT` is set, the build also emits `ads.txt`. The first
visit to a page with an ad slot shows a consent banner ("Allow ads" / "No
thanks") before any script or cookie loads; the choice is remembered in
localStorage. Declining renders nothing — no reserved blank space, no retry
nagging.

**Tip button.** Set `VITE_DONATE_URL` to a Ko-fi / Buy Me a Coffee / PayPal.me
link. It appears as a small "☕ Buy me a coffee" link on the results page and
home footer; unset, it renders nothing.

```bash
VITE_ADSENSE_CLIENT=ca-pub-... VITE_ADSENSE_SLOT_HOME=... VITE_ADSENSE_SLOT_RESULTS=... \
VITE_DONATE_URL=https://ko-fi.com/you \
npm run build
```

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml` (enable Pages → Source: GitHub Actions in repo settings).
The workflow injects the absolute site URL into OG tags, JSON-LD, robots.txt,
and sitemap.xml.
