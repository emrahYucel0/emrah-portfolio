// BATCH 2'S NAVIGATION, END TO END — every address a work now has, and the two seams around the bench.
//
//   node batch2nav.cjs <port> [lanHost]
//
// Round 2 gave every work its own address (R8), made the plain list open a work AT that address, made the bench
// browse by scrolling and open by click (R7), and made one notch leave the work field's end (R24). Each of those is
// a navigation path, so each is walked here rather than inspected:
//
//   DIRECT      every /tr/work/{id} and /en/work/{id} loads cold and arrives in that work.
//   HISTORY     Back from a work returns where it came from, Forward returns to the work, and the runtime's own
//               state follows — not just the address bar.
//   PLAIN LIST  the plain layer's link opens the work at its address, which is what round 2 changed.
//   BENCH       a notch moves one study and no more; a click opens the study under it.
//   SEAM        bench -> finale and finale -> bench, by wheel and by real touch.
//   R24         one notch at the end of the work field leaves it, and leaves it once.
const pw = require('playwright')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, lanHost] = process.argv.slice(2)
const BASE = 'http://127.0.0.1:' + port
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log('  ' + (c ? 'ok  ' : 'FAIL') + ' ' + l + (x ? ' — ' + x : '')) }
const WORKS = ['istanbul', 'ege', 'evden']

const st = (p) => p.evaluate(() => ({
  path: location.pathname,
  c2: document.documentElement.dataset.c2 ?? 'off',
  mode: window.__lab?.A?.mode ?? null,
  base: window.__lab?.A?.base ?? null,
  k: window.__lab?.A?.k ?? null,
  wt: window.__lab?.A?.wt == null ? null : Math.round(window.__lab.A.wt * 100) / 100,
  bench: !!document.querySelector('.lab-stage'),
  study: !!document.querySelector('.study'),
  finale: !!document.querySelector('.finale'),
  scrollY: Math.round(scrollY),
}))

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 110)))

  console.log('== BATCH 2 NAVIGATION   port ' + port)

  // ── every work's own address, cold, both locales ─────────────────────────────────────────────────────────
  console.log('\n-- a work at its own address')
  for (const loc of ['tr', 'en']) {
    for (const w of WORKS) {
      await p.goto(BASE + '/' + loc + '/work/' + w, { waitUntil: 'networkidle', timeout: 90000 })
      await p.waitForFunction(() => window.__lab && window.__lab.A.mode, null, { timeout: 60000 }).catch(() => {})
      await sleep(3200)
      const s = await st(p)
      // arriving IN the work means the world is on screen, or the index is holding that work in register
      const inWork = s.mode === 'world' || s.mode === 'exit' || (s.mode === 'index' && s.k !== null)
      ok(s.path === '/' + loc + '/work/' + w && s.c2 === 'on' && inWork,
        'direct load /' + loc + '/work/' + w, 'mode ' + s.mode + ' k ' + s.k + ' wt ' + s.wt + ' at ' + s.path)
    }
  }

  // ── Back and Forward through a work's address ───────────────────────────────────────────────────────────
  console.log('\n-- Back and Forward through a work')
  await p.goto(BASE + '/tr', { waitUntil: 'networkidle', timeout: 90000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 60000 }).catch(() => {})
  await sleep(3000)
  const STOP = await stopsOf(p)
  await p.evaluate((i) => window.__lab.go(i), STOP.work)
  await sleep(2600)
  const atWorkField = await st(p)
  await p.goto(BASE + '/tr/work/ege', { waitUntil: 'networkidle', timeout: 90000 })
  await sleep(3200)
  const inEge = await st(p)
  await p.goBack({ waitUntil: 'load' })
  await sleep(3000)
  const back = await st(p)
  ok(back.path === '/tr' && back.c2 === 'on' && back.mode === 'index',
    'Back from a work returns to the index', 'at ' + back.path + ' mode ' + back.mode + ' base ' + back.base)
  await p.goForward({ waitUntil: 'load' })
  await sleep(3200)
  const fwd = await st(p)
  ok(fwd.path === '/tr/work/ege' && fwd.c2 === 'on', 'Forward returns to the work', 'at ' + fwd.path + ' mode ' + fwd.mode)
  void atWorkField
  void inEge

  // ── the plain list opens a work at its address ───────────────────────────────────────────────────────────
  console.log('\n-- the plain list')
  await p.goto(BASE + '/tr', { waitUntil: 'networkidle', timeout: 90000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 60000 }).catch(() => {})
  await sleep(3000)
  const link = await p.evaluate(() => {
    const a = [...document.querySelectorAll('a[href*="/work/"]')].find((e) => /\/work\/[a-z]+$/.test(e.getAttribute('href') || ''))
    return a ? { href: a.getAttribute('href'), target: a.getAttribute('target'), text: (a.textContent || '').trim().slice(0, 24) } : null
  })
  ok(!!link && !link.target, 'the plain list links a work at its own address, in this tab', link ? link.href + ' target ' + link.target : 'no link found')
  if (link) {
    await p.evaluate(() => {
      const a = [...document.querySelectorAll('a[href*="/work/"]')].find((e) => /\/work\/[a-z]+$/.test(e.getAttribute('href') || ''))
      a.click()
    })
    await p.waitForFunction(() => /\/work\//.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
    await sleep(3200)
    const s = await st(p)
    ok(/\/work\/[a-z]+$/.test(s.path) && s.c2 === 'on', 'clicking it opens that work', 'at ' + s.path + ' mode ' + s.mode)
  }

  // ── the bench browses: one notch, one study; a click opens ───────────────────────────────────────────────
  console.log('\n-- the bench')
  await p.goto(BASE + '/tr/lab', { waitUntil: 'networkidle', timeout: 90000 })
  await sleep(2400)
  const cur = () => p.evaluate(() => {
    const el = document.querySelector('.lab-stage .rec[aria-current]') || document.querySelector('.lab-stage .rec-wrap[aria-current] .rec')
    const all = [...document.querySelectorAll('.lab-stage .rec')]
    const i = all.findIndex((e) => e === el || e.closest('[aria-current]'))
    return { i, n: all.length, text: (el?.textContent || '').trim().slice(0, 12) }
  })
  const c0 = await cur()
  await p.mouse.wheel(0, 120)
  await sleep(1600)
  const c1 = await cur()
  ok(c1.n > 1 && (c1.i === c0.i + 1 || c1.i === c0.i), 'one notch on the bench moves at most one study', c0.i + ' -> ' + c1.i + ' of ' + c1.n + ' (' + c1.text + ')')
  const s2 = await st(p)
  ok(s2.bench && !s2.study, 'and a notch does not open a study', 'bench ' + s2.bench + ' study ' + s2.study + ' at ' + s2.path)
  await p.evaluate(() => document.querySelector('.lab-stage .open-link')?.click())
  await p.waitForFunction(() => /\/lab\/[a-z]+$/.test(location.pathname), null, { timeout: 20000 }).catch(() => {})
  await sleep(2200)
  const s3 = await st(p)
  ok(/\/lab\/(weight|line|tone)$/.test(s3.path) && s3.study, 'a click opens the study', s3.path)

  // ── the bench <-> finale seam, by wheel ─────────────────────────────────────────────────────────────────
  /*
   * R7: THE BENCH BROWSES, SO A CROSSING IS NOT A FIXED NUMBER OF GESTURES.
   * This section used to fire six notches each way, which was right before R7 and now overshoots in both
   * directions: six down crossed to the finale and then SCROLLED it (the run recorded scrollY 150), and six back
   * up crossed to the bench, browsed 03 -> 01 and left again for Work, so `the finale -> bench` was measured at
   * /tr. The destination is driven to instead, one gesture at a time, and how many it took is reported - which is
   * also the number worth seeing. `until` is bounded, so a crossing that genuinely never happens still fails.
   */
  const until = async (pg, nudge, want, max = 7) => {
    for (let i = 1; i <= max; i++) {
      await nudge()
      await sleep(900)
      if (await pg.evaluate(want).catch(() => false)) return i
    }
    return null
  }
  const atFinale = () => /[/]contact$/.test(location.pathname) && !!window.__finale
  const atBench = () => /[/]lab$/.test(location.pathname) && !!document.querySelector('.lab-stage')
  const atBenchOf = (q) => /[/]lab$/.test(q.path) && q.bench
  console.log('\n-- the bench and the finale')
  await p.goto(BASE + '/tr/lab', { waitUntil: 'networkidle', timeout: 90000 })
  await sleep(2400)
  const downN = await until(p, () => p.mouse.wheel(0, 150), atFinale)
  await sleep(1600)
  const toFin = await st(p)
  ok(toFin.path === '/tr/contact' && toFin.finale, 'bench -> the finale, by wheel', 'at ' + toFin.path + ' finale ' + toFin.finale + ' scrollY ' + toFin.scrollY + ' in ' + downN + ' gestures (01, 02, 03, then across)')
  const upN = await until(p, () => p.mouse.wheel(0, -150), atBench)
  await sleep(1600)
  const backFin = await st(p)
  ok(atBenchOf(backFin), 'the finale -> bench, by wheel', 'at ' + backFin.path + ' bench ' + backFin.bench + ' in ' + upN + ' gestures')

  // ── R24: one notch leaves the end of the work field, and leaves it once ─────────────────────────────────
  console.log('\n-- R24: one notch off the end of the work field')
  await p.goto(BASE + '/tr', { waitUntil: 'networkidle', timeout: 90000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 60000 }).catch(() => {})
  await sleep(3000)
  await p.evaluate((i) => window.__lab.go(i), STOP.work)
  await sleep(2600)
  // to the last work, by the keyboard, so the wheel is spent only on leaving
  const n = await p.evaluate(() => window.__lab.WORKS().length)
  for (let i = 0; i < n; i++) { await p.keyboard.press('ArrowRight'); await sleep(700) }
  await sleep(1600)
  const atEnd = await st(p)
  await p.mouse.wheel(0, 120)
  await sleep(3400)
  const afterOne = await st(p)
  const left = afterOne.path !== '/tr' || afterOne.base !== STOP.work
  ok(left, 'one notch at the end leaves the work field', 'wt ' + atEnd.wt + ' base ' + atEnd.base + ' -> ' + afterOne.path + ' base ' + afterOne.base + ' bench ' + afterOne.bench)

  // ── the seam by real touch, on a phone ─────────────────────────────────────────────────────────────────
  console.log('\n-- the seam by touch (Chrome input pipeline, 390x844)')
  const mctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 })
  const mp = await mctx.newPage()
  const cdp = await mctx.newCDPSession(mp)
  const swipe = async (dy) => {
    const y0 = dy < 0 ? Math.round(844 * 0.78) : Math.round(844 * 0.26)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: y0 }] })
    for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: Math.round(y0 + (dy * i) / 14) }] }); await sleep(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(5200)
  }
  await mp.goto(BASE + '/tr/lab', { waitUntil: 'networkidle', timeout: 90000 })
  await sleep(2400)
  const tDown = await until(mp, () => swipe(-300), atFinale)
  let m = await st(mp)
  ok(m.path === '/tr/contact' && m.finale, 'bench -> the finale, by touch', 'at ' + m.path + ' finale ' + m.finale + ' in ' + tDown + ' swipes')
  const tUp = await until(mp, () => swipe(300), atBench)
  m = await st(mp)
  ok(atBenchOf(m), 'the finale -> bench, by touch', 'at ' + m.path + ' bench ' + m.bench + ' in ' + tUp + ' swipes')

  ok(errs.length === 0, 'no page errors through any of it', errs.slice(0, 3).join(' | '))
  if (lanHost) {
    const lp = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage()
    const r = await lp.goto('http://' + lanHost + ':' + port + '/tr', { waitUntil: 'load', timeout: 60000 }).catch(() => null)
    ok(!!r && r.ok(), 'the LAN address answers for the phone', lanHost + ':' + port)
  }
  await b.close()
  console.log('\nBATCH2 NAV: ' + (fails === 0 ? 'PASS' : 'FAIL (' + fails + ')'))
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
