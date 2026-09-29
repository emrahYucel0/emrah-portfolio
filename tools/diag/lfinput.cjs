// HOW MANY NOTCHES, AND HOW FAR A FINGER — and the recordings driven by those, not by the slider.
//
//   node lfinput.cjs <port> [--film]
const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4800'] = process.argv.slice(2)
const FILM = process.argv.includes('--film')
const OUT = 'out/linefield'

const open = async (b, w, h, extra = {}) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700, ...extra })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/tr?linefield=1`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => !!window.__lf, null, { timeout: 60000 })
  await sleep(600)
  return { ctx, p }
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  {
    const { ctx, p } = await open(b, 1440, 900)
    // one notch at a time, waiting for the glide to settle, until the far end is reached
    let n = 0
    while (n < 60) {
      const at = await p.evaluate(() => window.__lf.progress)
      if (at > 0.995) break
      await p.mouse.wheel(0, 100)
      await sleep(190)
      n++
    }
    const notch = await p.evaluate(() => window.__lf.notch)
    console.log(`  desktop: ${n} wheel notches end to end (one notch = ${(notch * 100).toFixed(1)}% of the passage)`)
    // how much of the passage one notch covers, and so how many notches one word's journey takes
    console.log(`  a single word's flow spans about 43% of the backend half, which is ${Math.round(0.43 * 0.5 / notch)} notches`)
    await ctx.close()
  }
  {
    const { ctx, p } = await open(b, 390, 844)
    const span = await p.evaluate(() => window.__lf.touchSpan())
    console.log(`  phone: a drag of ${Math.round(span)}px covers the whole passage — ${(span / 844).toFixed(2)} screen heights`)
    await ctx.close()
  }

  if (FILM) {
    const VID = `${OUT}/video`
    fs.mkdirSync(VID, { recursive: true })
    {
      const { ctx, p } = await open(b, 1440, 900, { recordVideo: { dir: VID, size: { width: 1440, height: 900 } } })
      for (let i = 0; i < 26; i++) { await p.mouse.wheel(0, 100); await sleep(190) }
      await sleep(700)
      for (let i = 0; i < 18; i++) { await p.mouse.wheel(0, -100); await sleep(180) }
      await sleep(600)
      const v = p.video(); await ctx.close()
      if (v) { const to = `${VID}/linefield-desktop-WHEEL-1440x900.webm`; fs.rmSync(to, { force: true }); await v.saveAs(to); console.log(`  ${to.split('/').pop()}`) }
    }
    {
      const { ctx, p } = await open(b, 390, 844, { recordVideo: { dir: VID, size: { width: 390, height: 844 } } })
      // three swipes up, then two back: a finger, not a slider
      for (const [from, to] of [[700, 180], [700, 180], [700, 220], [200, 700], [200, 700]]) {
        await p.touchscreen.tap(195, 420).catch(() => {})
        await p.mouse.move(195, from)
        await p.mouse.down()
        for (let k = 1; k <= 12; k++) { await p.mouse.move(195, from + (to - from) * (k / 12)); await sleep(22) }
        await p.mouse.up()
        await sleep(420)
      }
      const v = p.video(); await ctx.close()
      if (v) { const to = `${VID}/linefield-mobile-TOUCH-390x844-EMULATION-NOT-IOS.webm`; fs.rmSync(to, { force: true }); await v.saveAs(to); console.log(`  ${to.split('/').pop()}`) }
    }
  }
  await b.close()
})()
