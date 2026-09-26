const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
fs.mkdirSync('out/hero-final', { recursive: true })
;(async () => {
  const b = await pw.webkit.launch()
  for (const [w, h, loc] of [[1440, 900, 'tr'], [390, 844, 'en'], [320, 568, 'tr']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 700, hasTouch: w < 700 })
    const p = await ctx.newPage()
    await p.goto(`http://127.0.0.1:${port}/${loc}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(3200)
    fs.writeFileSync(`out/hero-final/${loc}-${w}-hero.png`, await p.screenshot())
    // the focus ring
    await p.evaluate(() => { const e = document.querySelector('.hero-about'); e.focus() })
    await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab')
    await sleep(400)
    fs.writeFileSync(`out/hero-final/${loc}-${w}-focus.png`, await p.screenshot())
    // the room it opens
    await p.click('.hero-about'); await sleep(3600)
    fs.writeFileSync(`out/hero-final/${loc}-${w}-about.png`, await p.screenshot())
    console.log(`  ${loc} ${w}x${h} shot`)
    await ctx.close()
  }
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
