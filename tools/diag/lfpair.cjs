// THE DEMO AND THE C2 VERSION, SIDE BY SIDE, OFF ONE CLOCK.
//   node lfpair.cjs <port> [--film]
const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4800'] = process.argv.slice(2)
const FILM = process.argv.includes('--film')
const OUT = 'out/linefield'
;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const [w, h, tag] of [[2880, 900, 'pair-1440x900'], [780, 844, 'pair-390x844']]) {
    const extra = FILM ? { recordVideo: { dir: `${OUT}/video`, size: { width: w, height: h } } } : {}
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, ...extra })
    const p = await ctx.newPage()
    await p.goto(`http://127.0.0.1:${port}/lf-compare.html`, { waitUntil: 'load', timeout: 90000 })
    await p.evaluate(() => window.__pair())
    await sleep(1500)
    fs.mkdirSync(`${OUT}/pair`, { recursive: true })
    for (const v of [0, 0.16, 0.28, 0.42, 0.5, 0.54, 0.7, 1]) {
      await p.evaluate((x) => window.__set(x), v)
      await sleep(260)
      fs.writeFileSync(`${OUT}/pair/${tag}-${Math.round(v * 100)}.png`, await p.screenshot())
    }
    if (FILM) {
      await p.evaluate(() => window.__set(0))
      await sleep(400)
      await p.evaluate(() => window.__sweep(0, 1, 6000))
      await sleep(400)
      await p.evaluate(() => window.__sweep(1, 0, 4000))
      await sleep(400)
    }
    const v = p.video()
    await ctx.close()
    if (v) { const to = `${OUT}/video/${tag}-DEMO-left-C2-right.webm`; fs.rmSync(to, { force: true }); await v.saveAs(to) }
    console.log(`  ${tag} done`)
  }
  await b.close()
})()
