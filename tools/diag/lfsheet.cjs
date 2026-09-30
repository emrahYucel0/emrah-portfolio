// A CONTACT SHEET OF THE PASSAGE, so a sequence can be judged as a sequence.
//
//   node lfsheet.cjs <port> [from] [to] [step] [cols]
//
// Single stills answer "is this frame right". The fold-back, the point and the line are about what follows what,
// and that question needs the frames laid out in order on one image. Percentages are burned into each tile, so a
// tile can be named in a review.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '3000', from = '34', to = '66', step = '2', cols = '6'] = process.argv.slice(2)
// `--demo` sheets the reference instead, at the same sizes and the same percentages, so the two sheets can be
// laid beside each other. The reference is the arbiter for everything about the motion.
const DEMO = process.argv.includes('--demo')
const OUT = 'out/linefield/sheet'
const REF = 'file:///C:/Users/monster/Desktop/EmrahYucel-Portfolio/emrah-portfolio-linefield/docs/reference/linefield-v2.html'

const TW = 320

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const [w, h, tag] of [[1440, 900, '1440x900'], [390, 844, '390x844']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    if (DEMO) {
      await p.goto(REF, { waitUntil: 'load', timeout: 60000 })
      await p.waitForFunction(() => !!window.__demo, null, { timeout: 30000 })
      await sleep(1200)
      await p.evaluate(() => document.getElementById('dock').classList.add('hidden'))
    } else {
      // the site's own path: the passage is a place now, so it is travelled to and held, exactly as a
      // visitor reaches it. The retired debug entry is not on a built site at all.
      await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'load', timeout: 90000 })
      await p.waitForFunction(() => !!window.__lab?.lfSet, null, { timeout: 60000 })
      await sleep(2400)
      await p.evaluate(() => window.__lab.go(window.__lab.STOP.linefield))
      await sleep(1700)
      // the site's chrome is not the passage; what is being sheeted is the material
      await p.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = 'hidden' }))
      await p.evaluate(() => window.__lab.lfSet(0.3))
      await sleep(2600)
    }
    const set = (v) => (DEMO
      ? p.evaluate((x) => window.__demo.setProgress(x / 100), v)
      : p.evaluate((x) => window.__lab.lfSet(x / 100), v))

    const th = Math.round((TW * h) / w)
    const tiles = []
    for (let v = Number(from); v <= Number(to) + 1e-9; v += Number(step)) {
      await set(v)
      await sleep(120)
      const png = await p.screenshot()
      fs.writeFileSync(`${OUT}/${DEMO ? 'demo-' : ''}${tag}-${v}.png`, png)
      const label = Buffer.from(
        `<svg width="${TW}" height="18"><rect width="${TW}" height="18" fill="#000" fill-opacity="0.62"/>`
        + `<text x="5" y="13" font-family="monospace" font-size="12" fill="#fff">${v}%</text></svg>`,
      )
      tiles.push(await sharp(png).resize(TW, th).composite([{ input: label, left: 0, top: 0 }]).toBuffer())
    }
    const C = Number(cols)
    const rows = Math.ceil(tiles.length / C)
    await sharp({ create: { width: C * (TW + 2), height: rows * (th + 2), channels: 3, background: '#555' } })
      .composite(tiles.map((input, i) => ({ input, left: (i % C) * (TW + 2), top: Math.floor(i / C) * (th + 2) })))
      .toFile(`${OUT}/SHEET-${DEMO ? 'DEMO-' : ''}${tag}-${from}-${to}.png`)
    console.log(`  ${tag}: ${tiles.length} frames -> ${OUT}/SHEET-${DEMO ? 'DEMO-' : ''}${tag}-${from}-${to}.png`)
    await ctx.close()
  }
  await b.close()
})()
