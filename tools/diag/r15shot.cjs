// R15 PHASE 2 — THE TWO INDICATORS, SEEN AND ASKED (app/components/R15Progress.client.vue, ?r15=a|b|ab).
//
//   node r15shot.cjs <port> [--out=out/r15/indicator] [--films] [--only=desktop|phone]
//
// For each variant — none (the site as it is), a, b, ab — on a desktop (1440x900) and a phone (390x844 @3, touch),
// at every place of the walk: a still of the page, and the two strips cut out at full resolution, laid side by side
// per place in sheets (strips-<viewport>.png, one row per place, one column per variant). Reduced motion: the same
// for `ab` at the places where it cuts. --films records the whole walk per variant on both viewports.
//
// And it ASSERTS what the strip says: the section's control carries aria-current at each place (the opening none,
// Work → İŞLER, Cross Section and the bench → LAB, the About room → HAKKIMDA, the finale → İLETİŞİM), the mark is
// drawn only where the variant has A, the line is there only where it has B, and with no key there is no attribute
// on the runtime's strip and no line at all. Browser page captures only, never the desktop (no-desktop-capture).
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs'), path = require('path')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
const argOf = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const OUT = argOf('out', 'out/r15/indicator'), FILMS = process.argv.includes('--films'), ONLY = argOf('only', '')
const BASE = `http://127.0.0.1:${port}`
const VARIANTS = ['none', 'a', 'b', 'ab']
const VIEWS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
].filter((v) => !ONLY || v.name === ONLY)
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }

// what the strip should say at each place (the runtime's data-go, or the Lab strip's link text)
const PLACES = [
  { id: 'name', section: null },
  { id: 'creative', section: null },
  { id: 'system', section: null },
  { id: 'linefield', section: null, set: (L) => L.lfSet(0.5) },
  { id: 'work', section: 'work' },
  { id: 'cross', section: 'lab', set: (L) => L.csSet(2) },
  { id: 'about', section: 'about' },
  { id: 'bench', section: 'lab', route: '/tr/lab' },
  { id: 'finale-mid', section: 'rest', route: '/tr/contact', scroll: 0.5 },
  { id: 'finale-end', section: 'rest', route: '/tr/contact', scroll: 1 },
]

const read = (p) => p.evaluate(() => {
  const strip = [...document.querySelectorAll('#ui .strip.top .nav [data-go]')]
  const lab = [...document.querySelectorAll('.lab-strip nav a')]
  const cur = strip.filter((b) => b.hasAttribute('aria-current')).map((b) => ({ go: b.dataset.go, v: b.getAttribute('aria-current'), mark: b.classList.contains('r15-here') }))
  const labCur = lab.filter((a) => a.hasAttribute('aria-current')).map((a) => ({ go: /lab$/.test(a.getAttribute('href') || '') ? 'lab' : /contact$/.test(a.getAttribute('href') || '') ? 'rest' : '?', v: a.getAttribute('aria-current'), mark: a.classList.contains('r15-here') }))
  const line = document.querySelector('.r15-line')
  const fill = document.querySelector('.r15-fill')?.style.transform || ''
  const strip0 = document.querySelector('#ui .strip.top') || document.querySelector('.lab-strip')
  const r = strip0?.getBoundingClientRect()
  return { cur: [...cur, ...labCur], line: !!line && line.style.visibility !== 'hidden', fill: +(fill.match(/[\d.]+/) || [0])[0], stripH: r ? Math.round(r.bottom) : 50, path: location.pathname }
})

async function arrive(p, place, variant, reduced) {
  const q = variant === 'none' ? '?r15=off' : `?r15=${variant}`
  if (place.route) {
    await p.goto(`${BASE}${place.route}${q}`, { waitUntil: 'networkidle', timeout: 60000 })
    await sleep(2200)
    if (place.scroll != null) { await p.evaluate((f) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * f), place.scroll); await sleep(1800) }
    return
  }
  await p.goto(`${BASE}/tr${q}`, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForFunction(() => window.__lab?.A?.mode === 'index', null, { timeout: 60000 })
  await sleep(reduced ? 1200 : 2600)
  if (place.id === 'about') await p.evaluate(() => document.querySelector('#ui [data-go="about"]').click())
  else if (place.id !== 'name') await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), place.id)
  await sleep(reduced ? 1600 : 3600)
  if (place.set) { await p.evaluate(`(${place.set.toString()})(window.__lab)`); await sleep(reduced ? 900 : 2200) }
}

async function stills(b, view, reduced) {
  const tag = `${view.name}${reduced ? '-reduced' : ''}`
  const dir = path.join(OUT, tag)
  fs.mkdirSync(dir, { recursive: true })
  const places = reduced ? PLACES.filter((x) => ['name', 'linefield', 'work', 'cross', 'bench', 'finale-mid'].includes(x.id)) : PLACES
  const variants = reduced ? ['none', 'ab'] : VARIANTS
  const cells = {}
  console.log(`\n== ${tag}`)
  for (const variant of variants) {
    const ctx = await b.newContext({ ...view, reducedMotion: reduced ? 'reduce' : 'no-preference' })
    const p = await ctx.newPage()
    const errs = []
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
    for (const place of places) {
      await arrive(p, place, variant, reduced)
      const s = await read(p)
      const file = path.join(dir, `${place.id}-${variant}.png`)
      await p.screenshot({ path: file })
      cells[`${place.id}|${variant}`] = { file, s }
      // what the strip says
      const want = place.section
      const said = s.cur.map((c) => c.go)
      const hasA = variant.includes('a'), hasB = variant.includes('b')
      if (variant === 'none') ok(!s.cur.some((c) => c.v === 'location') && !s.line, `${tag} ${place.id.padEnd(10)} none: no attribute of ours, no line`, JSON.stringify(s.cur))
      else {
        ok(want == null ? said.length === 0 : said.length === 1 && said[0] === want, `${tag} ${place.id.padEnd(10)} ${variant.padEnd(2)}: aria-current on ${want ?? 'nothing'}`, `said ${said.join(',') || 'nothing'}`)
        ok(s.cur.every((c) => c.mark === hasA), `${tag} ${place.id.padEnd(10)} ${variant.padEnd(2)}: the mark ${hasA ? 'drawn' : 'not drawn'}`)
        ok(s.line === hasB, `${tag} ${place.id.padEnd(10)} ${variant.padEnd(2)}: the line ${hasB ? `there, at ${s.fill.toFixed(3)}` : 'absent'}`)
      }
    }
    ok(errs.length === 0, `${tag} ${variant}: console clean`, errs.slice(0, 2).join(' | '))
    await ctx.close()
  }
  // the sheets: per place, the two strips of every variant side by side, at full resolution
  const dpr = view.deviceScaleFactor, W = view.viewport.width * dpr, H = view.viewport.height * dpr
  const rows = []
  for (const place of places) {
    const parts = []
    for (const variant of variants) {
      const c = cells[`${place.id}|${variant}`]
      const sh = Math.round((c.s.stripH + 6) * dpr), bh = Math.round(64 * dpr)
      const top = await sharp(c.file).extract({ left: 0, top: 0, width: W, height: Math.min(H, sh) }).toBuffer()
      const bot = await sharp(c.file).extract({ left: 0, top: H - bh, width: W, height: bh }).toBuffer()
      parts.push({ top, bot, sh, bh })
    }
    const cellH = parts[0].sh + parts[0].bh + 8 * dpr
    const row = sharp({ create: { width: W * variants.length + 12 * (variants.length - 1), height: cellH, channels: 3, background: '#7a7a7a' } })
    row.composite(parts.flatMap((x, i) => [{ input: x.top, left: i * (W + 12), top: 0 }, { input: x.bot, left: i * (W + 12), top: x.sh + 8 * dpr }]))
    rows.push({ buf: await row.png().toBuffer(), h: cellH })
  }
  const sheetW = W * variants.length + 12 * (variants.length - 1)
  const sheetH = rows.reduce((a, r) => a + r.h + 12, 0)
  let y = 0
  const comp = rows.map((r) => { const c = { input: r.buf, left: 0, top: y }; y += r.h + 12; return c })
  const sheet = path.join(OUT, `strips-${tag}.png`)
  await sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: '#404040' } }).composite(comp).png().toFile(sheet)
  console.log(`  sheet ${sheet}  (rows: ${places.map((x) => x.id).join(', ')}; columns: ${variants.join(', ')})`)
}

async function film(b, view, variant) {
  const dir = path.join(OUT, 'films')
  fs.mkdirSync(dir, { recursive: true })
  const ctx = await b.newContext({ ...view, recordVideo: { dir, size: view.viewport } })
  const p = await ctx.newPage()
  const cdp = view.hasTouch ? await ctx.newCDPSession(p) : null
  await p.goto(`${BASE}/tr?r15=${variant}`, { waitUntil: 'networkidle', timeout: 60000 })
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
  // the walk, at an easy pace: until the finale's end, or 40 gestures
  for (let i = 0; i < 40; i++) {
    await step(); await sleep(1500)
    const s = await p.evaluate(() => ({ path: location.pathname, end: scrollY >= document.documentElement.scrollHeight - innerHeight - 2 }))
    if (/\/contact$/.test(s.path) && s.end) break
  }
  await sleep(1200)
  const v = p.video()
  await ctx.close()
  const to = path.join(dir, `walk-${view.name}-${variant}.webm`)
  fs.rmSync(to, { force: true })
  await v.saveAs(to); await v.delete()
  console.log(`  film ${to}`)
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  for (const view of VIEWS) { await stills(b, view, false); await stills(b, view, true) }
  if (FILMS) for (const view of VIEWS) for (const variant of ['a', 'b', 'ab']) await film(b, view, variant)
  await b.close()
  console.log(`\nR15 INDICATORS: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e.stack || e).slice(0, 900)); process.exit(1) })
