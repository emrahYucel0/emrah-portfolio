// THE RUNTIME'S COLD BOOT FROM A DOCUMENT ROUTE — measured, before and after the warm-up.
// A visitor lands on /tr/contact (or the bench) directly, the page settles, and they press the strip's WORK: the time
// from the click to the runtime on screen, standing on Work (data-c2='on', base 3, p settled). Chromium, 1440×900,
// without load and with the CPU slowed 4× (CDP). Also: what the warm-up costs where it runs — the finale's own frame
// p95 while it happens — and that the page it runs on does not change (no pixel of the finale differs).
// node warm.cjs <port> [label] [out.json]
const fs = require('fs')
const pw = require('playwright')
const [port = '4500', label = 'run', out] = process.argv.slice(2)
const BASE = `http://127.0.0.1:${port}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function once(b, from, cpu, waitMs) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('finale-guide', '1') } catch {} })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  await p.goto(`${BASE}${from}`, { waitUntil: 'networkidle', timeout: 90000 })
  // the page settles and stays a while (a reader): the warm-up has its idle time
  await sleep(waitMs)
  const warmed = await p.evaluate(() => performance.getEntriesByName('c2:prep:textures').length > 0)
  const t0 = Date.now()
  await p.evaluate(() => [...document.querySelectorAll('.lab-strip a')].find((a) => /İŞLER|WORK/i.test(a.textContent.trim().toLocaleUpperCase('tr')))?.click())
  await p.waitForFunction(() => document.documentElement.dataset.c2 === 'on' && window.__lab?.A.base === 3 && Math.abs(window.__lab.A.p - 3) < 0.02, null, { timeout: 60000, polling: 50 }).catch(() => {})
  const ms = Date.now() - t0
  await ctx.close()
  return { ms, warmed }
}

// what the warm-up costs where it runs: /tr/contact is swept 0 → 1 → 0 through the warm-up's window (2–10 s after
// load), the finale's frame p95 (its HUD) and the long tasks (> 50 ms) counted; and, with reduced motion (no breath),
// the resting finale before and after that window compared pixel for pixel
async function cost(b, cpu) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  await p.addInitScript(() => { window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: true }) } catch {} })
  await p.goto(`${BASE}/tr/contact?hud=1`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => !!window.__finale && !!window.__hudReset, null, { timeout: 30000 })
  await sleep(1500)
  await p.evaluate(() => { window.__hudReset(); window.__long = [] })
  await p.evaluate(`new Promise((done) => { const t = document.querySelector('.finale .track'), span = t.offsetHeight - innerHeight, t0 = performance.now()
    const drive = (now) => { const q = Math.min(1, (now - t0) / 9000); const f = q < 0.5 ? q * 2 : 2 - q * 2; scrollTo(0, t.offsetTop + f * span); if (q < 1) requestAnimationFrame(drive); else done() }
    requestAnimationFrame(drive) })`)
  const r = await p.evaluate(() => ({ p95: +window.__hudStats().p95.toFixed(1), long: window.__long.slice(), warmed: !!window.__lab }))
  await ctx.close()
  return r
}
async function still(b) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  await ctx.addInitScript(() => { try { sessionStorage.setItem('finale-guide', '1') } catch {} })
  const p = await ctx.newPage()
  await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await p.waitForFunction(() => !!window.__finale); await sleep(1200)
  const a = await p.screenshot()
  await sleep(10000)
  const b2 = await p.screenshot(); const warmed = await p.evaluate(() => !!window.__lab)
  await ctx.close()
  return { same: a.equals(b2), warmed }
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const res = { label, rows: [], cost: [] }
  for (const cpu of [1, 4]) {
    const c = [await cost(b, cpu), await cost(b, cpu)]
    res.cost.push({ cpu, p95: c.map((x) => x.p95), long: c.map((x) => x.long), warmed: c.map((x) => x.warmed) })
    console.log(`  ${label.padEnd(7)} finale swept through the warm-up window, CPU ${cpu}×: p95 ${c.map((x) => x.p95).join(' / ')} ms · long tasks ${c.map((x) => `[${x.long.join(',')}]`).join(' ')} · runtime warmed ${c.map((x) => x.warmed).join('/')}`)
  }
  const st = await still(b)
  res.still = st
  console.log(`  ${label.padEnd(7)} the resting finale (reduced motion) before vs after the warm-up window: ${st.same ? 'pixel-identical' : 'DIFFERS'} (warmed ${st.warmed})`)
  // COLD and WARM interleaved in one session (machine noise between sessions was as large as the effect): the same
  // build, the click either 1.5 s after load (before the warm-up can start) or after 9 s (a reader who stayed)
  for (const from of ['/tr/contact', '/tr/lab']) {
    for (const cpu of [1, 4]) {
      const cold = [], warm = []
      for (let i = 0; i < 3; i++) {
        const pair = i % 2 ? [['warm', 9000], ['cold', 1500]] : [['cold', 1500], ['warm', 9000]]
        for (const [k, w] of pair) (k === 'cold' ? cold : warm).push(await once(b, from, cpu, w))
      }
      const row = { from, cpu, cold: cold.map((r) => r.ms), warm: warm.map((r) => r.ms), warmedBeforeClick: warm.map((r) => r.warmed), coldHadRuntime: cold.map((r) => r.warmed) }
      res.rows.push(row)
      console.log(`  ${from.padEnd(12)} CPU ${cpu}×  → Work on screen · cold ${row.cold.join(' / ')} ms · warm ${row.warm.join(' / ')} ms  (runtime prepared before the click: cold ${row.coldHadRuntime.join('/')}, warm ${row.warmedBeforeClick.join('/')})`)
    }
  }
  await b.close()
  if (out) fs.writeFileSync(out, JSON.stringify(res, null, 2))
})().catch((e) => { console.error(String(e).slice(0, 600)); process.exit(1) })
