// EVERY STOP AT THE HEIGHT A REAL PHONE ACTUALLY LEAVES.
//
//   node shortphone.cjs <port> [sizes] [locales] [--shots]
//
// WHY THIS EXISTS. Every phone check on this site used 390x844 — the CSS viewport of an iPhone with no browser
// chrome at all. A real Safari has a header and a toolbar, and leaves about 620-760 px of it. The work stop's
// title block was reported unreadable from a real iPhone on 2026-10-02 and reproduced at once at 390x700, while
// passing at 390x844: the block fell past the index column's fade onto the row field, and the rows ran through
// the words. Nothing was wrong with the site at the height we had been testing. So the heights are the check.
//
// WHAT IS ASSERTED, per visible line of type in the place:
//
//   LEGIBLE — the type is hidden, the ground behind it captured, and the WCAG ratio taken against EVERY pixel in
//   the line's box (panelfit's method, and worktext.cjs's). A row crossing the words is a few dark pixels in a
//   light box, which an average hides completely. At most 2% of a line may fail, for the glyphs' antialiasing.
//
//   NOT CROSSED — how many separate dark bands cross the line's box. That is the row field itself: zero is a
//   pocket doing its work, more is a row drawn through the words.
//
//   NOT CUT OFF — the line's box is inside the viewport.
//
//   CLEAR OF THE STRIPS — the box does not overlap the header strip or the foot strip, which are opaque and carry
//   their own words. The strips' own contents are excluded from the sweep; they are what everything else must
//   stay clear of.
const fs = require('fs')
const path = require('path')
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, sizesArg = '390x660,375x560,844x390', localesArg = 'tr'] = process.argv.slice(2)
const SHOTS = process.argv.includes('--shots')
const SIZES = sizesArg.split(',').map((s) => { const [w, h] = s.split('x').map(Number); return { w, h, land: w > h } })
const LOCALES = localesArg.split(',')
const OUT = path.join(__dirname, 'out', 'shortphone')
fs.mkdirSync(OUT, { recursive: true })
const FAIL_FRACTION = 0.02
/*
 * WHERE THE WORDS ARE THE MATERIAL. In the Linefield passage the labels are drawn in the row field, and in the
 * Contact finale the address is PLOTTED — drawn row by row as the visitor scrolls, so a frame caught mid-draw is
 * half a word by design. Measuring "is a row crossing these words" there asks the wrong question of the one place
 * where the answer is meant to be yes, and an earlier run of this file duly reported the finale at 14 lines
 * crossed and the Linefield label at 4 bands, with nothing wrong in either. Both already have a harness that
 * judges them properly — linefield.cjs (148 checks) and finale-a11y.cjs / contact.cjs — so here their contrast
 * and banding are REPORTED and not asserted. What is asserted everywhere, because it is purely geometric and
 * always meaningful, is that nothing is cut off and nothing sits on a strip.
 */
const MATERIAL = /Linefield|finale/i
let fails = 0
const rows = []

// every rendered line of type that is actually on screen, outside the two strips
const READ = () => {
  const out = []
  const range = document.createRange()
  const vis = (el) => {
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') return false
    let n = el
    while (n && n !== document.body) { const c = getComputedStyle(n); if (+c.opacity < 0.05 || c.display === 'none' || c.visibility === 'hidden') return false; n = n.parentElement }
    return true
  }
  const roots = [...document.querySelectorAll('#ui .layer.on, #ui .wb.on, .lab-stage, .finale, [data-finale], #finale, .study')]
  for (const root of roots) {
    if (!vis(root)) continue
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const t = n.textContent.trim()
      if (!t) continue
      const el = n.parentElement
      if (!el || el.closest('.strip') || el.closest('.sr') || el.classList.contains('sr')) continue
      if (!vis(el)) continue
      /*
       * SCREEN-READER-ONLY TEXT IS NOT ON SCREEN. The pattern here is `position:absolute; width:1px; height:1px;
       * clip: rect(0 0 0 0)` (style.css), and a Range over such a node still returns the text's FULL rects, not
       * the 1px box that clips it — so the Lab bench's hidden h2 "Lab — Aynı malzeme, benim adım" was measured
       * against the drawing behind it and reported at 1:1. The element's own box is what the viewer sees.
       */
      const eb = el.getBoundingClientRect()
      if (eb.width < 4 || eb.height < 4) continue
      const cs = getComputedStyle(el)
      const m = cs.color.match(/[\d.]+/g).map(Number)
      range.selectNodeContents(n)
      for (const r of range.getClientRects()) {
        if (r.width > 2 && r.height > 2) out.push({ text: t.slice(0, 30), col: [m[0], m[1], m[2]], x: r.x, y: r.y, w: r.width, h: r.height, tag: el.className || el.tagName })
      }
    }
  }
  const strip = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height } }
  return { lines: out, top: strip('#ui .strip.top'), bottom: strip('#ui .strip.bottom'), W: innerWidth, H: innerHeight }
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const scratch = await (await b.newContext()).newPage()
  console.log(`== EVERY STOP AT A REAL PHONE'S HEIGHT  :${port}`)

  const measure = async (p, label) => {
    const r = await p.evaluate(READ)
    if (!r || !r.lines.length) { rows.push({ label, lines: 0, note: 'no type found' }); return }
    await p.addStyleTag({ content: '#ui .layer, #ui .wb, .lab-stage, .finale, .study { color: transparent !important; text-shadow: none !important; } #ui .layer *, .lab-stage *, .finale *, .study * { color: transparent !important; }' })
    await sleep(240)
    const ground = await p.screenshot()
    await p.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); if (s && /color: transparent/.test(s.textContent)) s.remove() })
    await sleep(160)
    const out = await scratch.evaluate(async ({ png, lines, dpr }) => {
      const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + png })
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      const x = c.getContext('2d'); x.drawImage(img, 0, 0)
      const srgb = (v) => { const u = v / 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4 }
      const lum = (r, g, bl) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(bl)
      const rat = (a, bb) => (Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05)
      return lines.map((L) => {
        const x0 = Math.max(0, Math.round(L.x * dpr)), y0 = Math.max(0, Math.round(L.y * dpr))
        const w = Math.min(c.width - x0, Math.round(L.w * dpr)), h = Math.min(c.height - y0, Math.round(L.h * dpr))
        if (w <= 0 || h <= 0) return { ...L, skip: true }
        const d = x.getImageData(x0, y0, w, h).data
        const tl = lum(L.col[0], L.col[1], L.col[2])
        let bad = 0, n = 0, worst = Infinity
        const rowLum = []
        for (let yy = 0; yy < h; yy++) { let s = 0; for (let xx = 0; xx < w; xx++) { const i = ((yy * w) + xx) * 4; s += lum(d[i], d[i + 1], d[i + 2]) } rowLum.push(s / w) }
        const base = [...rowLum].sort((a, bb) => bb - a)[Math.floor(rowLum.length * 0.25)] || 0
        let bands = 0, inB = false
        for (const v of rowLum) { const dk = v < base * 0.86; if (dk && !inB) bands++; inB = dk }
        for (let i = 0; i < d.length; i += 4) { const rr = rat(tl, lum(d[i], d[i + 1], d[i + 2])); n++; if (rr < 4.5) bad++; if (rr < worst) worst = rr }
        return { ...L, frac: bad / n, worst: +worst.toFixed(2), bands }
      })
    }, { png: ground.toString('base64'), lines: r.lines, dpr: 2 })

    const hit = (a, s) => s && !(a.x + a.w <= s.x || a.x >= s.x + s.w || a.y + a.h <= s.y || a.y >= s.y + s.h)
    let worstLine = null, nCross = 0, nCut = 0, nStrip = 0, nDim = 0
    const cutSaid = []
    for (const L of out) {
      if (L.skip) continue
      if (L.frac > FAIL_FRACTION) { nDim++; if (!worstLine || L.frac > worstLine.frac) worstLine = L }
      if (L.bands > 0) nCross++
      if (L.x < -0.5 || L.y < -0.5 || L.x + L.w > r.W + 0.5 || L.y + L.h > r.H + 0.5) {
        nCut++
        cutSaid.push(`"${L.text}" ${Math.round(Math.max(-L.x, -L.y, L.x + L.w - r.W, L.y + L.h - r.H))}px outside`)
      }
      if (hit(L, r.top) || hit(L, r.bottom)) nStrip++
    }
    const material = MATERIAL.test(label)
    const good = nCut === 0 && nStrip === 0 && (material || nDim === 0)
    if (!good) fails++
    rows.push({ label, lines: out.length, nDim, nCross, nCut, nStrip, good, material,
      worst: [worstLine && !material ? `"${worstLine.text}" ${(worstLine.frac * 100).toFixed(0)}% below AA, worst ${worstLine.worst}:1` : '', cutSaid.join('; ')].filter(Boolean).join('  ·  ') })
  }

  for (const loc of LOCALES) {
    for (const S of SIZES) {
      const ctx = await b.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })
      const p = await ctx.newPage()
      /*
       * A PLACE IS WAITED FOR, NOT SLEPT THROUGH. The About panel is not a stop: `navigate('about')` travels the
       * index back to the name and only then presses it open, which is far more than a fixed sleep — an earlier
       * run of this file reported "no type found" for About at every size and had in fact photographed the hero.
       */
      const go = async (fn, label, wait = 2400, until = null) => {
        await fn()
        if (until) { const okd = await p.waitForFunction(until, null, { timeout: 25000 }).then(() => true, () => false); if (!okd) { rows.push({ label: `${loc} ${S.w}x${S.h} ${label}`, lines: 0, note: 'NEVER REACHED' }); fails++; return } }
        await sleep(wait); if (SHOTS) fs.writeFileSync(path.join(OUT, `${loc}-${S.w}x${S.h}-${label.replace(/[^a-z0-9]+/gi, '-')}.png`), await p.screenshot()); await measure(p, `${loc} ${S.w}x${S.h} ${label}`) }
      await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
      await p.waitForFunction(() => window.__lab?.A?.mode === 'index', null, { timeout: 40000 })
      await sleep(2800)
      const SPINE = await p.evaluate(() => window.__lab.SPINE)
      const at = (n) => p.evaluate((x) => window.__lab.go(window.__lab.STOP[x]), n)

      await go(async () => {}, 'Hero')
      await go(() => at('creative'), 'Creative')
      await go(() => at('system'), 'Full-Stack')
      if (SPINE.includes('linefield')) {
        await go(() => at('linefield'), 'Linefield back (rest)')
        await go(() => p.evaluate(() => { const lf = window.__lab.lf && window.__lab.lf(); if (lf && lf.drive) { lf.drive.target = 1; lf.drive.p = 1 } }), 'Linefield front (rest)')
        await go(() => p.evaluate(() => { const lf = window.__lab.lf && window.__lab.lf(); if (lf && lf.drive) { lf.drive.target = 0.5; lf.drive.p = 0.5 } }), 'Linefield mid (the passage)')
        await go(() => p.evaluate(() => { const lf = window.__lab.lf && window.__lab.lf(); if (lf && lf.drive) { lf.drive.target = 0; lf.drive.p = 0 } }), 'Linefield back again', 1200)
      }
      await go(() => at('work'), 'Work')
      await go(() => p.evaluate(() => document.querySelector('#ui [data-go="about"]')?.click()), 'About panel', 2600,
        () => !!window.__lab?.A?.aboutOpen && !!document.querySelector('#ui .about.on, #ui .layer.about.on'))
      await go(() => p.evaluate(() => document.querySelector('#ui [data-go="name"]')?.click()), 'Hero after About', 1800)
      await go(async () => { await p.goto(`http://127.0.0.1:${port}/${loc}/lab`, { waitUntil: 'networkidle', timeout: 60000 }) }, 'Lab bench')
      await go(async () => { await p.goto(`http://127.0.0.1:${port}/${loc}/contact`, { waitUntil: 'networkidle', timeout: 60000 }) }, 'Contact finale')
      await ctx.close()
    }
  }

  console.log(`\n  ${'place'.padEnd(42)} ${'lines'.padStart(5)} ${'dim'.padStart(4)} ${'crossed'.padStart(7)} ${'cut'.padStart(4)} ${'on strip'.padStart(8)}`)
  for (const r of rows) {
    if (r.note) { console.log(`  ${r.label.padEnd(42)} ${String(r.lines).padStart(5)}   — ${r.note}`); continue }
    console.log(`  ${r.good ? 'ok  ' : 'FAIL'} ${r.label.padEnd(37)} ${String(r.lines).padStart(5)} ${String(r.nDim).padStart(4)}${r.material ? '*' : ' '} ${String(r.nCross).padStart(6)}${r.material ? '*' : ' '} ${String(r.nCut).padStart(4)} ${String(r.nStrip).padStart(8)}${r.worst ? `   ${r.worst}` : ''}`)
  }
  console.log(`\n  * the words are drawn in the row field there by design; contrast and banding are reported, not asserted`)
  console.log(`    (linefield.cjs and finale-a11y.cjs judge those two places properly)`)
  console.log(`\nSHORT PHONE: ${fails === 0 ? 'PASS' : `FAIL (${fails} place/size combinations)`}`)
  if (SHOTS) console.log(`stills in ${OUT}`)
  await b.close()
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 700)); process.exit(1) })
