// HOW A GENTLE TRACKPAD FEELS IN THE WORK FIELD (R15, 2026-10-09).
//
//   node workfeel.cjs <port> [chrome|webkit] [--reps=3]
//
// One notch is one work since the work field's wheel gain went 2.6 → 5. The question this answers is whether a
// SMALL, slow trackpad movement — a few px per event — now carries the field into the next work too easily. From
// Work at w0, settled, each stream is played on a fixed in-page clock (one event every 16.7 ms, as a trackpad sends
// them), and the field is read: its furthest travel during the stream, where it stands as the stream ends, and the
// work registered once it has settled. A detent and two quick detents are played too, as the reference.
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, engine = 'chrome'] = process.argv.slice(2)
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const REPS = +argOf('reps', '3')
const STREAMS = [
  ...[2, 4, 8].flatMap((px) => [150, 300, 600].map((ms) => ({ label: `${px} px every 16.7 ms for ${ms} ms`, ev: Array.from({ length: Math.round(ms / 16.7) }, (_, i) => [i * 16.7, px]) }))),
  { label: 'one 100 px detent', ev: [[0, 100]] },
  { label: 'two 100 px detents, 60 ms apart', ev: [[0, 100], [60, 100]] },
  // and slowly: one notch is one work at any pace a hand turns a wheel (the second should reach w2)
  ...[300, 700, 1400].map((gap) => ({ label: `two 100 px detents, ${gap} ms apart`, ev: [[0, 100], [gap, 100]] })),
]

;(async () => {
  const b = await pw[engine === 'chrome' ? 'chromium' : 'webkit'].launch(engine === 'chrome' ? { channel: 'chrome' } : {})
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  const base = `http://127.0.0.1:${port}`
  await p.goto(`${base}/tr`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 })
  const STOP = await stopsOf(p)
  console.log(`== WORK FIELD FEEL  ${engine} :${port}   (works: 0 … ${await p.evaluate(() => window.__lab.works.length - 1)})`)
  console.log(`   ${'stream'.padEnd(36)} ${'total px'.padStart(8)}  peak travel   at stream end   settled on`)
  for (const s of STREAMS) {
    const rows = []
    for (let r = 0; r < REPS; r++) {
      await p.goto(`${base}/tr`, { waitUntil: 'networkidle' })
      await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }); await sleep(2400)
      await p.evaluate((w) => window.__lab.go(w), STOP.work); await sleep(2800)
      await p.waitForFunction(() => { const A = window.__lab.A; return !A.hush || performance.now() >= A.hush }, null, { timeout: 8000 }).catch(() => {})
      const out = await p.evaluate((ev) => new Promise((res) => {
        const A = window.__lab.A, t0 = performance.now() + 20
        let i = 0, peak = 0
        const watch = setInterval(() => { peak = Math.max(peak, Math.abs(A.wT)) }, 4)
        const tick = () => {
          while (i < ev.length && performance.now() >= t0 + ev[i][0]) { document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: ev[i][1], deltaMode: 0, bubbles: true, cancelable: true })); i++ }
          if (i < ev.length) setTimeout(tick, 2)
          else { const end = A.wT; setTimeout(() => { clearInterval(watch); res({ peak, end, base: A.base, wL: A.wLocked, wT: A.wT }) }, 1800) }
        }
        setTimeout(tick, 20)
      }), s.ev)
      rows.push(out)
    }
    const total = s.ev.reduce((a, [, d]) => a + d, 0)
    const left = rows.some((o) => o.base !== STOP.work)
    const settled = rows.map((o) => (o.base !== STOP.work ? `left Work (${o.base})` : `w${Math.round(o.wT)}`)).join(', ')
    console.log(`   ${s.label.padEnd(36)} ${String(Math.round(total)).padStart(8)}  ${rows.map((o) => o.peak.toFixed(2)).join('/').padStart(11)}   ${rows.map((o) => o.end.toFixed(2)).join('/').padStart(13)}   ${settled}${left ? '  !' : ''}`)
  }
  await b.close()
})().catch((e) => { console.error(String(e.stack || e).slice(0, 600)); process.exit(1) })
