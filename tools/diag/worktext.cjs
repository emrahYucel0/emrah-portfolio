// THE WORK STOP'S TITLE BLOCK, AGAINST THE PIXELS ACTUALLY BEHIND IT.
//
//   node worktext.cjs <port> [sizes] [locales] [--shots]
//   node worktext.cjs 4934 390x844,375x667 tr,en --shots
//
// On a phone the selected work's name, its one-line subtitle and the "İncele →" door sit at the bottom of the
// index column, where the column's night fades out into the cream row field. Reported from a real iPhone
// (2026-10-02): the rows run straight THROUGH the subtitle and the door, and the door is drawn in the dark-ground
// copper (#d4875a) while sitting on cream — both close to unreadable.
//
// The method is panelfit.cjs's, deliberately, so the two cannot disagree about what "readable" means:
//
//   * the type is HIDDEN while the background is captured, so "the pixels behind it" are exactly that;
//   * contrast is the WCAG ratio of the line's own computed colour against EVERY background pixel in its box,
//     not against an average and not against a CSS background — a row crossing the words is a few dark pixels in
//     a light box and an average hides it completely;
//   * a small fraction may fail, for the glyphs' antialiasing at the edges, and nothing more.
//
// It also counts, per line, how many distinct dark BANDS cross the box. That is the row field itself: zero is the
// pocket doing its work, and anything above zero is a row drawn through the words.
const fs = require('fs')
const path = require('path')
const pw = require('playwright')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const [port, sizesArg = '360x800,375x667,390x844,430x932', localesArg = 'tr,en'] = process.argv.slice(2)
const SHOTS = process.argv.includes('--shots')
const SIZES = sizesArg.split(',').map((s) => { const [w, h] = s.split('x').map(Number); return { w, h } })
const LOCALES = localesArg.split(',')
const OUT = path.join(__dirname, 'out', 'worktext')
fs.mkdirSync(OUT, { recursive: true })
const AA = 4.5
const FAIL_FRACTION = 0.02
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }

const srgb = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const lumOf = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

// one rect per rendered line of the three things in the current-work block, with the colour each is drawn in
const READ = () => {
  const cur = document.querySelector('#ui .work .current')
  if (!cur || getComputedStyle(cur).display === 'none') return null
  const out = []
  const range = document.createRange()
  for (const [sel, name] of [['.wtitle', 'title'], ['.wmeta', 'subtitle'], ['.open', 'İncele →']]) {
    const el = cur.querySelector(sel)
    if (!el || !el.textContent.trim()) continue
    const cs = getComputedStyle(el)
    const m = cs.color.match(/[\d.]+/g).map(Number)
    const alpha = m.length > 3 ? m[3] : 1
    const op = parseFloat(cs.opacity)
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent.trim()) continue
      range.selectNodeContents(n)
      for (const r of range.getClientRects()) {
        if (r.width > 1 && r.height > 1) out.push({ name, text: n.textContent.trim().slice(0, 42), col: [m[0], m[1], m[2]], alpha, op, x: r.x, y: r.y, w: r.width, h: r.height })
      }
    }
  }
  return out
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  console.log(`== WORK STOP TITLE BLOCK  :${port}  AA ${AA}:1, at most ${(FAIL_FRACTION * 100).toFixed(0)}% of a line's pixels may fail`)
  for (const loc of LOCALES) {
    for (const S of SIZES) {
      const ctx = await b.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })
      const p = await ctx.newPage()
      await p.goto(`http://127.0.0.1:${port}/${loc}`, { waitUntil: 'networkidle', timeout: 60000 })
      await p.waitForFunction(() => window.__lab?.A?.mode === 'index', null, { timeout: 40000 })
      await sleep(2600)
      await p.evaluate(() => window.__lab.go(window.__lab.STOP.work))
      await sleep(2800)
      const n = await p.evaluate(() => window.__lab.WORKS().length)
      console.log(`\n-- ${loc} ${S.w}x${S.h}`)
      /*
       * THE WORK IS REGISTERED, NOT OPENED. Clicking `[data-work]` OPENS the project (R5: a label chosen directly
       * is a shortcut into it), and an earlier version of this file did exactly that and then measured the
       * project's own page while reporting it as the Work stop. The work field is travelled instead, the way a
       * visitor travels it, and `A.wt` is read back to say which work is actually registered.
       */
      for (let k = 0; k < n; k++) {
        if (k > 0) { await p.keyboard.press('ArrowRight'); await sleep(1300) }
        await p.waitForFunction((i) => Math.abs((window.__lab.A.wt ?? -1) - i) < 0.02, k, { timeout: 8000 }).catch(() => {})
        await sleep(900)
        const at = await p.evaluate(() => ({ wt: +(window.__lab.A.wt ?? -1).toFixed(2), mode: window.__lab.A.mode, path: location.pathname }))
        if (at.mode !== 'index') { console.log(`   work ${k + 1}: left the index (mode ${at.mode}, ${at.path}) — not measured`); continue }
        const lines = await p.evaluate(READ)
        const name = await p.evaluate(() => document.querySelector('#ui .work .wtitle')?.textContent || '?')
        if (!lines) { console.log(`   work ${k + 1} (${name}): the block is not shown at this size — skipped`); continue }
        if (k === 0) console.log(`   (registered by travelling the field; wt ${at.wt})`)
        if (SHOTS) fs.writeFileSync(path.join(OUT, `${loc}-${S.w}x${S.h}-w${k + 1}-shown.png`), await p.screenshot())
        // the type goes away, so what is captured IS the ground behind it
        await p.addStyleTag({ content: '#ui .work .current { visibility: hidden !important; }' })
        await sleep(260)
        const shot = await p.screenshot()
        if (SHOTS && k === 0) fs.writeFileSync(path.join(OUT, `${loc}-${S.w}x${S.h}-ground.png`), shot)
        await p.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); if (s && /visibility: hidden/.test(s.textContent)) s.remove() })
        await sleep(200)

        const dpr = 2
        const res = await b.newContext().then((c) => c.newPage()).then(async (sp) => {
          const r = await sp.evaluate(async ({ png, lines, dpr }) => {
            const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + png })
            const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
            const x = c.getContext('2d'); x.drawImage(img, 0, 0)
            const srgb = (v) => { const u = v / 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4 }
            const lum = (r, g, b) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
            const rat = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
            return lines.map((L) => {
              const x0 = Math.max(0, Math.round(L.x * dpr)), y0 = Math.max(0, Math.round(L.y * dpr))
              const w = Math.min(c.width - x0, Math.round(L.w * dpr)), h = Math.min(c.height - y0, Math.round(L.h * dpr))
              if (w <= 0 || h <= 0) return { ...L, n: 0 }
              const d = x.getImageData(x0, y0, w, h).data
              const tl = lum(L.col[0], L.col[1], L.col[2])
              let bad = 0, worst = Infinity, n = 0
              // a row crossing the words shows up as dark BANDS: count how many separate ones cross the middle
              const mid = Math.floor(h / 2)
              const rowLum = []
              for (let yy = 0; yy < h; yy++) {
                let s = 0
                for (let xx = 0; xx < w; xx++) { const i = ((yy * w) + xx) * 4; s += lum(d[i], d[i + 1], d[i + 2]) }
                rowLum.push(s / w)
              }
              const base = [...rowLum].sort((a, b) => b - a)[Math.floor(rowLum.length * 0.25)] || 0
              let bands = 0, inBand = false
              for (const v of rowLum) { const dark = v < base * 0.86; if (dark && !inBand) bands++; inBand = dark }
              for (let i = 0; i < d.length; i += 4) {
                const rr = rat(tl, lum(d[i], d[i + 1], d[i + 2])); n++
                if (rr < 4.5) bad++
                if (rr < worst) worst = rr
              }
              return { ...L, n, bad, frac: bad / n, worst: +worst.toFixed(2), bands, mid }
            })
          }, { png: shot.toString('base64'), lines, dpr })
          await sp.context().close()
          return r
        })
        for (const L of res) {
          const good = L.frac <= FAIL_FRACTION
          const label = `${loc} ${S.w}x${S.h} w${k + 1} ${name.slice(0, 18).padEnd(18)} ${L.name.padEnd(9)}`
          ok(good, label, `${(L.frac * 100).toFixed(1)}% of the pixels behind it fail AA (worst ${L.worst}:1), ${L.bands} row band(s) cross it, ink rgb(${L.col.join(',')})${L.op < 1 ? ` at opacity ${L.op}` : ''}`)
        }
      }
      await ctx.close()
    }
  }
  console.log(`\nWORK TEXT: ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`)
  if (SHOTS) console.log(`stills in ${OUT}`)
  await b.close()
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 700)); process.exit(1) })
