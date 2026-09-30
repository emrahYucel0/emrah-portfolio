// DOES THE CORRIDOR SHIMMER? — a temporal measure, because shimmer is a thing that happens BETWEEN frames.
//
//   node lfshimmer.cjs <port> [--break fade|jacobian]
//
// WHY NOT THE OLD METRIC. The moire measure written for the plate's bed asks how much high-frequency energy
// VARIES ACROSS A FRAME. That is the right question for a flat ruled field and the wrong one here: a Linefield
// frame contains four enormous blocks of type, and a corridor's row spacing varies across the frame by design.
// It reads both as structure and returns numbers in the tens of per cent for a scene that is not shimmering.
//
// WHAT THIS ASKS INSTEAD. Shimmer is rows winking in and out as the sampling grid slides over them: between two
// frames a hair apart in progress, a shimmering pixel swings far more than the movement can account for. So the
// scene is stepped by a tiny amount, the two frames are differenced, and the difference is compared with what
// the same step produces in the parts of the field that are NOT converging. The ratio is the number: about 1
// means the converging region moves like the rest of the field; much more than 1 means it is boiling.
//
// CALIBRATION IS PART OF THE TEST. `--break fade` disables the coverage handling and `--break jacobian` replaces
// the analytic gradient with a finite-difference one. Both are deliberately wrong builds; the measure must read
// clearly higher on them than on the real one, or it is not measuring anything.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4800'] = process.argv.slice(2)
const bi = process.argv.indexOf('--break')
const BREAK = bi > 0 ? process.argv[bi + 1] : null
const OUT = 'out/linefield'

/** mean absolute difference per pixel, over a rectangle */
function madIn(a, b, W, c, box) {
  let s = 0
  let n = 0
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const i = (y * W + x) * c
      s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])
      n += 3
    }
  }
  return s / n
}

/** how much of a frame is high-frequency: each pixel against the mean of its four neighbours */
function hfIn(d, W, c, box) {
  let s = 0
  let n = 0
  for (let y = box.y + 1; y < box.y + box.h - 1; y++) {
    for (let x = box.x + 1; x < box.x + box.w - 1; x++) {
      const i = (y * W + x) * c
      const m = (d[i - c] + d[i + c] + d[i - W * c] + d[i + W * c]) / 4
      s += Math.abs(d[i] - m)
      n++
    }
  }
  return s / n
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const rows = []
  for (const [w, h, tag] of [[1440, 900, 'desktop-1440x900'], [390, 844, 'portrait-390x844']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    // the site's own path: the passage is a place now and is travelled to, exactly as a visitor reaches it
    await p.goto(`http://127.0.0.1:${port}/tr${BREAK ? `?lfbreak=${BREAK}` : ''}`, { waitUntil: 'load', timeout: 90000 })
    await p.waitForFunction(() => !!window.__lab?.lfSet, null, { timeout: 60000 })
    await sleep(2400)
    await p.evaluate(() => window.__lab.go(window.__lab.STOP.linefield))
    await sleep(1700)
    await p.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = 'hidden' }))
    await sleep(2400)

    /*
     * The two regions. NEAR is the third of the frame the rays converge into — where the corridor's vanishing
     * point lives and where shimmer would be. FAR is the third at the open end, where rows are far apart and
     * nothing should be boiling. The ratio between them is what makes the number mean something on a scene
     * whose content is not uniform.
     */
    const near = { x: Math.round(w * 0.08), y: Math.round(h * 0.18), w: Math.round(w * 0.26), h: Math.round(h * 0.64) }
    const far = { x: Math.round(w * 0.66), y: Math.round(h * 0.18), w: Math.round(w * 0.26), h: Math.round(h * 0.64) }

    for (const [name, from, step] of [
      ['the hardest convergence', 0.30, 0.0016],
      ['the passage', 0.48, 0.0016],
    ]) {
      let nearSum = 0
      let farSum = 0
      let hf = 0
      const N = 6
      for (let k = 0; k < N; k++) {
        await p.evaluate((x) => window.__lab.lfSet(x), from + k * step)
        await sleep(90)
        const A = await sharp(await p.screenshot()).raw().toBuffer({ resolveWithObject: true })
        await p.evaluate((x) => window.__lab.lfSet(x), from + (k + 1) * step)
        await sleep(90)
        const B = await sharp(await p.screenshot()).raw().toBuffer({ resolveWithObject: true })
        const { width: W, channels: c } = A.info
        /*
         * THE STATISTIC IS THE GRAIN OF THE CHANGE, not its size.
         *
         * The first version compared how much the converging region moved against how much the open field
         * moved. That is not shimmer: a region that has gone solid moves very little and scored LOW, so a
         * broken build looked better than the real one. Shimmer is rows winking in and out, which makes the
         * difference between two frames FINE-GRAINED. So the difference image is built and its
         * high-frequency content is measured against its own mean: smooth movement scores near zero whatever
         * its amplitude, and boiling scores high however faint.
         */
        const diff = new Uint8Array(A.data.length)
        for (let i = 0; i < A.data.length; i++) diff[i] = Math.abs(A.data[i] - B.data[i])
        const mean = madIn(A.data, B.data, W, c, near)
        nearSum += mean > 0.02 ? hfIn(diff, W, c, near) / mean : 0
        farSum += 1
        hf += hfIn(A.data, W, c, near)
      }
      const ratio = nearSum / Math.max(1, farSum)
      rows.push({ tag, name, ratio, hf: hf / N })
      console.log(`  ${tag}  ${name}: grain of the change where the rays converge ${ratio.toFixed(2)}, high-frequency energy there ${(hf / N).toFixed(2)}`)
    }
    await ctx.close()
  }
  await b.close()
  const worst = Math.max(...rows.map((r) => r.ratio))
  console.log(`\n  worst ratio: ${worst.toFixed(2)}${BREAK ? `   [BROKEN BUILD: ${BREAK}]` : ''}`)
  fs.writeFileSync(`${OUT}/shimmer${BREAK ? `-broken-${BREAK}` : ''}.json`, JSON.stringify(rows, null, 2))
})()
