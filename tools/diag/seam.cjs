// THE SEAM — Lab ⇄ Contact finale, and every other way into the finale (F2).
//
//  1. Lab → finale: a trackpad gesture down on the bench (push + a long coasting tail) lands on /contact at p = 0,
//     and the tail does not scroll the finale (hush). The bench's last frame (veil = 1) and the finale's first frame
//     are compared pixel for pixel over the sheet (strip and foot excluded).
//  2. finale → Lab: at p = 0 a gesture up returns to the bench; its tail does not carry on to Work.
//  3. a scroll that runs the drawing back to the top does NOT also leave it (one gesture, one destination).
//  4. the finger: the same two crossings with real touch input (Chromium, CDP touch events).
//  5. by name → p = 1: the runtime's strip Contact, the Lab strip's Contact, /tr#contact.
//  6. the runtime's Contact stop, reached by travel → the finale at p = 0.
//  7. Back / Forward: the finale is found where it was left.
// With `record`, desktop and phone videos of the Lab ⇄ finale crossing go to docs/contact-finale/f2/.
// node seam.cjs <port> [record|reduced]
const fs = require('fs')
const path = require('path')
const pw = require('playwright')
const [port, mode] = process.argv.slice(2)
const RECORD = mode === 'record'
const REDUCED = mode === 'reduced' // the same crossings with prefers-reduced-motion
const BASE = `http://127.0.0.1:${port}`
const OUT = path.resolve(__dirname, '../../docs/contact-finale/f2')
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const ok = (cond, label, extra = '') => { if (!cond) fails++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? ` — ${extra}` : ''}`) }

const state = () => {
  const F = window.__finale
  const raw = F ? F.frame.rawProgress() : null
  const touch = F ? F.touchSheet() : false
  return {
    path: location.pathname, hash: location.hash, y: Math.round(scrollY),
    finale: !!F, raw: raw == null ? null : +raw.toFixed(3),
    // the PLOT's p: on the narrow touch sheet the track runs on into the attention stretch
    p: raw == null ? null : +(touch ? Math.min(1, (raw * (F.STAGES + F.ATT_STAGES)) / F.STAGES) : raw).toFixed(3),
    bench: !!document.querySelector('.lab-stage'), c2: document.documentElement.dataset.c2 ?? 'off',
    base: window.__lab?.A?.base ?? null,
  }
}
const atFinale = (pg) => pg.waitForFunction(() => location.pathname === '/tr/contact' && !!window.__finale, null, { timeout: 20000 }).then(() => true).catch(() => false)
const atBench = (pg) => pg.waitForFunction(() => location.pathname === '/tr/lab' && !!document.querySelector('.lab-stage'), null, { timeout: 20000 }).then(() => true).catch(() => false)
const push = [6, 14, 26, 38, 44, 40]
const tail = [34, 27, 21, 16, 12, 9, 7, 5, 4, 3, 2, 2, 1, 1, 1, 1]
const momentum = async (pg, dir) => { for (const d of [...push, ...tail]) { await pg.mouse.wheel(0, d * dir); await sleep(16) } }

// the sheet between the strip and the foot band, as luminance
const sheetOf = async (pg) => pg.evaluate(async () => {
  const strip = document.querySelector('[data-strip]')?.getBoundingClientRect().height ?? 50
  return { top: Math.ceil(strip) + 2, bottom: innerHeight - 50 }
})
let scratch = null // a blank page does the comparing: two full-screen PNGs are too heavy for the finale's own page
async function diff(pg, a, b) {
  const box = await sheetOf(pg)
  if (!scratch) scratch = await pg.context().newPage()
  a = a.toString('base64'); b = b.toString('base64')
  return scratch.evaluate(async ({ a, b, box }) => {
    const load = (d) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + d })
    const [ia, ib] = await Promise.all([load(a), load(b)])
    const w = ia.width, h = box.bottom - box.top
    const px = (img) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(img, 0, -box.top); return x.getImageData(0, 0, w, h).data }
    const da = px(ia), db = px(ib)
    let sum = 0, over = 0, n = 0
    for (let i = 0; i < da.length; i += 4) {
      const la = da[i] * 0.299 + da[i + 1] * 0.587 + da[i + 2] * 0.114
      const lb = db[i] * 0.299 + db[i + 1] * 0.587 + db[i + 2] * 0.114
      const d = Math.abs(la - lb); sum += d; if (d > 8) over++; n++
    }
    return { mean: +(sum / n).toFixed(3), over: +((over / n) * 100).toFixed(3) }
  }, { a, b, box })
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const errs = []
  const watch = (pg) => {
    pg.on('pageerror', (e) => errs.push(`${pg.url().replace(BASE, '')} :: ${String(e.message).slice(0, 120)}`))
    pg.on('console', (c) => { if (c.type() === 'error' && !/ResizeObserver loop/.test(c.text())) errs.push(`${pg.url().replace(BASE, '')} :: ${c.text().slice(0, 120)}`) })
    return pg
  }
  const vid = (dir, size) => (RECORD ? { recordVideo: { dir, size } } : {})
  const deskOpts = { viewport: { width: 1440, height: 900 }, reducedMotion: REDUCED ? 'reduce' : 'no-preference' }
  const desk = await b.newContext({ ...deskOpts, ...vid(path.join(__dirname, 'out/seam-video-desktop'), deskOpts.viewport) })
  let p = watch(await desk.newPage())

  console.log('== 1. Lab → finale (trackpad, desktop)')
  await p.goto(`${BASE}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(2200)
  const benchShot = await p.screenshot()
  // the bench's last frame is taken the moment it has cleared itself to the bare field
  const lastBench = p.waitForFunction(() => getComputedStyle(document.querySelector('.lab-stage')).getPropertyValue('--veil').trim() === '1', null, { timeout: 6000, polling: 'raf' })
    .then(async () => p.screenshot()).catch(() => null)
  const gesture = momentum(p, 1)
  const bare = await lastBench
  const arrived = await atFinale(p)
  const firstFinale = await p.screenshot()
  await gesture; await sleep(900)
  let s = await p.evaluate(state)
  ok(arrived && s.finale, 'wheel down on the bench → /tr/contact, the finale running', `${s.path}`)
  ok(s.y === 0 && s.p === 0, 'the drawing starts at p = 0 and the gesture\'s tail did not scroll it', `scrollY ${s.y}, p ${s.p}`)
  if (bare) {
    const d = await diff(p, bare, firstFinale)
    ok(d.over < 0.5, "the seam: the bench's last frame IS the finale's first frame (sheet, strip and foot excluded)", `mean |Δlum| ${d.mean}, pixels over 8: ${d.over}%`)
    if (RECORD) fs.writeFileSync(path.join(OUT, 'seam-1-bench.png'), benchShot)
    if (RECORD) fs.writeFileSync(path.join(OUT, 'seam-2-bench-bare.png'), bare)
    if (RECORD) fs.writeFileSync(path.join(OUT, 'seam-3-finale-first.png'), firstFinale)
    await scratch.close(); scratch = null
    await p.bringToFront()
  } else ok(false, 'the bench cleared itself to the bare field before handing over')

  console.log('\n== 2. finale → Lab (trackpad)')
  await sleep(700)
  await momentum(p, -1)
  const back = await atBench(p)
  await sleep(1200)
  s = await p.evaluate(state)
  ok(back && s.bench, 'at p = 0 a gesture up returns to the bench', s.path)
  ok(s.path === '/tr/lab', "and its tail does not carry on to Work (hush on the bench)", s.path)
  const benchBack = await p.screenshot()
  if (RECORD) fs.writeFileSync(path.join(OUT, 'seam-4-bench-again.png'), benchBack)

  console.log('\n== 3. a scroll back up to the top stays in the finale')
  await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await atFinale(p); await sleep(1200)
  await p.evaluate(() => scrollTo(0, 500)); await sleep(500)
  for (let i = 0; i < 16; i++) { await p.mouse.wheel(0, -60); await sleep(16) }
  await momentum(p, -1)
  await sleep(1200)
  s = await p.evaluate(state)
  ok(s.path === '/tr/contact' && s.y === 0, 'one gesture ran the drawing back to p = 0 — and stayed', `${s.path} scrollY ${s.y}`)
  // a NEW gesture from the top leaves
  await sleep(400)
  await p.mouse.wheel(0, -120)
  ok(await atBench(p), 'a new gesture up from the top leaves for the Lab')

  console.log('\n== 5. by name → p = 1')
  await p.goto(`${BASE}/tr`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 30000 }).catch(() => {})
  await sleep(800)
  await p.evaluate(() => document.querySelector('#ui [data-go="rest"]')?.click())
  let a = await atFinale(p); await sleep(1500)
  s = await p.evaluate(state)
  ok(a && s.p >= 0.999, "the runtime strip's Contact → /tr/contact settled (p = 1)", `p ${s.p}`)
  await p.goto(`${BASE}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(800)
  await p.evaluate(() => [...document.querySelectorAll('.lab-strip a')].find((x) => /contact$/.test(x.getAttribute('href') || ''))?.click())
  a = await atFinale(p); await sleep(1500)
  s = await p.evaluate(state)
  ok(a && s.p >= 0.999, "the Lab strip's Contact → /tr/contact settled (p = 1)", `p ${s.p}`)
  await p.goto(`${BASE}/tr#contact`, { waitUntil: 'networkidle' })
  a = await atFinale(p); await sleep(1500)
  s = await p.evaluate(state)
  ok(a && s.p >= 0.999 && !s.hash, '/tr#contact → /tr/contact settled (p = 1)', `${s.path}${s.hash} p ${s.p}`)

  console.log('\n== 6. the runtime\'s Contact stop, by travel')
  await p.goto(`${BASE}/tr`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 30000 }).catch(() => {})
  await sleep(800)
  await p.evaluate(() => { window.__lab.A.base = window.__lab.A.pT = 4; window.__lab.A.labArmed = false; window.__lab.go(5) })
  a = await atFinale(p); await sleep(900)
  s = await p.evaluate(state)
  ok(a && s.p === 0, 'travel that settles on Contact → the finale from p = 0', `${s.path} p ${s.p}`)

  console.log('\n== 7. Back / Forward')
  await p.evaluate(() => scrollTo(0, Math.round(document.querySelector('.finale .track').offsetHeight * 0.4))); await sleep(900)
  const left = (await p.evaluate(state)).y
  await p.evaluate(() => [...document.querySelectorAll('.lab-strip a')].find((x) => /\/lab$/.test(x.getAttribute('href') || ''))?.click())
  await atBench(p); await sleep(800)
  await p.goBack(); a = await atFinale(p); await sleep(1200)
  s = await p.evaluate(state)
  ok(a && Math.abs(s.y - left) <= 2, 'Back → the finale where it was left', `left at ${left}, back at ${s.y}`)
  await p.goForward(); ok(await atBench(p), 'Forward → the bench')
  await p.goBack(); a = await atFinale(p); await sleep(1200)
  s = await p.evaluate(state)
  ok(a && Math.abs(s.y - left) <= 2, 'and Back again → the same place', `at ${s.y}`)
  await p.goBack(); await p.waitForFunction(() => location.pathname === '/tr' && document.documentElement.dataset.c2 === 'on', null, { timeout: 20000 }).catch(() => {})
  await sleep(1500)
  s = await p.evaluate(state)
  ok(s.path === '/tr' && s.base === 5, "Back past the finale → the runtime, standing quietly on its Contact stop", `${s.path} base ${s.base}`)
  await sleep(600)
  await p.mouse.wheel(0, 140)
  a = await atFinale(p); await sleep(900)
  s = await p.evaluate(state)
  ok(a && s.p === 0, 'one more gesture down there → the finale from p = 0', `${s.path} p ${s.p}`)

  // ── recording: the Lab ⇄ finale crossing, as a visitor makes it ──
  let deskVideo = null
  if (RECORD) {
    await p.goto(`${BASE}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(2500)
    await momentum(p, 1); await atFinale(p); await sleep(1600)
    // a little of the drawing, and back to its top
    for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, 40); await sleep(30) }
    await sleep(1400)
    for (let i = 0; i < 45; i++) { await p.mouse.wheel(0, -40); await sleep(30) }
    await sleep(1400)
    await momentum(p, -1); await atBench(p); await sleep(2500)
    deskVideo = p.video()
  }
  await desk.close()
  if (deskVideo) fs.copyFileSync(await deskVideo.path(), path.join(OUT, 'lab-finale-desktop.webm'))

  console.log('\n== 4. the finger (phone, Chromium touch)')
  const phone = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference', ...vid(path.join(__dirname, 'out/seam-video-phone'), { width: 390, height: 844 }) })
  p = watch(await phone.newPage())
  const cdp = await phone.newCDPSession(p)
  const swipe = async (dy) => {
    const x = 195, y0 = dy < 0 ? 620 : 260
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
    for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (dy * i) / 12 }] }); await sleep(16) }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  await p.goto(`${BASE}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(2500)
  await swipe(-260)
  a = await atFinale(p); await sleep(1400)
  s = await p.evaluate(state)
  ok(a && s.y === 0, 'swipe up on the bench → the finale at p = 0, not scrolled by the same finger', `${s.path} scrollY ${s.y}`)
  if (RECORD) {
    // a little of the drawing by finger, back to the top
    for (let k = 0; k < 3; k++) { await swipe(-240); await sleep(500) }
    await sleep(1200)
    await p.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' })); await sleep(1800)
  }
  await p.evaluate(() => scrollTo(0, 0)); await sleep(500)
  await swipe(260)
  a = await atBench(p); await sleep(1400)
  s = await p.evaluate(state)
  ok(a && s.path === '/tr/lab', 'at the top a swipe down → the bench', s.path)
  if (RECORD) await sleep(1500)
  const phoneVideo = RECORD ? p.video() : null
  await phone.close()
  if (phoneVideo) fs.copyFileSync(await phoneVideo.path(), path.join(OUT, 'lab-finale-phone.webm'))

  await b.close()
  console.log(`\n  console errors ${errs.length} ${JSON.stringify(errs.slice(0, 3))}`)
  if (errs.length) fails++
  console.log(`\nSEAM: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 800)); process.exit(1) })
