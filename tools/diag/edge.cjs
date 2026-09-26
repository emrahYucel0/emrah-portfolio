// WEIGHT — ROTATED TYPE AND ITS CELL BOXES.
//
// *** UNRESTORED. THIS HARNESS DOES NOT CURRENTLY ASSERT ANYTHING. ***
//
// This file was rewritten from its documented description after the original was lost, and the description does not
// match the code it was meant to check. It says "each cell clips its own box", but `StudyWeight.vue` sets
// `.study-weight .cell { overflow: visible }` — the cells do not clip. The words are MEANT to cross their cell
// rules; that crossing is the study. So:
//
//   * "pixels dark on a clip edge" counts ink crossing a boundary that is not a clip — and cannot tell whose ink
//     it is looking at, so a neighbour's word counts as this cell's.
//   * "own word past its own cell box" measures the intended overflow, correctly and uselessly.
//
// Neither is a defect signal. The recorded pre-branch numbers (49 flagged of 288 checked) also cannot be
// reproduced: the study has exactly 6 cells at every viewport, so 288 means twice as many sample points as the 4
// viewports x 6 progress steps here, and the flagged ratio differs too much for the difference to be scale alone
// (43% here against 17% recorded). Rather than tune the numbers until they matched, this prints both measurements
// and reports UNVERIFIED. Recovering what WEIGHT should actually be asserted against is its own small task.
// node edge.cjs <port> [webkit|chrome]
const pw = require('playwright')
const sharp = require('sharp')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, engine = 'webkit'] = process.argv.slice(2)
const VIEWS = [[1920, 1080], [1366, 768], [390, 844], [320, 568]]
const PROGRESS = [0, 0.2, 0.4, 0.6, 0.8, 1]

;(async () => {
  const b = engine === 'chrome' ? await pw.chromium.launch({ channel: 'chrome' }) : await pw.webkit.launch()
  let checked = 0, flagged = 0, worst = { n: 0, at: '' }
  let over = 0, worstOver = { px: 0, at: '' }
  for (const [w, h] of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 })
    const p = await ctx.newPage()
    await p.goto(`http://127.0.0.1:${port}/tr/lab/weight`, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(2200)
    for (const f of PROGRESS) {
      await p.evaluate((v) => { const t = document.querySelector('.track'); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * v) }, f)
      await sleep(700)
      const cells = await p.evaluate(() => [...document.querySelectorAll('.study-weight .cell')].map((e) => {
        const r = e.getBoundingClientRect()
        // GLYPH OWNERSHIP, not pixels: the cell's own word is measured through its own rects (transforms included),
        // so a neighbour's ink cannot be counted as this cell's. This is the assertion; the pixel scan below is
        // informational only, because it cannot tell whose ink it is looking at.
        const own = [...e.querySelectorAll('.t'), ...(e.querySelector('.t') ? [] : [e])]
        let ox = 0
        for (const t of own) for (const tr of t.getClientRects()) {
          ox = Math.max(ox, r.left - tr.left, tr.right - r.right, r.top - tr.top, tr.bottom - r.bottom)
        }
        return { t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 12), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), ox: Math.round(ox) }
      }))
      const { data, info } = await sharp(await p.screenshot()).greyscale().raw().toBuffer({ resolveWithObject: true })
      const dark = (x, y) => x >= 0 && y >= 0 && x < info.width && y < info.height && data[y * info.width + x] < 110
      for (const c of cells) {
        if (c.w < 4 || c.h < 4) continue
        checked++
        if (c.ox > 1) { over++; if (c.ox > worstOver.px) worstOver = { px: c.ox, at: `${c.ox}px ${w}x${h} p${f} ${c.t}` } }
        let n = 0
        for (let x = c.x; x < c.x + c.w; x++) { if (dark(x, c.y)) n++; if (dark(x, c.y + c.h - 1)) n++ }
        for (let y = c.y; y < c.y + c.h; y++) { if (dark(c.x, y)) n++; if (dark(c.x + c.w - 1, y)) n++ }
        if (n > 0) {
          flagged++
          if (n > worst.n) worst = { n, at: `${n}px ${w}x${h} p${f} ${c.t}` }
        }
      }
    }
    await ctx.close()
  }
  await b.close()
  console.log(`
  ${engine}: cells checked ${checked}`)
  console.log(`  own word past its own cell box: ${String(over).padStart(3)}  | worst ${worstOver.at || 'none'}`)
  console.log(`  pixels dark on a cell boundary: ${String(flagged).padStart(3)}  | worst ${worst.at || 'none'}`)
  console.log(`EDGE (${engine}): UNVERIFIED — neither number is a defect signal; see the header`)
  process.exit(0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
