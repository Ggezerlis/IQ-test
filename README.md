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

## Deploy

Pushing to `main` builds and deploys to GitHub Pages via
`.github/workflows/deploy.yml` (enable Pages → Source: GitHub Actions in repo settings).
