// CROSS SECTION — the approved reference demo, photographed at the same progresses as csshot.cjs.
//
//   node csdemo.cjs [WxH ...]      → tools/diag/out/cross/shots/demo/
//
// The demo is read from docs/reference/cross-section-v2.html and is never written to. It loads its face from Google
// Fonts; the harness reports whether it arrived (the demo shows a warning in its corner when it did not).
const pw = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sizes = process.argv.slice(2).filter((a) => /^\d+x\d+$/.test(a)).map((s) => s.split('x').map(Number))
if (!sizes.length) sizes.push([1440, 900], [390, 844])
const OUT = 'out/cross/shots/demo'
const AT = [0, 0.12, 0.25, 0.35, 0.42, 0.44, 0.47, 0.5, 0.53, 0.56, 0.6, 0.7, 0.85, 1]
const DEMO = 'file:///' + path.resolve(__dirname, '..', '..', 'docs', 'reference', 'cross-section-v2.html').replace(/\\/g, '/')

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const [w, h] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 700 ? 3 : 2 })
    const p = await ctx.newPage()
    await p.goto(DEMO, { waitUntil: 'load' })
    await p.waitForFunction(() => window.__demo, null, { timeout: 30000 })
    await sleep(1200)
    const warn = await p.evaluate(() => !document.getElementById('warn').hidden)
    console.log(`  ${w}x${h}  demo face ${warn ? 'FALLBACK (no network font)' : 'ok'}`)
    await p.evaluate(() => document.getElementById('dock').classList.add('hidden'))
    for (const v of AT) {
      await p.evaluate((x) => window.__demo.setProgress(x), v)
      await sleep(150)
      fs.writeFileSync(`${OUT}/${w}x${h}-${String(Math.round(v * 1000)).padStart(4, '0')}.png`, await p.screenshot())
    }
    await ctx.close()
  }
  await b.close()
  console.log('  stills in tools/diag/' + OUT)
})()
