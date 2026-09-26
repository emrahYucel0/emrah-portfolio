// THE NON-LAB SITE, BEFORE AND AFTER — the same journey on two builds, compared stop by stop.
// A pixel delta is reported but never asserted: the ambient wave means two runs of the SAME build differ by a
// few tenths of a percent. What is asserted is the STATE: mode, stop, position, which layers are up, which
// destinations exist. A state difference is a real change; a pixel delta is weather.
// node nonlabred.cjs <baselinePort> <currentPort>   — the same comparison, with reduced motion
const pw = require('playwright')
const sharp = require('sharp')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [basePort, curPort] = process.argv.slice(2)
const motion = 'reduced'
const reduced = motion === 'reduced'
let diffs = 0, worst = 0

const STOPS = [
  ['hero', null],
  ['creative', '#ui [data-go="creative"]'],
  ['full-stack', '#ui [data-go="system"]'],
  ['work', '#ui [data-go="work"]'],
  ['contact', '#ui [data-go="rest"]'],
  ['about', '#ui [data-go="about"]'],
  ['hero-again', '#ui [data-go="name"]'],
]

async function walk(browser, port) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3200)
  const out = []
  const snap = async (name) => {
    const st = await p.evaluate(() => ({
      mode: window.__lab.A.mode,
      base: window.__lab.A.base,
      p: Math.round(window.__lab.A.p),
      open: window.__lab.A.aboutOpen,
      busy: window.__lab.A.busy,
      route: location.pathname,
      layers: [...document.querySelectorAll('#ui .layer.on')].map((e) => [...e.classList].filter((c) => c !== 'layer' && c !== 'on').join('.')).sort(),
      c2: document.documentElement.dataset.c2 ?? 'off',
      stops: window.__lab.IDX().map((s) => s.id),
    }))
    out.push({ name, st, png: await p.screenshot() })
  }
  for (const [name, sel] of STOPS) {
    if (sel) { await p.evaluate((s) => document.querySelector(s)?.click(), sel); await sleep(reduced ? 2800 : 4400) }
    await snap(name)
  }
  // and one gesture, to be sure the material still answers the same way
  await p.mouse.move(500, 400); await p.mouse.down(); await p.mouse.move(520, 430, { steps: 8 }); await p.mouse.up()
  await sleep(2200)
  await snap('after-drag')
  await ctx.close()
  return { out, errs }
}

;(async () => {
  const b = await pw.webkit.launch()
  console.log(`the real old site, before and after${reduced ? ' (reduced motion)' : ''}`)
  const A = await walk(b, basePort)
  const B = await walk(b, curPort)
  for (let i = 0; i < A.out.length; i++) {
    const a = A.out[i], c = B.out[i]
    const [ia, ic] = await Promise.all([
      sharp(a.png).greyscale().raw().toBuffer({ resolveWithObject: true }),
      sharp(c.png).greyscale().raw().toBuffer({ resolveWithObject: true }),
    ])
    let n = 0
    const len = Math.min(ia.data.length, ic.data.length)
    for (let j = 0; j < len; j++) if (Math.abs(ia.data[j] - ic.data[j]) > 12) n++
    const pct = +((n / len) * 100).toFixed(2)
    worst = Math.max(worst, pct)
    const same = JSON.stringify(a.st) === JSON.stringify(c.st)
    if (!same) diffs++
    console.log(`  ${a.name.padEnd(14)} pixΔ ${String(pct).padStart(6)} | state ${same ? 'same' : 'DIFF'}`)
    if (!same) {
      console.log(`      before ${JSON.stringify(a.st)}`)
      console.log(`      after  ${JSON.stringify(c.st)}`)
    }
  }
  console.log(`  worst pixΔ ${worst} | state differences ${diffs} | errors before ${A.errs.length} after ${B.errs.length}`)
  await b.close()
  console.log(`NON-LAB: ${diffs === 0 && A.errs.length === 0 && B.errs.length === 0 ? 'UNCHANGED' : 'REVIEW'}`)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
