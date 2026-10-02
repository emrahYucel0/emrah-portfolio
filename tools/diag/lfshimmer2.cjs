// WHY THE DARK GROUNDS SHIMMER AND THE CREAM ONES DO NOT — with the pointer never touched.
//
//   node lfshimmer2.cjs <port> [locale]
//
// The mouse is never moved: no pointer event is dispatched at all, so nothing here can be the pointer ripple. A narrow
// column of ground is read, away from the centre where the type is, and the rows in it are found as peaks of a vertical
// profile. Then, over sixty frames:
//
//   PITCH        the spacing between neighbouring rows, in device pixels — the density the eye is given.
//   WIDTH        each row's width at half its own height, in device pixels. Under about one device pixel a row cannot
//                land on the grid without changing brightness as it moves.
//   PEAK         how bright each row gets, and how much neighbouring rows DIFFER from one another in one frame. This
//                is the "some white, some grey" in the report.
//   CRAWL        how much each row's brightness changes from frame to frame, and how far its centre MOVES — the wave
//                displaces rows by a continuous amount, with a per-row phase (r * 2.399 in the shader), so neighbours
//                move differently at the same instant.
//
// Everything is reported in DEVICE pixels, because that is where the resampling happens.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, loc = 'tr'] = process.argv.slice(2)
const OUT = 'out/linefield/shimmer'
const FRAMES = 60

const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const sd = (a) => {
  if (a.length < 2) return 0
  const m = a.reduce((x, y) => x + y, 0) / a.length
  return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1))
}

/** the vertical brightness profile of a narrow column, averaged across its width */
function profileOf(data, info, x0, w, y0, y1) {
  const out = new Float64Array(y1 - y0)
  for (let y = y0; y < y1; y++) {
    let s = 0
    for (let x = x0; x < x0 + w; x++) s += lum(data, (y * info.width + x) * info.channels)
    out[y - y0] = s / w
  }
  return out
}

/** rows are the local maxima of that profile; each one's height, sub-pixel centre and width at half height */
function rowsIn(prof, floorLevel) {
  const rows = []
  for (let i = 1; i < prof.length - 1; i++) {
    if (prof[i] <= prof[i - 1] || prof[i] < prof[i + 1]) continue
    if (prof[i] - floorLevel < 6) continue
    // a parabola through the three samples gives the peak's sub-pixel centre and height
    const a = prof[i - 1], b = prof[i], c = prof[i + 1]
    const den = a - 2 * b + c
    const off = den !== 0 ? 0.5 * (a - c) / den : 0
    const peak = b - 0.25 * (a - c) * off
    // width at half the peak's height above the floor
    const half = floorLevel + (peak - floorLevel) / 2
    let up = i
    while (up > 0 && prof[up] > half) up--
    let dn = i
    while (dn < prof.length - 1 && prof[dn] > half) dn++
    rows.push({ y: i + off, peak, width: dn - up })
  }
  return rows
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })

  // what this machine actually is, with no override at all
  const probe = await b.newContext()
  const pp = await probe.newPage()
  await pp.goto('http://127.0.0.1:' + port + '/' + loc, { waitUntil: 'load', timeout: 90000 })
  const host = await pp.evaluate(() => ({ dpr: devicePixelRatio, w: screen.width, h: screen.height, aw: window.outerWidth, ih: window.innerHeight }))
  console.log('== THE DARK GROUNDS, pointer never touched   /' + loc)
  console.log('   this machine, no override: devicePixelRatio ' + host.dpr + ', screen ' + host.w + 'x' + host.h)
  await probe.close()

  const GROUNDS = [
    ['Full-Stack dark ', 'system', null],
    ['Linefield dark  ', 'linefield', 0],
    ['Creative cream  ', 'creative', null],
    ['Linefield cream ', 'linefield', 1],
  ]
  const CONFIGS = [[1440, 900, 1], [1440, 900, 2], [390, 844, 3], [1440, 900, 1.5]]

  console.log('')
  console.log('   ground            size      dpr   backing  pitch(dev/css)  width  peak med  neighbour spread  crawl(bright)  crawl(move)  redraw   polarity')
  for (const cfg of CONFIGS) {
    const W = cfg[0]
    const H = cfg[1]
    const dpr = cfg[2]
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
    const p = await ctx.newPage()
    await p.goto('http://127.0.0.1:' + port + '/' + loc, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 }).catch(() => {})
    await sleep(2800)
    const STOP = await stopsOf(p)
    const back = await p.evaluate(() => {
      const c = document.querySelector('canvas#surface') || document.querySelector('canvas')
      return { buf: c ? [c.width, c.height] : null, uDpr: window.__lab.V.dpr * window.__lab.V.u, shot: devicePixelRatio }
    })

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

      const sc = back.shot
      const shotW = Math.round(W * sc)
      const shotH = Math.round(H * sc)
      // a column near the left edge: ground only, never the words in the middle
      const x0 = Math.round(shotW * 0.06)
      const colW = Math.max(3, Math.round(4 * sc))
      const y0 = Math.round(shotH * 0.2)
      const y1 = Math.round(shotH * 0.8)

      const series = []
      let firstPng = null
      let polarity = ''
      for (let f = 0; f < FRAMES; f++) {
        const png = await p.screenshot()
        if (f === 0) firstPng = png
        const r = await sharp(png).raw().toBuffer({ resolveWithObject: true })
        let prof = profileOf(r.data, r.info, x0, colW, y0, y1)
        /*
         * ROWS ARE EXTREMA AWAY FROM THE GROUND, and which way that is depends on the ground. A first version looked
         * for bright maxima and read ZERO rows on both cream grounds — where the ink is dark and a row is a MINIMUM.
         * The ground is the profile's median; whichever side of it reaches further is where the rows are, and a cream
         * profile is flipped so one peak-finder serves both.
         */
        const mid = med([...prof])
        const hi = Math.max.apply(null, [...prof])
        const lo = Math.min.apply(null, [...prof])
        const darkGround = (hi - mid) >= (mid - lo)
        if (!darkGround) prof = Float64Array.from(prof, (v) => 2 * mid - v)
        const floorLevel = med([...prof])
        series.push(rowsIn(prof, floorLevel))
        if (f === 0) polarity = darkGround ? 'rows bright on dark' : 'rows dark on cream'
        await sleep(33)
      }

      // the frame with the most rows decides the row count; rows are matched between frames by nearest centre
      const ref = series.reduce((m, s) => (s.length > m.length ? s : m), series[0])
      const pitch = ref.length > 2 ? med(ref.slice(1).map((r, i) => r.y - ref[i].y)) : 0
      const widths = ref.map((r) => r.width)
      const peaks = ref.map((r) => r.peak)
      const neighbourSpread = ref.length > 2 ? med(ref.slice(1).map((r, i) => Math.abs(r.peak - ref[i].peak))) : 0
      // follow each row of the reference through every frame
      const bright = []
      const moved = []
      for (const r0 of ref) {
        const bs = []
        const ys = []
        for (const s of series) {
          let best = null
          for (const r of s) if (!best || Math.abs(r.y - r0.y) < Math.abs(best.y - r0.y)) best = r
          if (best && Math.abs(best.y - r0.y) < Math.max(2, pitch / 2)) { bs.push(best.peak); ys.push(best.y) }
        }
        if (bs.length > FRAMES * 0.5) { bright.push(sd(bs)); moved.push(Math.max(...ys) - Math.min(...ys)) }
      }
      // HOW OFTEN THE IMAGE CHANGES AT ALL. A settled page draws only when something marks it dirty, so the wave does
      // not run continuously — it advances when a redraw happens. The cadence is as much the story as the amplitude.
      let changes = 0
      let prevBuf = null
      const diffs = []
      for (let f = 0; f < 40; f++) {
        const shot = await p.screenshot()
        if (prevBuf) {
          let n = 0
          const a = await sharp(prevBuf).raw().toBuffer({ resolveWithObject: true })
          const c = await sharp(shot).raw().toBuffer({ resolveWithObject: true })
          for (let i = 0; i < a.data.length; i += 4 * 97) if (Math.abs(a.data[i] - c.data[i]) > 2) n++
          if (n > 0) { changes++; diffs.push(n) }
        }
        prevBuf = shot
        await sleep(50)
      }
      const cadence = changes ? (39 * 50 / changes).toFixed(0) + 'ms' : 'never'

      fs.writeFileSync(OUT + '/' + name.trim().replace(/[^a-z]+/gi, '-') + '-' + W + 'x' + H + '@' + dpr + '.png', firstPng)
      await sharp(firstPng).extract({ left: x0 - 2, top: y0, width: Math.min(60, shotW - x0), height: Math.min(120, y1 - y0) }).resize({ width: 480, kernel: 'nearest' }).toFile(OUT + '/CROP-' + name.trim().replace(/[^a-z]+/gi, '-') + '-' + W + 'x' + H + '@' + dpr + '.png')
      console.log('   ' + name + ' ' + (W + 'x' + H).padEnd(9) + String(dpr).padEnd(5) + ' ' + (back.buf ? back.buf.join('x') : '-').padEnd(9)
        + (pitch.toFixed(2) + ' / ' + (pitch / sc).toFixed(2)).padEnd(16)
        + med(widths).toFixed(1).padEnd(7) + med(peaks).toFixed(0).padEnd(10)
        + neighbourSpread.toFixed(1).padEnd(18) + med(bright).toFixed(2).padEnd(15) + med(moved).toFixed(2).padEnd(13) + cadence.padEnd(9) + polarity)
    }
    await ctx.close()
  }
  await b.close()
  console.log('')
  console.log('   peak/spread/crawl(bright) are 0-255 luminance; pitch, width and crawl(move) are device pixels')
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
