// LINEFIELD — the corridor at its key moments, and in motion (Phase B).
//
//   node linefieldshot.cjs <port> [--film]
//
// Stills are taken at an exact progress, so two runs photograph the same moment. The in-motion frames are not
// stills at intervals: the scene is PLAYED and frames are captured while it moves, because shimmer is a thing
// that happens between frames and a still cannot show it.
const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4800'] = process.argv.slice(2)
const FILM = process.argv.includes('--film')
const OUT = 'out/linefield'

// the moments the sequence is made of, named so the contact sheet reads as the timeline
const MOMENTS = [
  ['00-backend-at-rest', 0],
  ['01-corridor-opening', 0.16],
  ['02-words-flowing', 0.26],
  ['03-corridor-full', 0.34],
  ['04-collapsing', 0.44],
  ['05-one-line', 0.5],
  ['06-opening-onto-cream', 0.55],
  ['07-frontend-arriving', 0.7],
  ['08-settling', 0.85],
  ['09-frontend-at-rest', 1],
]

async function open(b, w, h, extra = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700, ...extra })
  const p = await ctx.newPage()
  const bad = []
  p.on('pageerror', (e) => bad.push(String(e).slice(0, 200)))
  p.on('console', (m) => { if (m.type() === 'error') bad.push(m.text().slice(0, 200)) })
  await p.goto(`http://127.0.0.1:${port}/tr?linefield=1`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => !!window.__lf, null, { timeout: 60000 })
  await sleep(500)
  return { ctx, p, bad }
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })

  for (const [w, h, tag] of [[1440, 900, 'desktop-1440x900'], [390, 844, 'portrait-390x844']]) {
    const { ctx, p, bad } = await open(b, w, h)
    const info = await p.evaluate(() => ({ face: window.__lf.faceOk, sp: window.__lf.spacing() }))
    console.log(`\n  ${tag}  face ${info.face ? 'loaded' : 'FALLBACK'}  row pitch ${info.sp.back.toFixed(1)}px  cap ${info.sp.cap.toFixed(0)}px  -> ${(info.sp.cap / info.sp.back).toFixed(1)} rows per capital`)
    for (const [name, v] of MOMENTS) {
      await p.evaluate((x) => window.__lf.setProgress(x), v)
      await sleep(140)
      fs.writeFileSync(`${OUT}/${tag}-${name}.png`, await p.screenshot())
    }
    // frame time, measured over a played sweep rather than over stills
    await p.evaluate(() => window.__lf.resetTimes())
    await p.evaluate(() => window.__lf.play(0, 1, 2600))
    await sleep(200)
    const t = await p.evaluate(() => ({ mean: window.__lf.frameMs(), worst: window.__lf.worstMs() }))
    console.log(`  frame time over a full sweep: mean ${t.mean.toFixed(2)}ms, worst ${t.worst.toFixed(2)}ms  (60fps allows 16.7ms)`)
    if (bad.length) console.log(`  ERRORS: ${bad.slice(0, 3).join(' | ')}`)
    else console.log('  no page or console errors')
    await ctx.close()
  }

  /*
   * EVERY TWO PER CENT THROUGH THE PASSAGE, which is the part the review is about: the collapse, the one line,
   * and the opening onto cream.
   */
  for (const [w, h, tag] of [[1440, 900, 'desktop-1440x900'], [390, 844, 'portrait-390x844']]) {
    const { ctx, p } = await open(b, w, h)
    fs.mkdirSync(`${OUT}/sweep`, { recursive: true })
    for (let v = 36; v <= 60; v += 2) {
      await p.evaluate((x) => window.__lf.setProgress(x), v / 100)
      await sleep(120)
      fs.writeFileSync(`${OUT}/sweep/${tag}-${v}.png`, await p.screenshot())
    }
    console.log(`  ${tag}: 36%..60% every 2%`)
    await ctx.close()
  }

  /*
   * IN MOTION. Frames captured while the scene is playing, a third of a second apart, through the part of the
   * sequence where the rows converge hardest — which is where shimmer would live if the Jacobian were wrong.
   */
  {
    const { ctx, p } = await open(b, 1440, 900)
    fs.mkdirSync(`${OUT}/motion`, { recursive: true })
    const play = p.evaluate(() => window.__lf.play(0.10, 0.40, 3000))
    for (let i = 0; i < 8; i++) {
      await sleep(330)
      fs.writeFileSync(`${OUT}/motion/m-${String(i).padStart(2, '0')}.png`, await p.screenshot())
    }
    await play
    console.log(`\n  8 frames captured in motion, out/linefield/motion/`)
    await ctx.close()
  }

  if (FILM) {
    const VID = `${OUT}/video`
    fs.mkdirSync(VID, { recursive: true })
    for (const [w, h, name] of [[1440, 900, 'linefield-desktop-1440x900'], [390, 844, 'linefield-mobile-390x844-EMULATION-NOT-IOS']]) {
      const { ctx, p } = await open(b, w, h, { recordVideo: { dir: VID, size: { width: w, height: h } } })
      await p.evaluate(() => window.__lf.play(0, 1, 5200))
      await sleep(400)
      await p.evaluate(() => window.__lf.play(1, 0, 3600))
      await sleep(400)
      const v = p.video()
      await ctx.close()
      if (v) { const to = `${VID}/${name}.webm`; fs.rmSync(to, { force: true }); await v.saveAs(to); console.log(`  ${name}.webm`) }
    }
  }

  await b.close()
  console.log(`\n  stills in ${OUT}/\n`)
})()
