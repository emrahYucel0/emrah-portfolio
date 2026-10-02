// THE STAIRCASE ALONG A ROW — measured at the review machine's own configuration, mouse never touched.
//
//   node lfstairs.cjs <port> [locale]
//
// A row on this surface is not a horizontal line. In the shader its centre is
//
//     y = vy + A * s * waveT(x * f + r * 2.399 + t)
//
// so y varies ALONG the row with x, each row carries its own phase offset (r * 2.399), and the whole thing moves with
// t. Nothing is snapped to the pixel grid. A nearly-horizontal line that drifts across pixel boundaries rasterises
// into a staircase, and as t advances the steps travel along the row. That is what is measured here — not the
// difference BETWEEN rows, which a vertical column shows and which turned out to be a different effect altogether.
//
// For one row, at every x: the sub-pixel centre of the row, the brightness there, and from those:
//
//   AMPLITUDE   how far the row's centre wanders over its length, in device pixels. Under one pixel means the row
//               never leaves its pixel; over one means it must step.
//   STEPS       how many times the rendered centre crosses a pixel boundary along the row, and the median run of
//               pixels between crossings — the tread of the staircase.
//   TRAVEL      how far the whole pattern shifts between frames, by cross-correlation, in pixels per second.
//   ALONG       how much the brightness varies along one row, which is what a step looks like to the eye.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, loc = 'tr'] = process.argv.slice(2)
const OUT = 'out/linefield/stairs'
const FRAMES = 40
const GAP = 50

const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const sd = (a) => {
  if (a.length < 2) return 0
  const m = a.reduce((x, y) => x + y, 0) / a.length
  return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1))
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  console.log('== THE STAIRCASE ALONG A ROW   /' + loc + '   (mouse never touched)')
  console.log('')
  console.log('   ground            size       row y  pitch  amplitude  steps  tread  along(sd)  travel      redraw')

  const GROUNDS = [
    ['Full-Stack dark ', 'system', null],
    ['Creative cream  ', 'creative', null],
    ['Linefield dark  ', 'linefield', 0],
    ['Linefield cream ', 'linefield', 1],
  ]
  for (const cfg of [[1920, 1080, 1], [1440, 900, 1]]) {
    const W = cfg[0]
    const H = cfg[1]
    const dpr = cfg[2]
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
    const p = await ctx.newPage()
    await p.goto('http://127.0.0.1:' + port + '/' + loc, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 }).catch(() => {})
    await sleep(2800)
    const STOP = await stopsOf(p)

    for (const g of GROUNDS) {
      const name = g[0]
      const place = g[1]
      const lfp = g[2]
      if (STOP[place] === undefined) continue
      await p.evaluate((i) => window.__lab.go(i), STOP[place])
      await sleep(2600)
      if (lfp !== null) { await p.evaluate((v) => window.__lab.lfSet(v), lfp); await sleep(500) }
      await p.evaluate(() => document.querySelectorAll('.layer, .strip, #__nuxt').forEach((e) => { e.style.visibility = 'hidden' }))
      await sleep(300)

      // find one row to follow: the strongest extremum in a column, in the upper third away from the type
      const first = await p.screenshot()
      const r0 = await sharp(first).raw().toBuffer({ resolveWithObject: true })
      const midX = Math.round(W * 0.08)
      const yA = Math.round(H * 0.22)
      const yB = Math.round(H * 0.42)
      const colProf = []
      for (let y = yA; y < yB; y++) colProf.push(lum(r0.data, (y * r0.info.width + midX) * r0.info.channels))
      const mid = med(colProf)
      const darkGround = Math.max.apply(null, colProf) - mid >= mid - Math.min.apply(null, colProf)
      let rowY = yA
      let bestV = -1
      for (let i = 1; i < colProf.length - 1; i++) {
        const v = darkGround ? colProf[i] - mid : mid - colProf[i]
        if (v > bestV && (darkGround ? colProf[i] >= colProf[i - 1] && colProf[i] >= colProf[i + 1] : colProf[i] <= colProf[i - 1] && colProf[i] <= colProf[i + 1])) { bestV = v; rowY = yA + i }
      }

      /*
       * THE WINDOW MUST BE NARROWER THAN HALF THE PITCH, or the follower hops to a neighbour. A first version searched
       * +-5 px while Full-Stack's rows are 4.3 px apart, so it locked onto whichever of two or three rows happened to
       * be brightest: 363 "steps" with a tread of 1 px, which is a hopping follower and not a staircase. The pitch is
       * measured first, and the row is then followed CONTINUOUSLY — each x searches a narrow window around where the
       * row was at the previous x, so it cannot change rows however gently it slopes.
       */
      const peaks = []
      for (let i = 1; i < colProf.length - 1; i++) {
        const up = darkGround ? colProf[i] >= colProf[i - 1] && colProf[i] >= colProf[i + 1] : colProf[i] <= colProf[i - 1] && colProf[i] <= colProf[i + 1]
        if (up && Math.abs(colProf[i] - mid) > 6) peaks.push(yA + i)
      }
      const pitch = peaks.length > 2 ? med(peaks.slice(1).map((v, i) => v - peaks[i])) : 6
      const win = Math.max(1, Math.floor(pitch / 2 - 0.5))
      const x0 = Math.round(W * 0.06)
      const x1 = Math.round(W * 0.94)
      const series = []
      const brightSeries = []
      let changes = 0
      let prev = null
      for (let f = 0; f < FRAMES; f++) {
        const png = await p.screenshot()
        const r = await sharp(png).raw().toBuffer({ resolveWithObject: true })
        const ys = []
        const bs = []
        let track = rowY
        for (let x = x0; x < x1; x++) {
          let bi = Math.round(track)
          let bv = -1e9
          for (let y = Math.round(track) - win; y <= Math.round(track) + win; y++) {
            const v = darkGround ? lum(r.data, (y * r.info.width + x) * r.info.channels) : -lum(r.data, (y * r.info.width + x) * r.info.channels)
            if (v > bv) { bv = v; bi = y }
          }
          const at = (y) => { const v = lum(r.data, (y * r.info.width + x) * r.info.channels); return darkGround ? v : -v }
          const a = at(bi - 1), c0 = at(bi), c = at(bi + 1)
          const den = a - 2 * c0 + c
          const sub = bi + (den !== 0 ? Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / den)) : 0)
          ys.push(sub)
          bs.push(Math.abs(c0))
          track = sub
        }
        series.push(ys)
        brightSeries.push(bs)
        if (prev) {
          let n = 0
          for (let i = 0; i < ys.length; i += 7) if (Math.abs(ys[i] - prev[i]) > 0.02) n++
          if (n > 0) changes++
        }
        prev = ys
        if (f === 0) {
          fs.writeFileSync(OUT + '/' + name.trim().replace(/[^a-z]+/gi, '-') + '-' + W + 'x' + H + '.png', png)
          await sharp(png).extract({ left: x0, top: Math.max(0, rowY - 14), width: Math.min(220, x1 - x0), height: 28 })
            .resize({ width: 1100, kernel: 'nearest' }).toFile(OUT + '/CROP-' + name.trim().replace(/[^a-z]+/gi, '-') + '-' + W + 'x' + H + '.png')
        }
        await sleep(GAP)
      }

      const ref = series[0]
      const amp = Math.max.apply(null, ref) - Math.min.apply(null, ref)
      // the rendered staircase: how often the integer pixel the row sits in changes along its length
      let steps = 0
      const runs = []
      let run = 0
      for (let i = 1; i < ref.length; i++) {
        run++
        if (Math.round(ref[i]) !== Math.round(ref[i - 1])) { steps++; runs.push(run); run = 0 }
      }
      // how far the pattern travels: the shift that best lines up the last frame with the first
      let bestShift = 0
      let bestErr = 1e18
      const last = series[series.length - 1]
      for (let sh = -40; sh <= 40; sh++) {
        let e = 0
        let n = 0
        for (let i = 50; i < ref.length - 50; i += 3) {
          const j = i + sh
          if (j < 0 || j >= last.length) continue
          const d = ref[i] - last[j]
          e += d * d
          n++
        }
        if (n > 100 && e / n < bestErr) { bestErr = e / n; bestShift = sh }
      }
      const seconds = (FRAMES - 1) * GAP / 1000
      const travel = (bestShift / seconds).toFixed(1) + 'px/s'
      const along = sd(brightSeries[0])
      const cadence = changes ? ((FRAMES - 1) * GAP / changes).toFixed(0) + 'ms' : 'never'
      console.log('   ' + name + ' ' + (W + 'x' + H).padEnd(11) + String(rowY).padEnd(6) + pitch.toFixed(1).padEnd(7) + amp.toFixed(2).padEnd(11)
        + String(steps).padEnd(7) + (runs.length ? med(runs).toFixed(0) : '-').padEnd(7)
        + along.toFixed(1).padEnd(11) + travel.padEnd(12) + cadence)
    }
    await ctx.close()
  }
  await b.close()
  console.log('')
  console.log('   amplitude/tread/travel in device pixels; along(sd) is 0-255 luminance along one row')
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
