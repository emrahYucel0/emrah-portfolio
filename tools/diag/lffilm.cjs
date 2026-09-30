// THE PHASE C DELIVERABLES — the recordings and the stills the review is done from.
//
//   node lffilm.cjs <port>
//
// Nothing here asserts anything; linefield.cjs is the gate. This exists because a gate that passes and a scene
// that reads are different claims, and only one of them can be settled by looking.
//
//   journey/    Full-Stack -> the passage -> Work and back, driven by the wheel on a desktop and by flicks on
//               an emulated phone. Both are one continuous take: the whole point is whether the seams are there.
//   enter/      the four seams as stills — into the passage from each side, out of it to each side
//   beyond/     1:1 frames of the band past the vanishing point at 40, 50, 56 and 60 per cent
//   flight/     the top word mid-flight on both sides, where its letters were losing their tops
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port = '4801'] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const oi = process.argv.indexOf('--only')
const ONLY = oi > 0 ? process.argv[oi + 1] : null
const on = (s) => !ONLY || ONLY === s
const OUT = 'out/linefield/phaseC'

const open = async (b, w, h, locale, extra = {}) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700, ...extra })
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/${locale}`, { waitUntil: 'load', timeout: 90000 })
  await p.waitForFunction(() => !!window.__lab?.lfSet, null, { timeout: 60000 })
  await sleep(2400)
  return { ctx, p }
}
const goTo = async (p, n) => { await p.evaluate((x) => window.__lab.go(window.__lab.STOP[x]), n); await sleep(1600) }
const at = (p) => p.evaluate(() => ({ base: window.__lab.A.base, lfp: +window.__lab.A.lfp.toFixed(3) }))

/** a flick: short, fast, and let go of */
async function flick(p, x, from, to, steps = 5, gap = 8) {
  await p.mouse.move(x, from)
  await p.mouse.down()
  for (let k = 1; k <= steps; k++) { await p.mouse.move(x, from + (to - from) * (k / steps)); await sleep(gap) }
  await p.mouse.up()
}

;(async () => {
  for (const d of ['journey', 'enter', 'beyond', 'flight']) fs.mkdirSync(`${OUT}/${d}`, { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })

  // ── the two journeys, recorded ───────────────────────────────────────────────────────────────────────────
  if (on('journey')) {
    const { ctx, p } = await open(b, 1440, 900, 'tr', { recordVideo: { dir: `${OUT}/journey`, size: { width: 1440, height: 900 } } })
    await goTo(p, 'system')
    await sleep(700)
    for (let i = 0; i < 26; i++) { await p.mouse.wheel(0, 120); await sleep(300) }
    await sleep(1200)
    for (let i = 0; i < 26; i++) { await p.mouse.wheel(0, -120); await sleep(300) }
    await sleep(1000)
    const v = p.video()
    await ctx.close()
    if (v) { const to = `${OUT}/journey/desktop-WHEEL-fullstack-linefield-work-and-back-1440x900.webm`; fs.rmSync(to, { force: true }); await v.saveAs(to); console.log(`  ${to.split('/').pop()}`) }
  }
  {
    const { ctx, p } = await open(b, 390, 844, 'tr', { recordVideo: { dir: `${OUT}/journey`, size: { width: 390, height: 844 } } })
    await goTo(p, 'system')
    await sleep(700)
    for (const [from, to] of [[720, 300], [730, 320], [720, 300], [730, 330], [720, 320], [730, 300], [720, 340]]) {
      await flick(p, 195, from, to)
      await sleep(1000)
    }
    await sleep(900)
    for (const [from, to] of [[280, 700], [270, 710], [280, 700], [270, 690], [280, 710], [270, 700], [280, 700]]) {
      await flick(p, 195, from, to)
      await sleep(1000)
    }
    await sleep(900)
    const v = p.video()
    await ctx.close()
    if (v) { const to = `${OUT}/journey/mobile-TOUCH-390x844-EMULATION-NOT-IOS.webm`; fs.rmSync(to, { force: true }); await v.saveAs(to); console.log(`  ${to.split('/').pop()}`) }
  }

  // ── the four seams ───────────────────────────────────────────────────────────────────────────────────────
  if (on('enter')) {
    const { ctx, p } = await open(b, 1440, 900, 'tr')
    const shot = async (name) => fs.writeFileSync(`${OUT}/enter/${name}.png`, await p.screenshot())
    await goTo(p, 'system')
    await shot('1-at-fullstack')
    for (let i = 0; i < 10 && (await at(p)).base < 3; i++) { await p.mouse.wheel(0, 120); await sleep(320) }
    await sleep(260)
    await shot('2a-the-seam-fullstack-into-the-passage')
    await sleep(1400)
    await shot('2-entered-from-fullstack')
    await p.evaluate(() => window.__lab.lfSet(1))
    await sleep(600)
    await shot('3-at-the-far-end')
    for (let i = 0; i < 6 && (await at(p)).base < 4; i++) { await p.mouse.wheel(0, 120); await sleep(320) }
    await sleep(900)
    await shot('4-arrived-at-work')
    for (let i = 0; i < 10 && (await at(p)).base > 3; i++) { await p.mouse.wheel(0, -120); await sleep(320) }
    await sleep(260)
    await shot('5a-the-seam-work-into-the-passage')
    await sleep(1400)
    await shot('5-entered-from-work')
    for (let i = 0; i < 16 && (await at(p)).base > 2; i++) { await p.mouse.wheel(0, -120); await sleep(320) }
    await sleep(900)
    await shot('6-back-at-fullstack')
    console.log('  enter/ six stills')
    await ctx.close()
  }

  // ── beyond the vanishing point, 1:1 ──────────────────────────────────────────────────────────────────────
  for (const [w, h] of on('beyond') ? [[1920, 1080], [1440, 900], [390, 844]] : []) {
    const { ctx, p } = await open(b, w, h, 'tr')
    await goTo(p, 'linefield')
    await p.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = 'hidden' }))
    for (const v of [40, 50, 56, 60]) {
      await p.evaluate((x) => window.__lab.lfSet(x / 100), v)
      await sleep(400)
      const q = await p.evaluate(() => window.__lab.lfProbe())
      const png = await p.screenshot()
      fs.writeFileSync(`${OUT}/beyond/${w}x${h}-${v}.png`, png)
      // and the band itself, cropped at 1:1 so a mark of four pixels is not lost in a full frame
      const side = q.seq.side
      const left = side === 0 ? 0 : Math.min(w - 60, Math.ceil(q.hi))
      const width = side === 0 ? Math.max(60, Math.floor(q.lo)) : w - left
      await sharp(png).extract({ left: Math.max(0, left), top: 0, width: Math.max(20, Math.min(width, w - left)), height: h })
        .toFile(`${OUT}/beyond/${w}x${h}-${v}-BAND-1to1.png`)
    }
    console.log(`  beyond/ ${w}x${h} at 40, 50, 56, 60`)
    await ctx.close()
  }

  // ── the top word, mid-flight ─────────────────────────────────────────────────────────────────────────────
  for (const [w, h] of on('flight') ? [[1440, 900], [390, 844]] : []) {
    const { ctx, p } = await open(b, w, h, 'tr')
    await goTo(p, 'linefield')
    await p.evaluate(() => document.querySelectorAll('.layer, .strip').forEach((e) => { e.style.visibility = 'hidden' }))
    for (const v of [10, 14, 18, 62, 66, 70, 76, 82]) {
      await p.evaluate((x) => window.__lab.lfSet(x / 100), v)
      await sleep(360)
      fs.writeFileSync(`${OUT}/flight/${w}x${h}-${v}.png`, await p.screenshot())
    }
    console.log(`  flight/ ${w}x${h}`)
    await ctx.close()
  }

  await b.close()
  console.log(`\n  deliverables in ${OUT}/\n`)
})()
