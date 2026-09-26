// The new control must cost the cold load nothing: no shift, no new request.
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } })
    const p = await ctx.newPage()
    const reqs = []
    p.on('request', (r) => reqs.push(r.url().replace(`http://127.0.0.1:${port}`, '')))
    await p.addInitScript(() => {
      window.__cls = 0
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
    })
    await p.goto(`http://127.0.0.1:${port}/tr/`, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(6000)
    const r = await p.evaluate(() => ({ cls: +window.__cls.toFixed(4), control: !!document.querySelector('.hero-about') }))
    require("fs").writeFileSync(`out/req-${port}-${w}.txt`, reqs.sort().join("
"));console.log(`  ${w}x${h}  CLS ${r.cls}  control ${r.control}  requests ${reqs.length}  (fonts ${reqs.filter((u) => /\.woff2?/.test(u)).length}, images ${reqs.filter((u) => /\.(webp|avif|png|jpg|mp4)/.test(u)).length})`)
    await ctx.close()
  }
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
