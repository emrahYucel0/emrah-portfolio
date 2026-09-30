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
  const swipe = async (dy, atY) => {
    const y0 = atY ?? Math.round(844 * (dy < 0 ? 0.72 : 0.3))
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: y0 }] })
    for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: Math.round(y0 + (dy * i) / 14) }] }); await sleep(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(6000)
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
  }))
  const goBench = async () => { await p.goto(`http://127.0.0.1:${port}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(1700) }
  const goSite = async () => { await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {}); await sleep(4500) }

  console.log('== mobile touch journeys (real touch, Chrome pipeline, 390x844)')

  // the spine is read from the page, on a route the runtime owns — the Lab routes never start it, so it cannot be
  // asked there (see stops.cjs)
  await goSite()
  const STOP = await stopsOf(p)
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
  ok((await st()).bench, 'Work → Lab (bridge)')
  await swipe(-260)
  let s = await st()
  ok(atContact(s), 'Lab → the Contact finale', contactSaid(s))

  // Contact → Lab → Work. Reaching the Lab from Contact travels the index to the Lab stop and then hands off to
  // the bench route, so the arrival is waited for rather than guessed at.
  // the finger moves DOWN to travel UP the index — Contact to the Lab stop, which opens the bench
  await swipe(260)
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(1800)
  ok((await st()).bench, 'Contact → Lab')
  await swipe(260)
  s = await st()
  ok(s.path === '/tr' && s.base === STOP.work, 'Lab → Work', `${s.path} base ${s.base} (Work is ${STOP.work})`)

  // Work → Lab → Work
  await goBench(); await swipe(260)
  s = await st()
  ok(s.path === '/tr' && s.base === STOP.work, 'Lab → Work again', `${s.path} base ${s.base}`)

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
    await swipe(dy)
    s = await st()
    if (want === 'rest') ok(atContact(s), `Lab → the Contact finale after ${name}`, contactSaid(s))
    else ok(s.path === '/tr' && s.base === STOP.work, `Lab → Work after ${name}`, `${s.path} base ${s.base}`)
  }
  await b.close()
  console.log(`TOUCH JOURNEYS: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
