// HERO INTERACTION — scroll to Creative, a visible control to About, and no hold anywhere in it.
// node hero.cjs <port> [locale] [reduced]
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, loc = 'tr', motion = 'normal'] = process.argv.slice(2)
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
const WORD = { tr: 'HAKKIMDA', en: 'ABOUT' }[loc]
const momentum = async (p, dir) => { for (const d of [6, 14, 26, 38, 44, 40, 34, 27, 21, 16, 12, 9, 7, 5, 4, 3, 2, 1]) { await p.mouse.wheel(0, d * dir); await sleep(16) } }

;(async () => {
  const b = await pw.webkit.launch()
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  const home = async () => {
    await p.goto(`http://127.0.0.1:${port}/${loc}/`, { waitUntil: 'networkidle', timeout: 60000 })
    await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
    await sleep(3200)
  }
  const st = () => p.evaluate(() => ({ mode: window.__lab.A.mode, base: window.__lab.A.base, p: +window.__lab.A.p.toFixed(2), about: window.__lab.A.aboutOpen, detail: window.__lab.A.aboutDetail, press: window.__lab.A.press ? +window.__lab.A.press.L.toFixed(2) : null, path: location.pathname }))
  const ctl = () => p.evaluate(() => {
    const el = document.querySelector('.hero-about')
    if (!el) return null
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
    const layer = el.closest('.layer')
    return { text: el.textContent.trim(), name: el.getAttribute('aria-label') || el.textContent.trim(), tag: el.tagName, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), on: layer.classList.contains('on'), inert: !!layer.inert, opacity: +getComputedStyle(layer).opacity, underline: cs.textDecorationLine }
  })

  console.log(`== HERO ${loc.toUpperCase()} ${motion} ==`)

  // ─── the control itself ───
  await home()
  let c = await ctl()
  ok(!!c, 'the hero carries an About control')
  ok(c && c.text.toUpperCase().replace('I', 'I') === WORD.replace('I', 'I').toUpperCase(), `its word is ${WORD}`, c && c.text)
  ok(c && c.on && c.opacity > 0.9 && !c.inert, 'it is visible and reachable on the hero', c && `on=${c.on} opacity=${c.opacity} inert=${c.inert}`)
  ok(c && c.w >= 44 && c.h >= 44, 'its target is at least 44 × 44', c && `${c.w}x${c.h}`)
  ok(c && c.tag === 'BUTTON', 'it is a real control', c && c.tag)
  ok(c && /underline/.test(c.underline), 'it is marked as interactive, not plain text', c && c.underline)

  // it must not overlap the hero's artwork: the fold is the one band with no ink in it
  const clear = await p.evaluate(() => {
    const r = document.querySelector('.hero-about').getBoundingClientRect()
    const L = window.__lab, nm = L.IDX()[0], u = L.V.u
    // the word's own right edge: the target is wider than the word, and the overhang is cancelled by a negative margin
    const pr = parseFloat(getComputedStyle(document.querySelector('.hero-about')).paddingRight)
    return { top: Math.round(r.top / u), bottom: Math.round(r.bottom / u), foldTop: Math.round(nm.layout.top + nm.layout.cap), foldBottom: Math.round(nm.layout.top + nm.layout.cap + nm.layout.gap), right: Math.round(r.right / u - pr), margin: Math.round(L.V.W - L.V.pad) }
  })
  ok(clear.top >= clear.foldTop - 14 && clear.bottom <= clear.foldBottom + 14, 'its target stays within the fold between the names', JSON.stringify(clear))
  ok(Math.abs(clear.right - clear.margin) <= 2, 'and ends on the page margin, the axis the strips are set to', `${clear.right} vs ${clear.margin}`)

  // ─── one gesture from the hero goes to Creative ───
  await p.mouse.wheel(0, 150); await sleep(2600)
  let s = await st()
  ok(s.base === 1 && s.mode === 'index', 'one wheel notch from the hero → Creative', JSON.stringify(s))

  await home()
  await momentum(p, 1); await sleep(3600)
  s = await st()
  ok(s.base === 1, 'a whole trackpad momentum burst still moves exactly one stop', `base ${s.base}`)

  await home()
  await p.keyboard.press('ArrowDown'); await sleep(2600)
  s = await st()
  ok(s.base === 1, 'ArrowDown from the hero → Creative', `base ${s.base}`)

  // ─── the control opens About ───
  await home()
  await p.click('.hero-about'); await sleep(3200)
  s = await st()
  ok(s.about && s.base === 0, 'clicking the control opens About and does not travel', JSON.stringify(s))
  ok(await p.evaluate(() => { const t = document.querySelector('.layer.about'); return !!t && t.classList.contains('on') }), 'the About text arrives with it')
  await p.keyboard.press('Escape'); await sleep(2200)
  s = await st()
  ok(!s.about, 'Escape closes it again', JSON.stringify(s))

  // ─── keyboard ───
  await home()
  const reached = await p.evaluate(async () => {
    const el = document.querySelector('.hero-about')
    el.focus()
    return document.activeElement === el
  })
  ok(reached, 'the control takes keyboard focus')
  const ring = await p.evaluate(() => { const el = document.querySelector('.hero-about'); el.focus(); return getComputedStyle(el).outlineWidth })
  ok(parseFloat(ring) >= 1, 'focus is visible', ring)
  await p.keyboard.press('Enter'); await sleep(3200)
  s = await st()
  ok(s.about, 'Enter on the control opens About', JSON.stringify(s))

  // ─── a hold on the hero is decorative: it never opens About ───
  await home()
  await p.mouse.move(400, 384); await p.mouse.down(); await sleep(2600)
  const held = await st()
  await p.mouse.up(); await sleep(1200)
  const after = await st()
  ok(!held.about && !after.about, 'a two-and-a-half second hold on the hero does not open About', `during=${held.about} after=${after.about}`)
  ok(held.press === null || held.press <= 0.55, 'the hold loads the material and stops there', `L=${held.press}`)

  // ─── the About route, and Back ───
  await home()
  await p.click('.hero-about'); await sleep(3400)
  await p.click('.layer.about .more'); await sleep(4200)
  s = await st()
  ok(new RegExp(`/${loc}/about`).test(s.path) && s.detail, 'the room continues to the About route', JSON.stringify(s))
  const title = await p.title()
  await p.goBack(); await sleep(4200)
  s = await st()
  ok(new RegExp(`^/${loc}/?$`).test(s.path), 'Back returns to the portfolio', s.path)
  ok(s.mode === 'index' && s.base === 0 && !s.detail, 'it comes back to the hero, with no opening replayed', JSON.stringify(s))
  // the long About collapses back into the room it grew from — the existing return — and the control comes back
  // with the hero itself, once the room is closed
  ok(s.about, 'Back lands in the About room, as it did before', `about=${s.about}`)
  await p.keyboard.press('Escape'); await sleep(2400)
  c = await ctl()
  ok(c && c.on && !c.inert, 'and closing the room gives the control back', c && `on=${c.on}`)
  await p.goForward(); await sleep(4200)
  s = await st()
  ok(new RegExp(`/${loc}/about`).test(s.path) && s.detail, 'Forward returns to About', JSON.stringify(s))

  ok(errs.length === 0, 'no page errors', errs.join(' | ').slice(0, 200))
  ok((await p.evaluate(() => document.body.innerText)).indexOf('undefined') === -1, 'no undefined text anywhere on the hero')

  await b.close()
  console.log(`HERO ${loc}/${motion}: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
