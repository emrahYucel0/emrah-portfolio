const pw = require('playwright')
const sharp = require('sharp')
;(async () => {
  const b = await pw.webkit.launch()
  for (const [w, h] of [[1440, 900], [320, 568], [390, 844], [736, 330]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage()
    await p.goto('http://127.0.0.1:4500/tr/', { waitUntil: 'networkidle' })
    await new Promise(r => setTimeout(r, 3000))
    const box = await p.evaluate(() => { const r = document.querySelector('.hero-about').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom } })
    const { data, info } = await sharp(await p.screenshot()).greyscale().raw().toBuffer({ resolveWithObject: true })
    const W = info.width
    // a column's ink weight over a band; glyph columns carry far more than the row field alone
    const col = (y0, y1) => { const c = new Array(W).fill(0)
      for (let y = Math.max(0, y0 | 0); y < Math.min(info.height, y1 | 0); y++) for (let x = 0; x < W; x++) if (data[y * W + x] < 120) c[x]++
      return c }
    const rightMost = (c) => { const s = [...c].sort((a, z) => a - z), med = s[s.length >> 1], t = Math.max(med * 1.9, med + 6)
      for (let x = W - 1; x >= 0; x--) if (c[x] > t) return x
      return -1 }
    const above = rightMost(col(box.t - 140, box.t - 14)), below = rightMost(col(box.b + 14, box.b + 140))
    console.log(`${w}x${h}  control ink right=${(box.r - 13) | 0}  | EMRAH glyph right=${above}  YÜCEL glyph right=${below}`)
    await p.close()
  }
  await b.close()
})()
