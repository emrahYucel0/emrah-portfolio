// The six mobile touch journeys the brief lists, driven by real touch input through the browser's input pipeline.
const pw = require('playwright')
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
  const st = () => p.evaluate(() => ({ path: location.pathname, base: window.__lab?.A?.base ?? null, bench: !!document.querySelector('.lab-stage'), study: !!document.querySelector('.study') }))
  const goBench = async () => { await p.goto(`http://127.0.0.1:${port}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(1700) }
  const goSite = async () => { await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {}); await sleep(4500) }

  console.log('== mobile touch journeys (real touch, Chrome pipeline, 390x844)')
  // Work → Lab → Contact
  await goSite(); await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click()); await sleep(4500)
  await p.evaluate(() => document.querySelector('#ui [data-go="lab"]').click())
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {}); await sleep(1600)
  ok((await st()).bench, 'Work → Lab (bridge)')
  await swipe(-260); ok((await st()).base === 5, 'Lab → Contact', JSON.stringify(await st()))

  // Contact → Lab → Work. Reaching the Lab from Contact travels the index to stop 4 and then hands off to the
  // bench route, so the arrival is waited for rather than guessed at.
  // the finger moves DOWN to travel UP the index — Contact (5) to the Lab stop (4), which opens the bench
  await swipe(260)
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(1800)
  ok((await st()).bench, 'Contact → Lab')
  await swipe(260); ok((await st()).base === 3, 'Lab → Work', JSON.stringify(await st()))

  // Work → Lab → Work
  await goBench(); await swipe(260); ok((await st()).base === 3, 'Lab → Work again')

  // Lab → STUDY → Lab → destination, for each study
  for (const [rec, name, dy, want] of [[0, 'WEIGHT', -260, 5], [1, 'LINE', 260, 3], [2, 'TONE', -260, 5]]) {
    await goBench()
    if (rec > 0) await tapSel(`.lab-stage .rec-wrap:nth-child(${rec + 1}) .rec`)
    await tapSel('.lab-stage .open-link')
    let s = await st()
    ok(s.study, `Lab → ${name}`, s.path)
    await tapSel('.study .back')
    s = await st()
    ok(s.bench, `${name} → Lab`, s.path)
    await swipe(dy)
    s = await st()
    ok(s.base === want, `Lab → ${want === 5 ? 'Contact' : 'Work'} after ${name}`, `base ${s.base}`)
  }
  await b.close()
  console.log(`TOUCH JOURNEYS: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
