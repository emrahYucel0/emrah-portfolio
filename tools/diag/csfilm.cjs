// CROSS SECTION — a film of the path alone, for review: Work's last work → Cross Section → DEPTH, and back to Work.
//
//   node csfilm.cjs <port> [WxH ...] [--keys]
//
// One wheel notch per gesture, dispatched inside the page, with the pauses a visitor leaves (or ArrowDown/ArrowUp with
// --keys). Playwright's recorder runs at about 25 fps, so the film shows the path, not the frame pacing — the frame-
// level evidence is csseam.cjs. Writes tools/diag/out/cross/film/path-<WxH>.webm.
const pw = require('playwright')
const { watch } = require('./consolewatch.cjs')
const fs = require('node:fs')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const sizes = args.filter((a) => /^\d+x\d+$/.test(a)).map((s) => s.split('x').map(Number))
if (!sizes.length) sizes.push([1440, 900], [390, 844])
const keys = args.includes('--keys')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  fs.mkdirSync('out/cross/film', { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const [w, h] of sizes) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 700 ? 3 : 2, recordVideo: { dir: 'out/cross/film/tmp', size: { width: w, height: h } } })
    const p = await ctx.newPage()
    const W = watch(p, `${w}x${h}`)
    await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'load', timeout: 180000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
    await sleep(800)
    await p.evaluate(() => window.__lab.go(window.__lab.STOP.work)); await sleep(2200)
    for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowRight'); await sleep(500) }
    await sleep(2000)
    const step = async (dir) => {
      if (keys) await p.keyboard.press(dir > 0 ? 'ArrowDown' : 'ArrowUp')
      else await p.evaluate((d) => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 * d, deltaMode: 0, cancelable: true })), dir)
    }
    // forward: the gesture that leaves Work (and turns to the band), beside, in front, release and carry to DEPTH
    await step(1); await sleep(3200)
    await step(1); await sleep(1800)
    await step(1); await sleep(1800)
    await step(1); await sleep(2600)
    // back: in front, beside, behind, and the turn back into Work
    await step(-1); await sleep(1800)
    await step(-1); await sleep(1800)
    await step(-1); await sleep(1800)
    await step(-1); await sleep(3200)
    const bad = await W.verdict(p)
    if (bad.length) { process.exitCode = 1; console.log(`  FAIL console (${bad.length}):\n    ${bad.slice(0, 6).join('\n    ')}`) } else console.log('  console clean')
    await ctx.close()
    const dest = `out/cross/film/path-${w}x${h}.webm`
    fs.renameSync(await p.video().path(), dest)
    console.log(`  ${dest}`)
  }
  await b.close()
})()
