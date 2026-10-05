// LINEFIELD, ON THE SITE'S OWN PATH — the Phase C gate.
//
//   node linefield.cjs <port> [--only <section>]
//
// Phase B's harnesses drove a debug entry that took the whole screen. The passage is a PLACE now: it is entered
// by travelling to it, its progress is driven by the same gestures the rest of the index is driven by, and it
// hands back to Work at one end and to Full-Stack at the other. So everything is checked here through
// window.__lab — the same object every other harness on this site uses — and nothing is asked of a debug dock.
//
// Nine sections, in the order a visitor meets them:
//
//   ENTER      one gesture out of Full-Stack enters the passage at its start; one out of Work enters it at its
//              end. No place is skipped on the way in, in either direction.
//   EXIT       carried to either end, the next gesture continues along the spine — forward to Work, back to
//              Full-Stack — and one gesture is still one stop.
//   LEGIBLE    both ends are readable: the four words are there, at the size the layout says, clear of the
//              header and footer strips, in both languages.
//   CORRIDOR   the middle is a corridor: rows converge on a vanishing point that is where the map says it is.
//   POINT      just before the crossing the fan is a tip, then a point, then the single line takes the accent.
//   OUTSIDE    nothing is drawn outside the corridor's image, at any progress. Calibrated: it fails on
//              ?lfbreak=inverse, which is the arithmetic that drew dashes past the point.
//   WHOLE      every word is complete at every moment of its flight. Calibrated the same way: each frame is
//              rendered twice, once with ?lfbreak=noextent, and no type pixel of the reference may be missing.
//   REVERSE    the passage is a function of progress and nothing else: arriving at 43% going forwards and
//              arriving at 43% coming back are the same picture.
//   REDUCED    reduced motion shows the two ends and never the middle.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4801'] = process.argv.slice(2)
const oi = process.argv.indexOf('--only')
const ONLY = oi > 0 ? process.argv[oi + 1] : null
const OUT = 'out/linefield/phaseC'

let pass = 0
let fail = 0
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ok   ${msg}`) } else { fail++; console.log(`  FAIL ${msg}`) } }
const note = (msg) => console.log(`       ${msg}`)
const on = (name) => !ONLY || ONLY === name

async function open(b, w, h, locale, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700, ...opts })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 180)))
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 180)) })
  const q = opts.breakName ? `?lfbreak=${opts.breakName}` : ''
  await p.goto(`http://127.0.0.1:${port}/${locale}${q}`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => !!window.__lab?.lfSet, null, { timeout: 60000 })
  await sleep(2200)
  return { ctx, p, errs }
}

const stopOf = (p) => p.evaluate(() => ({ base: window.__lab.A.base, lfp: +window.__lab.A.lfp.toFixed(4), S: window.__lab.STOP }))
const holdAt = async (p, v) => { await p.evaluate((x) => window.__lab.lfSet(x), v); await sleep(200) }

/** travel to a place and let it settle */
const goTo = async (p, name) => { await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), name); await sleep(1500) }

/** wheel in separate gestures — one notch, then a gap long enough for the runtime to call the gesture over */
async function notches(p, n, dir, gap = 330) {
  for (let i = 0; i < n; i++) { await p.mouse.wheel(0, 120 * dir); await sleep(gap) }
}

/** the pixels that are not the ground, inside a box */
function inkBox(data, info, ground, box, tol = 10) {
  let n = 0
  let x0 = 1e9
  let x1 = -1
  let y0 = 1e9
  let y1 = -1
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const i = (y * info.width + x) * info.channels
      const d = Math.max(Math.abs(data[i] - ground[0]), Math.abs(data[i + 1] - ground[1]), Math.abs(data[i + 2] - ground[2]))
      if (d > tol) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    }
  }
  return { n, x0, x1, y0, y1 }
}

/*
 * WHERE THE TYPE IS, as against where the field is.
 *
 * The ruled ground runs edge to edge, so a bounding box of everything that is not the ground colour starts one
 * row below the header strip in every viewport and says nothing about the words. A letter's row is four or five
 * pixels of FULL ink at this pitch and a ground row is one or two of part ink, so a vertical run of at least
 * three full-ink pixels is type and nothing else is.
 */
/*
 * THE LETTERS, AS THE STATE LAID THEM OUT — for the LEGIBLE checks.
 *
 * Each word is drawn by states.js as 900-weight text in the cap band above its baseline, from x (left on the backend,
 * right on the frontend). Here every letter is drawn again into a mask the same way, so the checks know where each
 * glyph is to the pixel. And the fill a letter's row is drawn with is read from what the runtime drew: the corridor
 * program (A.lfWords, the probe's spread) or the base program (a solid row, 0.36 of the pitch either side).
 */
const lettersOf = (p) => p.evaluate(async () => {
  const L = window.__lab
  const pr = L.lfProbe()
  await document.fonts.ready
  const W = Math.ceil(L.V.W)
  const back = !!pr.seq.back
  const x = back ? L.V.W * 0.06 : L.V.W * 0.94
  const FAMILY = '"Big Shoulders Display Variable", "Big Shoulders Display", Impact, sans-serif'
  const s = pr.spacing
  const corridor = L.surface.usingVariant ? L.surface.usingVariant() : false
  const words = L.A.lfWords ?? 1
  const hwWord = corridor ? Math.max(s * 0.31 * (0.35 + 0.65 * pr.seq.spread), 0.35) : s * 0.36
  const fill = Math.min(1, (2 * hwWord) / s) * words
  const c = document.createElement('canvas')
  const g = c.getContext('2d', { willReadFrequently: true })
  const out = []
  let top = 1e9, bottom = -1e9, left = 1e9, right = -1e9
  pr.words.forEach((word, i) => {
    const base = pr.baseline[i]
    const y0 = Math.floor(base - pr.cap)
    const hh = Math.ceil(base) - y0 + 1
    c.width = W; c.height = hh
    g.font = `900 ${pr.size}px ${FAMILY}`
    g.textAlign = 'left'
    const wordW = g.measureText(word).width
    const x0 = back ? x : x - wordW
    g.clearRect(0, 0, W, hh)
    g.save(); g.beginPath(); g.rect(0, base - pr.cap - y0, W, pr.cap); g.clip()
    g.fillStyle = '#fff'
    g.fillText(word, x0, base - y0)
    g.restore()
    const img = g.getImageData(0, 0, W, hh).data
    top = Math.min(top, base - pr.cap); bottom = Math.max(bottom, base)
    for (let j = 0; j < word.length; j++) {
      if (word[j] === ' ') continue
      const a = x0 + g.measureText(word.slice(0, j)).width
      const e = x0 + g.measureText(word.slice(0, j + 1)).width
      const bx0 = Math.max(0, Math.floor(a) - 2), bx1 = Math.min(W, Math.ceil(e) + 2)
      let str = ''
      for (let yy = 0; yy < hh; yy++) for (let xx = bx0; xx < bx1; xx++) str += String.fromCharCode(img[(yy * W + xx) * 4 + 3])
      // the letter's extent is its INK, not its advance: an advance carries side bearings past the glyph
      for (let yy = 0; yy < hh; yy++) for (let xx = bx0; xx < bx1; xx++) if (img[(yy * W + xx) * 4 + 3] > 127) { left = Math.min(left, xx); right = Math.max(right, xx + 1) }
      out.push({ ch: word[j], x0: bx0, x1: bx1, y0, h: hh, mask: btoa(str) })
    }
  })
  return { letters: out, fill, corridor, words, top, bottom, left, right, cap: pr.cap, baseline: pr.baseline, spacing: s }
})

const toLin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const LIN = Float64Array.from({ length: 256 }, (_, i) => toLin(i))
/**
 * The ink of the screenshot, in linear light, as a share of the ground-to-ink contrast: 0 is the ground, 1 is the
 * ink — whatever the two are mixed as. Integrated inside each letter's mask against the ink it should carry; in the
 * rows just past the cap line and the last baseline against the open field beside the words; and in the strips.
 */
function measureLetters(data, info, pr, L, strip) {
  const { width: W, height: H, channels: c } = info
  const lum = (i) => 0.2126 * LIN[data[i]] + 0.7152 * LIN[data[i + 1]] + 0.0722 * LIN[data[i + 2]]
  const lg = 0.2126 * LIN[pr.ground[0]] + 0.7152 * LIN[pr.ground[1]] + 0.0722 * LIN[pr.ground[2]]
  const li = 0.2126 * LIN[pr.ink[0]] + 0.7152 * LIN[pr.ink[1]] + 0.0722 * LIN[pr.ink[2]]
  const ink = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : (lum((y * W + x) * c) - lg) / (li - lg))
  let worst = Infinity, best = 0, n = 0, total = 0
  // where the type is DRAWN: inside a letter's glyph, at least half ink (the glyph is the font's; what the rows
  // carry comes through the state's texture, and that is what the margins are about)
  let inkLeft = Infinity, inkRight = -Infinity
  // a mark smaller than two rows square (a full stop at the smallest sizes) carries too few rows to judge
  const minArea = 2 * L.spacing * L.spacing
  for (const t of L.letters) {
    const m = Buffer.from(t.mask, 'base64')
    const bw = t.x1 - t.x0
    let area = 0, got = 0
    for (let yy = 0; yy < t.h; yy++) for (let xx = 0; xx < bw; xx++) {
      const a = m[yy * bw + xx] / 255
      if (!a) continue
      area += a
      const v = ink(t.x0 + xx, t.y0 + yy)
      got += a * v
      if (a > 0.5 && v >= 0.5) { inkLeft = Math.min(inkLeft, t.x0 + xx); inkRight = Math.max(inkRight, t.x0 + xx + 1) }
    }
    if (area < minArea) continue
    const r = got / (area * L.fill || 1)
    worst = Math.min(worst, r); best = Math.max(best, r); n++
    total += got
  }
  const s = L.spacing
  const over = [Math.max(0, Math.floor(L.left)), Math.min(W, Math.ceil(L.right))]
  // the open field: the same rows, the same width, on the side of the screen the words are not on
  const span = Math.max(8, Math.round((over[1] - over[0]) / 3))
  const field = L.left > W / 2 ? [Math.round(W * 0.04), Math.round(W * 0.04) + span] : [Math.round(W * 0.96) - span, Math.round(W * 0.96)]
  const density = (xs, y0, y1) => {
    let sum = 0, k = 0
    for (let y = Math.max(0, Math.round(y0)); y < Math.min(H, Math.round(y1)); y++) for (let x = xs[0]; x < xs[1]; x++) { sum += Math.max(0, ink(x, y)); k++ }
    return k ? sum / k : 0
  }
  return {
    letters: n, worst: n ? worst : 0, best, inkShare: total / (W * H), inkLeft, inkRight,
    above: density(over, L.top - s, L.top - 2), below: density(over, L.bottom + 2, L.bottom + s),
    fieldAbove: density(field, L.top - s, L.top - 2), fieldBelow: density(field, L.bottom + 2, L.bottom + s),
    stripInk: Math.max(density(over, 0, strip), density(over, H - strip, H)),
  }
}

const raw = async (p) => {
  const png = await p.screenshot()
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
  return { png, data, info }
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const allErrs = []

  // ── ENTER ────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('enter')) {
    console.log('\nENTER — one gesture out of each neighbour puts the passage at the end it was entered from')
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const { ctx, p, errs } = await open(b, w, h, 'tr')
      await goTo(p, 'system')
      const seen = []
      for (let i = 0; i < 12; i++) { await notches(p, 1, 1); seen.push((await stopOf(p)).base); if (seen.at(-1) >= 3) break }
      const a = await stopOf(p)
      ok(a.base === a.S.linefield, `${w}x${h}  forward from Full-Stack arrives on the passage (base ${a.base})`)
      ok(a.lfp < 0.02, `${w}x${h}  and at its start — ${(a.lfp * 100).toFixed(1)}%`)
      ok(!seen.some((s) => s > 3), `${w}x${h}  nothing was skipped on the way in — stops seen ${[...new Set(seen)].join(',')}`)

      await goTo(p, 'work')
      const seen2 = []
      for (let i = 0; i < 12; i++) { await notches(p, 1, -1); seen2.push((await stopOf(p)).base); if (seen2.at(-1) <= 3) break }
      const c = await stopOf(p)
      ok(c.base === c.S.linefield, `${w}x${h}  back from Work arrives on the passage (base ${c.base})`)
      ok(c.lfp > 0.98, `${w}x${h}  and at its end — ${(c.lfp * 100).toFixed(1)}%`)
      allErrs.push(...errs)
      await ctx.close()
    }
  }

  // ── EXIT ─────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('exit')) {
    console.log('\nEXIT — at either end the next gesture continues along the spine, and one gesture is one stop')
    const { ctx, p, errs } = await open(b, 1440, 900, 'tr')
    await goTo(p, 'linefield')
    await holdAt(p, 1)
    let n = 0
    while (n < 8) { await notches(p, 1, 1); n++; if ((await stopOf(p)).base > 3) break }
    const a = await stopOf(p)
    ok(a.base === a.S.work, `held at the end, ${n} gesture(s) forward reach Work — base ${a.base}`)
    await goTo(p, 'linefield')
    await holdAt(p, 0)
    let m = 0
    while (m < 8) { await notches(p, 1, -1); m++; if ((await stopOf(p)).base < 3) break }
    const c = await stopOf(p)
    ok(c.base === c.S.system, `held at the start, ${m} gesture(s) back reach Full-Stack — base ${c.base}`)
    // and the tail of that gesture does not carry on past the next place
    await sleep(900)
    ok((await stopOf(p)).base === c.S.system, 'and it settles there rather than carrying on')
    allErrs.push(...errs)
    await ctx.close()
  }

  // ── LEGIBLE ──────────────────────────────────────────────────────────────────────────────────────────────
  if (on('legible')) {
    console.log('\nLEGIBLE — both ends, both languages, four viewports: every letter carries its ink, inside its block, clear of the strips')
    for (const locale of ['tr', 'en']) {
      for (const [w, h] of [[1440, 900], [390, 844], [320, 568], [844, 390]]) {
        const { ctx, p, errs } = await open(b, w, h, locale)
        await goTo(p, 'linefield')
        /*
         * THE SITE'S OWN CHROME IS TAKEN OUT OF THE FRAME, not out of the measurement. The navigation is pale
         * mono on the dark half — the same colour, in runs the same height, as a letter's rows — so measured
         * with it on screen every backend frame reported type inside the header strip. What is being asked is
         * whether the MATERIAL clears the strips, so the strips are hidden and the whole frame is measured.
         */
        await p.evaluate(() => document.querySelectorAll('.strip').forEach((e) => { e.style.visibility = 'hidden' }))
        // the same place with the words removed on purpose, beside it, for the negative control
        const nw = await open(b, w, h, locale, { breakName: 'nowords' })
        await goTo(nw.p, 'linefield')
        await nw.p.evaluate(() => document.querySelectorAll('.strip').forEach((e) => { e.style.visibility = 'hidden' }))
        for (const end of [0, 1]) {
          await holdAt(p, end)
          await sleep(350)
          const pr = await p.evaluate(() => window.__lab.lfProbe())
          const { png, data, info } = await raw(p)
          const strip = await p.evaluate(() => window.__lab.V.strip)
          const name = `${locale}-${w}x${h}-${end ? 'frontend' : 'backend'}`
          fs.writeFileSync(`${OUT}/rest-${name}.png`, png)
          const L = await lettersOf(p)
          const m = measureLetters(data, info, pr, L, strip)
          /*
           * EVERY LETTER CARRIES THE INK A LETTER IS DRAWN WITH (R9, 2026-10-05).
           *
           * This used to look for type by colour — runs of pixels within 46 levels of the ink — and it was
           * written for ink and paper mixed as sRGB. Mixed in linear light (R9) a letter's edges are softer, a
           * 4.3 px row is "within 46 levels" for 3 px rather than 4, and the check found 0% type in a frame whose
           * words carried exactly the ink they always had. So the words are measured the way the needle was:
           * by what is not the ground. Each letter's own glyph is drawn into a mask from the state's layout
           * (font, size, baseline, cap band, alignment), the ink inside it is integrated in linear light, and
           * that is compared with the ink a letter is drawn with — its area times the fill of a letter's row,
           * read from what the runtime drew (lettersOf). Then the same frame with the words removed must fail.
           */
          ok(m.letters > 0 && m.worst >= 0.6 && m.best <= 1.4, `${name}  every letter carries its ink — ${m.letters} letters, ink against expected ${m.worst.toFixed(2)}..${m.best.toFixed(2)} (fill ${L.fill.toFixed(2)})`)
          ok(m.inkShare > 0.01, `${name}  the words are there — ${(m.inkShare * 100).toFixed(1)}% of the frame is the words' ink`)
          ok(L.top >= strip && L.bottom <= info.height - strip && m.stripInk < 0.03, `${name}  and the type clears both strips — letters from y=${Math.round(L.top)} to y=${Math.round(L.bottom)}, strips ${strip}px, ink in the strips over the words ${m.stripInk.toFixed(3)}`)
          ok(m.inkLeft >= 4 && m.inkRight <= info.width - 4, `${name}  and both side margins — the type is drawn from x=${m.inkLeft} to x=${m.inkRight} of ${info.width} (its glyphs reach ${Math.round(L.left)}..${Math.round(L.right)})`)
          /*
           * AND NOTHING IS DRAWN OUTSIDE THE CAP LINE AND THE LAST BASELINE.
           *
           * S, C, U, O and G are drawn a little past both, and at this pitch that overshoot is caught by the
           * first row beyond the edge and drawn as a detached bar — STATE. reads as ŞTATE. No phase of the row
           * grid can clear it (the pitch would have to be 9.1px and it is 7), so the overshoot is clipped off.
           * This is the assertion that says it stayed clipped: the rows just past either edge, over the words,
           * carry no more ink than the open field beside them does at the same height.
           */
          ok(m.above <= m.fieldAbove * 1.5 + 0.03 && m.below <= m.fieldBelow * 1.5 + 0.03, `${name}  and no ink outside the cap line or the last baseline — over the words ${m.above.toFixed(3)} / ${m.below.toFixed(3)}, the field ${m.fieldAbove.toFixed(3)} / ${m.fieldBelow.toFixed(3)}`)
          note(`${name}  ${pr.rowsPerCap} rows through a capital, cap ${Math.round(pr.cap)}px, pitch ${pr.spacing.toFixed(2)}px`)
          ok(pr.rowsPerCap >= 10, `${name}  enough rows through a capital for a curve to keep its counter (${pr.rowsPerCap})`)
          // THE NEGATIVE CONTROL: the same frame, with the words taken out on purpose (lfbreak=nowords), must not pass
          await holdAt(nw.p, end)
          await sleep(350)
          const gone = await raw(nw.p)
          const mg = measureLetters(gone.data, gone.info, pr, L, strip)
          ok(mg.letters > 0 && mg.best < 0.6, `${name}  and with the words removed on purpose the same check fails — ink against expected at most ${mg.best.toFixed(2)}`)
        }
        allErrs.push(...errs)
        await ctx.close()
        await nw.ctx.close()
      }
    }
  }

  // ── CORRIDOR, POINT ──────────────────────────────────────────────────────────────────────────────────────
  if (on('corridor')) {
    console.log('\nNEEDLE — the fan flattens onto the horizon, becomes a needle across the whole width, and the rust line appears inside it')
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const { ctx, p, errs } = await open(b, w, h, 'tr')
      await goTo(p, 'linefield')
      await p.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = 'hidden' }))
      /*
       * THE FIELD'S OWN BAND, not the whole screen. The site keeps its name, its navigation and its status line
       * in the strips, and measured across the whole frame every one of these numbers was the width of the
       * navigation — 1368px at every progress, including the ones where the corridor is a dot.
       */
      const band = { y0: Math.round(h * 0.08), y1: Math.round(h * 0.92) }
      const field = (x, wd) => ({ x, y: band.y0, w: wd, h: band.y1 - band.y0 })

      // the corridor: at full depth the ink must be concentrated toward the vanishing point
      await holdAt(p, 0.34)
      const pr = await p.evaluate(() => window.__lab.lfProbe())
      const A = await raw(p)
      const half = Math.round(w / 2)
      const nearVp = inkBox(A.data, A.info, pr.ground, field(pr.vx < half ? 0 : half, half), 8).n
      const farVp = inkBox(A.data, A.info, pr.ground, field(pr.vx < half ? half : 0, half), 8).n
      fs.writeFileSync(`${OUT}/corridor-${w}x${h}-34.png`, A.png)
      ok(nearVp > farVp, `${w}x${h}  at 34% the field is denser toward the vanishing point (${nearVp} vs ${farVp} px)`)

      /*
       * THE PASSAGE, MEASURED AS THE REFERENCE DRAWS IT.
       *
       * The fan closes on cc alone: the vanishing point does not move and the far end stays at the screen edge,
       * so what happens is that the fan FLATTENS. Three things follow, and each is a number:
       *
       *   the span stays full width — a needle from the point across the frame, never a wedge in a corner;
       *   the height falls, monotonically, to almost nothing;
       *   the rust line appears while the needle is still open, along its centre, and is alone at the crossing.
       */
      const rows = []
      for (const v of [0.42, 0.44, 0.46, 0.48, 0.49, 0.5, 0.51, 0.52, 0.54, 0.56]) {
        await holdAt(p, v)
        const q = await p.evaluate(() => window.__lab.lfProbe())
        const f = await raw(p)
        const k = inkBox(f.data, f.info, q.ground, field(0, w), 8)
        // the rust, anywhere on the horizon: the accent belongs to this line and to nothing else on screen
        const { width: W, channels: c } = f.info
        /*
         * RUST IS MEASURED AGAINST THE GROUND, not against a fixed brightness. #b8622f is far redder than it is
         * blue; neither half's ground nor its ink is. An absolute threshold found the line at 1440 and missed
         * two thirds of it at 390, because at 48% the line is only a third opaque and what it is drawn OVER
         * differs — the reading was about the blend, not about the line.
         */
        const gRB = q.ground[0] - q.ground[2]
        let rust = 0
        for (let y = Math.round(q.lineY) - 2; y <= Math.round(q.lineY) + 2; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * c
            if ((f.data[i] - f.data[i + 2]) - gRB > 12) rust++
          }
        }
        // and the frame's own signature, so "every step moves" is about the picture and not about two counts
        let sig = 0
        for (let i = 0; i < f.data.length; i += c) sig += f.data[i] + f.data[i + 1] * 3 + f.data[i + 2] * 7
        rows.push({ v, w: k.n ? k.x1 - k.x0 + 1 : 0, h: k.n ? k.y1 - k.y0 + 1 : 0, n: k.n, rust, sig, flash: +q.seq.flash.toFixed(2) })
        fs.writeFileSync(`${OUT}/needle-${w}x${h}-${Math.round(v * 100)}.png`, f.png)
      }
      for (const r of rows) note(`${w}x${h}  ${Math.round(r.v * 100)}%  ink ${String(r.w).padStart(4)} x ${String(r.h).padStart(3)} px  ·  rust on the horizon ${String(r.rust).padStart(4)} px  (flash ${r.flash})`)

      const at = (v) => rows.find((r) => Math.abs(r.v - v) < 1e-6)
      const wide = at(0.42)
      const needle = at(0.48)
      const cross = at(0.5)
      const opening = at(0.52)
      ok(needle.w > w * 0.92, `${w}x${h}  at 48% the needle spans the whole width — ${needle.w}px of ${w}`)
      ok(needle.h < wide.h * 0.45, `${w}x${h}  and it has flattened — ${needle.h}px tall against ${wide.h}px at 42%`)
      ok(needle.rust > w * 0.5, `${w}x${h}  the rust line is already inside the needle at 48% — ${needle.rust}px of it on the horizon`)
      ok(cross.rust > w * 1.5, `${w}x${h}  at 50% a single rust line spans the frame — ${cross.rust}px`)
      ok(opening.w > w * 0.92, `${w}x${h}  and on the cream side it opens from the far point across the width — ${opening.w}px at 52%`)
      // no dead segment: something changes between every pair of frames through the passage
      /*
       * OUTSIDE THE LINE'S OWN WINDOW. The fan is held shut from 47% to 53% so the single rust line is on
       * screen long enough to be caught — identical frames there are the point of that hold, not a dead
       * segment. Everywhere else, something must change between every pair of steps.
       */
      const still = []
      for (let i = 1; i < rows.length; i++) if (rows[i].sig === rows[i - 1].sig && Math.abs(rows[i].v - 0.5) > 0.035) still.push(Math.round(rows[i].v * 100))
      ok(still.length === 0, `${w}x${h}  every step of the passage moves${still.length ? ` — nothing changed at ${still.join(', ')}%` : ''}`)
      allErrs.push(...errs)
      await ctx.close()
    }
  }

  // ── DWELL ────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('dwell')) {
    console.log('\nDWELL — how much scrolling the single rust line is on screen for')
    /*
     * TWO THINGS MAKE IT CATCHABLE, and they multiply.
     *
     * The fan is held shut across a window of the PROGRESS, so the line is alone for a stretch rather than an
     * instant. And the drive runs slower through that stretch, so the same wheel notch or the same centimetre
     * of finger covers less of it. What a visitor experiences is the product, which is what is measured here:
     * notches of a real wheel, and pixels of a real drag.
     */
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const { ctx, p, errs } = await open(b, w, h, 'tr')
      await goTo(p, 'linefield')

      // ── the wheel ──────────────────────────────────────────────────────────────────────────────────────
      await p.evaluate(() => window.__lab.lfSet(0.3))
      await sleep(600)
      let notches = 0
      let alone = 0
      let seen = false
      while (notches < 40) {
        await p.mouse.wheel(0, 100)
        await sleep(340)
        notches++
        const q = await p.evaluate(() => window.__lab.lfProbe())
        // alone: the rust is at full strength and the field has collapsed behind it
        const isAlone = q.seq.flash > 0.98 && q.seq.spread < 0.01
        if (isAlone) { alone++; seen = true } else if (seen) break
        if (q.seq.side === 1 && q.seq.spread > 0.4) break
      }
      ok(alone >= 1, `${w}x${h}  the single rust line is on screen for ${alone} wheel notch(es) of 100px`)
      note(`${w}x${h}  it took ${notches - alone} notches to reach it from 30%`)

      /*
       * THE FINGER, THROUGH THE REAL DRAG PATH. Synthesising pointer events for this measured nothing: on a
       * desktop context a press on the material is a HOLD, not a drag, and the vertical-drag branch only runs
       * for a touch pointer. The drive's own dragStart/dragMove are what a finger reaches, gain and all, so
       * they are driven directly and the distance is counted in the pixels a finger would have travelled.
       */
      const touch = await p.evaluate(() => {
        const LF = window.__lab.lf()
        const d = LF.drive
        d.set(0.4)
        d.dragStart(40000)
        let y = 40000
        let px = 0
        let alone = 0
        const STEP = 2
        // lfSet() is not used here: it cancels the drag, which is exactly what made an earlier version of this
        // travel twelve thousand pixels without moving anything
        while (d.target < 0.62 && px < 40000) {
          y -= STEP
          d.dragMove(y)
          px += STEP
          const q = LF.sequence(d.target)
          if (q.flash > 0.98 && q.spread < 0.01) alone += STEP
        }
        const span = d.target
        d.dragEnd()
        d.set(0)
        void span
        return { px, alone, span: 0 }
      })
      ok(touch.alone > 0, `${w}x${h}  and for ${touch.alone}px of finger travel (40% to 62% took ${touch.px}px; the whole passage is ${Math.round(w < 700 ? Math.max(560, h * 1.8) : Math.max(560, h * 1.8))}px at an even rate)`)
      allErrs.push(...errs)
      await ctx.close()
    }
  }

  // ── WIDE ─────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('wide')) {
    console.log('\nWIDE — the viewer is inside the fan: the rays run past the screen edge, as in the reference')
    /*
     * MEASURED ON BOTH, AT THE SAME PROGRESS. The reference is the arbiter, so the same numbers are taken from
     * it and from the site: how much of the FAR screen edge carries a ray, and how much of the field's top and
     * bottom edges do.
     *
     * One difference is expected and is the site's own rule rather than a fault: this site keeps a strip at the
     * top and the bottom of every screen, and no row ever crosses into one. So the rays run past the top and
     * bottom of the FIELD, where the reference's run past the top and bottom of the window. It is reported as a
     * number rather than hidden behind a threshold.
     */
    const path = require('node:path')
    const REF = `file:///${path.resolve(__dirname, '..', '..', 'docs', 'reference', 'linefield-v2.html').replace(/\\/g, '/')}`
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const site = await open(b, w, h, 'tr')
      await goTo(site.p, 'linefield')
      await site.p.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = 'hidden' }))

      const refCtx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
      const refP = await refCtx.newPage()
      await refP.goto(REF, { waitUntil: 'load', timeout: 60000 })
      await refP.waitForFunction(() => !!window.__demo, null, { timeout: 30000 })
      await sleep(1400)
      await refP.evaluate(() => document.getElementById('dock').classList.add('hidden'))

      const edges = async (page, isRef, v, ground) => {
        if (isRef) await page.evaluate((x) => window.__demo.setProgress(x), v)
        else await holdAt(page, v)
        await sleep(280)
        const f = await raw(page)
        const { width: W, height: H, channels: c } = f.info
        const lit = (x, y) => {
          const i = (y * W + x) * c
/*
           * THE BAR IS 6, AND IT HAS TO BE. Lower, and the dark ground's own dither counts as lit on the
           * reference: its edge rows read as one unbroken run and the ray count collapses to four. Higher, and
           * the reference's faintest rays — its per-row alpha starts at 0.2 and is scaled again by cc and by
           * depth — drop out. Six is the window where both are counting rays. Our rows are drawn brighter than
           * the reference's, so a handful of its faintest are still missed, and the site's number is the more
           * complete of the two.
           */
          return Math.max(Math.abs(f.data[i] - ground[0]), Math.abs(f.data[i + 1] - ground[1]), Math.abs(f.data[i + 2] - ground[2])) > 6
        }
        const b0 = Math.round(H * 0.08)
        const b1 = Math.round(H * 0.92)
        /*
         * RAYS, NOT PIXELS. A lit pixel count at the far edge is really a count of how many rows are drawn
         * there, and this field is deliberately sparser than the reference's — every 8th row, approved on the
         * device. Counting RUNS says how many rays cross the edge, which is the thing being compared; the
         * densities then differ by the ratio they are meant to.
         */
        const runsAt = (x) => {
          let n = 0
          let on = false
          for (let y = b0; y < b1; y++) { const v = lit(x, y); if (v && !on) n++; on = v }
          return n
        }
        const right = runsAt(W - 2)
        const left = runsAt(1)
        let top = 0
        let bot = 0
        for (let x = 0; x < W; x++) { if (lit(x, b0 + 1)) top++; if (lit(x, b1 - 2)) bot++ }
        return { right, left, top, bot, bandH: b1 - b0, png: f.png }
      }

      for (const v of [0.28, 0.34, 0.42, 0.46, 0.54, 0.58, 0.7]) {
        const g = (await site.p.evaluate(() => window.__lab.lfProbe())).ground
        const refGround = v < 0.5 ? [17, 18, 20] : [239, 238, 233]
        const S = await edges(site.p, false, v, g)
        const R = await edges(refP, true, v, refGround)
        const pc = Math.round(v * 100)
        fs.writeFileSync(`${OUT}/wide-site-${w}x${h}-${pc}.png`, S.png)
        fs.writeFileSync(`${OUT}/wide-ref-${w}x${h}-${pc}.png`, R.png)
        // on the dark half the fan opens to the right, on the cream half to the left: the FAR edge is the one
        // the rays run out through, and it swaps at the crossing
        const farSite = v < 0.5 ? S.right : S.left
        const farRef = v < 0.5 ? R.right : R.left
        note(`${w}x${h} ${pc}%  rays crossing the far edge: site ${farSite} · reference ${farRef}   |   field top+bottom edge, px: site ${S.top + S.bot} · reference ${R.top + R.bot} of ${w}`)
        ok(farSite > 0, `${w}x${h} ${pc}%  the rays run out through the far screen edge — ${farSite} of them (reference ${farRef})`)
        /*
         * Except where the fan is CLOSED. The site holds it shut from 47% to 53% so the single rust line has a
         * window a visitor can catch; the reference closes at 50% and is still open at 46 and 54. A collapsed
         * field has nothing at the top or bottom of the frame by definition, and that is the design.
         */
        const shut = (await site.p.evaluate(() => window.__lab.lfProbe())).seq.flash > 0.5
        if (!shut) ok(S.top + S.bot > 0, `${w}x${h} ${pc}%  and out through the top and bottom of the field — ${S.top + S.bot} px (reference ${R.top + R.bot})`)
        else note(`${w}x${h} ${pc}%  the fan is shut here by design — the line's window; the reference is still open`)
      }
      allErrs.push(...site.errs)
      await site.ctx.close()
      await refCtx.close()
    }
  }

  // ── OUTSIDE ──────────────────────────────────────────────────────────────────────────────────────────────
  if (on('outside')) {
    console.log("\nOUTSIDE — nothing is drawn outside the corridor's image (calibrated on ?lfbreak=inverse)")
    for (const broke of [null, 'inverse']) {
      let worst = 0
      let frames = 0
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        const { ctx, p, errs } = await open(b, w, h, 'tr', broke ? { breakName: broke } : {})
        await goTo(p, 'linefield')
        // the site's own chrome lives outside the corridor's image by definition; what is under test is the
        // material, so the strips and the layers are taken out of the frame
        await p.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = 'hidden' }))
        for (let v = 20; v <= 80; v += 2) {
          await holdAt(p, v / 100)
          const q = await p.evaluate(() => window.__lab.lfProbe())
          const f = await raw(p)
          const lo = Math.floor(q.lo) - 6
          const hi = Math.ceil(q.hi) + 6
          const markY = q.seq.flash > 0.002 ? q.lineY : -1e9
          let n = 0
          for (let y = 0; y < f.info.height; y++) {
            if (Math.abs(y - markY) < 5) continue
            for (let x = 0; x < f.info.width; x++) {
              if (x >= lo && x <= hi) continue
              const i = (y * f.info.width + x) * f.info.channels
              const d = Math.max(Math.abs(f.data[i] - q.ground[0]), Math.abs(f.data[i + 1] - q.ground[1]), Math.abs(f.data[i + 2] - q.ground[2]))
              if (d > 6) n++
            }
          }
          if (n > 0) { frames++; if (n > worst) { worst = n; fs.writeFileSync(`${OUT}/outside${broke ? `-${broke}` : ''}-${w}x${h}-${v}.png`, f.png) } }
        }
        if (!broke) allErrs.push(...errs)
        await ctx.close()
      }
      if (broke) ok(frames > 0, `the check fails on ?lfbreak=${broke} — ${frames} frames, worst ${worst} px outside the image`)
      else ok(frames === 0, `nothing outside the image, 20%..80% every 2%, two viewports${frames ? ` — ${frames} frames, worst ${worst} px` : ''}`)
    }
  }

  // ── WHOLE ────────────────────────────────────────────────────────────────────────────────────────────────
  if (on('whole')) {
    console.log('\nWHOLE — every word complete throughout its flight (calibrated on ?lfbreak=thinall)')
    /*
     * WHAT CALIBRATES THIS, AND WHAT NO LONGER DOES.
     *
     * The fault reported was the extent taking the top rows off FEEL in flight, and `extentall` reproduces that
     * rule exactly. It no longer discriminates here, and the reason is worth writing down: the block is now
     * sized and placed on its real ink inside the strips, which leaves it clear of the field's extent in every
     * viewport, so the extent cannot reach the type whether it is exempt from it or not. The exemption is belt
     * and braces and the check would pass with or without it. `nowhisker` is out of reach for the same reason.
     *
     * `thinall` is not: the thinning is on for most of both flights and takes seven rows in eight, so applied
     * to type it strips every letter wherever it is. That is what this check is calibrated against.
     */
    for (const broke of [null, 'thinall']) {
      let lostFrames = 0
      let worst = 0
      for (const [w, h] of [[1440, 900], [390, 844]]) {
        const ref = await open(b, w, h, 'tr', { breakName: 'noextent' })
        const real = await open(b, w, h, 'tr', broke ? { breakName: broke } : {})
        await goTo(ref.p, 'linefield')
        await goTo(real.p, 'linefield')
        for (const q of [ref.p, real.p]) await q.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = 'hidden' }))
        const list = []
        for (let v = 6; v <= 44; v += 4) list.push(v)
        for (let v = 58; v <= 96; v += 4) list.push(v)
        for (const v of list) {
          await holdAt(ref.p, v / 100)
          await holdAt(real.p, v / 100)
          // both pages are driven independently, so one can still be a frame behind when the other is
          // photographed — which read as a few hundred pixels lost in one frame of forty, and was not
          await sleep(220)
          const q = await ref.p.evaluate(() => window.__lab.lfProbe())
          const A = await raw(ref.p)
          const B = await raw(real.p)
          const { width: W, height: H, channels: c } = A.info
          const near = (d, i) => Math.max(Math.abs(d[i] - q.ink[0]), Math.abs(d[i + 1] - q.ink[1]), Math.abs(d[i + 2] - q.ink[2]))
          let lost = 0
          for (let x = 0; x < W; x++) {
            let run = 0
            for (let y = 0; y <= H; y++) {
              const solid = y < H && near(A.data, (y * W + x) * c) <= 46
              if (solid) { run++; continue }
              // a letter's row is four or five pixels of full ink at this pitch; a ground row is one or two of part ink
              if (run >= 3) for (let k = y - run; k < y; k++) { const i = (k * W + x) * c; if (near(B.data, i) - near(A.data, i) > 70) lost++ }
              run = 0
            }
          }
          if (lost > 0) { lostFrames++; if (lost > worst) { worst = lost; fs.writeFileSync(`${OUT}/whole${broke ? `-${broke}` : ''}-${w}x${h}-${v}.png`, B.png) } }
        }
        if (!broke) allErrs.push(...ref.errs, ...real.errs)
        await ref.ctx.close()
        await real.ctx.close()
      }
      if (broke) ok(lostFrames > 0, `the check fails on ?lfbreak=${broke} — ${lostFrames} frames lose rows off a letter, worst ${worst} px`)
      /*
       * A LOST ROW IS NOT ONE PIXEL. A row taken off a letter is several pixels tall across tens of columns —
       * the broken build below loses tens of thousands. What a real frame leaves is a pixel or two where an
       * edge was antialiased a shade differently in the two renders, so the bar is a row's worth, not zero.
       */
      else ok(worst <= 8, `no row is lost off a letter, 20 frames per viewport across both flights — worst frame ${worst} px, ${lostFrames} frame(s) with any difference at all`)
    }
  }

  // ── REVERSE ──────────────────────────────────────────────────────────────────────────────────────────────
  if (on('reverse')) {
    console.log('\nREVERSE — the same progress is the same picture, whichever way it was reached')
    const { ctx, p, errs } = await open(b, 1440, 900, 'tr')
    await goTo(p, 'linefield')
    /*
     * THE MATERIAL, not the furniture. The question is whether the corridor is a pure function of progress, and
     * the DOM layer over it fades on a 0.6s transition — reached first, 18% was still carrying the tail of the
     * heading fading out, and read as a difference of 1.7 in a row of exact zeroes.
     */
    await p.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = 'hidden' }))
    /*
     * And the material's own physics is let settle first. The visit's imprint fades in over the second or two
     * after an arrival, so the first frame measured was a per-cent or two darker than the same frame measured
     * ten seconds later — which is a difference in the page's memory, not in the map.
     */
    await holdAt(p, 0.18)
    await sleep(3000)
    const marks = [0.18, 0.31, 0.43, 0.57, 0.69, 0.84]
    const fwd = {}
    for (const v of [...marks].sort((a, c) => a - c)) { await holdAt(p, v); await sleep(160); fwd[v] = await p.screenshot() }
    const back = {}
    for (const v of [...marks].sort((a, c) => c - a)) { await holdAt(p, v); await sleep(160); back[v] = await p.screenshot() }
    for (const v of marks) {
      const A = await sharp(fwd[v]).raw().toBuffer({ resolveWithObject: true })
      const B = await sharp(back[v]).raw().toBuffer({ resolveWithObject: true })
      let s = 0
      for (let i = 0; i < A.data.length; i++) s += Math.abs(A.data[i] - B.data[i])
      const mad = s / A.data.length
      ok(mad < 1.2, `${Math.round(v * 100)}%  forwards and backwards agree — mean pixel difference ${mad.toFixed(3)}`)
    }
    allErrs.push(...errs)
    await ctx.close()
  }

  // ── REDUCED ──────────────────────────────────────────────────────────────────────────────────────────────
  if (on('reduced')) {
    console.log('\nREDUCED — two static states and a crossfade, and never the middle of the corridor')
    const { ctx, p, errs } = await open(b, 1440, 900, 'tr', { reducedMotion: 'reduce' })
    await goTo(p, 'linefield')
    const shots = []
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      await holdAt(p, v)
      await sleep(300)
      const st = await p.evaluate(() => window.__lab.lfState())
      shots.push({ v, shown: st.p })
      fs.writeFileSync(`${OUT}/reduced-${Math.round(v * 100)}.png`, await p.screenshot())
    }
    for (const s of shots) note(`asked for ${Math.round(s.v * 100)}%, showed ${Math.round(s.shown * 100)}%`)
    ok(shots.every((s) => s.shown === 0 || s.shown === 1), 'every frame is one of the two ends, never a sample of the passage')
    ok(shots[0].shown === 0 && shots.at(-1).shown === 1, 'and both ends are reachable')
    allErrs.push(...errs)
    await ctx.close()
  }

  await b.close()
  const real = allErrs.filter((e) => !/favicon|ERR_/.test(e))
  ok(real.length === 0, `no page or console errors${real.length ? ` — ${real.slice(0, 2).join(' | ')}` : ''}`)
  console.log(`\nLINEFIELD (Phase C): ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} ok, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
})()
