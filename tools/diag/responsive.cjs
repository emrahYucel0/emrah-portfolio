// THE FINALE AT EVERY SIZE — phones to 21:9, Chromium and WebKit (pre-F4 responsive round).
// Per size: the arrival at p = 0 (breath + the words), mid-drawing, p = 1 at rest, one field attended; then
//  - no overflow, the strip one row, the foot's words inside and apart;
//  - every value inside its own cell with clearance, the copy control clear of the email's lettering;
//  - the email soaks (or the reason it does not);
//  - proportions: the email's cap height against the sheet;
//  - the Lab → finale seam: the bench's last frame = the finale's first (sheet only).
// A p = 1 still per size is collected into docs/contact-finale/responsive/contact-sheet.png; sizes with a finding get
// their own stills. node responsive.cjs <port> [chromium|webkit]
const fs = require('fs')
const path = require('path')
const pw = require('playwright')
const sharp = require('sharp')
const [port = '4500', only] = process.argv.slice(2)
const BASE = `http://127.0.0.1:${port}`
const OUT = path.resolve(__dirname, '../../docs/contact-finale/responsive')
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const SIZES = [
  ['phone', 360, 780, true], ['phone', 430, 932, true],
  ['tablet', 768, 1024, true], ['tablet', 1024, 768, true], ['tablet', 820, 1180, true], ['tablet', 1180, 820, true],
  ['tablet', 1024, 1366, true], ['tablet', 1366, 1024, true],
  ['laptop', 1280, 800], ['laptop', 1366, 768], ['laptop', 1512, 982], ['laptop', 1728, 1117],
  ['desktop', 1920, 1080], ['desktop', 2560, 1440], ['wide', 3440, 1440],
]
const IDS = ['email', 'phone', 'github', 'linkedin', 'location']
const findings = []
let fails = 0
const ok = (cond, tag, label, extra = '') => { if (!cond) { fails++; findings.push(`${tag}: ${label}${extra ? ` — ${extra}` : ''}`) } return cond }
const setF = (f) => { const t = document.querySelector('.finale .track'); scrollTo(0, t.offsetTop + f * (t.offsetHeight - innerHeight)) }

const measure = (ids) => {
  const F = window.__finale, W = innerWidth, H = innerHeight
  const strip = document.querySelector('.lab-strip'), sb = strip.getBoundingClientRect()
  const rows = new Set([...strip.querySelectorAll('a')].map((e) => { const r = e.getBoundingClientRect(); return Math.round((r.top + r.bottom) / 6) })).size
  const stripClip = strip.scrollWidth > strip.clientWidth + 1
  const foot = document.querySelector('.finale .foot'), fb = foot.getBoundingClientRect()
  const words = [...foot.children].filter((e) => getComputedStyle(e).display !== 'none' && +getComputedStyle(e).opacity > 0.5 && e.textContent.trim())
    .map((e) => { const r = e.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(e).fontSize) * 1.6; return { c: e.className, l: r.left, r: r.right, clipped: e.scrollWidth > e.clientWidth + 1, wrapped: r.height > lh } })
  const footOverlap = words.some((a, i) => words.some((b, j) => j > i && a.l < b.r && b.l < a.r)) || words.some((w) => w.wrapped)
  const footOut = words.some((w) => w.l < -0.5 || w.r > W + 0.5)
  const cells = ids.map((id) => {
    const c = document.querySelector(`[data-cell="${id}"]`).getBoundingClientRect()
    // the lettering itself: valueBox() is the TOUCH box (it pads for the soaked face's spread even when the value
    // is pen-only), so the pad comes off, and a soaked value gets back the spread its heavy face really has
    const vb = F.plotter.valueBox(id), cap = F.plotter.capOf(id), pad = 4 + cap * 0.18
    // measured: at 3440 the attended GitHub's heavy G stands ~58 px inside its channel where 0.08 cap predicted a touch;
    // the face sits in its advance cells with its own side bearing, so its spread past the pen line is small
    const spread = F.soakDrawn()[id] ? 1 + cap * 0.03 : 1
    // valueBox() also reserves a descender (0.34 cap) under the LAST line whatever it holds: '.com' and 'İstanbul,
    // Türkiye's last line… only the letters that have one get it back
    const vr = F.plotter.valueRender(id)
    const lastLine = vr ? vr.lines[vr.lines.length - 1].cells.map((c) => c.ch).join('') : ''
    const desc = /[gjpqyç,ş]/.test(lastLine) ? 0 : cap * 0.34
    const b = vb && { x0: vb.x0 + pad - spread, x1: vb.x1 - pad + spread, y0: vb.y0 + pad - spread, y1: vb.y1 - pad * 0.6 - desc + spread }
    const sides = b ? { left: b.x0 - c.left, right: c.right - b.x1, top: b.y0 - c.top, bottom: c.bottom - b.y1 } : null
    const clear = sides ? Math.min(...Object.values(sides)) : null
    const side = sides ? Object.keys(sides).find((k) => sides[k] === clear) : ''
    return { id, side, cell: { x: c.left, y: c.top, w: c.width, h: c.height }, box: b, clear: clear == null ? null : +clear.toFixed(1), cap: +F.plotter.capOf(id).toFixed(1), onSheet: c.top >= sb.bottom - 1 && c.bottom <= fb.top + 1 && c.left >= -1 && c.right <= W + 1 }
  })
  const eb = F.plotter.valueBox('email'), cp = document.querySelector('[data-copy]').getBoundingClientRect()
  const tucked = document.querySelector('[data-copy]').classList.contains('is-tucked')
  const copyHits = eb && !tucked && cp.width > 0 && cp.left < eb.x1 && eb.x0 < cp.right && cp.top < eb.y1 && eb.y0 < cp.bottom
  return {
    W, H, overflowX: document.documentElement.scrollWidth > W + 1, rows, stripClip, footOverlap, footOut, words: words.map((w) => w.c + (w.clipped ? '(…)' : '') + (w.wrapped ? '(2 lines)' : '')),
    cells, copyHits: !!copyHits, tucked, soaked: !!F.soakDrawn().email, emailCapPct: +((F.plotter.capOf('email') / H) * 100).toFixed(1),
    attention: F.touchSheet() ? 'scroll' : 'cursor',
  }
}

async function seam(br, w, h, touch) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch })
  const p = await ctx.newPage()
  await p.goto(`${BASE}/tr/lab`, { waitUntil: 'networkidle' }); await sleep(1800)
  const bare = p.waitForFunction(() => getComputedStyle(document.querySelector('.lab-stage')).getPropertyValue('--veil').trim() === '1', null, { timeout: 6000, polling: 'raf' }).then(() => p.screenshot()).catch(() => null)
  await p.mouse.move(w / 2, h / 2)
  for (const d of [30, 60, 60, 40]) { await p.mouse.wheel(0, d); await sleep(16) }
  const a = await bare
  await p.waitForFunction(() => location.pathname === '/tr/contact' && !!window.__finale, null, { timeout: 20000 }).catch(() => {})
  const b = await p.screenshot()
  await ctx.close()
  if (!a) return null
  const top = 60, bot = h - 60
  const [ia, ib] = await Promise.all([a, b].map((x) => sharp(x).extract({ left: 0, top, width: w, height: bot - top }).greyscale().raw().toBuffer()))
  let over = 0
  for (let i = 0; i < ia.length; i++) if (Math.abs(ia[i] - ib[i]) > 8) over++
  return +((over / ia.length) * 100).toFixed(3)
}

;(async () => {
  const engines = only ? [only] : ['chromium', 'webkit']
  const tiles = []
  const table = []
  for (const eng of engines) {
    const br = eng === 'chromium' ? await pw.chromium.launch({ channel: 'chrome' }) : await pw.webkit.launch()
    for (const [kind, w, h, touch] of SIZES) {
      const tag = `${eng} ${w}×${h}`
      const dpr = w >= 1920 ? 1 : 2
      const opts = { viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: !!touch }
      if (touch && eng === 'chromium') opts.isMobile = true
      const ctx = await br.newContext(opts)
      // the once-per-session attention guide is its own check (beckon.cjs): here it would move the still
      await ctx.addInitScript(() => { try { sessionStorage.setItem('cue:finale-guide', '1') } catch {} })
      const p = await ctx.newPage()
      const errs = []
      p.on('pageerror', (e) => errs.push(e.message))
      p.on('console', (m) => { if (m.type() === 'error' && !/ResizeObserver/.test(m.text())) errs.push(m.text()) })
      await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle', timeout: 60000 })
      await p.waitForFunction(() => !!window.__finale, null, { timeout: 20000 }).catch(() => {})
      // p = 0: the words and the breath, once the arrival has been still for the hint system's 2.5 s (R3)
      await sleep(3200)
      const arr = await p.evaluate(() => ({ hint: document.querySelector('.finale .foot .hint').classList.contains('on'), y: scrollY }))
      const s0 = await p.screenshot()
      await sleep(700)
      const s1 = await p.screenshot()
      const breath = !s0.equals(s1)
      ok(arr.hint && breath && arr.y === 0, tag, 'arrival: the words and the breath at p = 0', `hint ${arr.hint}, breath ${breath}`)
      // mid-drawing (the email being written/soaking) and p = 1 at rest
      await p.evaluate(setF, 0.5); await sleep(1400)
      const mid = await p.screenshot()
      await p.evaluate(() => window.dispatchEvent(new Event('finale:arrive'))); await sleep(2600)
      let m = await p.evaluate(measure, IDS)
      const still = await p.screenshot()
      const tight = m.cells.filter((c) => c.box && c.clear < 2)
      const off = m.cells.filter((c) => !c.onSheet)
      ok(!m.overflowX && m.rows === 1 && !m.stripClip, tag, 'no overflow; the strip one row, unclipped', `rows ${m.rows}${m.stripClip ? ', clipped' : ''}`)
      ok(!m.footOverlap && !m.footOut, tag, "the foot's words inside and apart", m.words.join(' | '))
      ok(!tight.length && !off.length, tag, 'every value inside its cell with clearance, every cell on the sheet', [...tight.map((c) => `${c.id} clear ${c.clear}`), ...off.map((c) => `${c.id} off-sheet`)].join(', '))
      ok(!m.copyHits, tag, 'the copy control clear of the email lettering')
      ok(m.soaked, tag, 'the email soaks', `email cap ${m.cells[0].cap}px`)
      // one field attended: by the cursor (hover) or, on an all-coarse device, by the scroll's attention stretch
      if (m.attention === 'cursor') {
        const g = m.cells.find((c) => c.id === 'github').cell
        // straight onto it: a cursor dragged across the email on its way makes the email grow under it, and then it
        // IS on the email (Weight working, not a fault) — the check is about GitHub attended
        await p.mouse.move(g.x + g.w / 2, g.y + g.h / 2); await sleep(1800)
      } else {
        await p.evaluate(() => { const F = window.__finale, t = document.querySelector('.finale .track'); const f = (F.STAGES + 0.5 * F.ATT_STAGES) / (F.STAGES + F.ATT_STAGES); scrollTo(0, t.offsetTop + f * (t.offsetHeight - innerHeight)) }); await sleep(1800)
      }
      const ma = await p.evaluate(measure, IDS)
      // the target, not the spring's progress: WebKit's headless frames reach it later, the layout is checked either way
      const att = await p.evaluate(() => window.__finale.partition.attOf('github').attT)
      const attShot = await p.screenshot()
      const tightA = ma.cells.filter((c) => c.box && c.clear < 2)
      ok(att > 0.8 && !tightA.length && !ma.copyHits && !ma.overflowX, tag, `GitHub attended (${ma.attention}): still nothing touches`, `att ${att.toFixed(2)} ${tightA.map((c) => `${c.id} ${c.side} clear ${c.clear}`).join(', ')}${ma.copyHits ? ' copy control on the email' : ''}${ma.tucked ? ' (copy tucked)' : ''}${ma.overflowX ? ' overflow' : ''}`)
      ok(!errs.length, tag, 'no console errors', errs.slice(0, 2).join(' | '))
      const bad = findings.some((f) => f.startsWith(tag))
      if (bad) {
        const dir = path.join(OUT, 'findings'); fs.mkdirSync(dir, { recursive: true })
        const base = `${eng}-${w}x${h}`
        fs.writeFileSync(path.join(dir, `${base}-p0.png`), s0); fs.writeFileSync(path.join(dir, `${base}-mid.png`), mid)
        fs.writeFileSync(path.join(dir, `${base}-p1.png`), still); fs.writeFileSync(path.join(dir, `${base}-attended.png`), attShot)
      }
      if (eng === 'chromium') {
        tiles.push({ label: `${w}×${h}`, kind, png: still })
        const dir = path.join(OUT, 'p1'); fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(path.join(dir, `${w}x${h}.png`), still)
      }
      await ctx.close()
      // the Lab → finale seam at this size (sheet only, DPR 1)
      const sd = await seam(br, w, h, !!touch)
      ok(sd != null && sd < 0.5, tag, 'Lab → finale seam: the bench\'s last frame = the finale\'s first', `${sd}% of pixels differ`)
      table.push({ eng, size: `${w}×${h}`, attention: m.attention, soaked: m.soaked, emailCap: m.cells[0].cap, emailCapPct: m.emailCapPct, minClear: Math.min(...m.cells.map((c) => c.clear ?? 99)), seam: sd })
      console.log(`  ${bad ? 'FIND' : 'ok  '} ${tag.padEnd(22)} ${m.attention.padEnd(6)} email cap ${String(m.cells[0].cap).padStart(6)}px (${m.emailCapPct}% of H) soak ${m.soaked ? 'yes' : 'NO'} · min clear ${Math.min(...m.cells.map((c) => c.clear ?? 99))} · seam ${sd}%`)
    }
    await br.close()
  }
  fs.writeFileSync(path.join(OUT, only ? `responsive-${only}.json` : 'responsive.json'), JSON.stringify({ table, findings }, null, 2))
  // the contact sheet: one p = 1 still per size, scaled to a common tile height, 5 per row
  if (tiles.length) {
    const TH = 300, GAP = 24, HEAD = 48, PER = 5
    const scaled = await Promise.all(tiles.map(async (t) => {
      const img = sharp(t.png); const meta = await img.metadata()
      const w = Math.round((meta.width / meta.height) * TH)
      return { label: t.label, kind: t.kind, w, buf: await sharp(t.png).resize({ height: TH }).png().toBuffer() }
    }))
    const rows = []; for (let i = 0; i < scaled.length; i += PER) rows.push(scaled.slice(i, i + PER))
    const W = Math.max(...rows.map((r) => r.reduce((a, t) => a + t.w + GAP, GAP)))
    const H = rows.length * (TH + HEAD + GAP) + GAP
    const comp = []; const svg = []
    rows.forEach((r, ri) => {
      let x = GAP; const y = GAP + ri * (TH + HEAD + GAP)
      for (const t of r) {
        comp.push({ input: t.buf, left: x, top: y + HEAD })
        svg.push(`<text x="${x}" y="${y + 18}" font-family="monospace" font-size="16" fill="#111">${t.label}</text><text x="${x}" y="${y + 38}" font-family="monospace" font-size="13" fill="#666">${t.kind}</text>`)
        x += t.w + GAP
      }
    })
    const labels = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join('')}</svg>`)
    await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite([...comp, { input: labels, left: 0, top: 0 }]).png().toFile(path.join(OUT, 'contact-sheet.png'))
  }
  console.log(`\n  findings ${findings.length}`)
  for (const f of findings) console.log(`   - ${f}`)
  console.log(`\nRESPONSIVE: ${fails === 0 ? 'PASS' : `FINDINGS (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 800)); process.exit(1) })
