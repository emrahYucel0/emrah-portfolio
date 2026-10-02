// WHAT THE CORRIDOR COSTS, at the sizes where it costs most.
//
//   node lfperf.cjs <port> [locale]
//
// HOW IT IS MEASURED, AND WHAT THE NUMBER IS NOT. requestAnimationFrame is paced by the compositor, so a frame
// interval cannot go below the refresh period however fast the drawing is — these numbers are a measure of KEEPING UP,
// not of GPU time. The baseline row is what calibrates them: the same forced redraw on a place with no corridor, at
// the same size. If the baseline sits at the refresh period and the corridor rows sit with it, the corridor is free at
// that size; where the corridor rows rise above the baseline, the difference is its cost.
//
// Three states, because they are three different amounts of work:
//
//   BASE      a place with no corridor at all (Full-Stack), redrawn every frame.
//   IDENTITY  settled at an end of the passage, so the corridor's program is bound but its map is the identity.
//   DEPTH     driven around 30-40% of the passage, where depth is 1 and every pixel runs the Newton inverse.
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, loc = 'tr'] = process.argv.slice(2)

const SIZES = [
  [768, 1024, 2, 'tablet'],
  [1440, 900, 2, 'laptop'],
  [2560, 1440, 2, 'QHD'],
  [3840, 2160, 2, '4K'],
]

const stat = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return { med: +s[Math.floor(s.length / 2)].toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), n: s.length }
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  console.log('== WHAT THE CORRIDOR COSTS   /' + loc + '   port ' + port)
  console.log('   (frame intervals in ms; rAF cannot beat the refresh period, so BASE is the calibration)')
  console.log('')
  console.log('   size          backing store      base med/p95    identity med/p95   depth med/p95')
  for (const sz of SIZES) {
    const W = sz[0]
    const H = sz[1]
    const dpr = sz[2]
    const label = sz[3]
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
    const p = await ctx.newPage()
    await p.goto('http://127.0.0.1:' + port + '/' + loc, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 }).catch(() => {})
    await sleep(2800)
    const STOP = await stopsOf(p)
    const buf = await p.evaluate(() => {
      const c = document.querySelector('canvas#surface') || document.querySelector('canvas')
      return c ? [c.width, c.height] : null
    })

    // 180 frames, the first 30 dropped so the first compile and upload are not counted as steady state
    const run = (kind) => p.evaluate((k) => new Promise((res) => {
      const out = []
      let last = performance.now()
      let n = 0
      const tick = (t) => {
        out.push(t - last)
        last = t
        n++
        if (k === 'depth') window.__lab.lfSet(0.3 + 0.06 * Math.sin(n * 0.21))
        else window.__lab.redraw()
        if (n < 180) requestAnimationFrame(tick)
        else res(out.slice(30))
      }
      requestAnimationFrame(tick)
    }), kind)

    await p.evaluate((i) => window.__lab.go(i), STOP.system)
    await sleep(2200)
    const base = stat(await run('base'))

    await p.evaluate((i) => window.__lab.go(i), STOP.linefield)
    await sleep(2600)
    await p.evaluate(() => window.__lab.lfSet(0))
    await sleep(400)
    const ident = stat(await run('base'))
    const depth = stat(await run('depth'))

    const mp = buf ? (buf[0] * buf[1] / 1e6).toFixed(1) + 'Mpx' : '-'
    console.log('   ' + (W + 'x' + H + '@' + dpr).padEnd(14) + (buf ? buf.join('x') : '-').padEnd(12) + mp.padEnd(8)
      + (base.med + ' / ' + base.p95).padEnd(16)
      + (ident.med + ' / ' + ident.p95).padEnd(19)
      + (depth.med + ' / ' + depth.p95)
      + '   ' + label)
    await ctx.close()
  }
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
