// THE ENGRAVED PROOF under a real finger — dispatched through Chrome's own input pipeline (CDP), so touch-action
// and the browser's gesture arbitration apply. Chrome only; never to be presented as an iPhone result.
// node prooftouch.cjs <port> [w] [h] [locale]
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
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))

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
    await sleep(70)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const st = () => p.evaluate(() => ({
    path: location.pathname,
    c2: document.documentElement.dataset.c2 ?? 'off',
    base: window.__lab?.A?.base ?? null,
    mode: window.__lab?.A?.mode ?? null,
    y: Math.round(scrollY),
    stage: document.querySelector('.proof-stages li[aria-current]')?.textContent?.trim() ?? null,
    overflowX: document.documentElement.scrollWidth > innerWidth + 1,
  }))
  const home = async () => {
    await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(3000)
  }
  const toWork = async () => { await p.evaluate(() => document.querySelector('#ui [data-go="work"]').click()); await sleep(3800) }
  const box = (sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) } }, sel)

  console.log(`== PROOF, REAL TOUCH (Chrome input pipeline) ${W}x${H} ${loc} ==`)

  // 1. a swipe past Work enters the passage
  await home(); await toWork()
  await swipe(Math.round(+W / 2), Math.round(+H * 0.75), -Math.round(+H * 0.3))
  await sleep(1200)
  await swipe(Math.round(+W / 2), Math.round(+H * 0.75), -Math.round(+H * 0.3))
  await p.waitForFunction(() => /\/lab\/proof$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
  await sleep(1800)
  let s = await st()
  ok(/\/lab\/proof$/.test(s.path), 'a swipe past Work → the proof', s.path)
  ok(s.c2 === 'off', 'the document has the screen', `data-c2 ${s.c2}`)
  ok(!s.overflowX, 'no horizontal overflow')

  // 2. the press scrolls like a document, and the stages follow the finger
  const first = (await st()).stage
  // two measured swipes, well short of the end: past it the forward exit is what SHOULD fire, and does (4 below)
  await swipe(Math.round(+W / 2), Math.round(+H * 0.78), -Math.round(+H * 0.4), 12); await sleep(500)
  await swipe(Math.round(+W / 2), Math.round(+H * 0.78), -Math.round(+H * 0.4), 12); await sleep(900)
  s = await st()
  ok(/\/lab\/proof$/.test(s.path), 'still on the press', s.path)
  ok(s.y > 200, 'the finger scrolls it', `scrollY ${s.y}`)
  ok(s.stage !== first, 'and the stage follows the finger', `${first} → ${s.stage}`)

  // 3. reverse to the top, then one more swipe leaves for Work
  await p.evaluate(() => scrollTo(0, 0)); await sleep(900)
  await swipe(Math.round(+W / 2), Math.round(+H * 0.3), Math.round(+H * 0.25))
  await sleep(4500)
  s = await st()
  ok(new RegExp(`^/${loc}/?$`).test(s.path), 'one swipe down at the top → the site', s.path)
  ok(s.base === 3 && s.mode === 'index', 'and it is Work, composed', JSON.stringify({ base: s.base, mode: s.mode }))

  // 4. scrolling on past the last stage carries into the Lab, with no control pressed
  await home(); await toWork()
  await swipe(Math.round(+W / 2), Math.round(+H * 0.75), -Math.round(+H * 0.3)); await sleep(1200)
  await swipe(Math.round(+W / 2), Math.round(+H * 0.75), -Math.round(+H * 0.3))
  await p.waitForFunction(() => /\/lab\/proof$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
  await sleep(1600)
  await p.evaluate(() => { const t = document.querySelector('.proof-track'); scrollTo(0, t.offsetTop + t.offsetHeight) })
  await sleep(800)
  await swipe(Math.round(+W / 2), Math.round(+H * 0.7), -Math.round(+H * 0.25))
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(2000)
  s = await st()
  ok(/\/lab$/.test(s.path), 'a swipe past the end of the track carries into the Lab', s.path)

  // 5. the two controls are real targets and do what they say
  await home(); await toWork()
  await swipe(Math.round(+W / 2), Math.round(+H * 0.75), -Math.round(+H * 0.3)); await sleep(1200)
  await swipe(Math.round(+W / 2), Math.round(+H * 0.75), -Math.round(+H * 0.3))
  await p.waitForFunction(() => /\/lab\/proof$/.test(location.pathname), null, { timeout: 25000 }).catch(() => {})
  await sleep(1800)
  const skip = await box('.proof-skip'), backB = await box('.proof-back')
  ok(skip.h >= 44 && backB.h >= 44, 'both controls are at least 44px tall', `${skip.w}x${skip.h} · ${backB.w}x${backB.h}`)
  await tap(skip.x, skip.y)
  await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 30000 }).catch(() => {})
  await sleep(2000)
  s = await st()
  ok(/\/lab$/.test(s.path), 'a tap on the skip control folds through to the bench', s.path)
  ok(await p.evaluate(() => !!document.querySelector('.lab-stage')), 'the bench is there')
  const benchScroll = await p.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1)
  ok(!benchScroll, 'and the bench still does not scroll — the mobile Lab fix is intact')

  ok(errs.length === 0, 'no page errors', [...new Set(errs)].slice(0, 2).join(' | ').slice(0, 160))

  await b.close()
  console.log(`\nPROOF TOUCH ${W}x${H}: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
