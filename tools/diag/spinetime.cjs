// HOW LONG THE WORK <-> LAB PASSAGE TAKES, AND WHICH PART OF IT TAKES THAT LONG.
//
//   node spinetime.cjs <port> <label> [reps] [chrome|webkit]
//
// WHY THIS EXISTS, rather than reading spine.cjs's numbers. spine.cjs reports one number per arrival, measured in
// the HARNESS process: `Date.now()` from just after its input helper returns until a Playwright `waitForFunction`
// first sees the arrived state. That number is honest but it is three things added together — the real passage,
// the helper's own trailing `sleep(16)`, and a Playwright round trip per poll — and it cannot say which part of
// the passage is slow. It also cannot be compared across the four builds under test, because two of them
// (996a226, b04e1ed) expose no gesture fields at all, so a wheel-driven comparison would be comparing two
// different input rules and calling the difference a regression.
//
// So: every timestamp here is taken INSIDE the page with performance.now(), the clock starts on the real input
// event (read from the event itself in a capture-phase listener, not from when the harness asked for it), and the
// passage is cut into the phases a visitor actually waits through. The site is driven by real Playwright input.
//
// WHAT EACH NUMBER MEANS
//
//   Work -> Lab          trigger: the strip's LAB control, settled on Work. This is startBridge().
//     bridge    the input event -> A.mode becomes 'bridge'            (the runtime accepts the passage)
//     route         ... -> location.pathname is /tr/lab               (the router commits; the fold is playing)
//     bench         ... -> .lab-stage is in the DOM                   (the bench exists)
//     c2off         ... -> data-c2 is no longer 'on'                  (the runtime has let go of the screen)
//     TOTAL     the input event -> all four, i.e. the visitor is on a bench that owns the screen
//
//   Lab -> Work          trigger: one wheel notch up on the bench. One gesture, which leaves from study 01.
//     route     the input event -> location.pathname is /tr           (THE ROUTE HANDOVER)
//     c2on          ... -> data-c2 is 'on'                            (the runtime has the screen back)
//     base          ... -> A.base is Work                             (the index has decided where it is)
//     settled       ... -> |p - base| < 0.02 and |pT - base| < 0.02 and not busy   (THE SETTLE: motion over)
//     TOTAL     the input event -> settled
//
// Each phase is printed as the time from the INPUT EVENT, not from the phase before it, so the columns read as a
// stopwatch and a slow phase is obvious. The per-phase cost is the difference between neighbouring columns.
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, label = `:${process.argv[2]}`, repsArg = '5', engine = 'chrome'] = process.argv.slice(2)
const REPS = +repsArg

/*
 * The watcher lives in the page and survives a client-side route change, because it is on window and the site
 * navigates without a document load. It starts its clock on the real input event's own timeStamp.
 */
const INSTALL = ({ marks, kind }) => {
  const W = window
  W.__T = { t0: null, marks: {}, done: false, kind }
  const A = () => (W.__lab && W.__lab.A) || null
  const fns = marks.map(([n, src]) => [n, new Function('A', 'W', 'return (' + src + ')')])
  const check = () => {
    if (W.__T.t0 == null) return
    let all = true
    for (const [n, f] of fns) {
      if (W.__T.marks[n] == null) {
        let v = false
        try { v = !!f(A(), W) } catch (e) { v = false }
        if (v) W.__T.marks[n] = +(performance.now() - W.__T.t0).toFixed(1)
        else all = false
      }
    }
    if (all) W.__T.done = true
  }
  // the clock starts on the input itself, in the capture phase, before any handler has run
  const start = (e) => { if (W.__T.t0 == null) { W.__T.t0 = e.timeStamp <= performance.now() + 1 ? e.timeStamp : performance.now(); check() } }
  for (const t of [kind === 'wheel' ? 'wheel' : 'click']) W.addEventListener(t, start, { capture: true, once: true })
  const iv = setInterval(check, 4)
  const raf = () => { check(); if (!W.__T.done) requestAnimationFrame(raf); else clearInterval(iv) }
  requestAnimationFrame(raf)
  setTimeout(() => { clearInterval(iv); W.__T.done = true; W.__T.timedOut = !Object.keys(W.__T.marks).length || Object.keys(W.__T.marks).length < marks.length }, 24000)
}

;(async () => {
  const b = await pw[engine === 'chrome' ? 'chromium' : 'webkit'].launch(engine === 'chrome' ? { channel: 'chrome' } : {})
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } })
  const p = await ctx.newPage()
  const base = `http://127.0.0.1:${port}`
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 120)))

  await p.goto(`${base}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A?.mode === 'index', null, { timeout: 40000 })
  const STOP = await stopsOf(p)
  const SPINE = await p.evaluate(() => window.__lab.SPINE || null).catch(() => null)
  console.log(`== SPINE TIMING  ${label}  :${port}  ${engine}  reps ${REPS}`)
  console.log(`   spine ${SPINE ? SPINE.join(' · ') : '(not exposed — stops from the historical fallback)'}  ·  Work is stop ${STOP.work}`)

  const W = STOP.work
  const TO_LAB = [
    ['bridge', "A && A.mode === 'bridge'"],
    ['route', "location.pathname === '/tr/lab'"],
    ['bench', "!!document.querySelector('.lab-stage')"],
    ['c2off', "document.documentElement.dataset.c2 !== 'on'"],
  ]
  const TO_WORK = [
    ['route', "location.pathname === '/tr'"],
    ['c2on', "document.documentElement.dataset.c2 === 'on'"],
    ['base', `A && A.base === ${W}`],
    ['settled', `A && A.base === ${W} && Math.abs(A.p - ${W}) < 0.02 && Math.abs(A.pT - ${W}) < 0.02 && !A.busy`],
  ]
  const run = async (marks, kind, trigger) => {
    await p.evaluate(INSTALL, { marks, kind })
    await trigger()
    await p.waitForFunction(() => window.__T && window.__T.done, null, { timeout: 26000 }).catch(() => {})
    const r = await p.evaluate(() => window.__T)
    return r
  }
  const hush = () => p.waitForFunction(() => { const A = window.__lab?.A; return !A || !A.hush || performance.now() >= A.hush }, null, { timeout: 9000 }).catch(() => {})
  const settledAtWork = () => p.waitForFunction((w) => { const A = window.__lab?.A; return !!A && A.base === w && Math.abs(A.p - w) < 0.02 && !A.busy }, W, { timeout: 25000 }).catch(() => false)

  const rows = { toLab: [], toWork: [] }
  for (let rep = 1; rep <= REPS; rep++) {
    // a fresh document per rep: the first fold of a visit is the one a visitor meets, and a warm one would
    // quietly average two different things
    await p.goto(`${base}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A?.mode === 'index', null, { timeout: 40000 })
    await sleep(2600); await hush()
    await p.evaluate((w) => window.__lab.go(w), W)
    await settledAtWork(); await hush(); await sleep(400)

    // ── Work -> Lab, by the strip's LAB control (the same startBridge() every path funnels into) ──
    const a = await run(TO_LAB, 'click', () => p.click('#ui [data-go="lab"]', { timeout: 8000 }))
    rows.toLab.push(a)
    await p.waitForFunction(() => !!document.querySelector('.lab-stage'), null, { timeout: 20000 }).catch(() => {})
    await sleep(1500)

    // ── Lab -> Work, by one real wheel notch up on the bench ──
    const c = await run(TO_WORK, 'wheel', async () => { await p.mouse.move(683, 384); await p.mouse.wheel(0, -110) })
    rows.toWork.push(c)
    await sleep(600)
  }

  const fmt = (v) => (v == null ? '    —' : String(Math.round(v)).padStart(5))
  const stat = (xs) => {
    const v = xs.filter((x) => x != null).sort((a, b) => a - b)
    if (!v.length) return { n: 0, med: null, min: null, max: null }
    return { n: v.length, med: v[Math.floor(v.length / 2)], min: v[0], max: v[v.length - 1] }
  }
  const report = (name, list, marks) => {
    console.log(`\n-- ${name}   (ms from the input event; a phase's own cost is the gap to the column before it)`)
    console.log(`   rep  ${marks.map(([n]) => n.padStart(5)).join('  ')}   TOTAL`)
    for (let i = 0; i < list.length; i++) {
      const m = list[i].marks
      const total = Math.max(...marks.map(([n]) => m[n] ?? -1))
      const miss = marks.filter(([n]) => m[n] == null).map(([n]) => n)
      console.log(`   ${String(i + 1).padStart(3)}  ${marks.map(([n]) => fmt(m[n])).join('  ')}   ${total > 0 ? fmt(total) : '    —'}${miss.length ? `   never reached: ${miss.join(',')}` : ''}`)
    }
    const line = (f) => marks.map(([n]) => fmt(stat(list.map((r) => r.marks[n]))[f])).join('  ')
    const totals = list.map((r) => { const t = Math.max(...marks.map(([n]) => r.marks[n] ?? -1)); return t > 0 ? t : null })
    console.log(`   med  ${line('med')}   ${fmt(stat(totals).med)}`)
    console.log(`   min  ${line('min')}   ${fmt(stat(totals).min)}`)
    console.log(`   max  ${line('max')}   ${fmt(stat(totals).max)}`)
    return stat(totals).med
  }
  const mLab = report(`Work -> Lab   (trigger: the strip's LAB control = startBridge)`, rows.toLab, TO_LAB)
  const mWork = report(`Lab -> Work   (trigger: one wheel notch up on the bench)`, rows.toWork, TO_WORK)
  console.log(`\nSPINE TIMING ${label}: Work->Lab median ${mLab} ms · Lab->Work median ${mWork} ms${errs.length ? `  ·  ${errs.length} page errors: ${errs.slice(0, 2).join(' | ')}` : ''}`)
  await b.close()
})().catch((e) => { console.error(String(e).slice(0, 700)); process.exit(1) })
