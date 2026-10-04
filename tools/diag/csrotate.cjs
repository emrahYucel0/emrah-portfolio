// CROSS SECTION — TURNING THE PHONE MID-PASSAGE (C4, user requirement 2026-10-04).
//
//   node csrotate.cjs <port> [--only=surface,band,depth,turning,open,close,held] [--engine=chrome|webkit] [--q=csbreak=...]
//
// A phone (390×844@3, touch) is turned to landscape (844×390) and back at each moment of the passage: on SURFACE, in
// the band, on DEPTH, while the louvers turn, while the blinds open onto the bench, while they close over it, and while
// the closed canvas is held over the route change. Each turn must KEEP THE POSITION (the place, its position, the seam's
// direction and where it ends) and REDRAW CLEANLY:
//   redrawn  in the FIRST animation-frame tick that sees the new viewport, something is drawn onto the canvas at the new
//            size (draws to the canvas itself, stamped with their tick and buffer size), so no stale picture is presented.
//            Calibrated: --q=csbreak=noresizenow (the site's 140 ms debounce) FAILS at 153-167 ms
//   empty    no screencast frame whose field between the strips is a single flat colour (Chrome)
//   console  clean (consolewatch.cjs)
// The bench underneath is held still (__benchStill), so only the passage moves. Development server, flag on.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('node:fs')
const { watch } = require('./consolewatch.cjs')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const engine = opt('engine', 'chrome')
const only = opt('only', '').split(',').filter(Boolean)
const want = (s) => !only.length || only.includes(s)
// e.g. --q=csbreak=noheldredraw: the held canvas is not drawn again after a turn (must FAIL)
const Q = opt('q', '')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (ok, msg) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++ }
const PORTRAIT = { width: 390, height: 844 }, LANDSCAPE = { width: 844, height: 390 }

;(async () => {
  const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: PORTRAIT, deviceScaleFactor: 3, isMobile: engine !== 'webkit' ? true : undefined, hasTouch: true })
  const p = await ctx.newPage()
  const W = watch(p, 'rotate')
  await p.addInitScript(() => {
    window.__benchStill = true
    // every animation frame: the viewport, the canvas's backing store, what the runtime thinks the screen is, the passage
    window.__rot = { log: [], draws: 0, drawn: [] }
    /*
     * MEASURED IN ANIMATION-FRAME TICKS. Every callback of one tick receives the same timestamp, so each draw that reaches
     * the canvas is stamped with the tick it happened in and the size of the buffer it drew. A turn is redrawn cleanly
     * when, in the FIRST tick that sees the new viewport, something is drawn at the new size: the browser presents that
     * tick's picture, so nothing stale is ever shown. (Sampled by time instead, the order of callbacks within a tick and
     * headless WebKit's ~140 ms between ticks read as stale pictures that were never presented.)
     */
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (cb) => raf((t) => { window.__tick = t; cb(t) })
    const hook = () => {
      const c = document.querySelector('canvas#surface')
      const gl = c && c.getContext('webgl2')
      if (!gl || gl.__counted) return
      gl.__counted = true
      // only what reaches the canvas itself counts: the louvers also draw into their own offscreen buffers
      for (const f of ['drawArrays', 'drawElements']) { const o = gl[f]; gl[f] = function () { if (gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) === null) { window.__rot.draws++; window.__rot.drawn.push({ tick: window.__tick, w: gl.drawingBufferWidth, h: gl.drawingBufferHeight }) } return o.apply(this, arguments) } }
    }
    const s = () => {
      hook()
      const L = window.__lab, c = document.querySelector('canvas#surface'), cs = L && L.csState ? L.csState() : null
      window.__rot.log.push({ tick: window.__tick, t: performance.now(), w: Date.now(), iw: innerWidth, ih: innerHeight, cw: c ? c.width : 0, ch: c ? c.height : 0, vw: L ? L.V.W : 0, vh: L ? L.V.H : 0, dpr: L ? L.V.dpr * (L.V.u || 1) : 0, draws: window.__rot.draws, c2: document.documentElement.dataset.c2 ?? '', x: cs?.x, p: cs?.p, r: cs?.reveal.r, on: cs?.reveal.on, base: L?.A.base, held: L?.A.csHeld, path: location.pathname })
      requestAnimationFrame(s)
    }
    requestAnimationFrame(s)
  })
  await p.goto(`http://127.0.0.1:${port}/tr${Q ? '?' + Q : ''}`, { waitUntil: 'load', timeout: 180000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
  await sleep(1000)
  const STOP = await p.evaluate(() => window.__lab.STOP)
  let cdp = null
  const shots = []
  if (engine === 'chrome') {
    cdp = await ctx.newCDPSession(p)
    cdp.on('Page.screencastFrame', (f) => { shots.push({ t: f.metadata.timestamp * 1000, data: f.data, w: f.metadata.deviceWidth, h: f.metadata.deviceHeight }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}) })
  }
  const toCross = async (x) => {
    if (await p.evaluate(() => location.pathname.includes('/lab'))) {
      await p.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true })))
      await p.waitForFunction(() => !location.pathname.includes('/lab') && document.documentElement.dataset.c2 === 'on' && !window.__lab.A.csHeld, null, { timeout: 20000 })
      await sleep(600)
    }
    if (await p.evaluate(() => window.__lab.A.base) !== STOP.cross) { await p.evaluate((s) => window.__lab.go(s.cross), STOP); await sleep(2800) }
    await p.evaluate((i) => window.__lab.csSet(i), x); await sleep(900)
  }
  const state = () => p.evaluate(() => { const L = window.__lab, c = L.csState(); return { base: L.A.base, x: c.x, target: c.target, rv: c.reveal, c2: document.documentElement.dataset.c2 ?? '', path: location.pathname, held: L.A.csHeld } })
  /*
   * One turn: the viewport changes, then the frames are read. `stale` is measured from the first animation frame that
   * saw the new viewport to the first one whose backing store was the new size AND drew after it.
   */
  const meanOf = async (buf) => { const { data, info } = await sharp(buf).resize(120).raw().ensureAlpha().toBuffer({ resolveWithObject: true }); let s = 0; for (let i = 0; i < data.length; i += 4) s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; return s / (info.width * info.height) }
  const turn = async (to, label, during, { moving = false } = {}) => {
    const t0 = await p.evaluate(() => { window.__rot.log.length = 0; window.__rot.drawn.length = 0; return Date.now() })
    if (cdp) await cdp.send('Page.startScreencast', { format: 'png', maxWidth: to.width, maxHeight: to.height, everyNthFrame: 1 })
    await p.setViewportSize(to)
    if (during) await during()
    await sleep(1600)
    if (cdp) await cdp.send('Page.stopScreencast')
    const log = await p.evaluate(() => window.__rot.log.slice())
    const drawn = await p.evaluate(() => window.__rot.drawn.slice())
    const first = log.find((e) => e.iw === to.width && e.ih === to.height)
    const want = (e) => e.cw === Math.round(to.width * e.dpr) || e.cw === Math.ceil(to.width * e.dpr) || e.cw === Math.floor(to.width * e.dpr)
    // the first draw at the new size, in the first tick that saw the new viewport or later
    const dpr = log.slice().reverse().find((e) => e.iw === to.width)?.dpr || 1
    const sized = (d) => [Math.round, Math.ceil, Math.floor].some((f) => d.w === f(to.width * dpr)) && [Math.round, Math.ceil, Math.floor].some((f) => d.h === f(to.height * dpr))
    const firstDraw = first && drawn.find((d) => d.tick >= first.tick && sized(d))
    const fresh = firstDraw ? { ...first, w: first.w + (firstDraw.tick - first.tick) } : null
    const stale = first && firstDraw ? Math.round(firstDraw.tick - first.tick) : null
    if (process.env.ROT_DEBUG && first) console.log('      log', JSON.stringify(log.filter((e) => e.t >= first.t - 40 && e.t <= first.t + 220).map((e) => [Math.round(e.t - first.t), e.iw + 'x' + e.ih, e.cw + 'x' + e.ch, e.vw + 'x' + e.vh, +e.dpr.toFixed(2), e.draws])))
    // empty: a screencast frame after the turn whose field between the strips is one flat colour
    let empty = 0, decoded = 0, toneWorst = 0
    const means = []
    /*
     * WHICH FRAMES ARE READ.
     *   The browser's own: Chrome's emulated resize presents frames that are not the new screen's shape at all (the old
     *   surface with the new layout in it, or the reverse, with background beside it), and a frame or two of the old
     *   layout after the page has already drawn the new one (the compositor runs a couple of frames behind). Seen at the
     *   name and at Work as much as on the passage. They are counted, not read: a frame whose decoded shape is not the
     *   new viewport's, or that was presented within 50 ms of the page's first frame drawn at the new size.
     *   Empty: every frame from the turn on that IS the new screen's shape is checked for a flat field.
     *   Tone: the frames after that cut are read against the settled frame at the new orientation (portrait and
     *   landscape compose the place differently, so the frame before the turn is no reference). A fault that lasts the
     *   whole window passes this; the held case is therefore also read against the DEPTH that follows it, below.
     */
    const cut = fresh ? fresh.w + 50 : first ? first.w + 50 : t0
    const all = shots.splice(0).filter((f) => f.t >= t0)
    const frames = []
    for (const f of all) {
      const { data, info } = await sharp(Buffer.from(f.data, 'base64')).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
      const shaped = Math.abs(info.width / info.height - to.width / to.height) / (to.width / to.height) < 0.02
      frames.push({ f, data, info, shaped, late: f.t >= cut })
    }
    const between = frames.filter((x) => !x.shaped || !x.late).length
    const read = frames.filter((x) => x.shaped && x.late)
    const ref = read.length ? await meanOf(Buffer.from(read[read.length - 1].f.data, 'base64')) : null
    for (const { f, data, info, shaped, late } of frames) {
      if (!shaped) continue
      decoded++
      const y0 = Math.round(info.height * 0.15), y1 = Math.round(info.height * 0.85)
      let lo = 255, hi = 0
      for (let y = y0; y < y1; y += 3) for (let x = 0; x < info.width; x += 3) { const i = (y * info.width + x) * 4, l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; if (l < lo) lo = l; if (l > hi) hi = l }
      if (hi - lo < 6) empty++
      if (!moving && late && ref != null) {
        const m = await meanOf(Buffer.from(f.data, 'base64'))
        means.push(m)
        const d = Math.abs(m - ref)
        // the worst frame of each turn is kept, with the settled one, to be looked at
        if (d > toneWorst) { toneWorst = d; fs.mkdirSync('out/cross/rotate', { recursive: true }); fs.writeFileSync(`out/cross/rotate/${label}-${to.width}x${to.height}-worst.png`, Buffer.from(f.data, 'base64')); fs.writeFileSync(`out/cross/rotate/${label}-${to.width}x${to.height}-settled.png`, Buffer.from(read[read.length - 1].f.data, 'base64')) }
      }
    }
    const lastDraws = log.length ? log[log.length - 1].draws - (log[0]?.draws ?? 0) : 0
    return { stale, empty, decoded, drew: lastDraws, toneWorst: moving ? null : toneWorst, between, means }
  }
  const report = (label, before, after, R, extra = '') => {
    const kept = before.base === after.base && before.x === after.x && before.target === after.target && before.path === after.path
    check(kept, `${label}: the position is kept (base ${before.base} → ${after.base}, x ${before.x} → ${after.x}, ${before.path} → ${after.path})${extra}`)
    check(R.stale === 0, `${label}: redrawn at the new size ${R.stale == null ? 'NEVER' : R.stale === 0 ? 'in the first frame' : `${R.stale} ms`} after the turn (limit: the first frame)`)
    if (cdp) check(R.empty === 0, `${label}: no empty frame (${R.empty} of ${R.decoded} screencast frames of the new shape)`)
    if (cdp && R.toneWorst != null) check(R.toneWorst <= Math.max(30, floor), `${label}: every frame after the turn has the settled tone (worst ${R.toneWorst.toFixed(1)} levels of mean luminance, limit ${Math.max(30, floor).toFixed(1)}; ${R.between} frames of the browser's own in between)`)
  }
  console.log(`== CROSS SECTION, TURNED MID-PASSAGE   ${engine}   390×844 ⇄ 844×390`)
  /*
   * CONTROLS FIRST: the same turns at two ordinary places, the name and Work. Whatever a turn does to an ordinary place
   * (the browser's own frames, a composition settling) is the floor the passage is read against, not zero.
   */
  let floor = 0
  if (cdp) {
    console.log('\n CONTROL (the name, Work)')
    for (const stop of [STOP.name, STOP.work]) {
      await p.setViewportSize(PORTRAIT); await sleep(600)
      await p.evaluate((s) => window.__lab.go(s), stop); await sleep(2600)
      for (const to of [LANDSCAPE, PORTRAIT]) {
        const R = await turn(to, `control-${stop}`)
        floor = Math.max(floor, R.toneWorst ?? 0)
        console.log(`      place ${stop} → ${to.width > to.height ? 'landscape' : 'portrait'}: worst tone ${R.toneWorst?.toFixed(1)}, redrawn after ${R.stale} ms, empty ${R.empty}, browser's own frames ${R.between}`)
      }
    }
    console.log(`      floor: ${floor.toFixed(1)} levels`)
  }

  // at rest at a position: portrait → landscape → portrait
  for (const [name, x] of [['surface', 0], ['band', 2], ['depth', 4]]) {
    if (!want(name)) continue
    console.log(`\n ${name.toUpperCase()}`)
    await p.setViewportSize(PORTRAIT); await sleep(600)
    await toCross(x)
    for (const to of [LANDSCAPE, PORTRAIT]) {
      const before = await state()
      const R = await turn(to, name)
      const after = await state()
      report(`${name} → ${to.width > to.height ? 'landscape' : 'portrait'}`, before, after, R)
    }
  }
  // while the louvers turn: the gesture, then the phone turned before they land
  if (want('turning')) {
    console.log('\n TURNING (the louvers mid-movement)')
    await p.setViewportSize(PORTRAIT); await sleep(600)
    await toCross(1)
    await p.keyboard.press('ArrowDown')
    const before = await state()
    const R = await turn(LANDSCAPE, 'turning', null, { moving: true })
    await sleep(600)
    const after = await state()
    report('turning → landscape', before, after, R, ` (lands on ${after.x})`)
    await p.setViewportSize(PORTRAIT); await sleep(1200)
  }
  // during the blinds, opening (held at r = 0.4), closing (held at r = 0.5), and held closed over the route change
  if (want('open')) {
    console.log('\n OPEN (the blinds opening onto the bench)')
    await p.setViewportSize(PORTRAIT); await sleep(600)
    await toCross(4)
    await p.evaluate(() => window.__lab.csRevealFreeze(0.4))
    await p.keyboard.press('ArrowDown')
    await p.waitForFunction(() => document.querySelector('#__nuxt .lab-stage') && window.__lab.csState().reveal.wait === false, null, { timeout: 15000 })
    await sleep(500)
    for (const to of [LANDSCAPE, PORTRAIT]) {
      const before = await state()
      const R = await turn(to, 'open')
      const after = await state()
      report(`open, r 0.4 → ${to.width > to.height ? 'landscape' : 'portrait'}`, before, after, R)
    }
    await p.evaluate(() => window.__lab.csRevealFreeze(null))
    await p.waitForFunction(() => !document.documentElement.dataset.c2, null, { timeout: 15000 }).catch(() => {})
    const end = await state()
    check(end.path.endsWith('/lab') && end.c2 === '', `open: the blinds finish onto the bench (${end.path}, data-c2 '${end.c2}')`)
  }
  if (want('close')) {
    console.log('\n CLOSE (the blinds closing over the bench)')
    if (!(await p.evaluate(() => location.pathname.endsWith('/lab')))) { await toCross(4); await p.keyboard.press('ArrowDown'); await p.waitForFunction(() => !document.documentElement.dataset.c2 && location.pathname.endsWith('/lab'), null, { timeout: 15000 }) }
    await sleep(600)
    await p.evaluate(() => window.__lab.csRevealFreeze(0.5))
    await p.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true })))
    await p.waitForFunction(() => document.documentElement.dataset.c2 === 'cs', null, { timeout: 15000 })
    await sleep(500)
    for (const to of [LANDSCAPE, PORTRAIT]) {
      const before = await state()
      const R = await turn(to, 'close')
      const after = await state()
      report(`close, r 0.5 → ${to.width > to.height ? 'landscape' : 'portrait'}`, before, after, R)
    }
    await p.evaluate(() => window.__lab.csRevealFreeze(null))
    await p.waitForFunction(() => !location.pathname.includes('/lab') && document.documentElement.dataset.c2 === 'on' && !window.__lab.A.csHeld, null, { timeout: 15000 }).catch(() => {})
    const end = await state()
    check(end.base === STOP.cross && end.x === 4 && end.c2 === 'on', `close: the blinds finish, DEPTH (base ${end.base}, x ${end.x}, data-c2 '${end.c2}')`)
  }
  if (want('held')) {
    console.log('\n HELD (closed, the canvas held over the route change)')
    // the route change is held back (window.__csHoldMs, development only) so the turn lands inside the hold
    await toCross(4); await p.keyboard.press('ArrowDown')
    await p.waitForFunction(() => !document.documentElement.dataset.c2 && location.pathname.endsWith('/lab'), null, { timeout: 15000 }); await sleep(600)
    await p.evaluate(() => { window.__csHoldMs = 5000 })
    await p.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true })))
    const got = await p.waitForFunction(() => window.__lab.A.csHeld, null, { timeout: 15000 }).then(() => true, () => false)
    if (!got) check(false, 'held: not measured — the seam never reached its hold')
    else {
      const before = await state()
      const R = await turn(LANDSCAPE, 'held')
      const after = await state()
      report('held → landscape', before, after, R)
      /*
       * A HELD CANVAS IS READ AGAINST WHAT IT HOLDS. Against its own settled frame a fault that lasts the whole hold
       * passes (calibrated: an empty held canvas shows the bench through it, every frame the same). So the reference is
       * the DEPTH C2 itself draws at the new size once the hold ends.
       */
      await p.evaluate(() => { window.__csHoldMs = 0 })
      await p.waitForFunction(() => document.documentElement.dataset.c2 === 'on' && !window.__lab.A.csHeld, null, { timeout: 20000 }).catch(() => {})
      await sleep(800)
      const depth = await meanOf(await p.screenshot())
      const worst = R.means.length ? Math.max(...R.means.map((m) => Math.abs(m - depth))) : null
      // (WebKit has no screencast: there it is not measured, and says so)
      if (!cdp) console.log('   (not measured) held → landscape: the held frames against DEPTH — no screencast in WebKit')
      else check(worst != null && worst <= 30, `held → landscape: every held frame is the DEPTH that follows it (worst ${worst == null ? 'not measured' : worst.toFixed(1)} levels of mean luminance, limit 30)`)
    }
    await p.evaluate(() => { window.__csHoldMs = 0 })
    await p.setViewportSize(PORTRAIT); await sleep(2000)
  }
  const v = await W.verdict(p)
  check(v.length === 0, `console clean (${v.length})${v.length ? '\n        ' + v.slice(0, 6).join('\n        ') : ''}`)
  await b.close()
  console.log(fails ? `\n   FAIL (${fails})` : '\n   PASS')
  process.exit(fails ? 1 : 0)
})()
