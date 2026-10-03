// CROSS SECTION ON THE SPINE (Phase C) — the place's own rules, on the real runtime.
//
//   node cross.cjs <port> [--engine=chrome|webkit] [--only=<section,...>]
//
// Sections (C1 + C2; C3/C4 add EXIT-to-bench, REDUCED, LANDSCAPE, FLAGOFF):
//   ENTER    one gesture off Work's last work enters the place and the same gesture turns the louvers to the band's
//            first position (EDGE behind the line) — for a notch, a 60 Hz swipe, and a hard 120 Hz flick, whose tail
//            must never carry past that position
//   BAND     inside the band one gesture of any shape moves exactly one position
//   RELEASE  from in front, one gesture carries the louvers to DEPTH, where they rest
//   REVERSE  from DEPTH, a hard flick back moves one position; four gestures back return to Work's last work
//   KEYS     ArrowDown / ArrowUp move one position each
//   TOUCH    (Chrome, 390x844, CDP touch) one swipe, slow or fast, moves one position
//   HEADER   a jump from Work to the Lab in the strip crosses the place as scenery: no word, no louvers, no EDGE
//
// Streams are dispatched from inside the page on a fixed clock (tools/diag/cstempo.cjs has the shapes).
const pw = require('playwright')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4960'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const engine = opt('engine', 'chrome')
const only = opt('only', '').split(',').filter(Boolean)
const want = (s) => !only.length || only.includes(s.toLowerCase())
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const check = (ok, msg) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails++ }

async function open(b, w = 1440, h = 900, extra = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 700 ? 3 : 2, ...extra })
  const p = await ctx.newPage()
  p.__errs = []
  p.on('pageerror', (e) => p.__errs.push(e.message))
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'load', timeout: 180000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index' && window.__lab.csState, null, { timeout: 120000 })
  await sleep(1000)
  await p.evaluate(() => {
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
  const STOP = await p.evaluate(() => window.__lab.STOP)
  const here = await p.evaluate(() => window.__lab.A.base)
  if (here !== STOP.cross) { await p.evaluate((s) => window.__lab.go(s.cross), STOP); await sleep(2800); await settle(p, 300) }
  await p.evaluate((i) => window.__lab.csSet(i), x); await settle(p, 500)
}
const gest = (p, shape, sign) => p.evaluate(([s, g]) => window.__gest(s, g), [shape, sign])

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
  check(p.__errs.length === 0, `no page errors (${p.__errs.length})${p.__errs.length ? ': ' + p.__errs[0].slice(0, 160) : ''}`)
  await p.context().close()

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
    check(q.__errs.length === 0, `no page errors on the phone (${q.__errs.length})`)
    await q.context().close()
  }
  await b.close()
  console.log(fails ? `\n   FAIL (${fails})` : '\n   PASS')
  process.exit(fails ? 1 : 0)
})()
