// CROSS SECTION — THE TEMPO AND THE BAND, on the Phase B pacer (engine/c2/cross/input.js).
//
//   node cstempo.cjs <port> [--tempo=step|scroll]
//
// Input is dispatched from INSIDE the page on a fixed clock (Playwright stretches dispatched streams under load —
// docs/ROADMAP.md, R12/R28), as wheel streams of three shapes:
//   notch     one mouse notch: 100 px, once
//   swipe     a trackpad swipe: 60 events, 16.7 ms apart, decaying from 60 px (a momentum tail)
//   flick     a hard trackpad flick at 120 Hz: 120 events, 8.3 ms apart, decaying from 140 px
// Gestures are separated by 700 ms of quiet.
//
// What it asserts:
//   COUNT    how many gestures of each shape carry the passage from 0 to 1, and back from 1 to 0 (the R14 target is
//            about five from Work to the bench: this counts the passage's own, the leave to the bench is one more)
//   NO SKIP  from rest at SURFACE, ONE flick never gets past the band's first stop (EDGE arriving behind the line),
//            and from DEPTH one flick never gets past the band's last stop; the trace of every drawn frame is read
//   ONE STOP inside the band, one gesture of any shape moves exactly one stop
//
// This is the debug entry's pacer, not the site's gesture rule; Phase C replaces the detection with opensGesture and
// these assertions move to the integrated harness.
const pw = require('playwright')
const { watch } = require('./consolewatch.cjs')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const tempo = (args.find((a) => a.startsWith('--tempo=')) || '--tempo=step').slice(8)
let fails = 0
const check = (ok, msg) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++ }

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  const W = watch(p, 'tempo')
  await p.goto(`http://127.0.0.1:${port}/tr?cross=1&cstempo=${tempo}`, { waitUntil: 'load', timeout: 180000 })
  await p.waitForFunction(() => window.__cs && window.__cs.renderer, null, { timeout: 120000 })
  await p.evaluate(() => {
    const SH = {
      notch: () => [100],
      swipe: () => Array.from({ length: 60 }, (_, i) => 60 * Math.pow(0.93, i)),
      flick: () => Array.from({ length: 120 }, (_, i) => 140 * Math.pow(0.965, i)),
    }
    const GAP = { notch: 0, swipe: 16.7, flick: 8.33 }
    // one gesture on a fixed in-page clock; resolves after the stream and 700 ms of quiet
    window.__gest = (shape, sign) => new Promise((res) => {
      const d = SH[shape](), t0 = performance.now()
      let i = 0
      const tick = () => {
        const now = performance.now()
        while (i < d.length && now - t0 >= i * GAP[shape]) { window.dispatchEvent(new WheelEvent('wheel', { deltaY: sign * d[i], deltaMode: 0, cancelable: true })); i++ }
        if (i < d.length) setTimeout(tick, 2); else setTimeout(res, 700)
      }
      tick()
    })
    window.__settle = () => new Promise((res) => { let last = -1, same = 0; const s = () => { const v = window.__cs.progress; same = v === last ? same + 1 : 0; last = v; same > 8 ? res(v) : setTimeout(s, 50) }; s() })
  })
  const go = async (shape, sign) => { await p.evaluate(([s, g]) => window.__gest(s, g), [shape, sign]); return p.evaluate(() => window.__settle()) }
  const C = await p.evaluate(() => window.__cs.constants())
  console.log(`== CROSS SECTION TEMPO (${tempo})   band ${C.Z0}..${C.Z1}, ${C.steps} stops   stops at p ${C.stops.map((z) => (C.Z0 + z * (C.Z1 - C.Z0)).toFixed(3)).join(' ')}`)

  for (const shape of ['notch', 'swipe', 'flick']) {
    for (const [from, to, sign] of [[0, 1, 1], [1, 0, -1]]) {
      await p.evaluate((v) => window.__cs.setProgress(v), from)
      await p.waitForTimeout(400)
      let n = 0, v = from
      const path = []
      while (Math.abs(v - to) > 1e-4 && n < 40) { v = await go(shape, sign); n++; path.push(`${(v * 100).toFixed(1)}${await p.evaluate(() => (window.__cs.stop >= 0 ? `[${window.__cs.stop}]` : ''))}`) }
      console.log(`   ${shape.padEnd(5)} ${from}→${to}: ${n} gestures   ${path.join(' → ')}`)
      if (tempo === 'step') check(n === C.steps + 2, `${shape} ${from}→${to} takes ${C.steps + 2} gestures (turn, ${C.steps} stops, release-and-carry)`)
    }
  }

  // NO SKIP: one hard flick from each end, every drawn frame traced
  for (const [from, sign, limit, label] of [[0, 1, 0, 'SURFACE'], [1, -1, C.stops.length - 1, 'DEPTH']]) {
    await p.evaluate((v) => window.__cs.setProgress(v), from)
    await p.waitForTimeout(400)
    await p.evaluate(() => window.__cs.trace(true))
    await go('flick', sign)
    const tr = await p.evaluate(() => window.__cs.traced())
    const end = tr[tr.length - 1]
    const pStop = C.Z0 + C.stops[limit] * (C.Z1 - C.Z0)
    const beyond = tr.filter(([, v]) => (sign > 0 ? v > pStop + 1e-4 : v < pStop - 1e-4)).length
    check(beyond === 0 && end[2] === limit, `one flick from ${label} stops at band stop ${limit} (p ${pStop.toFixed(3)}): ${tr.length} frames, ${beyond} beyond it, ended at p ${end[1].toFixed(3)} stop ${end[2]}`)
  }

  // ONE STOP: inside the band, each shape moves exactly one stop
  for (const shape of ['notch', 'swipe', 'flick']) {
    await p.evaluate(() => window.__cs.toStop(0)); await p.evaluate(() => window.__settle())
    await go(shape, 1)
    const s = await p.evaluate(() => window.__cs.stop)
    check(s === 1, `${shape} inside the band: stop 0 → ${s}`)
  }
  const bad = await W.verdict(p)
  check(bad.length === 0, `console clean (${bad.length})${bad.length ? ': ' + bad[0] : ''}`)
  await b.close()
  console.log(fails ? `   FAIL (${fails})` : '   PASS')
  process.exit(fails ? 1 : 0)
})()
