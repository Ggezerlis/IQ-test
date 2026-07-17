/**
 * Dev-only preview: renders sample matrix items to a standalone HTML file for
 * eyeballing generator output. Usage: npm run gallery [-- <outfile>]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { generateMatrixItem } from '../src/generators/matrix'
import type { Difficulty } from '../src/lib/types'
import { figureToSvg, matrixToSvg } from '../src/render/shapes'

const SAMPLES: [Difficulty, number][] = [
  [1, 11], [1, 23], [2, 7], [2, 31], [3, 4], [3, 19], [4, 2], [4, 27], [5, 8], [5, 42],
]

const blocks = SAMPLES.map(([difficulty, seed], n) => {
  const { item } = generateMatrixItem(difficulty, seed)
  const uid = `g${n}`
  const prompt = item.prompt
  if (typeof prompt === 'string' || prompt.kind !== 'matrix') throw new Error('bad prompt')
  const matrix = matrixToSvg(prompt.cells, `${uid}p`, `Sample ${n + 1}`)
  const options = item.options
    .map((o, i) => {
      if (typeof o === 'string' || o.kind !== 'figure') throw new Error('bad option')
      const correct = i === item.correctIndex
      return `<div class="opt${correct ? ' correct' : ''}">
        <div class="optlabel">${String.fromCharCode(65 + i)}${correct ? ' ✓' : ''}</div>
        ${figureToSvg(o.figure, `${uid}o${i}`, `Option ${String.fromCharCode(65 + i)}`)}
      </div>`
    })
    .join('')
  return `<section>
    <h2>Sample ${n + 1} — difficulty ${difficulty}, seed ${seed}</h2>
    <p class="rules">rules: ${item.rulesUsed.join(' · ')}</p>
    <div class="row">
      <div class="matrix">${matrix}</div>
      <div class="options">${options}</div>
    </div>
  </section>`
}).join('\n')

const html = `<meta charset="utf-8">
<title>FreeIQ — matrix generator samples</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 980px; padding: 0 1rem; background: #f1f5f9; color: #0f172a; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1rem; margin: 0 0 .2rem; }
  section { background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: 1.2rem; }
  .rules { margin: 0 0 .8rem; color: #475569; font-size: .85rem; }
  .row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: flex-start; }
  .matrix { flex: 0 0 320px; max-width: 100%; } .matrix svg { width: 320px; max-width: 100%; height: auto; }
  .options { flex: 1; display: grid; grid-template-columns: repeat(3, minmax(90px, 120px)); gap: .7rem; }
  .opt { position: relative; } .opt svg { width: 100%; height: auto; }
  .opt.correct svg { outline: 3px solid #16a34a; outline-offset: 2px; border-radius: 6px; }
  .optlabel { font-size: .8rem; color: #475569; margin-bottom: .15rem; }
  .opt.correct .optlabel { color: #16a34a; font-weight: 600; }
</style>
<h1>FreeIQ — 10 procedurally generated matrix samples</h1>
<p>Correct option outlined in green. Two samples per difficulty, 1 → 5.</p>
${blocks}`

const out = resolve(process.argv[2] ?? 'gallery.html')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log(`wrote ${out}`)
