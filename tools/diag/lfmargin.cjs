// DO THE WORDS CLEAR THE EDGES, AND THE STRIPS? — measured from the render, in every viewport.
//
//   node lfmargin.cjs <port>
//
// The site keeps a header strip at the top and a footer strip at the bottom; the words must clear both, and the
// right-aligned frontend words must keep a real right margin. Measured as the ink bounding box of the WORDS —
// columns whose ink fraction is far above the bare field's, so the ruled ground is not mistaken for type.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4800'] = process.argv.slice(2)
const OUT = 'out/linefield'

function wordBox(d, W, H, c, dark) {
  const isInk = (i) => {
    const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    return dark ? L < 110 : L > 150
  }
  const colFrac = new Float64Array(W)
  for (let x = 0; x < W; x++) {
    let n = 0
    for (let y = 0; y < H; y++) if (isInk((y * W + x) * c)) n++
    colFrac[x] = n / H
  }
  /*
   * THE BAR IS SET BY THE FIELD ITSELF, not by a constant.
   *
   * A column through a letter is far more inked than one of bare field — but how much the bare field carries
   * depends on the viewport. At 844x390 it is about a tenth, which a fixed bar of 0.11 admitted: the "word
   * box" became the whole field and the margins reported were the field's own edges, not the words'. The
   * median column IS the bare field, so the bar is set from it.
   */
  const med = [...colFrac].sort((a, b) => a - b)[Math.floor(W / 2)]
  const CUT = Math.max(0.2, med * 3.5)

  const rowFrac = new Float64Array(H)
  for (let y = 0; y < H; y++) {
    let n = 0
    for (let x = 0; x < W; x++) if (colFrac[x] > CUT && isInk((y * W + x) * c)) n++
    rowFrac[y] = n / Math.max(1, W)
  }
  let x0 = -1
  let x1 = -1
  for (let x = 0; x < W; x++) if (colFrac[x] > CUT) { if (x0 < 0) x0 = x; x1 = x }
  let y0 = -1
  let y1 = -1
  const rcut = Math.max(...rowFrac) * 0.12
  for (let y = 0; y < H; y++) if (rowFrac[y] > rcut) { if (y0 < 0) y0 = y; y1 = y }
  return x0 < 0 || y0 < 0 ? null : { x0, x1, y0, y1, cut: CUT, med }
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const [w, h] of [[1440, 900], [390, 844], [320, 568], [844, 390]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700 && h > w, hasTouch: w < 700 })
    const p = await ctx.newPage()
    await p.goto(`http://127.0.0.1:${port}/tr?linefield=1`, { waitUntil: 'load', timeout: 90000 })
    await p.waitForFunction(() => !!window.__lf, null, { timeout: 60000 })
    await sleep(700)
    const strip = await p.evaluate(() => window.__lf.strip())
    // the dock belongs to the debug entry, not to the scene: measured with it up, every viewport reported the
    // same 18px bottom margin, which was the dock's own offset and not the words at all
    await p.evaluate(() => window.__lf.dock(false))
    for (const [v, side, dark] of [[0, 'backend', false], [1, 'frontend', true]]) {
      await p.evaluate((x) => window.__lf.setProgress(x), v)
      await sleep(300)
      const shot = await p.screenshot()
      fs.writeFileSync(`${OUT}/margin-${w}x${h}-${side}.png`, shot)
      const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true })
      const bx = wordBox(data, info.width, info.height, info.channels, dark)
      if (!bx) { console.log(`  ${w}x${h} ${side}: no words found`); continue }
      const left = bx.x0
      const right = w - 1 - bx.x1
      const top = bx.y0
      const bot = h - 1 - bx.y1
      const bad = []
      if (top < strip) bad.push(`TOP ${top} < strip ${strip}`)
      if (bot < strip) bad.push(`BOTTOM ${bot} < strip ${strip}`)
      if (side === 'frontend' && right < w * 0.05) bad.push(`RIGHT ${right} < 5% (${Math.round(w * 0.05)})`)
      if (side === 'backend' && left < w * 0.05) bad.push(`LEFT ${left} < 5%`)
      console.log(`  ${String(w + 'x' + h).padEnd(9)} ${side.padEnd(9)} left ${String(left).padStart(4)}  right ${String(right).padStart(4)}  top ${String(top).padStart(4)}  bottom ${String(bot).padStart(4)}  strip ${strip}${bad.length ? '   <-- ' + bad.join('; ') : ''}`)
    }
    await ctx.close()
  }
  await b.close()
})()
