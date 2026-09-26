// THE HERO UNDER A REAL FINGER — dispatched through Chrome's own input pipeline (CDP), so touch-action and the
// browser's gesture arbitration apply. Chrome only; never to be presented as an iPhone result.
// node herotouch.cjs <port> [w] [h] [locale]
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, W = '390', H = '844', loc = 'tr'] = process.argv.slice(2)
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  const swipe = async (x, y0, dy, steps = 14) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: Math.round(y0 + (dy * i) / steps) }] })
      await sleep(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const press = async (x, y, ms) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await sleep(ms)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const home = async () => {
    await p.goto(`http://127.0.0.1:${port}/${loc}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(3200)
  }
  const st = () => p.evaluate(() => ({ base: window.__lab.A.base, about: window.__lab.A.aboutOpen, mode: window.__lab.A.mode, press: window.__lab.A.press ? +window.__lab.A.press.L.toFixed(2) : null }))
  const box = () => p.evaluate(() => { const r = document.querySelector('.hero-about').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) } })

  console.log(`== HERO, REAL TOUCH (Chrome input pipeline) ${W}x${H} ${loc} ==`)

  // 1. a tap on the control opens About
  await home()
  let c = await box()
  await press(c.x, c.y, 70); await sleep(3400)
  let s = await st()
  ok(s.about && s.base === 0, 'a tap on the control opens About', JSON.stringify(s))

  // 2. a swipe that begins ON the control travels, and does not open About
  await home()
  c = await box()
  await swipe(c.x, c.y, -Math.round(+H * 0.22)); await sleep(3600)
  s = await st()
  ok(s.base === 1 && !s.about, 'a swipe beginning on the control goes to Creative and does not activate it', JSON.stringify(s))

  // 3. an ordinary swipe on the field
  await home()
  await swipe(Math.round(+W / 2), Math.round(+H * 0.72), -Math.round(+H * 0.22)); await sleep(3600)
  s = await st()
  ok(s.base === 1 && !s.about, 'a swipe on the hero itself goes to Creative', JSON.stringify(s))

  // 4. one swipe is one destination
  await home()
  await swipe(Math.round(+W / 2), Math.round(+H * 0.8), -Math.round(+H * 0.6), 26); await sleep(4200)
  s = await st()
  ok(s.base === 1, 'a long swipe still moves exactly one stop', `base ${s.base}`)

  // 5. a finger resting on the hero does not open About
  await home()
  await press(Math.round(+W / 2), Math.round(+H * 0.4), 2600); await sleep(1600)
  s = await st()
  ok(!s.about, 'holding the hero for two and a half seconds does not open About', JSON.stringify(s))

  // 6. a tap on the material itself does nothing at all
  await home()
  await press(Math.round(+W * 0.3), Math.round(+H * 0.3), 70); await sleep(2200)
  s = await st()
  ok(!s.about && s.base === 0, 'a tap on the name itself is not an About trigger', JSON.stringify(s))

  await b.close()
  console.log(`HERO TOUCH ${W}x${H}: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
