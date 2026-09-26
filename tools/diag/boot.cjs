// THE COLD LOAD — what owns the screen, and when. The promise this measures is that the semantic shell in
// document flow is NEVER what a visitor sees: the first paint is the portfolio's own material (the plate), and
// the runtime continues it. Every number is milliseconds from navigation start.
// node boot.cjs <port> <webkit|chrome> <path>
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, engine = 'webkit', path = '/tr'] = process.argv.slice(2)

;(async () => {
  const b = engine === 'chrome' ? await pw.chromium.launch({ channel: 'chrome' }) : await pw.webkit.launch()
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))

  await p.addInitScript(() => {
    window.__t0 = performance.now()
    window.__marks = {}
    const mark = (k) => { if (window.__marks[k] === undefined) window.__marks[k] = Math.round(performance.now() - window.__t0) }
    window.__mark = mark
    document.addEventListener('DOMContentLoaded', () => mark('dom-content-loaded'))
    document.fonts?.ready?.then(() => mark('fonts-ready'))
    // who owns the paint, sampled every frame
    window.__own = []
    const tick = () => {
      const t = Math.round(performance.now() - window.__t0)
      const plate = document.getElementById('c2-plate')
      const surf = document.getElementById('surface')
      const c2 = document.documentElement.dataset.c2 === 'on'
      const shell = document.getElementById('__nuxt')
      const shellVisible = !!shell && !c2 && !(plate && getComputedStyle(plate).display !== 'none')
      if (plate) mark('plate-owns')
      if (surf) mark('surface-exists')
      if (window.__lab) mark('engine-live')
      if (c2) mark('c2-owns')
      if (window.__lab?.A && window.__lab.A.mode === 'index' && !window.__lab.A.busy) mark('hero-interactive')
      window.__own.push([t, shellVisible ? 'shell' : c2 ? 'c2' : plate ? 'plate' : 'none'])
      if (t < 7000) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  await p.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'commit', timeout: 60000 })
  await sleep(7200)
  const r = await p.evaluate(() => ({ marks: window.__marks, own: window.__own }))
  const order = ['plate-owns', 'dom-content-loaded', 'fonts-ready', 'surface-exists', 'engine-live', 'c2-owns', 'hero-interactive']
  for (const k of order) console.log(`   ${k.padEnd(24)} ${r.marks[k] === undefined ? '  never' : String(r.marks[k]).padStart(5) + ' ms'}`)
  const shellOwned = r.own.filter(([, who]) => who === 'shell')
  console.log(`   ${'RAW SHELL OWNED PAINT'.padEnd(24)} ${shellOwned.length ? `${shellOwned.length} frames, first at ${shellOwned[0][0]} ms` : 'never'}`)
  const none = r.own.filter(([, who]) => who === 'none')
  console.log(`   ${'NEAR-EMPTY STRETCH'.padEnd(24)} ${none.length ? `${none.length} frames  (from ${none[0][0]}ms)` : '  0 ms'}`)
  console.log(`   errors ${errs.length}${errs.length ? ' — ' + errs.slice(0, 2).join(' | ').slice(0, 160) : ''}`)
  await b.close()
  process.exit(shellOwned.length || errs.length ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
