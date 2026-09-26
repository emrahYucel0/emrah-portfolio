// The bench's own furniture must never sit on top of itself, at any phone size, in either language, for any record.
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
let fails = 0
;(async () => {
  const b = await pw.webkit.launch()
  for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932], [736, 330]]) {
    for (const loc of ['tr', 'en']) {
      for (const rec of [0, 1, 2]) {
        const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
        const p = await ctx.newPage()
        await p.goto(`http://127.0.0.1:${port}/${loc}/lab`, { waitUntil: 'networkidle', timeout: 60000 })
        await sleep(1400)
        if (rec > 0) { await p.evaluate((n) => document.querySelectorAll('.lab-stage .rec')[n].click(), rec); await sleep(1300) }
        const d = await p.evaluate(() => {
          const R = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return r.height < 1 ? null : { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) } }
          const over = (a, x) => !!a && !!x && a.b > x.t + 1 && a.t < x.b - 1 && a.r > x.l + 1 && a.l < x.r - 1
          const open = R('.lab-stage .open'), note = R('.lab-stage .note'), foot = R('.lab-stage .foot')
          const cur = R('.lab-stage .rec[aria-current]'), strip = document.querySelector('.lab-strip')
          return {
            openNote: over(open, note), openRec: over(open, cur), noteFoot: over(note, foot), openFoot: over(open, foot),
            clip: strip.scrollWidth - strip.clientWidth,
            overflowX: document.documentElement.scrollWidth > innerWidth + 1,
            docScroll: document.documentElement.scrollHeight > innerHeight + 4,
            offRight: Math.max(open?.r ?? 0, note?.r ?? 0) - innerWidth,
          }
        })
        const bad = d.openNote || d.openRec || d.noteFoot || d.openFoot || d.clip > 0 || d.overflowX || d.docScroll || d.offRight > 0
        if (bad) { fails++; console.log(`  FAIL ${w}x${h} ${loc} rec${rec + 1} ${JSON.stringify(d)}`) }
        await ctx.close()
      }
    }
  }
  await b.close()
  console.log(`MOBILE LAYOUT: ${fails === 0 ? 'PASS — 30 combinations, nothing overlaps, nothing clipped, nothing scrolls' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
