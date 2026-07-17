/**
 * Dev-only preview: renders sample items of every type to a standalone HTML
 * file for eyeballing generator output. Usage: npm run gallery [-- <outfile>]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { generateMatrixItem } from '../src/generators/matrix'
import { generateSeriesItem } from '../src/generators/series'
import { generateSpatialItem } from '../src/generators/spatial'
import { generateWeightsItem } from '../src/generators/weights'
import type { Difficulty, Item } from '../src/lib/types'
import { specToSvg } from '../src/render/composites'

let uidCounter = 0

function itemBlock(item: Item, heading: string, note: string): string {
  const uid = `g${uidCounter++}`
  const prompt = typeof item.prompt === 'string'
    ? `<p class="seriesprompt">${item.prompt}</p>`
    : `<div class="matrix">${specToSvg(item.prompt, `${uid}p`, heading)}</div>`
  const options = item.options
    .map((o, i) => {
      const correct = i === item.correctIndex
      const label = `<div class="optlabel">${String.fromCharCode(65 + i)}${correct ? ' ✓' : ''}</div>`
      const body = typeof o === 'string'
        ? `<div class="optnum">${o}</div>`
        : specToSvg(o, `${uid}o${i}`, `Option ${String.fromCharCode(65 + i)}`)
      return `<div class="opt${correct ? ' correct' : ''}">${label}${body}</div>`
    })
    .join('')
  return `<section>
    <h2>${heading}</h2>
    <p class="rules">${note} · rules: ${item.rulesUsed.join(' · ')}</p>
    <div class="row">
      ${prompt}
      <div class="options${typeof item.options[0] === 'string' ? ' textopts' : ''}">${options}</div>
    </div>
  </section>`
}

const blocks: string[] = []

blocks.push('<h1>FreeIQ — generator samples, all four item types</h1><p>Correct option marked with ✓ and outlined in green.</p>')

blocks.push('<h1 class="sub">Abstract — 3×3 matrices</h1>')
for (const [d, seed] of [[2, 7], [4, 27]] as [Difficulty, number][]) {
  blocks.push(itemBlock(generateMatrixItem(d, seed).item, `Matrix — difficulty ${d}, seed ${seed}`,
    'complete the 3×3 pattern'))
}

blocks.push('<h1 class="sub">Numerical — number series</h1>')
for (const [d, seed] of [[1, 3], [2, 11], [3, 5], [4, 8], [5, 13]] as [Difficulty, number][]) {
  blocks.push(itemBlock(generateSeriesItem(d, seed).item, `Series — difficulty ${d}, seed ${seed}`,
    'find the next term'))
}

blocks.push('<h1 class="sub">Spatial — rotation / odd-one-out</h1>')
for (const [d, seed] of [[1, 6], [3, 14], [5, 21]] as [Difficulty, number][]) {
  blocks.push(itemBlock(generateSpatialItem(d, seed).item, `Spatial — difficulty ${d}, seed ${seed}`,
    'exactly one option is the target figure rotated; the rest are mirrored or altered'))
}

blocks.push('<h1 class="sub">Logical — figure weights</h1>')
for (const [d, seed] of [[1, 9], [3, 17], [5, 4]] as [Difficulty, number][]) {
  blocks.push(itemBlock(generateWeightsItem(d, seed).item, `Weights — difficulty ${d}, seed ${seed}`,
    'the top scales balance; choose the right pan that must balance the bottom scale'))
}

const html = `<meta charset="utf-8">
<title>FreeIQ — generator samples</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 980px; padding: 0 1rem; background: #f1f5f9; color: #0f172a; }
  h1 { font-size: 1.4rem; } h1.sub { font-size: 1.15rem; margin-top: 2rem; } h2 { font-size: 1rem; margin: 0 0 .2rem; }
  section { background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: 1.2rem; }
  .rules { margin: 0 0 .8rem; color: #475569; font-size: .85rem; }
  .row { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: flex-start; }
  .matrix { flex: 0 0 320px; max-width: 100%; } .matrix svg { width: 320px; max-width: 100%; height: auto; }
  .seriesprompt { flex: 0 0 100%; font-size: 1.5rem; font-variant-numeric: tabular-nums; letter-spacing: .03em; margin: .2rem 0 0; }
  .options { flex: 1; display: grid; grid-template-columns: repeat(3, minmax(90px, 120px)); gap: .7rem; }
  .options.textopts { grid-template-columns: repeat(6, minmax(60px, 90px)); }
  .opt { position: relative; } .opt svg { width: 100%; height: auto; }
  .optnum { border: 1.5px solid #cbd5e1; border-radius: 8px; background: #fff; text-align: center; padding: .6rem 0; font-size: 1.1rem; font-variant-numeric: tabular-nums; }
  .opt.correct svg, .opt.correct .optnum { outline: 3px solid #16a34a; outline-offset: 2px; border-radius: 6px; }
  .optlabel { font-size: .8rem; color: #475569; margin-bottom: .15rem; }
  .opt.correct .optlabel { color: #16a34a; font-weight: 600; }
</style>
${blocks.join('\n')}`

const out = resolve(process.argv[2] ?? 'gallery.html')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log(`wrote ${out}`)
