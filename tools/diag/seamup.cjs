// THE UPWARD SEAM, WITH ITS CONTROLS — finale at p = 0, one gesture up, onto the bench.
//
//   node seamup.cjs <port> <label> [reps]
//
// The release gate reports this as a failure:
//
//   FAIL the seam, upwards: the bench's first frames ARE the finale at p = 0 (sheet and foot band)
//        +141ms Δ0.488 (398894 px) · +148ms Δ1.177 (394388 px) · +165ms Δ1.526 (1155246 px)
//
// Before that can be called a fault in the site, the measurement has to be shown to be capable of passing. Two
// things about it are suspicious and neither is about the bench:
//
//   THE TWO SIDES ARE CAPTURED BY DIFFERENT MACHINERY. The finale's reference is `p.screenshot()`; the bench's
//   frames come from a CDP `Page.screencast`. One is a renderer snapshot, the other a compositor stream, PNG-
//   encoded on a different path. `diff()` also takes its canvas width from the FIRST image only
//   (`const w = ia.width`) and draws the second at its own natural size — so if the two sizes differ at all, the
//   images are compared misaligned and a difference is guaranteed whatever the bench does.
//
//   THE TEST IS STRICTER THAN ITS TWIN. Downward asserts `overPx === 0` — no pixel differing by more than 8
//   luminance levels. Upward asserts `anyPx === 0` — byte equality, across those two capture paths.
//
// So this harness measures the controls first and the seam second, and reports `overPx` for every frame, which
// the gate never printed:
//
//   control A  a screencast frame vs ANOTHER screencast frame of the same motionless page  (same path)
//   control B  a screencast frame vs a SCREENSHOT of the same motionless page               (across paths)
//   the seam   every frame of the first 400 ms after the route changes, against BOTH references
//
// Control A says what the stream's own noise is. Control B says what the gate's comparison costs before the
// bench has done anything at all. Only what is left over after those two can be the seam.
//
// The finale is reached by its own route and run back to the top, not by crossing down from the bench: that way
// this runs identically on builds from before R7, where the bench did not browse. Stills go to
// out/seamup/<label>/ — never into docs/, which is tracked (ROADMAP R27).
const fs = require('fs')
const path = require('path')
const pw = require('playwright')
const [port, label = `port-${process.argv[2]}`, repsArg = '3'] = process.argv.slice(2)
const REPS = +repsArg
// --viabench reaches the finale the way a VISITOR usually does: down from the bench, past study 03. The default
// reaches it by its own route, which mounts the bench cold on the way back and is the only path that shows the
// foot-band hairline. Both are real; the first is the common one, so it is the one to film.
const VIA = process.argv.includes('--viabench')
const REC = process.argv.includes('--record')
const BASE = `http://127.0.0.1:${port}`
const OUT = path.join(__dirname, 'out', 'seamup', label)
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const push = [6, 14, 26, 38, 44, 40]
const tail = [34, 27, 21, 16, 12, 9, 7, 5, 4, 3, 2, 2, 1, 1]
const momentum = async (pg, dir) => {
  const cdp = await pg.context().newCDPSession(pg)
  const t0 = Date.now() / 1000
  const seq = [...push, ...tail]
  for (let i = 0; i < seq.length; i++) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: seq[i] * dir, timestamp: t0 + i * 0.016 })
    await sleep(16)
  }
  await cdp.detach().catch(() => {})
}

let scratch = null
const sheetOf = (pg) => pg.evaluate(() => {
  const strip = document.querySelector('[data-strip]')?.getBoundingClientRect().height ?? 50
  return { top: Math.ceil(strip) + 2, bottom: innerHeight }
})
/*
 * The same luminance comparison the gate uses, with two differences: the sizes of both images are REPORTED, and
 * the crop is taken from the smaller of the two so a size mismatch cannot silently become a difference.
 */
async function diff(pg, a, b) {
  const box = await sheetOf(pg)
  if (!scratch) scratch = await pg.context().newPage()
  return scratch.evaluate(async ({ a, b, box }) => {
    const load = (d) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + d })
    const [ia, ib] = await Promise.all([load(a), load(b)])
    const sizes = `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}`
    const same = ia.width === ib.width && ia.height === ib.height
    const w = Math.min(ia.width, ib.width)
    const h = Math.min(ia.height, ib.height) - box.top
    const px = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, -box.top); return x.getImageData(0, 0, w, h).data }
    const da = px(ia), db = px(ib)
    let sum = 0, over = 0, any = 0, n = 0, worst = 0
    for (let i = 0; i < da.length; i += 4) {
      const la = da[i] * 0.299 + da[i + 1] * 0.587 + da[i + 2] * 0.114
      const lb = db[i] * 0.299 + db[i + 1] * 0.587 + db[i + 2] * 0.114
      const d = Math.abs(la - lb); sum += d; if (d > 8) over++; if (d > 0) any++; if (d > worst) worst = d; n++
    }
    return { mean: +(sum / n).toFixed(3), overPx: over, anyPx: any, worst: +worst.toFixed(1), n, sizes, sameSize: same }
  }, { a: a.toString('base64'), b: b.toString('base64'), box })
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference',
    ...(REC ? { recordVideo: { dir: path.join(OUT, 'video'), size: { width: 1440, height: 900 } } } : {}) })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 110)))
  console.log(`== UPWARD SEAM  ${label}  :${port}  reps ${REPS}  viewport 1440x900`)

  const state = () => p.evaluate(() => {
    const F = window.__finale
    return { path: location.pathname, y: Math.round(scrollY), finale: !!F, raw: F ? +F.frame.rawProgress().toFixed(3) : null, bench: !!document.querySelector('.lab-stage') }
  })

  for (let rep = 1; rep <= REPS; rep++) {
    console.log(`\n---- rep ${rep} ----`)
    if (VIA) {
      // the visitor's way in: the bench, browsed to its last study, then one gesture across (R7)
      await p.goto(`${BASE}/tr/lab`, { waitUntil: 'networkidle', timeout: 60000 })
      await sleep(2300)
      const studies = await p.evaluate(() => document.querySelectorAll('.lab-stage .rec').length)
      for (let k = 0; k < studies - 1; k++) { await momentum(p, 1); await sleep(900) }
      const at = await p.evaluate(() => [...document.querySelectorAll('.lab-stage .rec')].findIndex((x) => x.getAttribute('aria-current') === 'true') + 1)
      console.log('   came down from the bench, standing on 0' + at + ' of ' + studies)
      await momentum(p, 1)
      await p.waitForFunction(() => /[/]contact$/.test(location.pathname) && !!window.__finale, null, { timeout: 25000 }).catch(() => {})
      await sleep(1800)
    } else {
    await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => !!window.__finale, null, { timeout: 25000 }).catch(() => {})
    await sleep(1600)
    }
    // run the drawing back to its top, by separate gestures, and let the hush clear. R7 and the gesture rule both
    // make a single burst do less than it used to, so this scrolls until p is 0 rather than assuming once is enough.
    for (let i = 0; i < 14; i++) {
      const s = await state()
      if (s.raw != null && s.raw <= 0.0005 && s.y === 0) break
      await momentum(p, -1)
      await sleep(700)
      if ((await state()).path !== '/tr/contact') { console.log('   (left the finale while running it back to the top)'); break }
    }
    let s = await state()
    if (s.path !== '/tr/contact' || s.raw == null || s.raw > 0.0005) { console.log(`   SKIP rep: could not sit at the finale's top — ${JSON.stringify(s)}`); continue }
    await sleep(1400)

    /* ── the controls, on a page that is not moving ───────────────────────────────────────────────────────── */
    const cast0 = await ctx.newCDPSession(p)
    const still = []
    cast0.on('Page.screencastFrame', (f) => { still.push({ t: f.metadata.timestamp * 1000, data: f.data }); cast0.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}) })
    await cast0.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
    await sleep(900)
    const shot = await p.screenshot()
    await sleep(600)
    await cast0.send('Page.stopScreencast').catch(() => {}); await cast0.detach().catch(() => {})
    if (still.length < 2) { console.log(`   SKIP rep: the motionless screencast gave ${still.length} frames`); continue }
    const sA = Buffer.from(still[0].data, 'base64')
    const sB = Buffer.from(still[still.length - 1].data, 'base64')
    const cA = await diff(p, sA, sB)
    const cB = await diff(p, shot, sB)
    console.log(`   control A  screencast vs screencast, page still   mean ${cA.mean}  over8 ${cA.overPx}  any ${cA.anyPx}  worst ${cA.worst}  sizes ${cA.sizes}`)
    console.log(`   control B  SCREENSHOT vs screencast, page still   mean ${cB.mean}  over8 ${cB.overPx}  any ${cB.anyPx}  worst ${cB.worst}  sizes ${cB.sizes}${cB.sameSize ? '' : '   <-- DIFFERENT SIZES'}`)
    if (rep === 1) { fs.writeFileSync(path.join(OUT, 'control-screenshot.png'), shot); fs.writeFileSync(path.join(OUT, 'control-screencast.png'), sB) }

    /* ── the crossing ────────────────────────────────────────────────────────────────────────────────────── */
    const lastFinaleShot = await p.screenshot()
    const cast = await ctx.newCDPSession(p)
    const frames = []
    cast.on('Page.screencastFrame', (f) => { frames.push({ t: f.metadata.timestamp * 1000, data: f.data }); cast.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}) })
    await cast.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })
    await sleep(300)
    const preCross = frames.length ? Buffer.from(frames[frames.length - 1].data, 'base64') : null
    let navT = 0
    const watchNav = p.waitForFunction(() => location.pathname === '/tr/lab', null, { timeout: 20000, polling: 'raf' }).then(() => { navT = Date.now() }).catch(() => {})
    await momentum(p, -1)
    await watchNav
    await sleep(1300)
    await cast.send('Page.stopScreencast').catch(() => {}); await cast.detach().catch(() => {})
    s = await state()
    if (!navT) { console.log(`   SKIP rep: the gesture did not reach the bench — ${JSON.stringify(s)}`); continue }
    const after = frames.filter((f) => f.t >= navT && f.t - navT <= 400)
    console.log(`   crossed to ${s.path}; ${after.length} frames in the first 400 ms (of ${frames.length} recorded)`)
    console.log(`   frame            vs the finale SCREENSHOT              vs the last finale SCREENCAST frame`)
    const rows = []
    for (const f of after) {
      const buf = Buffer.from(f.data, 'base64')
      const dShot = await diff(p, lastFinaleShot, buf)
      const dCast = preCross ? await diff(p, preCross, buf) : null
      rows.push({ t: Math.round(f.t - navT), dShot, dCast })
      console.log(`   +${String(Math.round(f.t - navT)).padStart(4)}ms   mean ${String(dShot.mean).padStart(7)} over8 ${String(dShot.overPx).padStart(7)} any ${String(dShot.anyPx).padStart(7)}   |   mean ${String(dCast ? dCast.mean : '-').padStart(7)} over8 ${String(dCast ? dCast.overPx : '-').padStart(7)} any ${String(dCast ? dCast.anyPx : '-').padStart(7)}`)
      if (rep === 1) fs.writeFileSync(path.join(OUT, `cross-+${String(Math.round(f.t - navT)).padStart(4, '0')}ms.png`), buf)
    }
    // the gate's two verdicts, recomputed on the same frames, both ways
    const firstThree = rows.slice(0, 3)
    const gateExact = firstThree.some((r) => r.dShot.anyPx === 0)
    const overZero = firstThree.some((r) => r.dShot.overPx === 0)
    const castExact = firstThree.some((r) => r.dCast && r.dCast.anyPx === 0)
    const castOver = firstThree.some((r) => r.dCast && r.dCast.overPx === 0)
    const means = rows.map((r) => r.dShot.mean)
    const jumps = means.slice(1).map((m, i) => Math.abs(m - means[i]))
    console.log(`   the gate's rule (anyPx === 0 vs the screenshot, first 3 frames): ${gateExact ? 'PASS' : 'FAIL'}`)
    console.log(`   the downward rule (overPx === 0 vs the screenshot):              ${overZero ? 'PASS' : 'FAIL'}`)
    console.log(`   anyPx === 0 vs the screencast reference:                         ${castExact ? 'PASS' : 'FAIL'}`)
    console.log(`   overPx === 0 vs the screencast reference:                        ${castOver ? 'PASS' : 'FAIL'}`)
    console.log(`   largest frame-to-frame change over ${rows.length} frames: ${Math.max(0, ...jumps).toFixed(2)} (the gate fails this above 3)`)
    if (rep === 1) fs.writeFileSync(path.join(OUT, 'finale-last-screenshot.png'), lastFinaleShot)
  }
  if (errs.length) console.log(`\n   page errors: ${errs.slice(0, 3).join(' | ')}`)
  console.log(`\nstills in ${OUT}`)
  await ctx.close()
  if (REC) console.log('video in ' + path.join(OUT, 'video'))
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 700)); process.exit(1) })
