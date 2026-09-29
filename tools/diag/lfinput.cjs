// HOW THE PASSAGE FOLLOWS THE HAND — measured, and the recordings driven by a hand rather than by the slider.
//
//   node lfinput.cjs <port> [--film]
//
// Four things, because "lighter" and "smoother" are four different claims:
//
//   REACH       how many wheel notches, and how far a finger, carries the whole passage
//   NORMALISED  a mouse notch, a trackpad's flood of tiny deltas, and a wheel reporting LINES rather than
//               pixels must all mean the same travel. Playwright only sends pixel deltas, so the other two
//               modes are dispatched as real WheelEvents at the window
//   LAG         how long after an input the scene has covered 90% of the distance to it
//   MOMENTUM    a flick keeps travelling after the finger lifts, decelerates, and — the part that matters —
//               never skips the collapse. That is a claim about FRAMES, so the scene's own frame trace is
//               read rather than a screenshot: the largest single-frame step, and whether a frame was drawn
//               at the crossing itself
const pw = require('playwright')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4800'] = process.argv.slice(2)
const FILM = process.argv.includes('--film')
const OUT = 'out/linefield'

const open = async (b, w, h, extra = {}) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700, ...extra })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/tr?linefield=1`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => !!window.__lf, null, { timeout: 60000 })
  await sleep(600)
  return { ctx, p }
}

/** a drag down the screen at a chosen speed, ending in a lift — a flick if it is fast */
const swipe = async (p, x, from, to, steps, gap) => {
  await p.mouse.move(x, from)
  await p.mouse.down()
  for (let k = 1; k <= steps; k++) { await p.mouse.move(x, from + (to - from) * (k / steps)); await sleep(gap) }
  await p.mouse.up()
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const report = {}

  const b = await pw.chromium.launch({ channel: 'chrome' })

  // ── the wheel ────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(b, 1440, 900)
    const tune = await p.evaluate(() => window.__lf.input())
    report.tuning = tune
    console.log(`  tuning: follow ${tune.follow}/s (time constant ${Math.round(1000 / tune.follow)}ms) · momentum decay ${tune.momentumTau}s`)
    console.log(`          wheel ${tune.wheelSpan}px end to end · flick capped at ${tune.maxVel} of the passage per second`)

    let n = 0
    while (n < 80) {
      const at = await p.evaluate(() => window.__lf.progress)
      if (at > 0.995) break
      await p.mouse.wheel(0, 100)
      await sleep(190)
      n++
    }
    report.notches = n
    console.log(`  desktop: ${n} wheel notches of 100px end to end (one notch = ${(100 / tune.wheelSpan * 100).toFixed(1)}% of the passage)`)

    // the three devices, each asked for the same travel, each measured
    const modes = await p.evaluate(async () => {
      const out = {}
      const settle = () => new Promise((r) => setTimeout(r, 700))
      const run = async (name, fire) => {
        window.__lf.setProgress(0)
        await settle()
        fire()
        await settle()
        out[name] = window.__lf.progress
      }
      const ev = (deltaY, deltaMode) => window.dispatchEvent(new WheelEvent('wheel', { deltaY, deltaMode, bubbles: true, cancelable: true }))
      await run('mouse notch, 100px', () => ev(100, 0))
      // a trackpad reports the same travel as a flood of small deltas
      await run('trackpad, 20 x 5px', () => { for (let i = 0; i < 20; i++) ev(5, 0) })
      // and some mice report LINES: three lines is one notch
      await run('wheel in LINES, 6.25', () => ev(6.25, 1))
      return out
    })
    report.modes = modes
    const vals = Object.values(modes)
    const spread = (Math.max(...vals) - Math.min(...vals)) / Math.max(...vals)
    for (const [k, v] of Object.entries(modes)) console.log(`    ${k.padEnd(20)} -> ${(v * 100).toFixed(2)}%`)
    console.log(`  the three agree to within ${(spread * 100).toFixed(1)}%`)

    // lag: one notch, then how long until the scene has covered 90% of it
    const lag = await p.evaluate(async () => {
      window.__lf.setProgress(0.2)
      await new Promise((r) => setTimeout(r, 500))
      window.__lf.trace(true)
      const t0 = performance.now()
      window.__lf.nudge(0.08)
      await new Promise((r) => setTimeout(r, 700))
      const tr = window.__lf.traced()
      const hit = tr.find(([, v]) => v >= 0.2 + 0.08 * 0.9)
      window.__lf.trace(false)
      return hit ? hit[0] - t0 : -1
    })
    report.lagMs = Math.round(lag)
    console.log(`  lag: 90% of one notch covered in ${Math.round(lag)}ms`)
    await ctx.close()
  }

  // ── the finger ───────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(b, 390, 844)
    const span = await p.evaluate(() => window.__lf.touchSpan())
    report.touchSpan = Math.round(span)
    console.log(`  phone: a drag of ${Math.round(span)}px covers the whole passage — ${(span / 844).toFixed(2)} screen heights`)

    // a deliberate, slow positioning drag: where it ends is where the finger left it, and it must not coast
    await p.evaluate(() => window.__lf.setProgress(0))
    await sleep(300)
    await swipe(p, 195, 700, 380, 16, 90)
    const atLift = await p.evaluate(() => window.__lf.target)
    await sleep(900)
    const afterSlow = await p.evaluate(() => window.__lf.progress)
    report.slowCoast = +(afterSlow - atLift).toFixed(4)
    console.log(`  a slow positioning drag of 320px (about 220px/s) ends at ${(afterSlow * 100).toFixed(1)}% and coasts ${((afterSlow - atLift) * 100).toFixed(2)}% past the finger`)

    // a flick: same distance, much faster, and it must carry on
    await p.evaluate(() => window.__lf.setProgress(0))
    await sleep(300)
    await p.evaluate(() => window.__lf.trace(true))
    await swipe(p, 195, 700, 380, 6, 8)
    const flickLift = await p.evaluate(() => window.__lf.target)
    await sleep(1400)
    const flickEnd = await p.evaluate(() => window.__lf.progress)
    const tr = await p.evaluate(() => { const t = window.__lf.traced(); window.__lf.trace(false); return t })
    report.flickCarry = +(flickEnd - flickLift).toFixed(4)
    let worstStep = 0
    for (let i = 1; i < tr.length; i++) worstStep = Math.max(worstStep, Math.abs(tr[i][1] - tr[i - 1][1]))
    report.worstStep = +worstStep.toFixed(4)
    console.log(`  a flick of the same 320px ends at ${(flickEnd * 100).toFixed(1)}% — ${((flickEnd - flickLift) * 100).toFixed(1)}% of it after the finger lifted`)
    console.log(`  largest single-frame step during the flick: ${(worstStep * 100).toFixed(2)}% of the passage (${tr.length} frames drawn)`)

    /*
     * AND THE COLLAPSE IS NEVER SKIPPED. The hardest case is a flick that crosses 50% at full speed: if any
     * frame stepped over the crossing the passage would cut from the dark field to the cream one.
     */
    await p.evaluate(() => window.__lf.setProgress(0.36))
    await sleep(400)
    await p.evaluate(() => window.__lf.trace(true))
    await swipe(p, 195, 760, 200, 5, 6)
    await sleep(1600)
    const cross = await p.evaluate(() => { const t = window.__lf.traced(); window.__lf.trace(false); return t })
    const near = cross.filter(([, v]) => Math.abs(v - 0.5) < 0.015)
    let worstCross = 0
    for (let i = 1; i < cross.length; i++) worstCross = Math.max(worstCross, Math.abs(cross[i][1] - cross[i - 1][1]))
    report.framesAtCrossing = near.length
    report.worstStepCrossing = +worstCross.toFixed(4)
    console.log(`  a flick straight through the collapse drew ${near.length} frames within 1.5% of the crossing, worst step ${(worstCross * 100).toFixed(2)}%`)
    await ctx.close()
  }

  if (FILM) {
    const VID = `${OUT}/video`
    fs.mkdirSync(VID, { recursive: true })
    {
      const { ctx, p } = await open(b, 1440, 900, { recordVideo: { dir: VID, size: { width: 1440, height: 900 } } })
      for (let i = 0; i < 22; i++) { await p.mouse.wheel(0, 100); await sleep(150) }
      await sleep(900)
      for (let i = 0; i < 16; i++) { await p.mouse.wheel(0, -100); await sleep(150) }
      await sleep(700)
      const v = p.video(); await ctx.close()
      if (v) { const to = `${VID}/linefield-desktop-WHEEL-1440x900.webm`; fs.rmSync(to, { force: true }); await v.saveAs(to); console.log(`  ${to.split('/').pop()}`) }
    }
    {
      const { ctx, p } = await open(b, 390, 844, { recordVideo: { dir: VID, size: { width: 390, height: 844 } } })
      // flicks, not drags: short and fast, with the scene left to coast between them
      for (const [from, to, steps, gap] of [[720, 300, 5, 8], [720, 320, 5, 8], [700, 340, 5, 8], [260, 700, 5, 8], [260, 700, 5, 8]]) {
        await swipe(p, 195, from, to, steps, gap)
        await sleep(950)
      }
      const v = p.video(); await ctx.close()
      if (v) { const to = `${VID}/linefield-mobile-TOUCH-390x844-EMULATION-NOT-IOS.webm`; fs.rmSync(to, { force: true }); await v.saveAs(to); console.log(`  ${to.split('/').pop()}`) }
    }
  }

  await b.close()
  fs.writeFileSync(`${OUT}/input.json`, JSON.stringify(report, null, 2))
})()
