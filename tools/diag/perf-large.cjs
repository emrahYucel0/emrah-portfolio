// THE FINALE ON LARGE SCREENS AT DPR 2 — frame-time p95 from the page's own HUD (?hud=1 → window.__hudStats),
// Chromium (GPU as this machine gives it to headless Chrome). Per size: a sweep 0 → 1 → 0 over 8 s (plot, tear,
// the email's soak), and attention moving between the fields at p = 1 (the cells' springs, the soaks following
// attention). 3 runs each. 1440×900 is the reference the prototype was measured at.
// node perf-large.cjs <port> [out.json]
const fs = require('fs')
const pw = require('playwright')
const [port = '4500', out] = process.argv.slice(2)
const BASE = `http://127.0.0.1:${port}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const SIZES = [[1440, 900], [1920, 1080], [2560, 1440]]
const sweep = (secs) => `new Promise((done) => { const t = document.querySelector('.finale .track')
  const span = t.offsetHeight - innerHeight, t0 = performance.now()
  const drive = (now) => { const q = Math.min(1, (now - t0) / ${secs * 1000}); const p = q < 0.5 ? q * 2 : 2 - q * 2
    scrollTo(0, t.offsetTop + p * span); if (q < 1) requestAnimationFrame(drive); else done() }
  requestAnimationFrame(drive) })`

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const report = []
  for (const [w, h] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })
    await ctx.addInitScript(() => { try { sessionStorage.setItem('finale-guide', '1') } catch {} })
    const p = await ctx.newPage()
    await p.goto(`${BASE}/tr/contact?hud=1`, { waitUntil: 'networkidle' })
    await p.waitForFunction(() => !!window.__finale && !!window.__hudStats, null, { timeout: 20000 })
    await sleep(2000)
    const r = { size: `${w}×${h}@2`, sweep: [], attention: [] }
    for (let i = 0; i < 3; i++) {
      await p.evaluate(() => scrollTo(0, 0)); await sleep(600)
      await p.evaluate('window.__hudReset()'); await p.evaluate(sweep(8))
      r.sweep.push(+(await p.evaluate('window.__hudStats()')).p95.toFixed(1))
    }
    await p.evaluate(() => window.dispatchEvent(new Event('finale:arrive'))); await sleep(2500)
    for (let i = 0; i < 3; i++) {
      await p.evaluate('window.__hudReset()')
      // the cursor visits the fields in turn, resting long enough for each to take attention
      for (const id of ['github', 'location', 'phone', 'linkedin', 'email']) {
        const c = await p.evaluate((id) => { const r = document.querySelector(`[data-cell="${id}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, id)
        await p.mouse.move(c.x, c.y, { steps: 8 }); await sleep(900)
      }
      r.attention.push(+(await p.evaluate('window.__hudStats()')).p95.toFixed(1))
    }
    report.push(r)
    console.log(`  ${r.size.padEnd(14)} sweep p95 ${r.sweep.join(' / ')} ms · attention p95 ${r.attention.join(' / ')} ms`)
    await ctx.close()
  }
  await b.close()
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2))
  const worst = Math.max(...report.flatMap((r) => [...r.sweep, ...r.attention]))
  console.log(`\nPERF LARGE: worst p95 ${worst} ms ${worst <= 16 ? '(within 16 ms)' : '(OVER 16 ms)'}`)
})().catch((e) => { console.error(String(e).slice(0, 600)); process.exit(1) })
