// REDUCED MOTION — HOW LONG A CUT TAKES, ON THE FIRST VISIT TO A PLACE AND ONCE IT IS WARM.
//
//   node flatcut.cjs <port,...> [--cfg=WxH@dpr,...] [--rounds=2]
//
// Reduced motion has no travel: a move between places is a cut, and the 2D renderer (flat.js) paints the new place.
// A cut can paint more than once — Work paints again when its block's measured lines arrive, Cross Section draws
// SURFACE and then DEPTH — so each cut is reported twice:
//
//   shown    go() to the first animation frame after the destination's own state was first painted
//   settled  go() to the end of the last paint the cut caused (within 1.5 s), plus one frame
//
// Per build and size, in a fresh page that has had its load and three seconds of idle time, the spine is walked out
// and back twice, a visitor's pace apart (1.5 s, so the idle-time warm-up can run as it would for a person):
//
//   first    the first visit to each place
//   warm     every later visit: per place the worst, and over all places the median and the worst
//
// The Lab is visited last (arriving there opens the Lab page, which leaves the index). Builds are interleaved,
// `rounds` times, so a slow moment on the machine lands on both; each run waits for a quiet machine and is repeated if
// another project's script ran beside it (quiet.cjs). A response under 100 ms reads as immediate (RAIL).
const pw = require('playwright')
const { guarded } = require('./quiet.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const ports = args[0].split(',')
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=')[1]
const CONFIGS = opt('cfg', '1440x900@2,1920x991@1,390x844@3').split(',').map((s) => s.split(/[x@]/).map(Number))
const ROUNDS = +opt('rounds', 2)

async function run(b, port, W, H, dpr) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, reducedMotion: 'reduce', isMobile: W < 700, hasTouch: W < 700 })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 })
  await sleep(3000)
  const r = await p.evaluate(async () => {
    const L = window.__lab, s = L.surface, raf = () => new Promise((res) => requestAnimationFrame(res))
    const wait = (ms) => new Promise((res) => setTimeout(res, ms))
    // what each paint drew: the state the flat renderer shows (the front of the pair, as its render() picks it)
    let pairNow = null
    const pair = s.pair.bind(s), render = s.render.bind(s)
    s.pair = (a, b2, f) => { pairNow = (f < 0.5 ? a : b2) || b2 || a; return pair(a, b2, f) }
    let paints = []
    s.render = () => { const t = performance.now(); render(); paints.push({ t: performance.now(), ms: performance.now() - t, id: pairNow?.id || '' }) }
    const cut = async (to) => {
      for (let k = 0; k < 4; k++) await raf()
      paints = []
      const t0 = performance.now()
      L.go(L.STOP[to])
      let shown = 0
      while (performance.now() - t0 < 1500) {
        await raf()
        if (!shown && paints.some((q) => q.id.startsWith(to))) shown = performance.now() - t0
      }
      const last = paints.length ? paints[paints.length - 1].t : t0
      return { to, shown, settled: paints.length ? last - t0 + 16.7 : 0, paints: paints.map((q) => Math.round(q.ms)), ids: paints.map((q) => q.id) }
    }
    const names = Object.keys(L.STOP).filter((n) => L.STOP[n] !== L.CONTACT_STOP && n !== 'lab')
    const out = names.slice(1), back = names.slice(0, -1).reverse()
    const visits = []
    for (const n of [...out, ...back, ...out, ...back]) { visits.push(await cut(n)); await wait(1500) }
    if (L.STOP.lab != null) visits.push(await cut('lab'))
    s.render = render; s.pair = pair
    return visits
  })
  await ctx.close()
  return r
}
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1]
;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  {
    // the GPU this browser draws with, so every number is labelled with it (the machine has an Intel UHD and an RTX 4050)
    const p = await b.newPage()
    const gpu = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const d = gl && gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown' })
    console.log(`GPU: ${gpu}`)
    await p.close()
  }
  for (const [W, H, dpr] of CONFIGS) {
    console.log(`== ${W}x${H}@${dpr}   (ms: shown / settled, and the paints the cut caused)`)
    for (let round = 0; round < ROUNDS; round++) for (const port of ports) {
      const v = await guarded(`${port} ${W}x${H}@${dpr}`, () => run(b, port, W, H, dpr))
      const seen = new Set(), first = [], warm = []
      for (const c of v) { (seen.has(c.to) ? warm : first).push(c); seen.add(c.to) }
      const fmt = (c) => `${c.to} ${c.shown.toFixed(0)}/${c.settled.toFixed(0)} [${c.paints.join('+')}]`
      console.log(`   ${port} first: ${first.map(fmt).join(', ')}`)
      const per = {}
      for (const c of warm) (per[c.to] ||= []).push(c)
      console.log(`   ${port} warm worst per place: ${Object.entries(per).map(([k, a]) => `${k} ${Math.max(...a.map((c) => c.shown)).toFixed(0)}/${Math.max(...a.map((c) => c.settled)).toFixed(0)}`).join(', ')}`)
      const ws = warm.map((c) => c.shown), wt = warm.map((c) => c.settled), fs = first.map((c) => c.shown), ft = first.map((c) => c.settled)
      console.log(`   ${port} SUMMARY first: shown worst ${Math.max(...fs).toFixed(0)}, settled worst ${Math.max(...ft).toFixed(0)} | warm: shown median ${med(ws).toFixed(0)} worst ${Math.max(...ws).toFixed(0)}, settled median ${med(wt).toFixed(0)} worst ${Math.max(...wt).toFixed(0)}`)
    }
  }
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
