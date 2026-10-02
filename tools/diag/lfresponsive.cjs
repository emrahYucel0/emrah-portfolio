// LINEFIELD ACROSS THE SIZE MATRIX — the passage's geometry depends on the aspect ratio, its cost on the pixel count.
//
//   node lfresponsive.cjs <port> <phones|tablets|laptops|wide> [locale]
//
// WHAT IS MEASURED AT EACH SIZE, from rendered stills, at both ends of the passage and at four points through it:
//
//   ROWS PER CAPITAL  the type is built on the row grid, so under about twelve rows a capital stops being made of
//                     rows and becomes a shape with lines on it.
//   CLEARANCE         the words must sit inside the band between the strips and clear of the side edges. The site
//                     keeps a strip at the top and bottom of every screen and no row ever enters one.
//   THE LABEL         legible, and not crossed by the field: a band is cleared behind it, so the rows must not be
//                     inside its rectangle.
//   THE WIDE FAN      at 28%, rays running out past the far screen edge and past the top and bottom of the field.
//   THE NEEDLE        at 48%, flattened across the whole width; at 50%, one rust line on the horizon.
//   THE MOUTH         at 70%, the far end is a short aperture rather than a point.
//
// The double exposure at entry and exit is NOT here: LF.wordsGate() is a pure function of transition progress with no
// viewport term in it, so it cannot vary with size. It is measured once per class by lfseam.cjs instead of 70 times.
//
// The chrome is hidden before every sample — the runtime's own layers and strips AND the Nuxt shell, whose header
// stays painted and whose subpixel antialiasing reads as the accent (see the record in lfseam.cjs).
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, group = 'phones', loc = 'tr', mode] = process.argv.slice(2)
// The eight words are the same English set in both languages (the Step 2 decision), so only the HALF LABELS are
// localised — and a labels pass needs the two rest states and nothing else.
const LABELS_ONLY = mode === 'labels'
const OUT = 'out/linefield/responsive'
let fails = 0
const offSizes = []

// native DPR per class, plus one representative per class at DPR 1 as well: the row grid snaps through V.u and
// V.dpr, so the same CSS size can snap differently at a different device ratio
const GROUPS = {
  phones: [[360, 800, 3], [375, 667, 3], [390, 844, 3], [390, 844, 1], [430, 932, 3], [844, 390, 3], [932, 430, 3]],
  tablets: [[768, 1024, 2], [1024, 768, 2], [768, 1024, 1], [820, 1180, 2], [1180, 820, 2], [1024, 1366, 2], [1366, 1024, 2]],
  laptops: [[1280, 800, 1], [1366, 768, 1], [1440, 900, 2], [1440, 900, 1], [1536, 864, 1], [1728, 1117, 2]],
  wide: [[1920, 1080, 1], [2560, 1440, 2], [2560, 1440, 1], [3440, 1440, 1], [3840, 2160, 2]],
}

const raw = async (p) => {
  const png = await p.screenshot()
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
  return { png, data, info }
}

/** a vertical run of ink-coloured pixels this long is type; the field's own rows never make one */
function typeBox(f, ink, box, run0) {
  const W = f.info.width
  const c = f.info.channels
  const near = (i) => Math.max(Math.abs(f.data[i] - ink[0]), Math.abs(f.data[i + 1] - ink[1]), Math.abs(f.data[i + 2] - ink[2])) <= 46
  let n = 0
  let x0 = 1e9
  let x1 = -1
  let y0 = 1e9
  let y1 = -1
  const xEnd = Math.min(box.x + box.w, W)
  const yEnd = Math.min(box.y + box.h, f.info.height)
  for (let x = Math.max(0, box.x); x < xEnd; x++) {
    let run = 0
    for (let y = Math.max(0, box.y); y <= yEnd; y++) {
      if (y < yEnd && near((y * W + x) * c)) { run++; continue }
      if (run >= run0) {
        n += run
        if (y - run < y0) y0 = y - run
        if (y - 1 > y1) y1 = y - 1
        if (x < x0) x0 = x
        if (x > x1) x1 = x
      }
      run = 0
    }
  }
  return { n, x0, x1, y0, y1 }
}

/*
 * AND WHERE THE FIELD IS, which is a different question from where the type is.
 *
 * typeBox() asks whether a pixel is near the INK colour, which is right for the words — a letter is solid ink. It is
 * wrong for the field once the fan has flattened: at 48% the rows are a thin partial blend over the ground, nowhere
 * near solid, and asking for near-ink found ZERO at every phone size while the rust line — which is drawn inside the
 * needle — was found at all of them. Measured at 390x844: near-ink 0 px, not-ground 780 px spanning the full width.
 */
function groundBox(f, ground, box, tol) {
  const W = f.info.width
  const c = f.info.channels
  let n = 0
  let x0 = 1e9
  let x1 = -1
  let y0 = 1e9
  let y1 = -1
  const xEnd = Math.min(box.x + box.w, W)
  const yEnd = Math.min(box.y + box.h, f.info.height)
  for (let y = Math.max(0, box.y); y < yEnd; y++) {
    for (let x = Math.max(0, box.x); x < xEnd; x++) {
      const i = (y * W + x) * c
      if (Math.max(Math.abs(f.data[i] - ground[0]), Math.abs(f.data[i + 1] - ground[1]), Math.abs(f.data[i + 2] - ground[2])) > tol) {
        n++
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return { n, x0, x1, y0, y1 }
}

/** anything that is not the ground, counted over a list of points */
function litOn(f, ground, pts) {
  let n = 0
  for (const pt of pts) {
    const x = pt[0]
    const y = pt[1]
    if (x < 0 || y < 0 || x >= f.info.width || y >= f.info.height) continue
    const i = (y * f.info.width + x) * f.info.channels
    if (Math.max(Math.abs(f.data[i] - ground[0]), Math.abs(f.data[i + 1] - ground[1]), Math.abs(f.data[i + 2] - ground[2])) > 6) n++
  }
  return n
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const sizes = GROUPS[group]
  if (!sizes) { console.log('unknown group ' + group); process.exit(1) }
  const b = await pw.chromium.launch({ channel: 'chrome' })
  console.log('== LINEFIELD RESPONSIVE — ' + group + ', /' + loc + ', port ' + port)
  console.log('   size         dpr  rows/cap  words  label  fan28  needle48  rust50  mouth70')

  for (const sz of sizes) {
    const W = sz[0]
    const H = sz[1]
    const dpr = sz[2]
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 90)))
    await p.goto('http://127.0.0.1:' + port + '/' + loc, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 }).catch(() => {})
    await sleep(2600)
    const STOP = await stopsOf(p)
    if (STOP.linefield === undefined) { console.log('  !!  no passage in this build'); await ctx.close(); continue }
    const hideChrome = () => p.evaluate(() => document.querySelectorAll('.layer, .strip, #__nuxt').forEach((e) => { e.style.visibility = 'hidden' }))
    await p.evaluate((i) => window.__lab.go(i), STOP.linefield)
    await sleep(2800)

    // the geometry the site is working to. A screenshot is in DEVICE pixels; the site composes in its own logical
    // units (V.W/V.H) and shows them scaled by V.u, so every CSS measure is multiplied by u and by the shot's ratio.
    const geo = await p.evaluate(() => {
      const V = window.__lab.V
      return { u: V.u, dpr: V.dpr, VW: V.W, VH: V.H, strip: V.strip, shot: devicePixelRatio, P: V.P, T: V.T, S: V.S }
    })
    const sc = geo.shot
    const stripPx = Math.round(geo.strip * geo.u * sc)
    const shotW = Math.round(W * sc)
    const shotH = Math.round(H * sc)
    const band = { x: 0, y: stripPx, w: shotW, h: shotH - 2 * stripPx }

    const at = async (v) => {
      await p.evaluate((x) => window.__lab.lfSet(x), v)
      await sleep(260)
      await hideChrome()
      const f = await raw(p)
      const pr = await p.evaluate(() => window.__lab.lfProbe())
      return { f, pr }
    }

    const notes = []
    const check = (good, key, detail) => {
      if (!good) { fails++; notes.push(key + ': ' + detail) }
      return good
    }
    const tag = (W + 'x' + H + '@' + dpr + '-' + loc)

    // ── the two rest states ─────────────────────────────────────────────────────────────────────
    let rowsPerCap = null
    let wordsOk = true
    let labelOk = true
    for (const end of [0, 1]) {
      const name = end === 0 ? 'back' : 'front'
      const r = await at(end)
      rowsPerCap = r.pr.rowsPerCap
      const t = typeBox(r.f, r.pr.ink, band, 3)
      const present = t.n > 200
      const inBand = present && t.y0 >= band.y && t.y1 <= band.y + band.h
      const offEdge = present && t.x0 > 2 && t.x1 < shotW - 3
      if (!check(inBand && offEdge, 'words ' + name, 'ink ' + t.n + 'px, box x ' + t.x0 + '..' + t.x1 + ' y ' + t.y0 + '..' + t.y1 + ', band y ' + band.y + '..' + (band.y + band.h) + ', width ' + shotW)) wordsOk = false
      // the half label: the field must not cross the rectangle its type sits in
      const lab = await p.evaluate((sel) => {
        const e = document.querySelector(sel)
        if (!e) return null
        const q = e.getBoundingClientRect()
        return { x: q.x, y: q.y, w: q.width, h: q.height, text: (e.textContent || '').trim() }
      }, end === 0 ? '.lf-back span' : '.lf-front span')
      if (lab && lab.w > 0) {
        const lb = { x: Math.round(lab.x * sc), y: Math.round(lab.y * sc), w: Math.round(lab.w * sc), h: Math.round(lab.h * sc) }
        const inside = typeBox(r.f, r.pr.ink, { x: lb.x - 2, y: lb.y - 2, w: lb.w + 4, h: lb.h + 4 }, 3)
        if (!check(inside.n < Math.max(40, lb.w * 0.04), 'label ' + name, inside.n + 'px of field inside "' + lab.text + '" rect ' + lb.w + 'x' + lb.h)) labelOk = false
      } else if (!check(false, 'label ' + name, 'no label span in the DOM')) labelOk = false
      if (!wordsOk || !labelOk) fs.writeFileSync(OUT + '/' + tag + '-rest-' + name + '.png', r.f.png)
    }

    if (LABELS_ONLY) {
      const t2 = (v) => (v ? ' ok  ' : ' OFF ')
      console.log('   ' + (W + 'x' + H).padEnd(12) + String(dpr).padEnd(4) + ' labels only:' + t2(labelOk) + '  rows/cap ' + rowsPerCap)
      for (const n of notes) console.log('                  - ' + n)
      if (notes.length) offSizes.push(W + 'x' + H + '@' + dpr)
      await ctx.close()
      continue
    }

    // ── the wide fan at 28% ─────────────────────────────────────────────────────────────────────
    const fan = await at(0.28)
    const vxShot = fan.pr.vx * geo.u * sc
    const farX = vxShot < shotW / 2 ? shotW - 2 : 1
    const colPts = []
    for (let y = band.y; y < band.y + band.h; y += 2) colPts.push([farX, y])
    const edgeRays = litOn(fan.f, fan.pr.ground, colPts)
    const rowPts = []
    for (let x = 0; x < shotW; x += 2) { rowPts.push([x, band.y + 1]); rowPts.push([x, band.y + band.h - 2]) }
    const tbRays = litOn(fan.f, fan.pr.ground, rowPts)
    const fanOk = check(edgeRays > 0 && tbRays > 0, 'fan 28%', 'far edge ' + edgeRays + ' rows lit, field top+bottom ' + tbRays + 'px')
    if (!fanOk) fs.writeFileSync(OUT + '/' + tag + '-fan28.png', fan.f.png)

    // ── the needle at 48%, the rust line at 50% ─────────────────────────────────────────────────
    const nd = await at(0.48)
    const nb = groundBox(nd.f, nd.pr.ground, band, 6)
    const ndW = nb.n ? nb.x1 - nb.x0 + 1 : 0
    const needleOk = check(ndW > shotW * 0.9, 'needle 48%', 'spans ' + ndW + 'px of ' + shotW)
    if (!needleOk) fs.writeFileSync(OUT + '/' + tag + '-needle48.png', nd.f.png)

    const cr = await at(0.5)
    const ly = Math.round(cr.pr.lineY * geo.u * sc)
    let rust = 0
    for (let y = Math.max(0, ly - 5); y <= Math.min(shotH - 1, ly + 5); y++) {
      for (let x = 0; x < shotW; x += 2) {
        const i = (y * cr.f.info.width + x) * cr.f.info.channels
        if (Math.abs(cr.f.data[i] - 0xb8) <= 30 && Math.abs(cr.f.data[i + 1] - 0x62) <= 30 && Math.abs(cr.f.data[i + 2] - 0x2f) <= 30) rust++
      }
    }
    const rustOk = check(rust > shotW * 0.2, 'rust 50%', rust + 'px near the accent within 5px of the horizon (y ' + ly + ')')
    if (!rustOk) fs.writeFileSync(OUT + '/' + tag + '-rust50.png', cr.f.png)

    // ── the mouth at 70% ───────────────────────────────────────────────────────────────────────
    /*
     * THE MOUTH IS MEASURED WHERE IT IS DEFINED, which is AT FULL DEPTH.
     *
     * Three definitions were wrong before this one. Near-ink found nothing, because the flattened field is a partial
     * blend and not solid ink. One column eight CSS pixels inside the point read 28-34% at every phone size — the
     * signature of the measurement, since that is twenty-four device pixels at DPR 3 and the spread grows with the
     * distance from the horizon. And the narrowest column, correctly found, still read 26% at 70% — because the
     * aperture TRACKS DEPTH, and at 70% depth has fallen to 0.74 and the fan has legitimately reopened.
     *
     * Profiled at both 390x844 and 1440x900, the two agreeing within half a per cent at every progress: 45% at depth
     * 0.56, 11% at 0.94, then 1.1-5.4% through the full-depth stretch, 0.3% at the crossing. So "a few per cent of
     * the screen height" is a property of the deep corridor, and that is where it is asserted — non-zero, so the far
     * end is an opening and not a point, and under eight per cent, so it is still narrow.
     */
    const aperture = async (v) => {
      const fr = await at(v)
      const vxs = Math.round(fr.pr.vx * geo.u * sc)
      const dir = vxs < shotW / 2 ? 1 : -1
      let best = 0
      for (let d = 1; d <= Math.round(48 * sc); d++) {
        const x = vxs + dir * d
        if (x < 0 || x >= shotW) continue
        const cb = groundBox(fr.f, fr.pr.ground, { x, y: band.y, w: 1, h: band.h }, 6)
        if (!cb.n) continue
        const ext = cb.y1 - cb.y0 + 1
        if (best === 0 || ext < best) best = ext
      }
      return { px: best, pc: +(100 * best / band.h).toFixed(1), depth: +fr.pr.seq.depth.toFixed(2), png: fr.f.png }
    }
    const profile = []
    for (const v of [0.28, 0.42, 0.5, 0.58, 0.7]) profile.push([v, await aperture(v)])
    const deep = profile.filter((e) => e[0] === 0.42 || e[0] === 0.58).map((e) => e[1])
    const mouthOk = check(deep.every((a) => a.px >= 2 && a.pc < 8), 'mouth at full depth', deep.map((a) => a.px + 'px/' + a.pc + '%').join(' and '))
    const mouthPc = deep.map((a) => a.pc).join('/')
    if (!mouthOk) for (const e of profile) fs.writeFileSync(OUT + '/' + tag + '-aperture-' + Math.round(e[0] * 100) + '.png', e[1].png)

    const rowsOk = check(rowsPerCap >= 12, 'rows/cap', String(rowsPerCap))
    if (errs.length) check(false, 'page errors', errs.slice(0, 2).join(' | '))

    const t = (v) => (v ? ' ok  ' : ' OFF ')
    console.log('   ' + (W + 'x' + H).padEnd(12) + String(dpr).padEnd(4) + ' ' + (String(rowsPerCap) + (rowsOk ? '' : ' LOW')).padEnd(9) + t(wordsOk) + ' ' + t(labelOk) + ' ' + t(fanOk) + ' ' + t(needleOk) + '    ' + t(rustOk) + ' ' + t(mouthOk) + '  u ' + geo.u.toFixed(2) + ' V ' + geo.VW + 'x' + geo.VH + (geo.T ? ' tablet' : '') + (geo.S ? ' short' : '') + (geo.P ? ' portrait' : ''))
    console.log('                  aperture: ' + profile.map((e) => Math.round(e[0] * 100) + '% ' + e[1].pc + '% (depth ' + e[1].depth + ')').join(' · '))
    for (const n of notes) console.log('                  - ' + n)
    if (notes.length) offSizes.push(W + 'x' + H + '@' + dpr)
    await ctx.close()
  }
  await b.close()
  console.log('\n' + group.toUpperCase() + ' /' + loc + ': ' + (fails === 0 ? 'all checks clean' : fails + ' checks off, at ' + offSizes.length + ' sizes (' + offSizes.join(', ') + ')'))
  process.exit(0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
