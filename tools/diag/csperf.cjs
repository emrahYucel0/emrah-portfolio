// CROSS SECTION — WHAT THE SLATS COST, on this machine's GPU (R14 decision 1: the performance decision comes first).
//
//   node csperf.cjs <port> [--headed] [--sizes=1440x900@2,1920x1080@1,...] [--json=path]
//
// Needs the dev server with the flag on (the debug entry is development-only). Prints the GPU the browser actually
// drew with — this machine has an Intel UHD and an NVIDIA RTX 4050, and a number from the wrong one decides nothing.
//
// THREE MEASURES, AND WHAT EACH ONE IS NOT (see __cs in engine/c2/cross/debug.js):
//   sync   every frame followed by a 1-pixel readPixels: CPU + GPU + the readback round trip. An upper bound on the
//          GPU's work per frame that the compositor cannot hide. Over a full 0→1 sweep, and over the band (EDGE).
//   gpu    EXT_disjoint_timer_query_webgl2, the GPU's own clock for the draw — reported only if the browser exposes it
//          and the measurement was not disjoint.
//   raf    a continuous sweep on requestAnimationFrame: intervals cannot beat the refresh period, so this is KEEPING
//          UP, not cost. THE PASS CRITERION IS STATED IN IT: p95 <= 16.7 ms and under 1% of frames over 33 ms.
// Every measure has its CONTROL: the front state through the BASE program at the same size — an ordinary place on
// this site. The slats' cost is the difference.
const pw = require('playwright')
const { watch } = require('./consolewatch.cjs')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
// e.g. --q=cspxcap=8.3: R20's proposed ceiling on the backing store (debug.js)
const Q = opt('q', '')
const SIZES = opt('sizes', '1440x900@2,1920x1080@1,1920x1080@1.5,390x844@3,390x660@3').split(',').map((s) => {
  const [wh, d] = s.split('@'); const [w, h] = wh.split('x').map(Number); return { w, h, dpr: Number(d || 1) }
})
const stat = (a) => {
  if (!a || !a.length) return null
  const s = [...a].sort((x, y) => x - y)
  const q = (f) => s[Math.min(s.length - 1, Math.floor(s.length * f))]
  return { n: s.length, med: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +s[s.length - 1].toFixed(2), over33: +((s.filter((v) => v > 33.4).length / s.length) * 100).toFixed(2) }
}
const row0 = (S) => `${S.w}x${S.h}@${S.dpr}`
const f = (x) => (x ? `${x.med.toFixed(2)} / ${x.p95.toFixed(2)}` : 'n/a').padEnd(14)

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome', headless: !args.includes('--headed') })
  const out = { when: new Date().toISOString(), headed: args.includes('--headed'), rows: [] }
  console.log(`== CROSS SECTION COST   port ${port}   ${out.headed ? 'headed' : 'headless'}`)
  console.log('   ms, median / p95.   sync = frame + 1px readback (upper bound)   gpu = timer query   raf = keeping up')
  for (const S of SIZES) {
    const ctx = await b.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: S.dpr })
    const p = await ctx.newPage()
    const W = watch(p, row0(S))
    await p.goto(`http://127.0.0.1:${port}/tr?cross=1${Q ? '&' + Q : ''}`, { waitUntil: 'load', timeout: 180000 })
    await p.waitForFunction(() => window.__cs && window.__cs.renderer, null, { timeout: 120000 })
    await p.evaluate(() => document.fonts.ready)
    await p.evaluate(() => window.__cs.dock(false))
    const info = await p.evaluate(() => ({ r: window.__cs.renderer, L: window.__cs.layout() }))
    if (out.rows.length === 0) console.log(`   renderer: ${info.r}\n`)
    // warm both programs and every texture before anything is timed
    await p.evaluate(() => { window.__cs.sync(20, false); window.__cs.sync(20, true) })
    await sleep(300)
    const row = { size: `${S.w}x${S.h}@${S.dpr}`, backing: info.L.backing, renderer: info.r }
    row.syncCtl = stat(await p.evaluate(() => window.__cs.sync(120, true)))
    row.syncSweep = stat(await p.evaluate(() => window.__cs.sync(120, false, 0, 1)))
    row.syncBand = stat(await p.evaluate(() => window.__cs.sync(120, false, 0.4, 0.6)))
    const g1 = await p.evaluate(() => window.__cs.gpu(90, true))
    const g2 = await p.evaluate(() => window.__cs.gpu(90, false, 0, 1))
    row.gpuCtl = g1 && !g1.disjoint ? stat(g1.ms) : null
    row.gpuSweep = g2 && !g2.disjoint ? stat(g2.ms) : null
    row.gpuNote = g1 ? (g1.disjoint || g2.disjoint ? 'disjoint' : 'ok') : 'not exposed'
    row.rafCtl = stat(await p.evaluate(() => window.__cs.raf(3000, true)))
    row.rafSweep = stat(await p.evaluate(() => window.__cs.raf(4000, false, 0, 1)))
    row.rafBand = stat(await p.evaluate(() => window.__cs.raf(3000, false, 0.4, 0.6)))
    row.pass = !!row.rafSweep && row.rafSweep.p95 <= 16.7 && row.rafSweep.over33 < 1 && row.rafBand.p95 <= 16.7 && row.rafBand.over33 < 1
    out.rows.push(row)
    console.log(`   ${row.size.padEnd(16)} backing ${String(row.backing.join('x')).padEnd(10)}`)
    console.log(`      sync  control ${f(row.syncCtl)} sweep ${f(row.syncSweep)} band ${f(row.syncBand)}`)
    console.log(`      gpu   control ${f(row.gpuCtl)} sweep ${f(row.gpuSweep)} (${row.gpuNote})`)
    console.log(`      raf   control ${f(row.rafCtl)} sweep ${f(row.rafSweep)} band ${f(row.rafBand)}  >33ms ${row.rafSweep.over33}% / ${row.rafBand.over33}%   ${row.pass ? 'PASS' : 'FAIL'}`)
    const bad = await W.verdict(p)
    if (bad.length) { process.exitCode = 1; console.log(`      FAIL console (${bad.length}): ${bad[0]}`) }
    await ctx.close()
  }
  await b.close()
  const file = opt('json', `out/cross/perf-${out.headed ? 'headed' : 'headless'}.json`)
  fs.mkdirSync(require('node:path').dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(out, null, 2))
  console.log(`\n   written ${file}`)
})()
