// THE COLD LOAD, ACROSS THE SCREENS IT IS COMPOSED FOR — the plate must be the first thing painted, it must
// cover the viewport, and its rows must begin under the strip at the strip's own height.
// node bootresp.cjs <port> [webkit|chrome]
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, engine = 'webkit'] = process.argv.slice(2)
const VIEWS = [[1512, 982], [1920, 1080]]
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }

;(async () => {
  const b = engine === 'chrome' ? await pw.chromium.launch({ channel: 'chrome' }) : await pw.webkit.launch()
  for (const [w, h] of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } })
    const p = await ctx.newPage()
    await p.addInitScript(() => {
      window.__first = null
      window.__shellEver = false
      const tick = () => {
        const plate = document.getElementById('c2-plate')
        const c2 = document.documentElement.dataset.c2 === 'on'
        const plateUp = !!plate && getComputedStyle(plate).display !== 'none'
        const shellUp = !!document.getElementById('__nuxt') && !c2 && !plateUp
        if (shellUp) window.__shellEver = true
        if (!window.__first && (plateUp || c2 || shellUp)) window.__first = plateUp ? 'plate' : c2 ? 'c2' : 'shell'
        if (performance.now() < 6000) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'commit', timeout: 60000 })
    await sleep(700)
    const m = await p.evaluate(() => {
      const plate = document.getElementById('c2-plate')
      const rows = plate?.querySelector('.rows')
      const r = plate?.getBoundingClientRect()
      const rr = rows?.getBoundingClientRect()
      return {
        first: window.__first,
        shellEverOwned: window.__shellEver,
        covers: !!r && r.top <= 0 && r.left <= 0 && r.right >= innerWidth - 1 && r.bottom >= innerHeight - 1,
        rowsTop: rr ? `${Math.round(rr.top)}px` : 'none',
        overflowX: document.documentElement.scrollWidth > innerWidth + 1,
      }
    })
    ok(m.first === 'plate' && !m.shellEverOwned && m.covers && !m.overflowX,
      `${w}x${h}`,
      `first=${m.first} shellEverOwned=${m.shellEverOwned} covers=${m.covers} rowsTop=${m.rowsTop} overflowX=${m.overflowX}`)
    await ctx.close()
  }
  await b.close()
  console.log(`BOOT RESPONSIVE (${engine}): ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
