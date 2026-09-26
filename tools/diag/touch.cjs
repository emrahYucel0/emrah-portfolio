// REAL touch input, not synthesised DOM events: dispatched through the browser's own input pipeline via CDP, so
// it is subject to touch-action and to the browser's gesture arbitration — which is what the bug was about.
// Chrome only (WebKit exposes no equivalent); stated as such, never as an iPhone result.
// node touch.cjs <port> [w] [h]
const pw = require('playwright')
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
  }))
  const recBox = (i) => p.evaluate((n) => { const r = document.querySelectorAll('.lab-stage .rec')[n].getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } }, i)

  console.log(`== REAL TOUCH (Chrome input pipeline) ${W}x${H}`)

  // 1. swipe up from empty field → Contact
  await bench()
  await swipe(Math.round(+W / 2), Math.round(+H * 0.72), -260)
  await sleep(6000)
  let s = await state()
  ok(s.path === '/tr' && s.base === 5, 'swipe up (empty field) → Contact', `${s.path} base ${s.base}`)

  // 2. swipe down from empty field → Work
  await bench()
  await swipe(Math.round(+W / 2), Math.round(+H * 0.3), 260)
  await sleep(6000)
  s = await state()
  ok(s.path === '/tr' && s.base === 3, 'swipe down (empty field) → Work', `${s.path} base ${s.base}`)

  // 3–5. a swipe that BEGINS on each record must still navigate, and must not open a study
  for (const i of [0, 1, 2]) {
    await bench()
    const before = await state()
    const box = await recBox(i)
    await swipe(box.x, box.y, -260)
    await sleep(6000)
    s = await state()
    ok(s.path === '/tr' && s.base === 5, `swipe beginning on record ${i + 1} → Contact`, `${s.path} base ${s.base} (was registered: ${before.current})`)
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

  await b.close()
  console.log(`TOUCH ${W}x${H}: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
