// R15 — INDICATOR A, THE DEFAULT: the strip names the section the visitor is in (user decision 2026-10-08).
//
//   node r15shot.cjs <port> [--out=out/r15/indicator-a] [--films] [--only=desktop|phone]
//
// On a desktop (1440x900) and a phone (390x844 @3, touch), in normal and reduced motion, at every place of the walk:
// a still, and the top strips cut out at full resolution in one sheet per viewport (strips-<viewport>.png, one row
// per place). --films records the whole walk on both viewports.
//
// It ASSERTS what the strip says, on the strip that is on screen — the runtime's while it owns the screen, the Lab's
// chrome on the bench and the finale: the section's control carries aria-current (the opening none, Work İŞLER,
// Cross Section and the bench LAB, the About room HAKKIMDA, the finale İLETİŞİM), it is drawn underlined, no other
// control is current, and the prototype's line (B) is gone. Browser page captures only, never the desktop.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs'), path = require('path')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const OUT = argOf('out', 'out/r15/indicator-a'), FILMS = process.argv.includes('--films'), ONLY = argOf('only', '')
const BASE = `http://127.0.0.1:${port}`
const VIEWS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
].filter((v) => !ONLY || v.name === ONLY)
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }

// what the strip should say at each place (the runtime's data-go, or the Lab strip's link)
const PLACES = [
  { id: 'name', section: null },
  { id: 'creative', section: null },
  { id: 'system', section: null },
  { id: 'linefield', section: null, set: 'lf' },
  { id: 'work', section: 'work' },
  { id: 'cross', section: 'lab', set: 'cs' },
  { id: 'about', section: 'about' },
  { id: 'bench', section: 'lab', route: '/tr/lab' },
  { id: 'finale-mid', section: 'rest', route: '/tr/contact', scroll: 0.5 },
  { id: 'finale-end', section: 'rest', route: '/tr/contact', scroll: 1 },
]

const read = (p) => p.evaluate(() => {
  const owns = document.documentElement.dataset.c2 === 'on'
  const els = owns ? [...document.querySelectorAll('#ui .strip.top .nav [data-go]')] : [...document.querySelectorAll('.lab-strip nav a')]
  const goOf = (e) => {
    if (e.dataset.go) return e.dataset.go
    const h = e.getAttribute('href') || ''
    return h.endsWith('/lab') ? 'lab' : h.endsWith('/contact') ? 'rest' : h.endsWith('/about') ? 'about' : 'work'
  }
  const cur = els.filter((e) => e.hasAttribute('aria-current')).map((e) => ({ go: goOf(e), v: e.getAttribute('aria-current'), mark: getComputedStyle(e).textDecorationLine.includes('underline') }))
  const strip = owns ? document.querySelector('#ui .strip.top') : document.querySelector('.lab-strip')
  const r = strip?.getBoundingClientRect()
  return { cur, owns, line: !!document.querySelector('.r15-line'), stripH: r ? Math.round(r.bottom) : 50, path: location.pathname }
})

async function arrive(p, place, reduced) {
  if (place.route) {
    await p.goto(`${BASE}${place.route}`, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(2200)
    if (place.scroll != null) { await p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), place.scroll); await sleep(1800) }
    return
  }
  await p.goto(`${BASE}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A?.mode === 'index', null, { timeout: 60000 })
  await sleep(reduced ? 1200 : 2600)
  if (place.id === 'about') await p.evaluate(() => document.querySelector('#ui [data-go="about"]').click())
  else if (place.id !== 'name') await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), place.id)
  await sleep(reduced ? 1600 : 3600)
  if (place.set === 'lf') { await p.evaluate(() => window.__lab.lfSet(0.5)); await sleep(reduced ? 900 : 2200) }
  if (place.set === 'cs') { await p.evaluate(() => window.__lab.csSet(2)); await sleep(reduced ? 900 : 2200) }
}

async function stills(b, view, reduced) {
  const tag = `${view.name}${reduced ? '-reduced' : ''}`
  const dir = path.join(OUT, tag)
  fs.mkdirSync(dir, { recursive: true })
  const ctx = await b.newContext({ ...view, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  console.log(`\n== ${tag}`)
  const cells = []
  for (const place of PLACES) {
    await arrive(p, place, reduced)
    const s = await read(p)
    const file = path.join(dir, `${place.id}.png`)
    await p.screenshot({ path: file })
    cells.push({ file, s })
    const want = place.section
    const said = s.cur.map((c) => c.go)
    ok(want == null ? said.length === 0 : said.length === 1 && said[0] === want, `${tag} ${place.id.padEnd(10)}: aria-current on ${want ?? 'nothing'}`, `said ${said.join(',') || 'nothing'} (${s.owns ? 'runtime strip' : 'Lab strip'})`)
    ok(s.cur.every((c) => c.mark), `${tag} ${place.id.padEnd(10)}: the current section is underlined`)
    ok(!s.line, `${tag} ${place.id.padEnd(10)}: no line (B is not the default)`)
  }
  ok(errs.length === 0, `${tag}: console clean`, errs.slice(0, 2).join(' | '))
  await ctx.close()
  // the sheet: the top strip of every place, at full resolution, one under the other
  const dpr = view.deviceScaleFactor, W = view.viewport.width * dpr, H = view.viewport.height * dpr
  const parts = []
  for (const c of cells) {
    const sh = Math.min(H, Math.round((c.s.stripH + 6) * dpr))
    parts.push({ buf: await sharp(c.file).extract({ left: 0, top: 0, width: W, height: sh }).toBuffer(), h: sh })
  }
  let y = 0
  const comp = parts.map((x) => { const c = { input: x.buf, left: 0, top: y }; y += x.h + 8; return c })
  const sheet = path.join(OUT, `strips-${tag}.png`)
  await sharp({ create: { width: W, height: y, channels: 3, background: '#404040' } }).composite(comp).png().toFile(sheet)
  console.log(`  sheet ${sheet}  (rows: ${PLACES.map((x) => x.id).join(', ')})`)
}

async function film(b, view) {
  const dir = path.join(OUT, 'films')
  fs.mkdirSync(dir, { recursive: true })
  const ctx = await b.newContext({ ...view, recordVideo: { dir, size: view.viewport } })
  const p = await ctx.newPage()
  const cdp = view.hasTouch ? await ctx.newCDPSession(p) : null
  await p.goto(`${BASE}/tr`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A?.mode === 'index', null, { timeout: 60000 }); await sleep(2500)
  const { width: w, height: h } = view.viewport
  const step = async () => {
    if (cdp) {
      const y0 = Math.round(h * 0.72), dy = -Math.round(h * 0.4)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: w / 2, y: y0 }] })
      for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: w / 2, y: Math.round(y0 + (dy * i) / 14) }] }); await sleep(16) }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } else { await p.mouse.move(w / 2, h / 2); for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 100); await sleep(45) } }
  }
  for (let i = 0; i < 40; i++) {
    await step(); await sleep(1500)
    const s = await p.evaluate(() => ({ path: location.pathname, end: scrollY >= document.documentElement.scrollHeight - innerHeight - 2 }))
    if (s.path.endsWith('/contact') && s.end) break
  }
  await sleep(1200)
  const v = p.video()
  await ctx.close()
  const to = path.join(dir, `walk-${view.name}.webm`)
  fs.rmSync(to, { force: true })
  await v.saveAs(to); await v.delete()
  console.log(`  film ${to}`)
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const view of VIEWS) { await stills(b, view, false); await stills(b, view, true) }
  if (FILMS) for (const view of VIEWS) await film(b, view)
  await b.close()
  console.log(`\nR15 INDICATOR A: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e.stack || e).slice(0, 900)); process.exit(1) })
