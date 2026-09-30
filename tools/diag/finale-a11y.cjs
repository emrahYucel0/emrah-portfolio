// F3 — THE FINALE FOR EVERY READER: assistive technology, the keyboard, reduced motion, both languages, the phones.
//  1. at p = 0 (the drawing not yet placed) the heading and the five facts are in the accessibility tree; axe at
//     p = 0 and p = 1, TR/EN, desktop and phone
//  2. the keyboard: Tab from the strip reaches the facts in reading order; focus on one settles the drawing first,
//     and its ring sits on its own fact; Enter on the location records a revision (announced)
//  3. the language control keeps the reader's place on the drawing (p = 1, and mid-drawing)
//  4. reduced motion: the drawing takes its four stations only
//  5. phones and a landscape phone (Chromium and WebKit): settled, nothing overflows, the strip is one row, every
//     fact lies on the sheet with a ≥ 44 px target; stills go to docs/contact-finale/f3/
// node finale-a11y.cjs <port>
const fs = require('fs')
const path = require('path')
const pw = require('playwright')
const port = process.argv[2] || '4500'
const BASE = `http://127.0.0.1:${port}`
const OUT = path.resolve(__dirname, '../../docs/contact-finale/f3')
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let fails = 0
const ok = (cond, label, extra = '') => { if (!cond) fails++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${extra ? ` — ${extra}` : ''}`) }
const IDS = ['email', 'phone', 'github', 'linkedin', 'location']
const plotP = () => {
  const F = window.__finale; if (!F) return null
  const raw = F.frame.rawProgress()
  return +(F.touchSheet() ? Math.min(1, (raw * (F.STAGES + F.ATT_STAGES)) / F.STAGES) : raw).toFixed(3)
}
const ready = (pg) => pg.waitForFunction(() => !!window.__finale, null, { timeout: 20000 }).catch(() => {})
const axe = async (pg) => {
  await pg.addScriptTag({ url: `${BASE}/axe.min.js` })
  return pg.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map((x) => `${x.id}(${x.impact}×${x.nodes.length})`))
}
// what assistive technology can reach: rendered, not visibility-hidden, not aria-hidden
const reachable = () => {
  const seen = (el) => { for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.getAttribute('aria-hidden') === 'true') return false } return true }
  const h1 = document.querySelector('main h1')
  return { h1: h1 && seen(h1) ? h1.textContent.trim() : null, facts: ['email', 'phone', 'github', 'linkedin', 'location'].filter((id) => { const c = document.querySelector(`[data-cell="${id}"]`); return c && seen(c) }) }
}

;(async () => {
  const chromium = await pw.chromium.launch({ channel: 'chrome' })
  const webkit = await pw.webkit.launch()
  const errs = []
  const watch = (pg) => { pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/ResizeObserver loop/.test(m.text())) errs.push(m.text()) }); return pg }

  console.log('== 1. the accessibility tree at every p; axe')
  for (const lang of ['tr', 'en']) {
    for (const v of [{ w: 1440, h: 900 }, { w: 390, h: 844, touch: true }]) {
      const ctx = await chromium.newContext({ viewport: { width: v.w, height: v.h }, isMobile: !!v.touch, hasTouch: !!v.touch, deviceScaleFactor: v.touch ? 2 : 1 })
      const p = watch(await ctx.newPage())
      await p.goto(`${BASE}/${lang}/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(1200)
      const r0 = await p.evaluate(reachable)
      ok(r0.h1 && r0.facts.length === 5, `${lang} ${v.w}: at p = 0 the heading and all five facts reach assistive technology`, `${r0.h1} · ${r0.facts.join(',')}`)
      const a0 = await axe(p)
      await p.evaluate(() => window.__finale && window.dispatchEvent(new Event('finale:arrive'))); await sleep(2200)
      const r1 = await p.evaluate(reachable)
      const a1 = await axe(p)
      ok(r1.facts.length === 5 && !a0.length && !a1.length, `${lang} ${v.w}: axe 0 at p = 0 and at p = 1`, `${a0.join(';') || '0'} / ${a1.join(';') || '0'}`)
      await ctx.close()
    }
  }

  console.log('\n== 2. the keyboard')
  {
    const ctx = await chromium.newContext({ viewport: { width: 1440, height: 900 } })
    const p = watch(await ctx.newPage())
    await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(1200)
    ok((await p.evaluate(plotP)) === 0, 'starts at p = 0')
    const order = []
    for (let i = 0; i < 16 && order.length < 6; i++) {
      await p.keyboard.press('Tab'); await sleep(i === 0 ? 50 : 30)
      const f = await p.evaluate(() => document.activeElement?.getAttribute('data-cell') || (document.activeElement?.hasAttribute('data-copy') ? 'copy' : null))
      if (f && !order.includes(f)) order.push(f)
      if (order.length === 1 && i < 15) await sleep(1200) // the first fact settles the drawing
    }
    ok(JSON.stringify(order) === JSON.stringify(['email', 'copy', 'phone', 'github', 'linkedin', 'location']), 'Tab reaches the facts in reading order', order.join(' → '))
    const pNow = await p.evaluate(plotP)
    ok(pNow >= 0.999, 'focus reaching a fact settled the drawing (p = 1)', `p ${pNow}`)
    await sleep(900)
    // the ring is on its own fact: the focused cell's box lies on the sheet and contains its plotted value
    const ring = await p.evaluate(() => {
      const el = document.activeElement, r = el.getBoundingClientRect(), id = el.getAttribute('data-cell')
      const b = window.__finale.plotter.valueBox(id)
      const onSheet = r.width > 40 && r.height > 20 && r.top >= 40 && r.bottom <= innerHeight - 30
      const holds = b && b.x0 >= r.left - 2 && b.x1 <= r.right + 2 && b.y0 >= r.top - 2 && b.y1 <= r.bottom + 2
      return { id, onSheet, holds, visible: getComputedStyle(el, ':focus-visible') && el.matches(':focus-visible') }
    })
    ok(ring.onSheet && ring.holds && ring.visible, 'the focus ring sits on its own fact', JSON.stringify(ring))
    await p.keyboard.press('Enter'); await sleep(900)
    const st = await p.evaluate(() => document.querySelector('.finale [role=status]').textContent)
    ok(/Revizyon 1/.test(st), 'Enter on the location records a revision, announced', st)
    await p.screenshot({ path: path.join(OUT, 'keyboard-location-focus.png') })
    await ctx.close()
  }

  console.log('\n== 3. the language control keeps the place')
  for (const where of ['end', 'mid']) {
    const ctx = await chromium.newContext({ viewport: { width: 1440, height: 900 } })
    const p = watch(await ctx.newPage())
    await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(1000)
    if (where === 'end') await p.evaluate(() => window.dispatchEvent(new Event('finale:arrive')))
    else await p.evaluate(() => { const t = document.querySelector('.finale .track'); scrollTo(0, t.offsetTop + 0.5 * (t.offsetHeight - innerHeight)) })
    await sleep(1200)
    const before = await p.evaluate(() => +window.__finale.frame.rawProgress().toFixed(3))
    await p.evaluate(() => document.querySelector('.lab-strip .lang').click())
    await p.waitForFunction(() => location.pathname === '/en/contact' && !!window.__finale, null, { timeout: 20000 }).catch(() => {})
    await sleep(1500)
    const after = await p.evaluate(() => ({ raw: +window.__finale.frame.rawProgress().toFixed(3), h1: document.querySelector('main h1').textContent.trim(), lang: document.documentElement.lang, foot: document.querySelector('.finale .foot').textContent.trim() }))
    ok(Math.abs(after.raw - before) < 0.01 && after.h1 === 'Contact' && /^en/.test(after.lang), `TR → EN at ${where}: the same place, in English`, `${before} → ${after.raw}, h1 ${after.h1}, lang ${after.lang}, foot "${after.foot}"`)
    if (where === 'end') await p.screenshot({ path: path.join(OUT, 'en-p1-desktop.png') })
    await p.goBack(); await p.waitForFunction(() => location.pathname === '/tr/contact' && !!window.__finale, null, { timeout: 20000 }).catch(() => {}); await sleep(1200)
    const back = await p.evaluate(() => +window.__finale.frame.rawProgress().toFixed(3))
    ok(Math.abs(back - before) < 0.01, `Back → Turkish, still at ${where}`, `${back}`)
    await ctx.close()
  }

  console.log('\n== 4. reduced motion: four stations')
  {
    const ctx = await chromium.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    const p = watch(await ctx.newPage())
    await p.goto(`${BASE}/tr/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(1000)
    const seen = new Set()
    for (let i = 0; i <= 20; i++) {
      await p.evaluate((f) => { const t = document.querySelector('.finale .track'); scrollTo(0, t.offsetTop + f * (t.offsetHeight - innerHeight)) }, i / 20)
      await sleep(120)
      seen.add(await p.evaluate(() => window.__finale.frame.progress().toFixed(3)))
    }
    ok(seen.size === 4, 'the drawing takes four stations only', [...seen].join(' · '))
    await p.evaluate(() => window.dispatchEvent(new Event('finale:arrive'))); await sleep(800)
    await p.screenshot({ path: path.join(OUT, 'reduced-p1-desktop.png') })
    await ctx.close()
  }

  console.log('\n== 5. phones')
  const PHONES = [[320, 568], [375, 667], [390, 844], [414, 896], [844, 390]]
  for (const [eng, br] of [['chromium', chromium], ['webkit', webkit]]) {
    for (const [w, h] of PHONES) {
      for (const lang of ['tr', 'en']) {
        const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: eng === 'chromium', hasTouch: true })
        const p = watch(await ctx.newPage())
        await p.goto(`${BASE}/${lang}/contact`, { waitUntil: 'networkidle' }); await ready(p); await sleep(1000)
        await p.evaluate(() => window.dispatchEvent(new Event('finale:arrive'))); await sleep(2600)
        const s = await p.evaluate((ids) => {
          const strip = document.querySelector('.lab-strip'), sb = strip.getBoundingClientRect()
          const mids = new Set([...strip.querySelectorAll('a')].map((e) => { const r = e.getBoundingClientRect(); return Math.round((r.top + r.bottom) / 6) }))
          const foot = document.querySelector('.finale .foot').getBoundingClientRect()
          const cells = ids.map((id) => {
            const c = document.querySelector(`[data-cell="${id}"]`), r = c.getBoundingClientRect(), v = c.querySelector('.val').getBoundingClientRect()
            return { id, in: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= sb.bottom - 1 && r.bottom <= foot.top + 1, target: Math.round(Math.min(v.height, r.height)) }
          })
          return { overflowX: document.documentElement.scrollWidth > innerWidth + 1, rows: mids.size, cells }
        }, IDS)
        const bad = s.cells.filter((c) => !c.in || c.target < 44)
        const tag = `${eng} ${lang} ${w}×${h}`
        ok(!s.overflowX && s.rows === 1 && !bad.length, `${tag}: settled — no overflow, strip one row, every fact on the sheet, targets ≥ 44 px`, bad.length ? JSON.stringify(bad) : `targets ${s.cells.map((c) => c.target).join('/')}`)
        if (eng === 'webkit' && lang === 'tr') await p.screenshot({ path: path.join(OUT, `phone-${w}x${h}-p1.png`) })
        await ctx.close()
      }
    }
  }

  await chromium.close(); await webkit.close()
  console.log(`\n  console errors ${errs.length} ${JSON.stringify([...new Set(errs)].slice(0, 3))}`)
  if (errs.length) fails++
  console.log(`\nFINALE A11Y: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 800)); process.exit(1) })
