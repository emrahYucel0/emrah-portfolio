// THE BENCH BROWSES (ROADMAP R7, user decisions 2026-10-02). Scrolling moves the bench one study; a click — the
// copper AÇ →, or the chosen study — opens it; a label chosen directly is a shortcut. Past 03 the gesture carries on
// down to the Contact finale (at p = 0), past 01 up to Work; up out of the finale lands on 03, Back from a study on
// that study, every other way in on 01. One gesture is one study: a hard trackpad throw moves one. The finger, the
// one hint (once, after 2.5 s), the foot band (the home strip's words), and the records (no button face, no second
// impression, 44 px targets) are checked too.
//
//   node bench.cjs <port> [chrome|webkit]      stills to tools/diag/out/r7
const pw = require('playwright')
const path = require('path'), fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PORT = process.argv[2] || '4500', ENGINE = process.argv[3] || 'chrome'
const OUT = path.join(__dirname, 'out', 'r7'); fs.mkdirSync(OUT, { recursive: true })
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
const base = `http://127.0.0.1:${PORT}`
const at = (p) => p.evaluate(() => ({ path: location.pathname, y: Math.round(scrollY), sel: [...document.querySelectorAll('.lab-stage .rec')].findIndex((b) => b.getAttribute('aria-current') === 'true') + 1, base: window.__lab?.A?.base, mode: window.__lab?.A?.mode }))
// a stream played from inside the page on a fixed clock (as trackpad.cjs does): macOS momentum, thrown hard
const throwHard = (p, dir) => p.evaluate((dir) => new Promise((res) => {
  const ev = []; let t = 0
  for (const d of [20, 60, 140, 240, 320, 380]) { ev.push([t, d]); t += 16.7 }
  let v = 400; while (v >= 1) { ev.push([t, Math.round(v)]); v *= 0.955; t += 16.7 }
  const t0 = performance.now() + 20; let i = 0
  const tick = () => {
    const now = performance.now(); let sum = 0, n = 0
    while (i < ev.length && t0 + ev[i][0] <= now) { sum += ev[i][1]; i++; n++ }
    if (n) document.body.dispatchEvent(new WheelEvent('wheel', { deltaY: sum * dir, bubbles: true, cancelable: true }))
    if (i < ev.length) setTimeout(tick, Math.max(0, t0 + ev[i][0] - performance.now())); else setTimeout(res, 50)
  }
  setTimeout(tick, 20)
}), dir)
;(async () => {
  const b = ENGINE === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: 'chrome' })
  const desk = { viewport: { width: 1440, height: 900 } }
  const mk = async (opts = desk) => { const ctx = await b.newContext(opts); const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); return { ctx, p, errs } }
  const toBench = async (p) => { await p.goto(`${base}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(2200) }
  const notch = async (p, dy) => { await p.mouse.move(720, 450); await p.mouse.wheel(0, dy); await sleep(900) }

  console.log(`== desktop, wheel (${ENGINE} :${PORT})`)
  {
    const { ctx, p, errs } = await mk()
    await toBench(p)
    let s = await at(p); ok(s.sel === 1, 'arriving at the Lab: 01 Weight', JSON.stringify(s))
    await notch(p, 120); s = await at(p); ok(s.sel === 2 && s.path === '/tr/lab', 'one notch down: 02 Line', JSON.stringify(s))
    await notch(p, 120); s = await at(p); ok(s.sel === 3, 'and again: 03 Tone', JSON.stringify(s))
    await notch(p, 120)
    await p.waitForFunction(() => /\/contact$/.test(location.pathname) && !!window.__finale, null, { timeout: 15000 }).catch(() => {})
    await sleep(900); s = await at(p)
    ok(s.path === '/tr/contact' && s.y === 0, 'from 03, one notch down: the Contact finale at p = 0', JSON.stringify(s))
    await notch(p, -120)
    await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 15000 }).catch(() => {}); await sleep(1500)
    s = await at(p); ok(s.path === '/tr/lab' && s.sel === 3, 'from the finale\'s top, one notch up: back on the bench at 03 Tone', JSON.stringify(s))
    await notch(p, -120); s = await at(p); ok(s.sel === 2, 'up: 02', JSON.stringify(s))
    await notch(p, -120); s = await at(p); ok(s.sel === 1, 'up: 01', JSON.stringify(s))
    await notch(p, -120)
    await p.waitForFunction(() => location.pathname === '/tr' && window.__lab?.A?.mode === 'index', null, { timeout: 20000 }).catch(() => {}); await sleep(1500)
    s = await at(p); const STOP = await p.evaluate(() => window.__lab?.STOP)
    ok(s.path === '/tr' && s.base === STOP?.work, 'from 01, one notch up: Work', JSON.stringify(s))
    ok(errs.length === 0, 'no page errors', errs.slice(0, 2).join(' | '))
    await ctx.close()
  }
  console.log('== one gesture is one study: a hard trackpad throw')
  {
    const { ctx, p } = await mk()
    await toBench(p)
    await throwHard(p, 1); await sleep(900); let s = await at(p)
    ok(s.sel === 2, 'a hard throw down from 01 moves one study, to 02', JSON.stringify(s))
    await throwHard(p, 1); await sleep(900); s = await at(p)
    ok(s.sel === 3, 'another: 03', JSON.stringify(s))
    await throwHard(p, 1)
    await p.waitForFunction(() => /\/contact$/.test(location.pathname) && !!window.__finale, null, { timeout: 15000 }).catch(() => {}); await sleep(1500)
    s = await at(p); ok(s.path === '/tr/contact' && s.y === 0, 'another: the finale, and its tail does not scroll it', JSON.stringify(s))
    await throwHard(p, -1)
    await p.waitForFunction(() => /\/lab$/.test(location.pathname), null, { timeout: 15000 }).catch(() => {}); await sleep(1800)
    s = await at(p); ok(s.path === '/tr/lab' && s.sel === 3, 'a hard throw up from the finale: the bench at 03, and the tail moves nothing more', JSON.stringify(s))
    // a deliberate second notch after the throw has died away is obeyed
    await notch(p, -120); s = await at(p); ok(s.sel === 2, 'a deliberate notch after it: 02', JSON.stringify(s))
    await ctx.close()
  }
  console.log('== the click opens; the labels choose; Back returns to the study')
  {
    const { ctx, p } = await mk()
    await toBench(p)
    await p.click('.lab-stage .rec-wrap:nth-child(3) .rec'); await sleep(900)
    let s = await at(p); ok(s.sel === 3 && s.path === '/tr/lab', 'clicking a label chooses it (a shortcut), it does not open it', JSON.stringify(s))
    const open = await p.evaluate(() => { const a = document.querySelector('.lab-stage .open-link'); const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), h: Math.round(r.height), color: getComputedStyle(a.querySelector('.t2')).color } })
    await p.click('.lab-stage .open-link'); await p.waitForURL(/\/lab\/tone$/, { timeout: 10000 }).catch(() => {}); await sleep(1200)
    ok(/\/lab\/tone$/.test(p.url()), 'the copper AÇ → opens 03 Tone', `${open.text} · ${open.h}px · ${open.color}`)
    await p.goBack(); await p.waitForURL(/\/lab$/, { timeout: 10000 }).catch(() => {}); await sleep(1500)
    s = await at(p); ok(s.sel === 3, 'Back from Tone: the bench on Tone', JSON.stringify(s))
    await p.click('.lab-stage .rec-wrap:nth-child(2) .rec'); await sleep(700)
    await p.click('.lab-stage .rec-wrap:nth-child(2) .rec'); await p.waitForURL(/\/lab\/line$/, { timeout: 10000 }).catch(() => {}); await sleep(1200)
    ok(/\/lab\/line$/.test(p.url()), 'clicking the chosen study opens it')
    await p.click('.study .back').catch(() => {}); await p.waitForURL(/\/lab$/, { timeout: 10000 }).catch(() => {}); await sleep(1500)
    s = await at(p); ok(s.sel === 2, 'the study\'s own way back: the bench on Line', JSON.stringify(s))
    await ctx.close()
  }
  console.log('== the hint, the strip, the records')
  {
    const { ctx, p } = await mk()
    await p.goto(`${base}/tr`, { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.__lab?.A?.mode === 'index').catch(() => {}); await sleep(1500)
    const home = await p.evaluate(() => ({ roles: document.querySelector('.strip.bottom .roles')?.textContent.trim(), state: document.querySelector('#hint')?.textContent.trim() }))
    await toBench(p); await sleep(1800)
    const f = await p.evaluate(() => { const ft = document.querySelector('.lab-stage .foot'); const h = ft.querySelector('.hint'); return { roles: ft.querySelector('.roles').textContent.trim(), state: ft.querySelector('.state').textContent.trim(), hint: h.classList.contains('on') ? h.textContent : '', all: ft.textContent } })
    ok(f.roles === home.roles && f.state === home.state && !/01 \/ 03|kayıtlı|registered/i.test(f.all), 'the foot is the home strip\'s words, no counter, no "registered"', `${f.roles} | ${f.state}`)
    ok(/kaydırarak gez · tıklayarak aç/i.test(f.hint), 'still for 2.5 s: "KAYDIRARAK GEZ · TIKLAYARAK AÇ"', f.hint)
    await p.screenshot({ path: path.join(OUT, 'after-bench-1440-hint.png') })
    await p.mouse.move(700, 400); await p.mouse.wheel(0, 10); await sleep(700)
    ok(!(await p.evaluate(() => document.querySelector('.lab-stage .foot .hint').classList.contains('on'))), 'any input ends it')
    await toBench(p); await sleep(3200)
    ok(!(await p.evaluate(() => document.querySelector('.lab-stage .foot .hint').classList.contains('on'))), 'once per session')
    const recs = await p.evaluate(() => [...document.querySelectorAll('.lab-stage .rec')].map((b) => { const cs = getComputedStyle(b), r = b.getBoundingClientRect(), af = getComputedStyle(b.querySelector('.nm'), '::after'); return { bg: cs.backgroundColor, border: cs.borderTopWidth, h: Math.round(r.height), after: af.content } }))
    ok(recs.every((r) => (r.bg === 'rgba(0, 0, 0, 0)' || r.bg === 'transparent') && r.border === '0px' && (r.after === 'none' || r.after === 'normal') && r.h >= 44), 'records: no button face, no second impression, 44px targets', JSON.stringify(recs))
    await ctx.close()
  }
  console.log('== phone: the finger')
  {
    const { ctx, p } = await mk({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: ENGINE !== 'firefox', hasTouch: true })
    const cdp = ENGINE === 'chrome' ? await ctx.newCDPSession(p) : null
    await toBench(p)
    const swipe = async (dy) => {
      if (!cdp) return
      const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) })
      await T('touchStart', [[300, 500]]); for (let i = 1; i <= 10; i++) { await T('touchMove', [[300, 500 + dy * i / 10]]); await sleep(16) } await T('touchEnd', []); await sleep(1000)
    }
    if (cdp) {
      await swipe(-220); let s = await at(p); ok(s.sel === 2 && s.path === '/tr/lab', 'a swipe up (one long one): 02, once', JSON.stringify(s))
      await swipe(-220); s = await at(p); ok(s.sel === 3, 'again: 03', JSON.stringify(s))
      await swipe(220); s = await at(p); ok(s.sel === 2, 'a swipe down: 02', JSON.stringify(s))
      await ctx.close()
      const c2 = await mk({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
      await c2.p.goto(`${base}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(3500)
      const h = await c2.p.evaluate(() => { const e = document.querySelector('.lab-stage .foot .hint'); return e.classList.contains('on') ? e.textContent : '' })
      ok(/dokunarak aç/i.test(h), 'on a phone the hint says tap', h)
      await c2.p.screenshot({ path: path.join(OUT, 'after-bench-390-hint.png') })
      const tg = await c2.p.evaluate(() => [...document.querySelectorAll('.lab-stage .rec, .lab-stage .open-link')].map((e) => Math.round(e.getBoundingClientRect().height)))
      ok(tg.every((h) => h >= 44), 'phone targets ≥ 44px', tg.join(','))
      await c2.ctx.close()
    } else await ctx.close()
  }
  console.log('== reduced motion')
  {
    const { ctx, p } = await mk({ ...desk, reducedMotion: 'reduce' })
    await toBench(p)
    await p.mouse.move(720, 450); await p.mouse.wheel(0, 120); await sleep(200)
    const s = await at(p); ok(s.sel === 2, 'reduced motion: the step is instant, the rule the same', JSON.stringify(s))
    await ctx.close()
  }
  await b.close()
  console.log(`\nBENCH: ${fails ? `FAIL (${fails})` : 'PASS'}`)
  process.exitCode = fails ? 1 : 0
})().catch((e) => { console.error(String(e).slice(0, 500)); process.exit(1) })
