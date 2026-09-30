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
function typeBox(data, info, ink, box, run0 = 3) {
  const { width: W, channels: c } = info
  const near = (i) => Math.max(Math.abs(data[i] - ink[0]), Math.abs(data[i + 1] - ink[1]), Math.abs(data[i + 2] - ink[2]))
  let n = 0
  let y0 = 1e9
  let y1 = -1
  let x0 = 1e9
  let x1 = -1
  for (let x = box.x; x < box.x + box.w; x++) {
    let run = 0
    for (let y = box.y; y <= box.y + box.h; y++) {
      const solid = y < box.y + box.h && near((y * W + x) * c) <= 46
      if (solid) { run++; continue }
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
    console.log('\nLEGIBLE — both ends, both languages, four viewports: words present and clear of the strips')
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
        for (const end of [0, 1]) {
          await holdAt(p, end)
          await sleep(350)
          const pr = await p.evaluate(() => window.__lab.lfProbe())
          const { png, data, info } = await raw(p)
          const strip = await p.evaluate(() => window.__lab.V.strip)
          // the words live between the strips; the strips themselves carry the site's own chrome
          const box = { x: 0, y: 0, w: info.width, h: info.height }
          // a letter's row is about 0.72 of the pitch; the threshold follows the pitch, because at 320x568 it
          // is under three pixels and a fixed three found no type at all
          const run0 = Math.max(2, Math.round(pr.spacing * 0.55))
          const k = typeBox(data, info, pr.ink, box, run0)
          const name = `${locale}-${w}x${h}-${end ? 'frontend' : 'backend'}`
          fs.writeFileSync(`${OUT}/rest-${name}.png`, png)
          ok(k.n > info.width * info.height * 0.01, `${name}  the words are there — ${(k.n / (info.width * info.height) * 100).toFixed(1)}% of the frame is type`)
          ok(k.y0 >= strip && k.y1 <= info.height - strip, `${name}  and the type clears both strips — from y=${k.y0} to y=${k.y1}, strips ${strip}px (${k.y0 - strip} / ${info.height - strip - k.y1} px of air)`)
          ok(k.x0 >= 4 && k.x1 <= info.width - 4, `${name}  and both side margins — from x=${k.x0} to x=${k.x1} of ${info.width}`)
          note(`${name}  ${pr.rowsPerCap} rows through a capital, cap ${Math.round(pr.cap)}px, pitch ${pr.spacing.toFixed(2)}px`)
          ok(pr.rowsPerCap >= 10, `${name}  enough rows through a capital for a curve to keep its counter (${pr.rowsPerCap})`)
        }
        allErrs.push(...errs)
        await ctx.close()
      }
    }
  }

  // ── CORRIDOR, POINT ──────────────────────────────────────────────────────────────────────────────────────
  if (on('corridor')) {
    console.log('\nCORRIDOR and POINT — the middle converges, then a tip, then a point, then the line')
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const { ctx, p, errs } = await open(b, w, h, 'tr')
      await goTo(p, 'linefield')
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

      // the sequence across the crossing
      const widths = []
      for (const v of [0.46, 0.47, 0.48, 0.49, 0.5, 0.51, 0.52, 0.53]) {
        await holdAt(p, v)
        const q = await p.evaluate(() => window.__lab.lfProbe())
        const f = await raw(p)
        const k = inkBox(f.data, f.info, q.ground, field(0, w), 8)
        widths.push({ v, w: k.n ? k.x1 - k.x0 + 1 : 0, n: k.n, mark: +q.seq.mark.toFixed(2), grow: +q.seq.grow.toFixed(2) })
        fs.writeFileSync(`${OUT}/point-${w}x${h}-${Math.round(v * 100)}.png`, f.png)
      }
      for (const r of widths) note(`${w}x${h}  ${Math.round(r.v * 100)}%  ink spans ${r.w}px, ${r.n} px of it  (mark ${r.mark}, grow ${r.grow})`)
      const tip = widths.find((r) => r.v === 0.48)
      const line = widths.find((r) => r.v === 0.5)
      ok(tip.w < w * 0.35, `${w}x${h}  at 48% what is left is a tip, not a field — ${tip.w}px of ${w}`)
      ok(line.w > w * 0.9, `${w}x${h}  at 50% the single line runs across the frame — ${line.w}px of ${w}`)
      ok(tip.w < line.w * 0.5, `${w}x${h}  the point comes before the line and is a fraction of its length`)
      allErrs.push(...errs)
      await ctx.close()
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
          const markY = q.seq.mark > 0.002 ? q.lineY : -1e9
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
