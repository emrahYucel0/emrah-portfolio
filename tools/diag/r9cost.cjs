// R9 / R29 — WHAT THE REDUCED-MOTION PAINT COSTS, AND WHETHER A CUT LAGS.
//
//   node r9cost.cjs <port,...> [--cfg=WxH@dpr,...]
//
// Reduced motion has no travel: a move between places is a cut, and the 2D renderer paints the new place once. Since
// R9 that paint mixes the rows in linear light over the whole canvas, so it costs more. Two numbers, per build, size
// and CPU speed (as is, and throttled 4x through CDP — Lighthouse's mobile setting, an emulation and not a phone):
//
//   paint   one surface.render() of Full-Stack and of Creative, median of seven, main thread wall time — and the
//           main thread's CPU time for the same seven (CDP Performance ThreadTime), which another busy process on
//           the machine inflates far less than wall time
//   cut     from go() to the first animation frame after the new place has been painted, median of six cuts
//           Creative <-> Full-Stack; and the longest task the browser reports while it happens
//
// A response under 100 ms reads as immediate (RAIL); that is the line the report holds the cut against.
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const ports = args[0].split(',')
const cfgArg = (args.find((a) => a.startsWith('--cfg=')) || '').slice(6)
const CONFIGS = cfgArg ? cfgArg.split(',').map((s) => { const m = /(\d+)x(\d+)@([\d.]+)/.exec(s); return [+m[1], +m[2], +m[3]] }) : [[1920, 991, 1], [1440, 900, 2], [390, 844, 3], [375, 667, 2]]
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1]

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  console.log('== reduced motion: paint and cut')
  for (const [W, H, dpr] of CONFIGS) {
    for (const rate of [1, 4]) {
      const line = []
      for (const port of ports) {
        const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, reducedMotion: 'reduce', isMobile: W < 700, hasTouch: W < 700 })
        const p = await ctx.newPage()
        await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'load', timeout: 90000 })
        await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 })
        await sleep(1500)
        const cdp = await ctx.newCDPSession(p)
        await cdp.send('Emulation.setCPUThrottlingRate', { rate })
        await cdp.send('Performance.enable')
        const thread = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'ThreadTime').value
        const cpu = {}
        for (const place of ['system', 'creative']) {
          await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), place)
          await sleep(400)
          const t0 = await thread()
          await p.evaluate(() => { for (let i = 0; i < 7; i++) window.__lab.surface.render() })
          cpu[place] = ((await thread()) - t0) / 7 * 1000
        }
        const r = await p.evaluate(async () => {
          const L = window.__lab
          const s = L.surface
          const raf = () => new Promise((res) => requestAnimationFrame(res))
          const paint = {}
          for (const place of ['system', 'creative']) {
            L.go(L.STOP[place]); for (let i = 0; i < 6; i++) await raf()
            const t = []
            for (let i = 0; i < 7; i++) { const t0 = performance.now(); s.render(); t.push(performance.now() - t0) }
            t.sort((a, b2) => a - b2)
            paint[place] = t[3]
          }
          // the cut: wrap render so the moment the new place is painted is known
          const orig = s.render.bind(s)
          let lastPaint = 0
          s.render = () => { orig(); lastPaint = performance.now() }
          let longest = 0
          const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) longest = Math.max(longest, e.duration) })
          try { po.observe({ type: 'longtask', buffered: false }) } catch {}
          const cuts = []
          for (let i = 0; i < 6; i++) {
            const to = i % 2 ? 'creative' : 'system'
            for (let k = 0; k < 10; k++) await raf()
            const t0 = performance.now()
            L.go(L.STOP[to])
            let done = 0
            const until = t0 + 3000
            while (performance.now() < until) {
              await raf()
              if (lastPaint > t0 && L.A.base === L.STOP[to]) { await raf(); done = performance.now() - t0; break }
            }
            cuts.push(done)
          }
          po.disconnect()
          s.render = orig
          cuts.sort((a, b2) => a - b2)
          return { paint, cut: cuts[cuts.length >> 1], cutMax: cuts[cuts.length - 1], longest }
        })
        line.push(`${port}: paint ${r.paint.system.toFixed(0)} / ${r.paint.creative.toFixed(0)} ms (cpu ${cpu.system.toFixed(0)} / ${cpu.creative.toFixed(0)}), cut ${r.cut.toFixed(0)} ms (worst ${r.cutMax.toFixed(0)}), longest task ${r.longest.toFixed(0)} ms`)
        await ctx.close()
      }
      console.log(`   ${W}x${H}@${dpr} cpu x${rate}   ` + line.join('   |   '))
    }
  }
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
