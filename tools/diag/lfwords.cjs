// EVERY WORD IS WHOLE AT EVERY MOMENT OF ITS FLIGHT.
//
//   node lfwords.cjs <port>
//
// The field has an extent — the reference's rows run from 7% to 93% of the height and no further — and the
// corridor's ground needs it, or rows from far above and below the screen pile up around the vanishing point.
// A WORD does not need it and must not have it: FEEL flies in across the top of that extent, and applied to the
// whole pixel the extent took the top rows off its letters until it settled.
//
// HOW IT IS MEASURED. Not by eye, and not against a threshold picked to pass. The same frame is rendered twice:
// once with the extent removed entirely (`?lfbreak=noextent`, where every word is certainly complete) and once
// as it really is. In the reference frame a pixel is TYPE if it sits at full ink inside a vertical run of at
// least three such pixels — a ground row at this pitch is one or two pixels of part ink, a letter's row is four
// or five of full ink, so the two do not overlap. Every type pixel of the reference must still be inked in the
// real frame. One that is not is a row taken off a letter.
//
// AND IT IS CALIBRATED. `--break extentall` renders the middle frame with the extent applied to type as well —
// what the code did when the fault was reported. The check must find that guilty against the same reference.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4802'] = process.argv.slice(2)
const bi = process.argv.indexOf('--break')
const BREAK = bi > 0 ? process.argv[bi + 1] : null
const OUT = BREAK ? `out/linefield/words-broken-${BREAK}` : 'out/linefield/words'

// a letter's row is this many pixels of solid ink or more; a ground row never is
const RUN = 3
// how far from the ink colour a pixel may be and still count as full ink
const FULL = 46
// and how far the real frame may fall short of the reference at a type pixel before it counts as a row lost
const SHORT = 70

const open = async (b, w, h, breaks) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/tr?linefield=1${breaks ? `&lfbreak=${breaks}` : ''}`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => !!window.__lf, null, { timeout: 60000 })
  await p.evaluate(() => window.__lf.dock(false))
  await p.evaluate(() => window.__lf.play(0, 0.3, 300))
  await sleep(300)
  return { ctx, p }
}

const shot = async (p, v) => {
  await p.evaluate((x) => window.__lf.setProgress(x), v)
  await sleep(130)
  const png = await p.screenshot()
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
  return { png, data, info }
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const report = []

  for (const [w, h, tag] of [[1440, 900, '1440x900'], [390, 844, '390x844']]) {
    const ref = await open(b, w, h, 'noextent')
    const real = await open(b, w, h, BREAK)

    // the whole of both flights, either side of the passage, every two per cent
    const list = []
    for (let v = 4; v <= 46; v += 2) list.push(v)
    for (let v = 56; v <= 98; v += 2) list.push(v)

    let worstLost = 0
    let worstAt = 0
    for (const v of list) {
      const A = await shot(ref.p, v / 100)
      const B = await shot(real.p, v / 100)
      const ink = await ref.p.evaluate(() => window.__lf.inkColour())
      const { width: W, height: H, channels: c } = A.info
      const near = (d, i) => Math.max(Math.abs(d[i] - ink[0]), Math.abs(d[i + 1] - ink[1]), Math.abs(d[i + 2] - ink[2]))

      // type pixels of the reference: full ink, in a vertical run of at least RUN
      let lost = 0
      let total = 0
      let topLost = H
      for (let x = 0; x < W; x++) {
        let run = 0
        for (let y = 0; y <= H; y++) {
          const solid = y < H && near(A.data, (y * W + x) * c) <= FULL
          if (solid) { run++; continue }
          if (run >= RUN) {
            for (let k = y - run; k < y; k++) {
              total++
              const i = (k * W + x) * c
              if (near(B.data, i) - near(A.data, i) > SHORT) { lost++; if (k < topLost) topLost = k }
            }
          }
          run = 0
        }
      }
      const pct = total ? (lost / total) * 100 : 0
      report.push({ tag, v, total, lost, pct: +pct.toFixed(3) })
      if (lost > worstLost) { worstLost = lost; worstAt = v }
      if (lost > 0) {
        console.log(`  ${tag} ${v}%  ${lost} of ${total} type pixels lost (${pct.toFixed(2)}%), highest at y=${topLost}`)
        fs.writeFileSync(`${OUT}/${tag}-${v}-real.png`, B.png)
        fs.writeFileSync(`${OUT}/${tag}-${v}-noextent.png`, A.png)
      }
    }
    // and the named moments, kept whatever the result, because they are what the review looks at
    for (const v of [58, 62, 66, 70, 74, 8, 14, 20, 26]) {
      const B = await shot(real.p, v / 100)
      fs.writeFileSync(`${OUT}/${tag}-${v}.png`, B.png)
    }
    const mine = report.filter((r) => r.tag === tag)
    const bad = mine.filter((r) => r.lost > 0)
    console.log(`  ${tag}: ${bad.length ? `${bad.length} of ${mine.length} frames lose rows off a letter, worst ${worstLost} px at ${worstAt}%` : `every word whole in all ${mine.length} frames`}`)
    await ref.ctx.close()
    await real.ctx.close()
  }

  await b.close()
  fs.writeFileSync(`${OUT}/words.json`, JSON.stringify(report, null, 2))
  const bad = report.filter((r) => r.lost > 0)
  console.log(`\n  ${bad.length === 0 ? 'PASS — every word is complete at every moment of its flight' : `FAIL — ${bad.length} frames take rows off a letter`}${BREAK ? `   [BROKEN BUILD: ${BREAK}]` : ''}\n`)
})()
