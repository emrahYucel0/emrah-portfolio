// A FINGER ON THE WORK FIELD — a tap opens the registered project, a swipe changes it, and neither is the other.
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const { stopsOf } = require('./stops.cjs')
const [port, W = '390', H = '844', loc = 'tr'] = process.argv.slice(2)
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 })
  const p = await ctx.newPage()
  const cdp = await ctx.newCDPSession(p)
  const swipeX = async (dx) => {
    const x0 = Math.round(+W / 2), y = Math.round(+H * 0.45)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] })
    for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(x0 + dx * i / 14), y }] }); await sleep(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const tap = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await sleep(70)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const st = () => p.evaluate(() => ({ mode: window.__lab.A.mode, base: window.__lab.A.base, wt: Math.round(window.__lab.A.wt), locked: window.__lab.A.wLocked, hint: document.querySelector('#cue')?.textContent?.trim() ?? '' }))   // the one hint, centred in the strip (R3)
  await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
  await sleep(3000)
  await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click()); await sleep(4200)
  console.log(`== WORK FIELD, REAL TOUCH ${W}x${H} ${loc} ==`)
  let s = await st()
  const STOP = await stopsOf(p)
  ok(s.base === STOP.work, 'standing on the work field')
  ok(!/basılı tut|hold the image/i.test(s.hint), 'the hint no longer asks for a hold', s.hint)
  ok(/dokun|tap/i.test(s.hint), 'and names the tap', s.hint)

  // a sideways swipe changes the project and does NOT open one
  const before = (await st()).wt
  await swipeX(-Math.round(+W * 0.5)); await sleep(2600)
  s = await st()
  ok(s.mode === 'index', 'a sideways swipe does not open a project', s.mode)
  ok(s.wt !== before, 'it changes which project is in register', `${before} → ${s.wt}`)

  // a tap on the registered image opens it
  await p.waitForFunction(() => window.__lab.A.wLocked >= 0, null, { timeout: 20000 }).catch(() => {})
  const fr = await p.evaluate(() => { const st = window.__lab.WORKS()[Math.round(window.__lab.A.wt)]; const f = st.layout.frame; const u = window.__lab.V.u; return { x: Math.round((f.x + f.w / 2) * u), y: Math.round((f.y + f.h / 2) * u) } })
  await tap(fr.x, fr.y)
  await p.waitForFunction(() => window.__lab.A.mode === 'world', null, { timeout: 20000 }).catch(() => {})
  await sleep(1500)
  s = await st()
  ok(s.mode === 'world', 'a tap on the registered image opens the project', s.mode)
  await b.close()
  console.log(`\nWORK TAP ${W}x${H}: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 300)); process.exit(1) })
