// The six mobile touch journeys the brief lists, driven by real touch input through the browser's input pipeline.
//
//   node touchjourney.cjs <port>
//
// THE STOPS ARE ASKED FOR, NEVER COUNTED. This file used to assert `base === 5` for Contact and `base === 3` for
// Work, and both had rotted, in two different ways:
//
//   5 MEANT CONTACT, and Contact is a route since the finale. Settling on the last stop hands the screen over, so
//     `A.base` on the far side reads 0 or a stale 4 — it failed on origin/main too, identically, so it was a stale
//     assertion and not a regression. The arrival is asserted by the route, the handover and the finale being on
//     the page instead, which is more than the old form checked rather than less.
//   THE NUMBERS WERE POSITIONS, NOT PLACES. On a build with the passage in the spine Work is the fifth place and
//     5 is the Lab, so the same file failed twice more for a reason that had nothing to do with what it tests.
//     That is the rule in CLAUDE.md — stops are named, not numbered, and in the harnesses too.
//
// AND THE BENCH BROWSES (R7, 6954a14). One gesture moves the bench one study, 01 → 02 → 03; only past 03 does the
// same gesture carry on down to the Contact finale, and only past 01 up to Work. R7 taught touch.cjs, journey.cjs,
// spine, gesture2, beckon and finale-a11y that rule and did not touch this file, so three of its six journeys
// still swiped once and expected to have left. They had not: they had browsed one study. The failures matched the
// new rule line for line — including `Lab → Work` PASSING, which it only did because the two swipes before it had
// walked the selection back to 01, and `after TONE` passing because the bench stands on 03 when a visitor comes
// back from the third study. Nothing was wrong with the site. Leaving the bench is now done by as many gestures
// as a finger would need, and the rule itself is asserted directly, below.
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  const swipe = async (dy, atY, settle = 6000) => {
    const y0 = atY ?? Math.round(844 * (dy < 0 ? 0.72 : 0.3))
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: y0 }] })
    for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: Math.round(y0 + (dy * i) / 14) }] }); await sleep(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(settle)
  }
  const tapSel = async (sel) => {
    const r = await p.evaluate((s) => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) } }, sel)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] })
    await sleep(60)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(2500)
  }
  const st = () => p.evaluate(() => ({
    path: location.pathname,
    base: window.__lab?.A?.base ?? null,
    c2: document.documentElement.dataset.c2 ?? 'off',
    bench: !!document.querySelector('.lab-stage'),
    study: !!document.querySelector('.study'),
    finale: !!document.querySelector('.finale, [data-finale], #finale'),
    scrollY: Math.round(scrollY),
    // R7: which study the bench stands on, 1-3 — the same read as touch.cjs and journey.cjs, so the three
    // harnesses cannot drift apart on what the bench's position means. NOT `study`: that name was already taken
    // by "a study page is open", and shadowing it made `Lab -> WEIGHT` fail on a page that was plainly there.
    benchStudy: [...document.querySelectorAll('.lab-stage .rec')].findIndex((b) => b.getAttribute('aria-current') === 'true') + 1,
  }))
  const goBench = async () => { await p.goto(`http://127.0.0.1:${port}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(1700) }
  /*
   * LEAVING THE BENCH TAKES A GESTURE PER STUDY, AND THEN ONE MORE.
   * Returns how many it took, which is the interesting number: from 01 upward it is 1, from 01 downward 3. The
   * loop is bounded by the number of studies plus one, so a bench that genuinely refuses to let go still FAILS
   * rather than swiping for ever.
   */
  const STUDIES = 3
  const leaveBench = async (dy) => {
    for (let i = 1; i <= STUDIES + 1; i++) {
      await swipe(dy, undefined, 2200)
      // (with Cross Section a seam to or from the bench runs for over a second: it is waited out before anything is read)
      await p.waitForFunction(() => document.documentElement.dataset.c2 !== 'cs' && !(window.__lab && window.__lab.A.csHeld), null, { timeout: 15000 }).catch(() => {})
      if (!(await st()).bench) { await sleep(3800); return i }   // settle the arrival as a 6 s swipe used to
    }
    return null
  }
  const goSite = async () => { await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {}); await sleep(4500) }

  console.log('== mobile touch journeys (real touch, Chrome pipeline, 390x844)')

  // the spine is read from the page, on a route the runtime owns — the Lab routes never start it, so it cannot be
  // asked there (see stops.cjs)
  await goSite()
  const STOP = await stopsOf(p)
  // above the bench: Work, or — with Cross Section on the spine (R14) — the passage, entered at DEPTH
  const UP = STOP.cross ?? STOP.work, UPN = STOP.cross != null ? 'Cross Section (DEPTH)' : 'Work'
  const SPINE = await p.evaluate(() => window.__lab.SPINE || null).catch(() => null)
  // An older artifact does not expose it. The stops are still resolved — that fallback IS the spine such a build
  // has — but it is said out loud, because a harness that quietly measures something else is how this rotted.
  if (!SPINE) console.log(`  !!  window.__lab.SPINE is not exposed on this build; stops resolved from the historical spine ${JSON.stringify(STOP)}`)
  else console.log(`      spine: ${SPINE.join(' · ')}`)

  /*
   * ARRIVING AT CONTACT IS ARRIVING AT A ROUTE — the route, the handover, and the finale actually being there.
   * The same form as tools/diag/touch.cjs, so the two harnesses cannot drift apart on what that arrival means.
   */
  const atContact = (s) => s.path === '/tr/contact' && s.c2 === 'off' && s.finale && s.scrollY === 0
  const contactSaid = (s) => `${s.path} c2 ${s.c2} finale ${s.finale} scrollY ${s.scrollY}`

  // Work → Lab → Contact
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click()); await sleep(4500)
  await p.evaluate(() => document.querySelector('#ui [data-go="lab"]').click())
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {}); await sleep(1600)
  ok((await st()).bench, STOP.cross != null ? 'Work → Lab (the strip, past Cross Section)' : 'Work → Lab (bridge)')
  // the rule itself, stated once and directly: ONE swipe moves the bench ONE study and does not leave it
  const b0 = await st()
  await swipe(-260, undefined, 2200)
  let s = await st()
  ok(s.bench && s.benchStudy === b0.benchStudy + 1, 'one swipe on the bench moves one study, and does not leave', `study ${b0.benchStudy} → ${s.benchStudy} at ${s.path}`)
  // and from there, a gesture per remaining study and one more, down to the finale
  let n = await leaveBench(-260)
  s = await st()
  ok(atContact(s), `Lab → the Contact finale (${n} more gestures)`, contactSaid(s))

  // Contact → Lab → Work. Reaching the Lab from Contact travels the index to the Lab stop and then hands off to
  // the bench route, so the arrival is waited for rather than guessed at.
  // the finger moves DOWN to travel UP the index — Contact to the Lab stop, which opens the bench
  await swipe(260)
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(1800)
  ok((await st()).bench, 'Contact → Lab')
  // R7: coming up out of the finale the bench stands on 03, so Work is three gestures away
  ok((await st()).benchStudy === 3, 'up out of the finale, the bench stands on 03', `study ${(await st()).benchStudy}`)
  n = await leaveBench(260)
  s = await st()
  ok(s.path === '/tr' && s.base === UP, `Lab → ${UPN} (${n} gestures)`, `${s.path} base ${s.base} (${UPN} is ${UP})`)

  // Work → Lab → Work
  // every other way in the bench opens on 01, so upward it leaves on the first gesture
  await goBench()
  ok((await st()).benchStudy === 1, 'entered afresh, the bench stands on 01', `study ${(await st()).benchStudy}`)
  n = await leaveBench(260)
  s = await st()
  ok(s.path === '/tr' && s.base === UP && n === 1, `Lab → ${UPN} again (${n} gesture)`, `${s.path} base ${s.base}`)

  // Lab → STUDY → Lab → destination, for each study
  for (const [rec, name, dy, want] of [[0, 'WEIGHT', -260, 'rest'], [1, 'LINE', 260, 'work'], [2, 'TONE', -260, 'rest']]) {
    await goBench()
    if (rec > 0) await tapSel(`.lab-stage .rec-wrap:nth-child(${rec + 1}) .rec`)
    await tapSel('.lab-stage .open-link')
    s = await st()
    ok(s.study, `Lab → ${name}`, s.path)
    await tapSel('.study .back')
    s = await st()
    ok(s.bench, `${name} → Lab`, s.path)
    // R7: Back leaves the bench standing on the study it came from — which is why these three used to fail and
    // `after TONE` did not: from 03 the downward gesture is the one that leaves
    ok(s.benchStudy === rec + 1, `${name} → Lab leaves the bench on 0${rec + 1}`, `study ${s.benchStudy}`)
    n = await leaveBench(dy)
    s = await st()
    if (want === 'rest') ok(atContact(s), `Lab → the Contact finale after ${name} (${n} gestures)`, contactSaid(s))
    else ok(s.path === '/tr' && s.base === UP, `Lab → ${UPN} after ${name} (${n} gestures)`, `${s.path} base ${s.base}`)
  }
  await b.close()
  console.log(`TOUCH JOURNEYS: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
