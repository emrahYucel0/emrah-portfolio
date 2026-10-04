// CROSS SECTION — THE BENCH SEAM (Phase C, C3): DEPTH → the bench and back, measured.
//
//   node csbenchseam.cjs <port> [WxH@dpr ...] [--engine=chrome|webkit] [--film]
//
// Runs against the dev server with the flag on (WebKit on a --wk server port). Gestures are dispatched from INSIDE the
// page. Sections:
//
//   IDENTITY   at DEPTH at rest: the blinds' first frame (r = 0) against the C2 frame face 1 holds — the departure —
//              and their last frame (r = 1): how many device pixels of the canvas are not fully transparent there.
//   LANDING    up from the bench: the closed blinds' last frame against the first frame C2 then draws of DEPTH
//              (place.js audit, read back from the canvas).
//   SCREENCAST (Chrome) every presented frame, the whole screen (the strips change hands here). CONTROLS FIRST: a
//              second of the still DEPTH and a second of the still bench — the bench breathes (WEIGHT's rules move),
//              and its largest step between two frames is its floor. Then, against those floors:
//                under DEPTH    every frame while the route changes under it (forward, before the blinds move; back,
//                               while the canvas is held) against the still DEPTH
//                the release    forward, the step from the last blinds frame to the first frame without the canvas
//                the take-over  back, the step from the bench to the first frame the runtime has the screen in
//                the hand-over  back, the step from the held canvas to C2's own first frame of DEPTH
//
// Pixel deltas: luminance (0.299/0.587/0.114), "changed" = more than 8 levels. Frames are aligned with the page's own
// per-frame log by wall-clock time; a frame is classified only when the log agrees 34 ms either side of it.
// Writes tools/diag/out/cross/benchseam/<tag>.json (and with --film, .webm recordings to tools/diag/out/cross/film/).
const pw = require('playwright')
const { watch } = require('./consolewatch.cjs')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const engine = opt('engine', 'chrome')
const FILM = args.includes('--film')
// e.g. --q=csbreak=revealleft: the calibration break that leaves part of the strips behind (must FAIL)
const Q = opt('q', '')
// the bench breathes (WEIGHT's rules move every frame), so its floor is thousands of pixels and wanders; by default it
// is held still (window.__benchStill, development only) and every boundary must then be exactly nothing.
// --breathing measures it breathing instead, against that floor.
const BREATHING = args.includes('--breathing')
const sizes = args.filter((a) => /^\d+x\d+@[\d.]+$/.test(a)).map((s) => { const [wh, d] = s.split('@'); const [w, h] = wh.split('x').map(Number); return { w, h, dpr: Number(d) } })
if (!sizes.length) sizes.push({ w: 1440, h: 900, dpr: 2 }, { w: 1920, h: 991, dpr: 1 }, { w: 390, h: 844, dpr: 3 })
const OUT = 'out/cross/benchseam'
let fails = 0
const check = (ok, msg) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++ }

function lumaDiff(a, b, w, h) {
  let changed = 0, sum = 0
  for (let i = 0; i < w * h * 4; i += 4) {
    const d = Math.abs(0.299 * (a[i] - b[i]) + 0.587 * (a[i + 1] - b[i + 1]) + 0.114 * (a[i + 2] - b[i + 2]))
    sum += d; if (d > 8) changed++
  }
  return { changed, mean: sum / (w * h) }
}
/*
 * THE STRIPS, FINELY. The bench breathes in its field, so a whole-screen count against its floor cannot see a faint film
 * left behind (calibrated: a tenth of the dark strip left on the canvas moved each pixel ~7 levels, under the 8 that
 * count as changed). Its strips do not breathe — the chrome and the foot are still — so there a change of more than 2
 * levels is counted, against the same measure of the still bench.
 */
function stripDiff(a, b, w, h, [top, bot]) {
  let changed = 0
  for (let y = 0; y < h; y++) {
    if (y >= top && y < h - bot) continue
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (Math.abs(0.299 * (a[i] - b[i]) + 0.587 * (a[i + 1] - b[i + 1]) + 0.114 * (a[i + 2] - b[i + 2])) > 2) changed++
    }
  }
  return changed
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' })
  const sharp = require('sharp')
  for (const S of sizes) {
    const tag = `${engine}-${S.w}x${S.h}@${S.dpr}`
    console.log(`\n== ${tag}`)
    const extra = FILM ? { recordVideo: { dir: 'out/cross/film/tmp', size: { width: S.w, height: S.h } } } : {}
    const ctx = await b.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: S.dpr, ...extra })
    const p = await ctx.newPage()
    const W = watch(p, tag)
    if (!BREATHING) await p.addInitScript(() => { window.__benchStill = true })
    await p.goto(`http://127.0.0.1:${port}/tr${Q ? `?${Q}` : ''}`, { waitUntil: 'load', timeout: 180000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
    await sleep(1200)
    const STOP = await p.evaluate(() => window.__lab.STOP)
    await p.evaluate((s) => window.__lab.go(s.cross), STOP); await sleep(2800)
    await p.evaluate(() => window.__lab.csSet(4)); await sleep(1500)
    await p.evaluate(() => window.__lab.csAudit(true))
    // the hints may appear on their own clock (the runtime's after its idle time, the bench's after CUE_IDLE): hidden
    // (and on a screen under 1100 px the bench's foot fades its status out to make room for its hint: held too)
    await p.addStyleTag({ content: '#cue, .lab-stage .foot .hint { visibility: hidden !important; } .lab-stage .foot .state, .lab-stage .foot .roles { opacity: 1 !important; transition: none !important; }' })
    // the bands both pages keep still: inside the runtime's strips AND inside the bench's chrome and foot (measured on
    // the bench below), 2 px clear of their edges
    let stripPx = [0, 0]
    const vStrip = await p.evaluate(() => window.__lab.V.strip)
    // IDENTITY first, at rest; then C2 draws DEPTH again and the page is still for the controls
    const id = await p.evaluate(() => window.__lab.csRevealIdentity())
    await sleep(1200)
    // the page's own account of every frame, across both routes (the window survives the route change)
    await p.evaluate(() => {
      window.__bLog = []
      const s = () => {
        const L = window.__lab, c = L.csState()
        window.__bLog.push({ t: Date.now(), c2: document.documentElement.dataset.c2 ?? '', r: c.reveal.r, mode: c.reveal.mode, on: c.reveal.on, wait: c.reveal.wait, held: L.A.csHeld, bench: !!document.querySelector('#__nuxt .lab-stage'), x: c.x, base: L.A.base })
        requestAnimationFrame(s)
      }
      requestAnimationFrame(s)
    })
    let cdp = null
    const frames = []
    if (engine === 'chrome') {
      cdp = await ctx.newCDPSession(p)
      cdp.on('Page.screencastFrame', (f) => { frames.push({ t: f.metadata.timestamp * 1000, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}) })
      await cdp.send('Page.startScreencast', { format: 'png', maxWidth: S.w, maxHeight: S.h, everyNthFrame: 1 })
    }
    // a second of the still DEPTH (the control), then the gesture
    await sleep(1000)
    const tFwd = Date.now()
    await p.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, deltaMode: 0, cancelable: true })))
    await p.waitForFunction(() => location.pathname.endsWith('/lab') && !document.documentElement.dataset.c2, null, { timeout: 20000 }).catch(() => {})
    const bench = await p.evaluate(() => ({ chrome: document.querySelector('[data-strip]')?.getBoundingClientRect().height ?? 0, foot: document.querySelector('.lab-stage .foot')?.getBoundingClientRect().height ?? 0 }))
    stripPx = [Math.floor(Math.min(vStrip, bench.chrome)) - 2, Math.floor(Math.min(vStrip, bench.foot)) - 2]
    await sleep(1600)
    // the still bench (the control) is the second before the gesture up
    const tUp = Date.now()
    await p.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, deltaMode: 0, cancelable: true })))
    await p.waitForFunction(() => !location.pathname.includes('/lab') && document.documentElement.dataset.c2 === 'on' && !window.__lab.A.csHeld, null, { timeout: 20000 }).catch(() => {})
    await sleep(1200)
    const tEnd = Date.now()
    if (cdp) await cdp.send('Page.stopScreencast')
    const end = await p.evaluate(() => ({ base: window.__lab.A.base, cs: window.__lab.csState(), path: location.pathname }))
    const landings = await p.evaluate(() => window.__lab.csLandings())
    const log = await p.evaluate(() => window.__bLog)
    const consoleBad = await W.verdict(p)
    await ctx.close()
    if (FILM) {
      const vid = await p.video().path()
      fs.mkdirSync('out/cross/film', { recursive: true })
      fs.renameSync(vid, `out/cross/film/benchseam-${tag}.webm`)
      console.log(`   film out/cross/film/benchseam-${tag}.webm`)
    }

    // ── report ─────────────────────────────────────────────────────────────────────────────────────────────────
    check(end.base === STOP.cross && end.cs.x === 4 && !end.path.includes('/lab'), `DEPTH → the bench → one gesture up → DEPTH again (base ${end.base}, x ${end.cs.x}, ${end.path})`)
    if (!id) check(false, 'IDENTITY: not measured (not at rest at DEPTH with its frame kept)')
    else {
      check(id.first.worst <= 1, `IDENTITY, the blinds' first frame vs C2's DEPTH: ${id.first.diff} of ${id.first.px} device px differ, worst ${id.first.worst} levels`)
      check(id.last.lit === 0, `IDENTITY, the blinds' last frame: ${id.last.lit} of ${id.last.px} device px not fully transparent`)
    }
    const land = landings.filter((l) => l.kind === 'bench')
    if (!land.length) check(false, 'LANDING up from the bench: not audited')
    for (const l of land) check(l.worst <= 1, `LANDING up from the bench, closed blinds vs C2's DEPTH: ${l.diff} of ${l.px} device px differ, worst ${l.worst} levels`)
    const out = { id, landings, end }
    if (frames.length > 4) {
      const dec = []
      for (const f of frames) { const { data, info } = await sharp(Buffer.from(f.data, 'base64')).resize(S.w, S.h).raw().ensureAlpha().toBuffer({ resolveWithObject: true }); dec.push({ t: f.t, data, w: info.width, h: info.height }) }
      const at = (t) => { let r = log[0]; for (const e of log) { if (e.t <= t) r = e; else break } return r }
      // a frame is "in" a state only when the log agrees on both sides of it
      const is = (f, pred) => pred(at(f.t - 34)) && pred(at(f.t)) && pred(at(f.t + 34))
      const step = (i) => lumaDiff(dec[i - 1].data, dec[i].data, S.w, S.h)
      const maxStep = (from, to) => { let m = { changed: 0, mean: 0 }; for (let i = 1; i < dec.length; i++) if (dec[i - 1].t >= from && dec[i].t <= to) { const d = step(i); if (d.changed > m.changed) m = d } return m }
      const floorDepth = maxStep(tFwd - 950, tFwd - 20)
      const floorBench = maxStep(tUp - 1400, tUp - 20)
      let floorStrip = 0
      for (let i = 1; i < dec.length; i++) if (dec[i - 1].t >= tUp - 1400 && dec[i].t <= tUp - 20) floorStrip = Math.max(floorStrip, stripDiff(dec[i - 1].data, dec[i].data, S.w, S.h, stripPx))
      const depthStill = dec.filter((f) => f.t < tFwd - 20).pop()
      // under DEPTH: forward, 'cs' and the blinds not moved yet; back, 'cs' and held (or 'on' before C2 has drawn)
      const under = dec.filter((f) => f.t > tFwd && (is(f, (e) => e.c2 === 'cs' && e.r === 0 && e.on) || is(f, (e) => e.held)))
      let underWorst = { changed: 0, mean: 0 }
      for (const f of under) {
        const d = lumaDiff(depthStill.data, f.data, S.w, S.h)
        if (d.changed > underWorst.changed) {
          // where it differs: the bounding box of the changed pixels, and which way the seam was going
          let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
          for (let k = 0; k < S.w * S.h; k++) { const i = k * 4; if (Math.abs(0.299 * (depthStill.data[i] - f.data[i]) + 0.587 * (depthStill.data[i + 1] - f.data[i + 1]) + 0.114 * (depthStill.data[i + 2] - f.data[i + 2])) > 8) { const x = k % S.w, y = (k / S.w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) } }
          underWorst = { ...d, box: [x0, y0, x1, y1], dir: f.t < tUp ? 'forward' : 'back', state: at(f.t) }
          await sharp(f.data, { raw: { width: S.w, height: S.h, channels: 4 } }).png().toFile(`${OUT}/${tag}-under-worst.png`)
          await sharp(depthStill.data, { raw: { width: S.w, height: S.h, channels: 4 } }).png().toFile(`${OUT}/${tag}-under-control.png`)
        }
      }
      // the release: the last frame with the canvas over the bench, then the first without (forward)
      let release = null, takeover = null, handover = null
      /*
       * A BOUNDARY IS A WINDOW, NOT A PAIR. The screencast's frame times and the page's log are two clocks, and a frame
       * may be presented a frame after the log says (calibrated: a single pair missed a film the release left behind).
       * So every step from 3 frames before the boundary to 3 after is measured, and the worst is the boundary's.
       */
      const around = (i) => {
        let w = { changed: 0, mean: 0, strip: 0, i }
        // only frames the blinds have already left (r ≥ 0.97, where their fade ends) or the canvas is gone from
        // (in the strips, from r = 0.7, where the strips' own fade ends: the louvers never reach a strip)
        // (the fade's own last steps move ~2 levels each, so there the canvas counts as gone only from 0.99)
        const gone = (e) => e.c2 === '' || (e.c2 === 'cs' && e.r >= (e.mode === 'fade' ? 0.99 : 0.97))
        // (the fade fallback fades the strips with the whole canvas, so there they are gone only where it is)
        const stripsGone = (e) => e.c2 === '' || (e.c2 === 'cs' && e.r >= (e.mode === 'fade' ? 0.99 : 0.7))
        for (let k = Math.max(1, i - 4); k <= Math.min(dec.length - 1, i + 4); k++) {
          if (is(dec[k - 1], stripsGone) && is(dec[k], stripsGone)) { w.strip = Math.max(w.strip, stripDiff(dec[k - 1].data, dec[k].data, S.w, S.h, stripPx)); w.stripSteps = (w.stripSteps || 0) + 1 }
          if (!is(dec[k - 1], gone) || !is(dec[k], gone)) continue
          const d = step(k)
          if (d.changed > w.changed) { w.changed = d.changed; w.mean = d.mean }
          w.steps = (w.steps || 0) + 1
        }
        return w
      }
      for (let i = 1; i < dec.length; i++) {
        const a = at(dec[i - 1].t), c = at(dec[i].t)
        if (!release && dec[i].t < tUp && a.c2 === 'cs' && c.c2 === '' && c.bench) release = around(i)
        if (!takeover && dec[i].t > tUp && a.c2 === '' && c.c2 === 'cs') takeover = around(i)
        if (!handover && dec[i].t > tUp && (a.c2 === 'cs' || a.held) && c.c2 === 'on' && !c.held) handover = { ...step(i), i }
      }
      const benchAfter = dec.filter((f) => f.t > tFwd && f.t < tUp && is(f, (e) => e.c2 === '' && e.bench)).length
      console.log(`   screencast: ${dec.length} frames over ${((tEnd - tFwd) / 1000).toFixed(1)} s (Chrome's own presented frames, the whole screen)`)
      console.log(`   controls: still DEPTH, worst step ${floorDepth.changed} px (mean ${floorDepth.mean.toFixed(3)}); still bench, worst step ${floorBench.changed} px (mean ${floorBench.mean.toFixed(3)})${BREATHING ? " (breathing)" : " (held still)"}`)
      if (!under.length) console.log('   (not measured) under DEPTH: no screencast frame was caught while the route changed beneath it')
      else check(underWorst.changed <= floorDepth.changed, `under DEPTH, while the route changes beneath it: ${under.length} frames, worst ${underWorst.changed} px against the still DEPTH (floor ${floorDepth.changed})${underWorst.box ? ` — ${underWorst.dir}, in [${underWorst.box}], ${JSON.stringify(underWorst.state)}` : ''}`)
      console.log(`      the still bench's strips (top ${stripPx[0]} px, foot ${stripPx[1]} px): worst step ${floorStrip} px over 2 levels`)
      check(release && release.steps && release.stripSteps && release.changed <= floorBench.changed && release.strip <= floorStrip, `the release onto the bench: ${release ? `${release.changed} px (mean ${release.mean.toFixed(3)}); in the strips ${release.strip} px over 2 levels (${release.steps} / ${release.stripSteps} steps)` : 'not caught between two screencast frames'} — floors ${floorBench.changed} / ${floorStrip}`)
      check(takeover && takeover.steps && takeover.stripSteps && takeover.changed <= floorBench.changed && takeover.strip <= floorStrip, `the runtime takes the screen over the bench: ${takeover ? `${takeover.changed} px (mean ${takeover.mean.toFixed(3)}); in the strips ${takeover.strip} px over 2 levels (${takeover.steps} / ${takeover.stripSteps} steps)` : 'not caught'} — floors ${floorBench.changed} / ${floorStrip}`)
      check(handover && handover.changed <= floorDepth.changed, `the hand-over to C2's own DEPTH: ${handover ? `${handover.changed} px (mean ${handover.mean.toFixed(3)})` : 'not caught'} against DEPTH's floor ${floorDepth.changed}`)
      console.log(`      (the bench on its own between the two: ${benchAfter} frames)`)
      Object.assign(out, { floorDepth, floorBench, floorStrip, under: { n: under.length, ...underWorst }, release, takeover, handover, frames: dec.length })
    } else if (engine === 'chrome') check(false, 'SCREENCAST: no frames')
    else console.log('   screencast: not measured in WebKit (no CDP screencast); identity, landing and the path are')
    check(consoleBad.length === 0, `console clean: no console error, no WebGL warning, no page error, no GL-check record (${consoleBad.length})${consoleBad.length ? '\n        ' + consoleBad.slice(0, 6).join('\n        ') : ''}`)
    fs.writeFileSync(`${OUT}/${tag}.json`, JSON.stringify(out, null, 2))
  }
  await b.close()
  console.log(fails ? `\n   FAIL (${fails})` : '\n   PASS')
  process.exit(fails ? 1 : 0)
})()
