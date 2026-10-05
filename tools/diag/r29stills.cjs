// R29 — REDUCED MOTION'S TONE ROWS, BEFORE AND AFTER: stills for the user's eye.
//
//   node r29stills.cjs <after port> <before port> [WxH] [dpr,...]
//
// For Full-Stack and Creative, at each DPR, one sheet: normal motion (the after build), reduced motion before,
// reduced motion after — whole frames side by side, and under them the same patch of rows magnified four times.
// Writes tools/diag/out/iq/r29/R29-<face>-<W>x<H>@<dpr>.png.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [after, before, size = '1440x900', dprs = '1,2'] = process.argv.slice(2)
const [W, H] = size.split('x').map(Number)
const OUT = 'out/iq/r29'
fs.mkdirSync(OUT, { recursive: true })

async function shot(b, port, place, dpr, reduced) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 })
  await sleep(2000)
  await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), place)
  await sleep(2800)
  const png = await p.screenshot()
  await ctx.close()
  return png
}

const label = (text, w) => Buffer.from(`<svg width="${w}" height="34" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><text x="10" y="23" font-family="monospace" font-size="18" fill="#111">${text}</text></svg>`)

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const [place, face] of [['system', 'fullstack'], ['creative', 'creative']]) {
    for (const dpr of dprs.split(',').map(Number)) {
      const shots = [
        ['normal motion', await shot(b, after, place, dpr, false)],
        ['reduced, before R29', await shot(b, before, place, dpr, true)],
        ['reduced, after R29', await shot(b, after, place, dpr, true)],
      ]
      const pw2 = Math.round(W * 0.5)
      const ph2 = Math.round(H * 0.5)
      // a patch of open rows on the left, between the two blocks, magnified
      const crop = { left: Math.round(W * 0.05 * dpr), top: Math.round(H * 0.42 * dpr), width: Math.round(110 * dpr), height: Math.round(70 * dpr) }
      const zoom = 4 / dpr
      const cw = Math.round(crop.width * zoom)
      const chh = Math.round(crop.height * zoom)
      const colW = Math.max(pw2, cw)
      const comps = []
      for (let i = 0; i < shots.length; i++) {
        const [name, png] = shots[i]
        const x = i * (colW + 12)
        comps.push({ input: label(`${name} · ${W}x${H}@${dpr}`, colW), left: x, top: 0 })
        comps.push({ input: await sharp(png).resize({ width: pw2, height: ph2 }).toBuffer(), left: x, top: 34 })
        comps.push({ input: await sharp(png).extract(crop).resize({ width: cw, height: chh, kernel: 'nearest' }).toBuffer(), left: x, top: 34 + ph2 + 12 })
      }
      const file = `${OUT}/R29-${face}-${W}x${H}@${dpr}.png`
      await sharp({ create: { width: 3 * colW + 24, height: 34 + ph2 + 12 + chh, channels: 3, background: '#ff00ff' } }).composite(comps).png().toFile(file)
      console.log('written ' + file)
    }
  }
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
