// CROSS SECTION ON THE SPINE (Phase C) — the place's own rules, on the real runtime.
//
//   node cross.cjs <port> [--engine=chrome|webkit] [--only=<section,...>] [--dpr=1|2] [--q=csbreak=...]
//
// Sections (C1 + C2 + C3; C4 adds REDUCED, LANDSCAPE):
//   ENTER    one gesture off Work's last work enters the place and the same gesture turns the louvers to the band's
//            first position (EDGE behind the line) — for a notch, a 60 Hz swipe, and a hard 120 Hz flick, whose tail
//            must never carry past that position
//   BAND     inside the band one gesture of any shape moves exactly one position
//   RELEASE  from in front, one gesture carries the louvers to DEPTH, where they rest
//   REVERSE  from DEPTH, a hard flick back moves one position; four gestures back return to Work's last work
//   KEYS     ArrowDown / ArrowUp move one position each
//   TOUCH    (Chrome, 390x844, CDP touch) one swipe, slow or fast, moves one position
//   HEADER   a jump from Work to the Lab in the strip crosses the place as scenery: no word, no louvers, no EDGE
//   BENCH    (C3) from DEPTH one gesture (notch, flick) opens the blinds onto the bench: the route changes under DEPTH,
//            the blinds wait for the bench, open, and hand the screen back; the bench is on 01 and the flick's tail
//            does not move it
//   UP       (C3) from the bench at 01 one gesture up (notch, flick) closes the blinds and stands at DEPTH, NEVER on
//            Work at any frame (going up from the Lab must not skip Cross Section), and the flick's tail stays there
//   WAY      (C3) the way is five gestures each way: Work's last work to the bench in five, and back in five
//   BHEADER  (C3) the strip's WORK on the bench is a jump: it goes to Work and does not play the passage
//   COLD     (C3) the bench landed on cold (the runtime not loaded yet): the gesture up still arrives at DEPTH (the
//            fallback, a cut by the route); once the runtime is warm, the same gesture closes the blinds
//
// Streams are dispatched from inside the page on a fixed clock (tools/diag/cstempo.cjs has the shapes).
const pw = require('playwright')
const { watch } = require('./consolewatch.cjs')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const engine = opt('engine', 'chrome')
const only = opt('only', '').split(',').filter(Boolean)
// e.g. --q=csbreak=leakgl: the calibration break that reintroduces the GL-state leak (must FAIL)
const Q = opt('q', '')
// the desktop's device-pixel ratio: 2 by default; --dpr=1 for a 1x display (user decision 2026-10-04: both are run)
const DPR = Number(opt('dpr', '2'))
const want = (s) => !only.length || only.includes(s.toLowerCase())
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (ok, msg) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++ }

async function open(b, w = 1440, h = 900, extra = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 700 ? 3 : DPR, ...extra })
  const p = await ctx.newPage()
  // every console error, every WebGL warning, every page error, and the runtime's own GL record (consolewatch.cjs)
  p.__watch = watch(p, `${w}x${h}`)
  // the helpers, on every document the test lands on (a section that left for the Lab may come back by a reload)
  // (--q=csbreak=skipup: the bench's way up skips to Work again, the calibration break for UP; the bench is reached
  // by an in-page navigation that drops the query, so it is set on the window)
  if (Q.includes('csbreak=skipup')) await p.addInitScript(() => { window.__csBreak = 'skipup' })
  await p.addInitScript(() => {
    const SH = {
      notch: () => [100],
      swipe: () => Array.from({ length: 60 }, (_, i) => 60 * Math.pow(0.93, i)),
      flick: () => Array.from({ length: 120 }, (_, i) => 140 * Math.pow(0.965, i)),
    }
    const GAP = { notch: 0, swipe: 16.7, flick: 8.33 }
    window.__gest = (shape, sign) => new Promise((res) => {
      const d = SH[shape](), t0 = performance.now()
      let i = 0
      const tick = () => {
        const now = performance.now()
        while (i < d.length && now - t0 >= i * GAP[shape]) { window.dispatchEvent(new WheelEvent('wheel', { deltaY: sign * d[i], deltaMode: 0, cancelable: true })); i++ }
        if (i < d.length) setTimeout(tick, 2); else setTimeout(res, 50)
      }
      tick()
    })
    // every frame: the furthest position the passage reached, and whether the louvers drew
    window.__csTrace = (on) => {
      window.__csT = on ? { maxX: -1, minX: 9, mesh: 0, leg: false, wordVis: 0 } : null
      if (!on) return
      const s = () => {
        if (!window.__csT) return
        const c = window.__lab.csState()
        const T = window.__csT
        T.maxX = Math.max(T.maxX, c.x); T.minX = Math.min(T.minX, c.x)
        if (c.p > 0 && c.p < 1) T.mesh++
        // the leg is read while the spine is passing the place itself, not before the jump has begun
        if (c.leg && Math.abs(window.__lab.A.p - c.stop) < 0.5) T.leg = true
        const w = document.querySelector('.cs-word')
        if (w && getComputedStyle(w).opacity > 0.01 && getComputedStyle(w.parentElement).visibility !== 'hidden') T.wordVis++
        requestAnimationFrame(s)
      }
      requestAnimationFrame(s)
    }
  })
  await p.goto(`http://127.0.0.1:${port}/tr${Q ? `?${Q}` : ''}`, { waitUntil: 'load', timeout: 180000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
  await sleep(1000)
  return p
}
// (the place's own progress is `p`; the spine's position is `at`)
const st = (p) => p.evaluate(() => ({ ...window.__lab.csState(), base: window.__lab.A.base, at: window.__lab.A.p, path: location.pathname }))
async function settle(p, ms = 500) {
  await p.waitForFunction(() => { const L = window.__lab; if (!L) return true; const s = L.csState(); return Math.abs(L.A.p - L.A.pT) < 1e-3 && (!s || !s.moving) }, null, { timeout: 20000 }).catch(() => {})
  await sleep(ms)
}
async function toLastWork(p) {
  const STOP = await p.evaluate(() => window.__lab.STOP)
  await p.evaluate((s) => window.__lab.go(s.work), STOP); await settle(p, 1200)
  for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowRight'); await sleep(450) }
  await settle(p, 1200)
  return STOP
}
// every section arrives at the place for itself, then holds it at the position it is about
async function atCross(p, x) {
  // the runtime owns the screen only on the index: a section that left for the Lab comes back first
  if (await p.evaluate(() => location.pathname.includes('/lab'))) {
    await p.goto(`http://127.0.0.1:${port}/tr${Q ? `?${Q}` : ''}`, { waitUntil: 'load', timeout: 180000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
    await sleep(800)
  }
  const STOP = await p.evaluate(() => window.__lab.STOP)
  const here = await p.evaluate(() => window.__lab.A.base)
  if (here !== STOP.cross) { await p.evaluate((s) => window.__lab.go(s.cross), STOP); await sleep(2800); await settle(p, 300) }
  await p.evaluate((i) => window.__lab.csSet(i), x); await settle(p, 500)
}
const gest = (p, shape, sign) => p.evaluate(([s, g]) => window.__gest(s, g), [shape, sign])
// C3: every frame across both routes (the window survives the route change): where the spine is, the seam, the page
async function seamTrace(p, on) {
  if (!on) return p.evaluate(() => { const t = window.__sT; window.__sT = null; return { ...t, bases: [...t.bases], paths: [...t.paths], studies: [...t.studies] } })
  await p.evaluate(() => {
    const T = window.__sT = { frames: 0, bases: new Set(), work: 0, reveal: 0, cs: 0, paths: new Set(), studies: new Set() }
    const s = () => {
      if (window.__sT !== T) return
      T.frames++
      const L = window.__lab
      if (L && L.A && document.documentElement.dataset.c2 === 'on') { T.bases.add(L.A.base); if (L.A.base === L.STOP.work || Math.round(L.A.p) === L.STOP.work) T.work++ }
      const c = L && L.csState && L.csState()
      if (c && c.reveal.on && c.reveal.r > 0 && c.reveal.r < 1) T.reveal++
      if (document.documentElement.dataset.c2 === 'cs') T.cs++
      T.paths.add(location.pathname)
      const rec = document.querySelector('.lab-stage .rec[aria-current]')
      if (rec) T.studies.add([...document.querySelectorAll('.lab-stage .rec')].indexOf(rec))
      requestAnimationFrame(s)
    }
    requestAnimationFrame(s)
  })
}
const benchUp = (p) => p.waitForFunction(() => location.pathname.endsWith('/lab') && !document.documentElement.dataset.c2 && document.querySelector('.lab-stage .rec[aria-current]'), null, { timeout: 20000 })
const depthUp = (p) => p.waitForFunction(() => !location.pathname.includes('/lab') && document.documentElement.dataset.c2 === 'on' && window.__lab.csState().x === 4 && !window.__lab.csState().reveal.hold, null, { timeout: 20000 })
// a seam still running (a slow renderer: headless WebKit draws at ~20 fps) is waited out before anything is counted
const seamDone = (p) => p.waitForFunction(() => document.documentElement.dataset.c2 !== 'cs' && !(window.__lab && window.__lab.A.csHeld), null, { timeout: 20000 }).catch(() => {})
// the bench, reached the way a visitor reaches it: DEPTH, then one key
async function toBench(p) { await atCross(p, 4); await p.keyboard.press('ArrowDown'); await benchUp(p); await sleep(900) }

;(async () => {
  const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' })
  const p = await open(b)
  const STOP = await p.evaluate(() => window.__lab.STOP)
  console.log(`== CROSS SECTION ON THE SPINE   ${engine}   spine: ${(await p.evaluate(() => window.__lab.SPINE)).join(' · ')}`)

  if (want('enter')) {
    console.log('\n ENTER')
    for (const shape of ['notch', 'swipe', 'flick']) {
      await toLastWork(p)
      await p.evaluate(() => window.__csTrace(true))
      await gest(p, shape, 1)
      await sleep(2600); await settle(p, 300)
      const T = await p.evaluate(() => { const t = window.__csT; window.__csTrace(false); return t })
      const s = await st(p)
      check(s.base === STOP.cross && s.x === 1 && T.maxX === 1, `${shape}: Work's last work → the band's first position (base ${s.base}, x ${s.x}, furthest x ${T.maxX})`)
    }
  }
  if (want('band')) {
    console.log('\n BAND')
    for (const shape of ['notch', 'swipe', 'flick']) {
      await atCross(p, 1)
      await gest(p, shape, 1); await sleep(1300); await settle(p, 300)
      const s = await st(p)
      check(s.x === 2, `${shape}: behind → beside, one position (x ${s.x})`)
    }
  }
  if (want('release')) {
    console.log('\n RELEASE')
    await atCross(p, 3)
    await gest(p, 'flick', 1); await sleep(1800); await settle(p, 400)
    const s = await st(p)
    check(s.x === 4 && s.p === 1 && s.base === STOP.cross, `a flick from in front carries to DEPTH and rests there (x ${s.x}, p ${s.p}, base ${s.base})`)
  }
  if (want('reverse')) {
    console.log('\n REVERSE')
    await atCross(p, 4)
    await p.evaluate(() => window.__csTrace(true))
    await gest(p, 'flick', -1); await sleep(1800); await settle(p, 300)
    let T = await p.evaluate(() => { const t = window.__csT; window.__csTrace(false); return t })
    let s = await st(p)
    check(s.x === 3 && T.minX === 3, `a flick back from DEPTH moves one position (x ${s.x}, nearest x ${T.minX})`)
    for (let i = 0; i < 3; i++) { await gest(p, 'notch', -1); await sleep(1500) }
    await sleep(1500); await settle(p, 800)
    s = await st(p)
    const wT = await p.evaluate(() => window.__lab.A.wT)
    check(s.base === STOP.work && Math.abs(s.at - STOP.work) < 0.01 && wT === 2, `three more back: Work, on its last work (base ${s.base}, wT ${wT})`)
  }
  if (want('keys')) {
    console.log('\n KEYS')
    await atCross(p, 1)
    const a = (await st(p)).x
    await p.keyboard.press('ArrowDown'); await sleep(1200); await settle(p, 300)
    const b2 = (await st(p)).x
    await p.keyboard.press('ArrowUp'); await sleep(1200); await settle(p, 300)
    const c = (await st(p)).x
    check(a === 1 && b2 === 2 && c === 1, `ArrowDown then ArrowUp: ${a} → ${b2} → ${c}`)
  }
  if (want('resize')) {
    console.log('\n RESIZE')
    await atCross(p, 2)
    await p.setViewportSize({ width: 1280, height: 800 })
    await sleep(900)
    await p.keyboard.press('ArrowDown'); await sleep(1400); await settle(p, 400)
    const s = await st(p)
    check(s.x === 3 && s.valid[0] && s.valid[1], `a resize in the band, then a gesture: both faces hold a frame again and the louvers go on (x ${s.x}, valid ${s.valid})`)
    await p.setViewportSize({ width: 1440, height: 900 }); await sleep(900)
  }
  if (want('fallback')) {
    console.log('\n FALLBACK')
    await atCross(p, 1)
    await p.evaluate(() => window.__lab.csBreak())
    await p.keyboard.press('ArrowDown'); await sleep(120)
    const s = await st(p)
    check(s.broken && s.x === 2 && s.p === s.target, `with the louvers switched off, a gesture still moves one position and shows it at once, as a cut (broken ${s.broken}, x ${s.x}, p ${s.p})`)
  }
  if (want('header')) {
    console.log('\n HEADER')
    await toLastWork(p)
    await p.evaluate(() => window.__csTrace(true))
    await p.click('[data-go="lab"]').catch(() => p.evaluate(() => window.__lab.navigate('lab')))
    await p.waitForFunction(() => location.pathname.includes('/lab'), null, { timeout: 15000 }).catch(() => {})
    const T = await p.evaluate(() => { const t = window.__csT; window.__csTrace(false); return t })
    const path = await p.evaluate(() => location.pathname)
    check(T && !T.leg && T.mesh === 0 && T.wordVis === 0 && path.includes('/lab'), `the strip's LAB from Work crosses the place as scenery and opens the bench (leg ${T?.leg}, louver frames ${T?.mesh}, EDGE frames ${T?.wordVis}, ${path})`)
  }
  if (want('bench')) {
    console.log('\n BENCH (C3)')
    for (const shape of ['notch', 'flick']) {
      await atCross(p, 4)
      await seamTrace(p, true)
      await gest(p, shape, 1)
      await benchUp(p).catch(() => {})
      await sleep(2500)
      const T = await seamTrace(p, false)
      const c2 = await p.evaluate(() => document.documentElement.dataset.c2 ?? null)
      const path = await p.evaluate(() => location.pathname)
      check(path.endsWith('/lab') && c2 === null && T.reveal > 15 && T.studies.join() === '0', `${shape}: DEPTH → the blinds open onto the bench (${path}, ${T.reveal} reveal frames, data-c2 ${c2}, studies shown ${T.studies.join(',')})`)
    }
  }
  if (want('up')) {
    console.log('\n UP (C3): going up from the Lab never skips Cross Section')
    for (const shape of ['notch', 'flick']) {
      if (!(await p.evaluate(() => location.pathname.endsWith('/lab')))) await toBench(p)
      await seamTrace(p, true)
      await gest(p, shape, -1)
      await depthUp(p).catch(() => {})
      await sleep(2200)
      const T = await seamTrace(p, false)
      const s = await st(p)
      check(s.base === STOP.cross && s.x === 4 && s.p === 1 && T.work === 0 && T.reveal > 15 && !s.path.includes('/lab'), `${shape}: the bench at 01 → the blinds close → DEPTH, and stays there (base ${s.base}, x ${s.x}, ${T.reveal} closing frames, frames on Work ${T.work}, ${s.path})`)
    }
  }
  if (want('way')) {
    console.log('\n WAY (C3): five gestures each way')
    await atCross(p, 0)
    await toLastWork(p)
    let n = 0
    const where = () => p.evaluate(() => `${location.pathname} ${document.documentElement.dataset.c2 ?? '-'} base ${window.__lab.A.base} x ${window.__lab.csState().x} wT ${window.__lab.A.wT}`)
    const trail = [await where()]
    for (; n < 8 && !(await p.evaluate(() => location.pathname.endsWith('/lab') && !document.documentElement.dataset.c2)); n++) { await gest(p, 'notch', 1); await sleep(2400); await seamDone(p); await settle(p, 300); trail.push(await where()) }
    if (n !== 5) console.log('      ' + trail.join('\n      '))
    check(n === 5, `Work's last work → the bench: ${n} gestures`)
    await sleep(800)
    let m = 0
    const atWork = () => p.evaluate(() => !location.pathname.includes('/lab') && window.__lab.A.base === window.__lab.STOP.work && document.documentElement.dataset.c2 === 'on')
    const trail2 = [await where()]
    for (; m < 8 && !(await atWork()); m++) { await gest(p, 'notch', -1); await sleep(2400); await seamDone(p); await settle(p, 300); trail2.push(await where()) }
    if (m !== 5) console.log('      ' + trail2.join('\n      '))
    const wT = await p.evaluate(() => window.__lab.A.wT)
    check(m === 5 && wT === 2, `the bench → Work's last work: ${m} gestures (wT ${wT})`)
  }
  if (want('bheader')) {
    console.log('\n BHEADER (C3)')
    await toBench(p)
    await seamTrace(p, true)
    await p.click('[data-strip] li:first-child a')
    await p.waitForFunction(() => !location.pathname.includes('/lab') && document.documentElement.dataset.c2 === 'on', null, { timeout: 20000 }).catch(() => {})
    await sleep(2500)
    const T = await seamTrace(p, false)
    const s = await st(p)
    check(s.base === STOP.work && T.reveal === 0 && T.cs === 0, `the strip's WORK on the bench jumps to Work without the passage (base ${s.base}, reveal frames ${T.reveal}, 'cs' frames ${T.cs})`)
  }
  const v1 = await p.__watch.verdict(p)
  check(v1.length === 0, `console clean: no console error, no WebGL warning, no page error, no GL-check record (${v1.length})${v1.length ? '\n        ' + v1.slice(0, 6).join('\n        ') : ''}`)
  await p.context().close()

  if (want('cold')) {
    console.log('\n COLD (C3)')
    // cold, warm, and the fallback forced (csrise=route: a runtime that was not ready in time)
    for (const [warm, route] of [[false, false], [true, false], [false, true]]) {
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: DPR })
      const q = await ctx.newPage()
      q.__watch = watch(q, `cold-${warm}`)
      const qs = [Q, route ? 'csrise=route' : ''].filter(Boolean).join('&')
      await q.goto(`http://127.0.0.1:${port}/tr/lab${qs ? `?${qs}` : ''}`, { waitUntil: 'load', timeout: 180000 })
      // mounted, not merely rendered: the records come from the server with aria-current already set, and a gesture
      // made before the bench listens moves nothing (the bench places its records when it mounts)
      await q.waitForFunction(() => !!document.querySelector('.lab-stage .rec-wrap')?.style.left, null, { timeout: 60000 })
      // warm: the layout warms the runtime in idle time once the page has settled; cold: the gesture comes first
      if (warm) await q.waitForFunction(() => window.__c2Cross, null, { timeout: 60000 }); else await sleep(400)
      const was = await q.evaluate(() => !!window.__c2Cross)
      await q.evaluate(() => { window.__csSeen = 0; const s = () => { if (document.documentElement.dataset.c2 === 'cs') window.__csSeen++; requestAnimationFrame(s) }; requestAnimationFrame(s) })
      await q.evaluate(() => window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true })))
      await q.waitForFunction(() => !location.pathname.includes('/lab') && window.__lab && window.__lab.csState && document.documentElement.dataset.c2 === 'on', null, { timeout: 60000 }).catch(() => {})
      await sleep(2500)
      const s = await st(q)
      const seen = await q.evaluate(() => window.__csSeen)
      check(s.base === STOP.cross && s.x === 4 && (!warm || seen > 15) && (!route || seen === 0), `${route ? 'fallback forced' : warm ? 'warm' : 'cold'} (runtime ${was ? 'ready' : 'not loaded'}): one gesture up arrives at DEPTH (base ${s.base}, x ${s.x}, ${seen ? `blinds over ${seen} frames` : 'by the route, a cut'})`)
      const v = await q.__watch.verdict(q)
      check(v.length === 0, `console clean (${v.length})${v.length ? '\n        ' + v.slice(0, 6).join('\n        ') : ''}`)
      await ctx.close()
    }
  }

  if (want('touch') && engine === 'chrome') {
    console.log('\n TOUCH (390x844)')
    const q = await open(b, 390, 844, { hasTouch: true, isMobile: true })
    await q.evaluate(() => window.__lab.csSet(1)); await q.evaluate((s) => window.__lab.go(s.cross), STOP)
    await sleep(2800); await settle(q, 400)
    const cdp = await q.context().newCDPSession(q)
    const swipe = async (fromY, toY, ms) => {
      const steps = Math.max(4, Math.round(ms / 16)), x = 195
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: fromY }] })
      for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: fromY + ((toY - fromY) * i) / steps }] }); await sleep(ms / steps) }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    const x0 = (await st(q)).x
    await swipe(600, 450, 260); await sleep(1300); await settle(q, 300)
    const x1 = (await st(q)).x
    await swipe(700, 150, 120); await sleep(1300); await settle(q, 300)
    const x2 = (await st(q)).x
    check(x0 === 1 && x1 === 2 && x2 === 3, `a slow swipe, then a long fast one: one position each (${x0} → ${x1} → ${x2})`)
    // C3: on to DEPTH, one swipe on opens the blinds onto the bench; one swipe back down on the bench closes them
    await swipe(700, 150, 120); await sleep(1600); await settle(q, 300)
    await swipe(700, 150, 120)
    await q.waitForFunction(() => location.pathname.endsWith('/lab') && !document.documentElement.dataset.c2, null, { timeout: 20000 }).catch(() => {})
    await sleep(1500)
    const sb = await q.evaluate(() => [...document.querySelectorAll('.lab-stage .rec')].findIndex((e) => e.getAttribute('aria-current')))
    check(sb === 0, `DEPTH, then a swipe on: the bench, on 01 (${sb}, ${await q.evaluate(() => location.pathname)})`)
    await swipe(150, 700, 160)
    await q.waitForFunction(() => !location.pathname.includes('/lab') && document.documentElement.dataset.c2 === 'on', null, { timeout: 20000 }).catch(() => {})
    await sleep(2000)
    const su = await st(q)
    check(su.base === STOP.cross && su.x === 4, `a swipe back down on the bench: DEPTH, not Work (base ${su.base}, x ${su.x})`)
    const v2 = await q.__watch.verdict(q)
    check(v2.length === 0, `console clean on the phone (${v2.length})${v2.length ? '\n        ' + v2.slice(0, 6).join('\n        ') : ''}`)
    await q.context().close()
  }
  await b.close()
  console.log(fails ? `\n   FAIL (${fails})` : '\n   PASS')
  process.exit(fails ? 1 : 0)
})()
