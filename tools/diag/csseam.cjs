// CROSS SECTION — THE WORK SEAM (Phase C, C1 + C2): Work → Cross Section → DEPTH and back, measured.
//
//   node csseam.cjs <port> [WxH@dpr ...] [--engine=chrome|webkit] [--film]
//
// Runs against the dev server with the flag on, or a flag-on build (WebKit on a --wk server port). Gestures are
// dispatched from INSIDE the page on a fixed clock (Playwright stretches dispatched streams under load). Three sections:
//
//   IDENTITY   at rest at each end, the louvers drawn there against the C2 frame they were copied from (place.js
//              identity()). The departure seam: the first louver frame starts from exactly this.
//   LANDING    every landing during the path, audited as it happens: the face the louvers were carrying against the
//              frame C2 draws when it takes the end back (place.js audit). The arrival seam.
//   SCREENCAST (Chrome) every presented frame of the path. CONTROLS FIRST: two still frames of the page at rest on
//              Work, and two at rest on DEPTH — the pages breathe, and that is the floor. Then the crossing: each
//              frame against the one before it. Reported: the floor; the worst step during the C2 travel from Work;
//              the step at the first louver frame and at the landing; and whether any frame was blank or a stranger.
//
// Pixel deltas: luminance (0.299/0.587/0.114) over the area between the strips, "changed" = more than 8 levels.
// Writes tools/diag/out/cross/seam/ (and with --film, .webm recordings to tools/diag/out/cross/film/).
const pw = require('playwright')
const { watch } = require('./consolewatch.cjs')
const fs = require('node:fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const engine = opt('engine', 'chrome')
const FILM = args.includes('--film')
const Q = opt('q', '')
const sizes = args.filter((a) => /^\d+x\d+@[\d.]+$/.test(a)).map((s) => { const [wh, d] = s.split('@'); const [w, h] = wh.split('x').map(Number); return { w, h, dpr: Number(d) } })
if (!sizes.length) sizes.push({ w: 1440, h: 900, dpr: 2 }, { w: 390, h: 844, dpr: 3 })
const OUT = 'out/cross/seam'
let fails = 0
const check = (ok, msg) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++ }

// the gesture, inside the page: one wheel notch of 100 px, then quiet
const NOTCH = () => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, deltaMode: 0, cancelable: true }))
const NOTCH_UP = () => window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, deltaMode: 0, cancelable: true }))

async function settle(p, ms = 400) {
  await p.waitForFunction(() => { const L = window.__lab, s = L.csState(); return Math.abs(L.A.p - L.A.pT) < 1e-3 && (!s || !s.moving) }, null, { timeout: 15000 }).catch(() => {})
  await sleep(ms)
}

function lumaDiff(a, b, w, h, y0, y1) {
  let changed = 0, sum = 0, n = 0
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    const la = 0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2], lb = 0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2]
    const d = Math.abs(la - lb); sum += d; n++; if (d > 8) changed++
  }
  return { changed, mean: sum / n }
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
    await p.goto(`http://127.0.0.1:${port}/tr${Q ? `?${Q}` : ''}`, { waitUntil: 'load', timeout: 180000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
    await sleep(1200)
    const STOP = await p.evaluate(() => window.__lab.STOP)
    // to Work's last work, settled
    await p.evaluate((s) => window.__lab.go(s.work), STOP); await settle(p, 1500)
    for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowRight'); await sleep(500) }
    await settle(p, 1500)
    await p.evaluate(() => { window.__lab.csAudit(true); document.querySelectorAll('#cue').forEach((e) => { e.style.visibility = 'hidden' }) })

    // ── SCREENCAST (Chrome): controls first, then the path ───────────────────────────────────────────────────
    let cdp = null
    const frames = []
    if (engine === 'chrome') {
      cdp = await ctx.newCDPSession(p)
      cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp * 1000, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}) })
    }
    // the page's own account of each frame: what was on screen, and when
    await p.evaluate(() => {
      window.__csLog = []
      const s = () => { const L = window.__lab, c = L.csState(); window.__csLog.push([Date.now(), L.A.base, L.A.p, c.p, c.x, c.moving, c.p > 0 && c.p < 1]); requestAnimationFrame(s) }
      requestAnimationFrame(s)
    })
    const grab = async () => { const shot = await p.screenshot(); const { data, info } = await sharp(shot).resize(S.w, S.h).raw().ensureAlpha().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height } }
    const strip = await p.evaluate(() => window.__lab.V.strip)
    const y0 = Math.ceil(strip) + 2, y1 = S.h - Math.ceil(strip) - 2
    const c1 = await grab(); await sleep(300); const c2 = await grab()
    const floorWork = lumaDiff(c1.data, c2.data, c1.w, c1.h, y0, y1)
    /*
     * THE CONTROL TRAVEL. The way from Work into SURFACE is the site's own travel between two places — C2 drawing a
     * blend of both, row by row — and so is every other travel on the spine. Its steps are measured against an
     * ordinary one in the same run: from the place before Work into Work, the travel every visit already makes.
     */
    let controlTravel = null
    if (engine === 'chrome') {
      await p.keyboard.press('ArrowUp'); await settle(p, 1500)
      const ctrl = []
      const onF = async (f) => { ctrl.push(f.data); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}) }
      cdp.removeAllListeners('Page.screencastFrame'); cdp.on('Page.screencastFrame', onF)
      await cdp.send('Page.startScreencast', { format: 'png', maxWidth: S.w, maxHeight: S.h, everyNthFrame: 1 })
      await p.keyboard.press('ArrowDown'); await settle(p, 1200)
      await cdp.send('Page.stopScreencast')
      cdp.removeAllListeners('Page.screencastFrame')
      cdp.on('Page.screencastFrame', async (f) => { frames.push({ t: f.metadata.timestamp * 1000, data: f.data }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}) })
      let worst = { changed: 0, mean: 0 }, prev = null
      for (const d of ctrl) { const { data, info } = await sharp(Buffer.from(d, 'base64')).resize(S.w, S.h).raw().ensureAlpha().toBuffer({ resolveWithObject: true }); if (prev) { const x = lumaDiff(prev, data, info.width, info.height, y0, y1); if (x.changed > worst.changed) worst = x } prev = data }
      controlTravel = { frames: ctrl.length, ...worst }
      // and back onto the last work, settled, for the path itself
      for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowRight'); await sleep(500) }
      await settle(p, 1500)
    }
    if (cdp) await cdp.send('Page.startScreencast', { format: 'png', maxWidth: S.w, maxHeight: S.h, everyNthFrame: 1 })
    const t0 = Date.now()
    // forward: leave Work (the turn plays), beside, in front, release and carry to DEPTH
    for (let i = 0; i < 4; i++) { await p.evaluate(NOTCH); await sleep(i === 0 ? 2600 : 1400) }
    await settle(p, 600)
    const tDepth = Date.now()
    if (cdp) await cdp.send('Page.stopScreencast')
    const d1 = await grab(); await sleep(300); const d2 = await grab()
    const floorDepth = lumaDiff(d1.data, d2.data, d1.w, d1.h, y0, y1)
    const atDepth = await p.evaluate(() => window.__lab.csState())
    const idDepth = await p.evaluate(() => window.__lab.csIdentity())
    await sleep(300)
    // back: in front, beside, behind, and the turn back into Work
    if (cdp) await cdp.send('Page.startScreencast', { format: 'png', maxWidth: S.w, maxHeight: S.h, everyNthFrame: 1 })
    for (let i = 0; i < 4; i++) { await p.evaluate(NOTCH_UP); await sleep(i === 3 ? 2600 : 1400) }
    await settle(p, 800)
    if (cdp) await cdp.send('Page.stopScreencast')
    const backAt = await p.evaluate(() => ({ base: window.__lab.A.base, cs: window.__lab.csState() }))
    // SURFACE at rest, held there, for its identity
    await p.evaluate((s) => window.__lab.go(s.cross), STOP)
    await p.waitForFunction(() => window.__lab.csState().x >= 1, null, { timeout: 15000 }).catch(() => {})
    await settle(p, 300)
    await p.evaluate(() => window.__lab.csSet(0)); await sleep(800)
    const idSurface = await p.evaluate(() => window.__lab.csIdentity())
    const landings = await p.evaluate(() => window.__lab.csLandings())
    const log = await p.evaluate(() => window.__csLog)
    const consoleBad = await W.verdict(p)
    await ctx.close()
    if (FILM) {
      const vid = await p.video().path()
      fs.mkdirSync('out/cross/film', { recursive: true })
      fs.renameSync(vid, `out/cross/film/seam-${tag}.webm`)
      console.log(`   film out/cross/film/seam-${tag}.webm`)
    }

    // ── report ─────────────────────────────────────────────────────────────────────────────────────────────────
    console.log(`   controls: still Work ${floorWork.changed} px changed (mean ${floorWork.mean.toFixed(3)}), still DEPTH ${floorDepth.changed} px (mean ${floorDepth.mean.toFixed(3)})`)
    check(atDepth && atDepth.x === 4 && atDepth.p === 1, `4 gestures from Work's last work rest on DEPTH (x ${atDepth?.x}, p ${atDepth?.p})`)
    check(backAt.base === STOP.work, `4 gestures back return to Work (base ${backAt.base})`)
    for (const [name, r] of [['DEPTH', idDepth], ['SURFACE', idSurface]]) {
      if (!r) { check(false, `IDENTITY at ${name}: not measured (not at rest at that end)`); continue }
      check(r.worst <= 1, `IDENTITY at ${name}: louvers vs C2's frame — ${r.diff} of ${r.px} device px differ, worst ${r.worst} levels`)
    }
    if (!landings.length) check(false, 'LANDING: no landing was audited')
    for (const l of landings) check(l.worst <= 1, `LANDING on ${l.side ? 'DEPTH' : 'SURFACE'}: carried face vs C2's frame — ${l.diff} of ${l.px} device px differ, worst ${l.worst} levels`)
    if (frames.length > 2) {
      // decode the screencast and step through it, aligning frames with the page's log by wall-clock time
      const dec = []
      for (const f of frames) { const { data, info } = await sharp(Buffer.from(f.data, 'base64')).resize(S.w, S.h).raw().ensureAlpha().toBuffer({ resolveWithObject: true }); dec.push({ t: f.t, data, w: info.width, h: info.height }) }
      const stateAt = (t) => { let r = log[0]; for (const e of log) { if (e[0] <= t) r = e; else break } return r }
      let travelWorst = { changed: 0, mean: 0 }, firstLouver = null, landing = null, blank = 0
      for (let i = 1; i < dec.length; i++) {
        const d = lumaDiff(dec[i - 1].data, dec[i].data, dec[i].w, dec[i].h, y0, y1)
        const sa = stateAt(dec[i - 1].t), sb = stateAt(dec[i].t)
        // a frame of nothing but ground: every sampled pixel within 2 levels of the first
        let flat = true; const L0 = dec[i].data[(y0 * dec[i].w) * 4]
        for (let k = y0 * dec[i].w * 4; k < y1 * dec[i].w * 4 && flat; k += 4 * 97) if (Math.abs(dec[i].data[k] - L0) > 2) flat = false
        if (flat) blank++
        if (!sa[6] && sb[6] && !firstLouver) firstLouver = { ...d, i }
        else if (sa[6] && !sb[6] && sb[3] === 1 && !landing) landing = { ...d, i }
        else if (!sa[6] && !sb[6] && sb[1] !== STOP.work && d.changed > travelWorst.changed) travelWorst = d
      }
      console.log(`   screencast: ${dec.length} frames in ${((tDepth - t0) / 1000).toFixed(1)} s forward (Chrome's own presented frames)`)
      console.log(`      worst step of the C2 travel Work → SURFACE: ${travelWorst.changed} px (mean ${travelWorst.mean.toFixed(2)})`)
      if (controlTravel) console.log(`      control: worst step of an ordinary travel into Work: ${controlTravel.changed} px (mean ${controlTravel.mean.toFixed(2)}), ${controlTravel.frames} frames`)
      console.log(`      the first louver frame: ${firstLouver ? `${firstLouver.changed} px (mean ${firstLouver.mean.toFixed(2)})` : 'not caught between two screencast frames'}`)
      console.log(`      the landing on DEPTH:   ${landing ? `${landing.changed} px (mean ${landing.mean.toFixed(2)})` : 'not caught between two screencast frames'}`)
      check(blank === 0, `no blank frame in the path (${blank})`)
    }
    check(consoleBad.length === 0, `console clean: no console error, no WebGL warning, no page error, no GL-check record (${consoleBad.length})${consoleBad.length ? '\n        ' + consoleBad.slice(0, 6).join('\n        ') : ''}`)
    fs.writeFileSync(`${OUT}/${tag}.json`, JSON.stringify({ floorWork, floorDepth, controlTravel, idDepth, idSurface, landings, atDepth, backAt }, null, 2))
  }
  await b.close()
  console.log(fails ? `\n   FAIL (${fails})` : '\n   PASS')
  process.exit(fails ? 1 : 0)
})()
