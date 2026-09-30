// REAL touch input, not synthesised DOM events: dispatched through the browser's own input pipeline via CDP, so
// it is subject to touch-action and to the browser's gesture arbitration — which is what the bug was about.
// Chrome only (WebKit exposes no equivalent); stated as such, never as an iPhone result.
// node touch.cjs <port> [w] [h]
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, W = '390', H = '844'] = process.argv.slice(2)
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)

  // a finger: down, a dozen real moves, up
  const swipe = async (x, y0, dy, steps = 14) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(y0 + (dy * i) / steps) }] })
      await sleep(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const tap = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await sleep(60)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const bench = async () => { await p.goto(`http://127.0.0.1:${port}/tr/lab`, { waitUntil: 'networkidle', timeout: 60000 }); await sleep(1800) }
  const state = () => p.evaluate(() => ({
    path: location.pathname, c2: document.documentElement.dataset.c2 ?? 'off',
    base: window.__lab?.A?.base ?? null,
    scrollY: Math.round(scrollY),
    current: document.querySelector('.lab-stage .rec[aria-current]')?.textContent?.trim().slice(0, 10) ?? null,
    finale: !!document.querySelector('.finale, [data-finale], #finale'),
  }))
  /*
   * ARRIVING AT CONTACT IS ARRIVING AT A ROUTE.
   *
   * This used to read `path === '/tr' && base === STOP.rest`, and it had been failing since the Contact finale
   * landed — on origin/main as well, identically, so it was a stale assertion and not a regression. Settling on
   * the last stop now OPENS a route: the runtime hands the screen over, so `/tr` is a state the page passes
   * through rather than one it rests in, and `A.base` cannot be read on the far side of the handover at all.
   *
   * So the arrival is asserted by the three things that are true there and were not checkable before — the route,
   * the handover, and the finale actually being on the page — instead of one stop index that no longer exists.
   * That is strictly more than the old form checked, not less.
   */
  const arrivedAtContact = (s) => s.path === '/tr/contact' && s.c2 === 'off' && s.finale && s.scrollY === 0
  const contactSaid = (s) => `${s.path} c2 ${s.c2} finale ${s.finale} scrollY ${s.scrollY}`
  /*
   * A KNOWN ISSUE IS STILL WATCHED. It asserts the behaviour AS IT IS, so that the day it changes this says so
   * and the entry in docs/KNOWN-ISSUES.md can be retired — rather than the check quietly passing for a new reason.
   */
  const known = (stillBroken, label, detail = '') => {
    if (!stillBroken) fails++
    console.log(`  ${stillBroken ? 'note' : 'GONE'} ${label}${detail ? ` — ${detail}` : ''}${stillBroken ? '  (known issue; docs/KNOWN-ISSUES.md)' : '  ← FIXED: make this an assertion and retire the entry'}`)
  }
  const recBox = (i) => p.evaluate((n) => { const r = document.querySelectorAll('.lab-stage .rec')[n].getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } }, i)

  console.log(`== REAL TOUCH (Chrome input pipeline) ${W}x${H}`)

  // the stops are asked of the page, never counted: on a build with the passage in it, Contact is the seventh place
  // and not the sixth, and an assertion written as `base === 5` would be testing a position instead of a place
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
  await sleep(2600)
  const STOP = await stopsOf(p)
  const SPINE = await p.evaluate(() => window.__lab.SPINE || null).catch(() => null)
  /*
   * AND IT SAYS SO WHEN IT CANNOT SEE THE SPINE. An older artifact does not expose window.__lab.SPINE, and the
   * per-place loop below then iterated an empty list and printed nothing — so the hard-flick section reported
   * PASS on a build where it had tested none of the places. A harness that silently covers less is the same kind
   * of fault as an assertion that is out of date, and it has to be visible in the output.
   */
  if (!SPINE) console.log(`  !!  window.__lab.SPINE is not exposed on this build — the per-place hard-flick cases CANNOT RUN here (only the bench ones below). Stops fall back to ${JSON.stringify(STOP)}`)

  // 1. swipe up from empty field → Contact
  await bench()
  await swipe(Math.round(+W / 2), Math.round(+H * 0.72), -260)
  await sleep(6000)
  let s = await state()
  ok(arrivedAtContact(s), 'swipe up (empty field) → the Contact finale', contactSaid(s))

  // 2. swipe down from empty field → Work
  await bench()
  await swipe(Math.round(+W / 2), Math.round(+H * 0.3), 260)
  await sleep(6000)
  s = await state()
  ok(s.path === '/tr' && s.base === STOP.work, 'swipe down (empty field) → Work', `${s.path} base ${s.base}`)

  // 3–5. a swipe that BEGINS on each record must still navigate, and must not open a study
  for (const i of [0, 1, 2]) {
    await bench()
    const before = await state()
    const box = await recBox(i)
    await swipe(box.x, box.y, -260)
    await sleep(6000)
    s = await state()
    ok(arrivedAtContact(s), `swipe beginning on record ${i + 1} → the Contact finale`, `${contactSaid(s)} (was registered: ${before.current})`)
    ok(!/\/lab\/(weight|line|tone)/.test(s.path), `record ${i + 1}: no study opened by the swipe`)
  }

  // 6. a deliberate tap still selects the record it is on
  await bench()
  const box2 = await recBox(1)
  await tap(box2.x, box2.y)
  await sleep(1200)
  s = await state()
  ok(s.path === '/tr/lab' && /Line/i.test(s.current ?? ''), 'a tap selects the record, and does not navigate', `registered ${s.current} at ${s.path}`)

  // 7. tapping the open control enters that study
  await bench()
  const open = await p.evaluate(() => { const r = document.querySelector('.lab-stage .open-link').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } })
  await tap(open.x, open.y)
  await sleep(2200)
  s = await state()
  ok(/\/tr\/lab\/(weight|line|tone)$/.test(s.path), 'the open control enters the study', s.path)

  // 8. inside a study, a vertical drag scrolls the study and does not navigate
  await p.goto(`http://127.0.0.1:${port}/tr/lab/weight`, { waitUntil: 'networkidle' }); await sleep(1800)
  await swipe(Math.round(+W / 2), Math.round(+H * 0.7), -300)
  await sleep(1200)
  s = await state()
  ok(s.path === '/tr/lab/weight' && s.scrollY > 40, 'inside a study the finger scrolls the study', `scrollY ${s.scrollY}`)

  /*
   * 9. A HARD FLICK. One finger, thrown as hard as a finger can be thrown — most of the screen in a fifth of a
   * second — from every place on the spine, in both directions.
   *
   * On this site a finger declares its own boundaries: the index has no touch momentum, so one drag is one gesture
   * however fast it is made, and the rule is simply that it may carry one stop. A place with an axis of its own —
   * the work field, and the passage on a build that has it — may instead run that axis and stay, and then leaving
   * it needs the finger to lift and come back. What may never happen is the thing the report described: one throw
   * arriving several places away.
   */
  console.log('\n-- a hard flick')
  /*
   * IT HAS TO BEGIN ON MATERIAL, and where that is depends on the place.
   *
   * The first version of this started every flick at 18% of the height, which on the Work stop is over the project
   * row — a real button[data-work] without data-through — so pointerdown marked the pointer as UI and returned, and
   * the flick was never tracked: ptr.axis null, ptr.moved 0, not one call into scrollBy. It read as "NOTHING MOVED"
   * and looked like a fault in the gesture rule, while the passage one stop earlier passed the identical case
   * because it happens to have no control at that height. Traced on origin/main too, which behaves the same and has
   * no gesture rule at all.
   *
   * So the start point is FOUND rather than assumed, ACROSS THE WHOLE USABLE HEIGHT rather than a guessed band —
   * a band was the second version of this mistake, because the Work stop's three project rows can cover all of it —
   * and the chosen point is PRINTED in every case, whatever the outcome. A check that picks a coordinate has to say
   * which coordinate: not printing it is what made this take three passes to read. If there is genuinely no clear
   * point between the strips it fails and says so, rather than quietly handing back a point that is on a control.
   *
   * A flick beginning ON a control is a different question, and it is asked on its own in section 10.
   */
  const usableBand = () => p.evaluate(() => {
    // the site keeps a strip at the top and the bottom of every screen; no material is ever inside one
    let top = 0
    let bot = innerHeight
    for (const el of document.querySelectorAll('#ui .strip, #ui .layer.strip')) {
      const r = el.getBoundingClientRect()
      if (!r.height) continue
      if (r.top <= 1) top = Math.max(top, r.bottom)
      if (r.bottom >= innerHeight - 1) bot = Math.min(bot, r.top)
    }
    return { top: Math.ceil(top) + 4, bot: Math.floor(bot) - 4 }
  })
  const whatIsUnder = (x, y) => p.evaluate(({ cx, cy }) => {
    const el = document.elementFromPoint(cx, cy)
    const ctl = el && el.closest('a, button, .scroll')
    return {
      tag: el ? el.tagName.toLowerCase() : 'nothing',
      cls: el ? String(el.className || '').trim().slice(0, 24) : '',
      ctl: ctl ? `${ctl.tagName.toLowerCase()}${[...ctl.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `[${a.name}]`).join('')}` : null,
    }
  }, { cx: x, cy: y })
  /*
   * A FINGER HAS WIDTH, AND THE BROWSER KNOWS IT.
   *
   * The first version of this asked elementFromPoint, which answers for a mathematical point, and picked a height
   * seven pixels above a project row — genuinely clear by hit-testing. Chrome's TOUCH ADJUSTMENT then retargeted the
   * touchstart onto the row, because a real touch has an area and the browser snaps it to a nearby clickable
   * element. Measured on the Work stop, rows at 143–186: y=128 arrives on <body>, y=136 arrives on
   * button[data-work]. So the swipe was swallowed by the known issue in section 10 and read as a fault in the
   * gesture rule, which had never been reached at all.
   *
   * So a candidate must be clear across the finger, not at its centre: nothing within TOUCH_SLOP either side.
   */
  const TOUCH_SLOP = 16
  const clearPoint = async (x, prefer) => {
    const band = await usableBand()
    const ys = []
    for (let y = band.top + TOUCH_SLOP; y <= band.bot - TOUCH_SLOP; y += 8) ys.push(y)
    ys.sort((a, c) => Math.abs(a - prefer) - Math.abs(c - prefer))
    for (const y of ys) {
      let clear = true
      let u = null
      for (const dy of [-TOUCH_SLOP, -8, 0, 8, TOUCH_SLOP]) {
        const at = await whatIsUnder(x, y + dy)
        if (dy === 0) u = at
        if (at.ctl) { clear = false; break }
      }
      if (clear) return { y, u, band, tried: ys.length }
    }
    return { y: null, u: null, band, tried: ys.length }
  }
  const said = (c) => (c.y === null
    ? `NO CLEAR POINT between the strips (${c.band.top}..${c.band.bot}, ${c.tried} heights tried, ±${TOUCH_SLOP}px each)`
    : `from y=${c.y} on <${c.u.tag}${c.u.cls ? ` class="${c.u.cls}"` : ''}>, clear ±${TOUCH_SLOP}px`)
  // the sweep stays inside the band, and is a flick only if it covers a real distance
  const hard = async (y0, toward) => {
    const band = await usableBand()
    const x = Math.round(+W / 2)
    const y1 = toward > 0 ? band.bot : band.top
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(y0 + ((y1 - y0) * i) / 6) }] })
      await sleep(3)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    return Math.abs(y1 - y0)
  }
  // a swipe DOWN the screen travels back up the spine, so the sign is flipped for the reading
  const AXIS = new Set(['work', 'linefield'].filter((n) => STOP[n] !== undefined))
  for (const name of (SPINE || []).filter((n) => n !== 'lab' && n !== 'rest')) {
    for (const dir of [1, -1]) {
      await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
      await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
      await sleep(2600)
      if (name !== 'name') { await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), name); await sleep(2600) }
      const a = await p.evaluate(() => ({ base: window.__lab.A.base, wT: +window.__lab.A.wT.toFixed(2), lfp: +(window.__lab.A.lfp ?? -1).toFixed(3) }))
      /*
       * Travelling DOWN the spine means sweeping the finger UP the screen, so it starts low; and the other way for
       * up. The start point is the clear height nearest that end, and where it landed is printed either way.
       */
      const cp = await clearPoint(Math.round(+W / 2), dir > 0 ? Math.round(+H * 0.86) : Math.round(+H * 0.16))
      if (cp.y === null) { ok(false, `hard flick ${dir > 0 ? 'down' : 'up  '} from ${name.padEnd(10)} — cannot begin`, said(cp)); continue }
      const swept = await hard(cp.y, dir > 0 ? -1 : 1)
      await sleep(4000)
      const c = await p.evaluate(() => ({ base: window.__lab?.A?.base ?? null, wT: +(window.__lab?.A?.wT ?? 0).toFixed(2), lfp: +(window.__lab?.A?.lfp ?? -1).toFixed(3), path: location.pathname }))
      const pos = /\/contact$/.test(c.path) ? STOP.rest : /\/lab/.test(c.path) ? STOP.lab : c.base
      const moved = pos - a.base
      const atEnd = (dir > 0 && a.base >= STOP.rest) || (dir < 0 && a.base <= 0)
      const ran = name === 'work' ? Math.abs(c.wT - a.wT) : Math.abs(c.lfp - a.lfp)
      const held = moved === 0 && AXIS.has(name) && ran > 0.2
      let why = `${moved > 0 ? '+' : ''}${moved}`
      if (moved === 0) why = atEnd ? 'the end of the spine' : held ? `stayed, and its own axis moved ${ran.toFixed(2)}` : 'NOTHING MOVED'
      ok(Math.abs(moved) <= 1 && (Math.abs(moved) === 1 || atEnd || held), `hard flick ${dir > 0 ? 'down' : 'up  '} from ${name.padEnd(10)} ${a.base} → ${pos}`, `${why}  ·  ${said(cp)}, swept ${swept}px`)
    }
  }
  // and from the bench, where the runtime is on screen but the document owns it
  for (const dir of [1, -1]) {
    await bench()
    const cp = await clearPoint(Math.round(+W / 2), dir > 0 ? Math.round(+H * 0.86) : Math.round(+H * 0.16))
    if (cp.y === null) { ok(false, `hard flick ${dir > 0 ? 'down' : 'up  '} from the bench      — cannot begin`, said(cp)); continue }
    const swept = await hard(cp.y, dir > 0 ? -1 : 1)
    await sleep(6000)
    s = await state()
    const where = `${said(cp)}, swept ${swept}px`
    if (dir > 0) ok(arrivedAtContact(s), 'hard flick down from the bench      → the Contact finale', `${contactSaid(s)}  ·  ${where}`)
    else ok(s.path === '/tr' && s.base === STOP.work, 'hard flick up   from the bench      → Work', `${s.path} base ${s.base}  ·  ${where}`)
  }

  /*
   * 10. A FINGER THAT LANDS ON A PROJECT ROW. Two things are wanted of it, and the site does one of them.
   *
   * Measured on origin/main and on this build, identically (390x844, Chrome's own touch pipeline): a TAP opens the
   * project, and a vertical SWIPE that begins on the row is IGNORED — pointerdown marks the pointer as UI and
   * returns, so the swipe is never tracked. The same swipe twelve pixels to the side of the row travels one stop.
   *
   * The wanted behaviour is that such a swipe scrolls like a swipe anywhere else, as it already does on the Lab
   * bench, where the records carry data-through. It is recorded in docs/KNOWN-ISSUES.md and fixed in its own step;
   * here the current behaviour is asserted as it stands, so the day it changes this says so.
   */
  console.log('\n-- a finger that lands on a project row')
  const workRow = async () => {
    await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(2600)
    await p.evaluate((i) => window.__lab.go(i), STOP.work)
    await sleep(2800)
    return p.evaluate(() => {
      const el = document.querySelector('#ui [data-work]')
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), through: el.hasAttribute('data-through') }
    })
  }
  const row = await workRow()
  if (!row) {
    console.log('  !!  no [data-work] control on the Work stop — this section cannot run')
  } else {
    // a tap opens the project
    await tap(row.x, row.y)
    await sleep(3500)
    const t = await p.evaluate(() => ({ mode: window.__lab.A.mode, wLocked: window.__lab.A.wLocked ?? null }))
    ok(t.mode === 'world' || t.wLocked === 0, 'a tap on the project row opens the project', `mode ${t.mode} wLocked ${t.wLocked}`)

    // a swipe that begins on it — currently ignored
    const r2 = await workRow()
    const b2 = await p.evaluate(() => window.__lab.A.base)
    await swipe(r2.x, r2.y, -Math.round(+H * 0.42))
    await sleep(4000)
    const s2 = await state()
    known(s2.base === b2 && s2.path === '/tr', 'a vertical swipe beginning on the project row does not travel', `base ${b2} → ${s2.base} at ${s2.path}; data-through: ${r2.through}`)

    // and the control: the same swipe just beside the row does travel, so it is the control and not the height
    const r3 = await workRow()
    const sideX = Math.max(8, r3.x - Math.round(r3.w / 2) - 12)
    const b3 = await p.evaluate(() => window.__lab.A.base)
    await swipe(sideX, r3.y, -Math.round(+H * 0.42))
    await sleep(4000)
    const s3 = await state()
    ok(s3.base !== b3 || /\/lab|\/contact/.test(s3.path), 'the same swipe just beside the row travels one stop', `base ${b3} → ${s3.base} at ${s3.path}`)
  }

  await b.close()
  console.log(`TOUCH ${W}x${H}: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
