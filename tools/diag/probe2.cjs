const pw = require('playwright')
const sharp = require('sharp')
;(async () => {
  const b = await pw.webkit.launch()
  for (const [w, h] of [[1440, 900], [320, 568], [390, 844], [736, 330]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 } )).newPage()
    await p.goto('http://127.0.0.1:4500/tr/', { waitUntil: 'networkidle' })
    await new Promise(r => setTimeout(r, 3000))
    const box = await p.evaluate(() => { const r = document.querySelector('.hero-about').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height } })
    const buf = await p.screenshot()
    const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true })
    // rightmost dark pixel of a band, ignoring the control's own box
    const edge = (y0, y1) => { let last = -1
      for (let y = Math.max(0, y0 | 0); y < Math.min(info.height, y1 | 0); y++)
        for (let x = 0; x < info.width; x++) if (data[y * info.width + x] < 100 && x > last) last = x
      return last }
    const nameTop = edge(box.t - 120, box.t - 12), nameBot = edge(box.b + 12, box.b + 120)
    const inBand = edge(box.t + 2, box.b - 2)
    console.log(`${w}x${h} control l=${box.l|0} r=${box.r|0} t=${box.t|0} b=${box.b|0} ${box.w|0}x${box.h|0} | name ink right: above=${nameTop} below=${nameBot} | darkest-right inside band=${inBand}`)
    await p.close()
  }
  await b.close()
})()
