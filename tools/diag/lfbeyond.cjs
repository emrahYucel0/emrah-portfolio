// BEYOND THE VANISHING POINT THERE IS NOTHING — a measurement, and the stills to look at.
//
//   node lfbeyond.cjs <port>
//
// The corridor's image has an END. At full depth every flat column t maps to a screen column between the
// vanishing point and the far point, and NOTHING maps past the vanishing point — there is no row there, no word
// segment, no field edge. So the rule is absolute: outside the image, ground colour only.
//
// WHAT IS MEASURED. The ground colour is read from a corner the corridor never reaches. Then, in the band past
// the vanishing point (excluding a margin either side of the point itself, where the corridor legitimately ends
// and a pixel may be half in), every pixel that differs from the ground by more than a threshold is counted.
// A clean build reads zero. The stills are written at 1:1 so the marks can be seen, not inferred.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4802'] = process.argv.slice(2)
// `--break inverse` restores the sign-dropping derivative guard and removes the residual gate: the build this
// check was written against. It must FAIL on it, or it is not checking anything.
const bi = process.argv.indexOf('--break')
const BREAK = bi > 0 ? process.argv[bi + 1] : null
const OUT = BREAK ? `out/linefield/beyond-broken-${BREAK}` : 'out/linefield/beyond'

// far enough past the point that a pixel cannot be straddling the corridor's own last column
const MARGIN = 6
// a difference this small is the PNG's own rounding, not a mark
const TOL = 6

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const rows = []
  for (const [w, h, tag] of [[1440, 900, '1440x900'], [1920, 1080, '1920x1080'], [390, 844, '390x844']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    await p.goto(`http://127.0.0.1:${port}/tr?linefield=1${BREAK ? '&lfbreak=' + BREAK : ''}`, { waitUntil: 'load', timeout: 90000 })
    await p.waitForFunction(() => !!window.__lf, null, { timeout: 60000 })
    await p.evaluate(() => window.__lf.dock(false))
    /*
     * A WARM-UP, AND THEN A CHECK THAT THE CANVAS IS ACTUALLY ALIVE.
     *
     * On a cold page the first frames can be composited before the corridor's program is in use, and a
     * screenshot then photographs a scene that is not the one the scene object reports. That happened here: the
     * state said 56% and the picture was the field at rest, and every number below it was measured against a
     * frame that was never drawn. So the scene is played once before anything is measured, and two frames a
     * long way apart are compared — identical bytes mean the canvas is frozen and the run is abandoned.
     */
    await p.evaluate(() => window.__lf.play(0, 0.3, 300))
    await sleep(300)
    const alive = []
    for (const v of [0, 0.55]) {
      await p.evaluate((x) => window.__lf.setProgress(x), v)
      await sleep(200)
      alive.push((await p.screenshot()).length)
    }
    if (alive[0] === alive[1]) throw new Error(`${tag}: the canvas is frozen — both 0% and 55% photograph the same bytes`)
    await sleep(200)

    // the whole range, every two per cent, plus the four the review names
    const list = []
    for (let v = 20; v <= 80; v += 2) list.push(v)
    for (const v of [40, 50, 56, 60]) if (!list.includes(v)) list.push(v)
    list.sort((a, c) => a - c)

    for (const v of list) {
      await p.evaluate((x) => window.__lf.setProgress(x / 100), v)
      await sleep(110)
      const png = await p.screenshot()
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
      const c = info.channels
      const { vx, side } = await p.evaluate(() => window.__lf.vp())
      const img = await p.evaluate(() => window.__lf.image())
      // the ground is asked for, not sampled: every pixel in the band is under test, so there is no pixel left
      // to read it from
      const g = await p.evaluate(() => window.__lf.ground())
      let n = 0
      let worst = 0
      let wy = -1
      let wx = -1
      /*
       * OUTSIDE THE IMAGE, not merely past the point. The corridor reaches the columns between X(0) and X(1)
       * and no others: past the vanishing point at one end, and past the far point once the fold-back has drawn
       * it in at the other. Both are under test.
       *
       * The drawn mark is not a corridor remnant — it is the passage itself, and the reference draws it right
       * across the frame — so the rows it occupies are left out.
       */
      const lo = Math.floor(img.lo) - MARGIN
      const hi = Math.ceil(img.hi) + MARGIN
      const markY = img.mark > 0.002 ? img.lineY : -1e9
      for (let y = 0; y < info.height; y++) {
        if (Math.abs(y - markY) < 5) continue
        for (let x = 0; x < info.width; x++) {
          if (x >= lo && x <= hi) continue
          const i = (y * info.width + x) * c
          const d = Math.max(Math.abs(data[i] - g[0]), Math.abs(data[i + 1] - g[1]), Math.abs(data[i + 2] - g[2]))
          if (d > TOL) { n++; if (d > worst) { worst = d; wy = y; wx = x } }
        }
      }
      rows.push({ tag, v, vx: Math.round(vx), side, lo, hi, n, worst })
      const named = [40, 50, 56, 60].includes(v)
      if (named || n > 0) {
        fs.writeFileSync(`${OUT}/${tag}-${v}.png`, png)
        // and a 1:1 crop of the band past the vanishing point, so a mark of four pixels is not lost in a frame
        const x0 = side === 0 ? 0 : Math.min(info.width - 40, hi)
        const cw = side === 0 ? Math.max(40, lo) : info.width - x0
        await sharp(png).extract({ left: Math.max(0, x0), top: 0, width: Math.max(8, Math.min(cw, info.width - x0)), height: info.height })
          .toFile(`${OUT}/${tag}-${v}-BAND.png`)
      }
      if (n > 0) console.log(`  ${tag} ${v}%  image x ${lo}..${hi}  ${n} px outside it, worst ${worst} at (${wx},${wy})`)
    }
    const bad = rows.filter((r) => r.tag === tag && r.n > 0)
    console.log(`  ${tag}: ${bad.length ? `${bad.length} of ${rows.filter((r) => r.tag === tag).length} frames draw outside the corridor's image` : 'CLEAN across the whole range'}`)
    await ctx.close()
  }
  await b.close()
  fs.writeFileSync(`${OUT}/beyond.json`, JSON.stringify(rows, null, 2))
  const dirty = rows.filter((r) => r.n > 0)
  console.log(`\n  ${dirty.length === 0 ? 'PASS — nothing is drawn outside the corridor image' : `FAIL — ${dirty.length} frames draw outside the image, worst ${Math.max(...dirty.map((r) => r.n))} px`}\n`)
})()
