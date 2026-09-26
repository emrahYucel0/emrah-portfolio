// THE HERO'S ABOUT CONTROL, ACROSS THE SCREENS THE COMPOSITION IS SET FOR.
// Proves: it is in the fold, its target is 44 × 44, it clears both strips, and no glyph of either name comes
// within reach of it — measured from the rendered pixels, by column ink density, not from the layout's own numbers.
// node herolayout.cjs <port>
const pw = require('playwright')
const sharp = require('sharp')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const port = process.argv[2]
let fails = 0
const ok = (c, l, x = '') => { if (!c) fails++; console.log(`  ${c ? 'ok  ' : 'FAIL'} ${l}${x ? ` — ${x}` : ''}`) }
const VIEWPORTS = [[320, 568], [375, 667], [390, 844], [430, 932], [736, 330], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080]]

;(async () => {
  const b = await pw.webkit.launch()
  for (const [w, h] of VIEWPORTS) {
    for (const loc of ['tr', 'en']) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 700, hasTouch: w < 700 })
      const p = await ctx.newPage()
      await p.goto(`http://127.0.0.1:${port}/${loc}/`, { waitUntil: 'networkidle', timeout: 60000 })
      await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 40000 }).catch(() => {})
      await sleep(3000)
      const m = await p.evaluate(() => {
        const el = document.querySelector('.hero-about')
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el)
        const L = window.__lab, nm = L.IDX()[0], u = L.V.u
        const pad = { l: parseFloat(cs.paddingLeft), r: parseFloat(cs.paddingRight) }
        return {
          box: { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height },
          ink: { l: r.left + pad.l, r: r.right - pad.r },
          fold: { t: (nm.layout.top + nm.layout.cap) * u, b: (nm.layout.top + nm.layout.cap + nm.layout.gap) * u },
          strip: L.V.strip * u, H: innerHeight, text: el.textContent.trim(), on: el.closest('.layer').classList.contains('on'),
        }
      })
      // the space the control occupies, with the control taken out of it: whatever ink is left there is the
      // composition's, and the question is whether any of it is a glyph rather than the row field
      await p.addStyleTag({ content: '.hero-act { display: none !important }' })
      await sleep(400)
      const { data, info } = await sharp(await p.screenshot()).greyscale().raw().toBuffer({ resolveWithObject: true })
      const W = info.width
      const colWeight = (y0, y1) => {
        const c = new Array(W).fill(0)
        for (let y = Math.max(0, y0 | 0); y < Math.min(info.height, y1 | 0); y++) for (let x = 0; x < W; x++) if (data[y * W + x] < 120) c[x]++
        return c
      }
      // a glyph column carries far more ink than the row field it stands in
      const glyphRight = (y0, y1) => {
        const c = colWeight(y0, y1), s = [...c].sort((a, z) => a - z), med = s[s.length >> 1], t = Math.max(med * 1.9, med + 6)
        for (let x = W - 1; x >= 0; x--) if (c[x] > t) return x
        return -1
      }
      // is any glyph standing in the control's own space? the field's own hairlines are the baseline; a glyph
      // column carries several times that. Measured over the word's rectangle, widened by 6px of breathing room.
      const band = (x0, x1, y0, y1) => {
        const c = []
        for (let x = Math.max(0, x0 | 0); x < Math.min(info.width, x1 | 0); x++) {
          let n = 0
          for (let y = Math.max(0, y0 | 0); y < Math.min(info.height, y1 | 0); y++) if (data[y * info.width + x] < 120) n++
          c.push(n)
        }
        return c
      }
      const inWord = band(m.ink.l - 6, m.ink.r + 6, m.box.t - 6, m.box.b + 6)
      const field = band(4, info.width - 4, m.box.t - 6, m.box.b + 6)
      const sorted = [...field].sort((a, z) => a - z)
      const med = sorted[sorted.length >> 1]
      const peak = Math.max(...inWord)
      const glyphInSpace = peak > Math.max(med * 1.9, med + 6)
      const tag = `${w}x${h} ${loc}`
      const fine =
        m.on &&
        m.box.w >= 44 && m.box.h >= 44 &&
        m.box.t >= m.fold.t - 14 && m.box.b <= m.fold.b + 14 &&
        m.box.t > m.strip && m.box.b < m.H - m.strip &&
        !glyphInSpace &&
        m.box.r <= info.width + 1 && m.box.l >= 0
      ok(fine, tag, `${m.text} ${Math.round(m.box.w)}x${Math.round(m.box.h)} at ${Math.round(m.box.l)},${Math.round(m.box.t)} | fold ${Math.round(m.fold.t)}–${Math.round(m.fold.b)} | ink in its space: peak ${peak} vs field ${med}`)
      await ctx.close()
    }
  }
  await b.close()
  console.log(`HERO LAYOUT: ${fails === 0 ? `PASS — ${VIEWPORTS.length * 2} combinations` : `FAIL (${fails})`}`)
  process.exit(fails ? 1 : 0)
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1) })
