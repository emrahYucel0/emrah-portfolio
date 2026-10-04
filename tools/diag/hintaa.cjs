// THE BENCH'S FOOT HINT (.hint) AGAINST WHAT IS BEHIND IT — the way `.state` was settled (docs/KNOWN-ISSUES.md).
//
//   node hintaa.cjs <port> [--path=/en/lab] [--size=1440x900@2]
//
// In the window a visitor reads it: the hint arrives after CUE_IDLE of no input and fades in; it is measured once its
// opacity is 1. Its own colour (computed) against every pixel behind its glyphs, with the hint's text hidden for that
// capture, as WCAG contrast ratios: the worst, and the share under AA (4.5:1). Also: whether another label shares its
// box (the `.state` lesson: two labels drawn over each other read as a contrast failure), and the opacity timeline,
// which is what axe can catch mid-fade. Crops in tools/diag/out/hintaa/.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('node:fs')
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4962'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const path = opt('path', '/en/lab')
const [wh, dprS] = opt('size', '1440x900@2').split('@'); const [W, H] = wh.split('x').map(Number); const DPR = Number(dprS || 1)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const ratio = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05) }

;(async () => {
  fs.mkdirSync('out/hintaa', { recursive: true })
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR })
  const p = await ctx.newPage()
  await p.addInitScript(() => {
    // the opacity timeline of the hint, from the page's own clock
    window.__op = []
    const t0 = performance.now()
    const s = () => { const h = document.querySelector('.lab-stage .foot .hint'); if (h) window.__op.push([Math.round(performance.now() - t0), +getComputedStyle(h).opacity, h.textContent.trim().length > 0]); requestAnimationFrame(s) }
    requestAnimationFrame(s)
  })
  await p.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'load', timeout: 120000 })
  // no input at all: the hint is the bench's answer to stillness
  await p.waitForFunction(() => { const h = document.querySelector('.lab-stage .foot .hint'); return h && h.textContent.trim() && +getComputedStyle(h).opacity === 1 }, null, { timeout: 30000 })
  await sleep(300)
  const info = await p.evaluate(() => {
    const h = document.querySelector('.lab-stage .foot .hint')
    const range = document.createRange(); range.selectNodeContents(h)
    const r = range.getBoundingClientRect()
    const box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const rr = document.createRange(); rr.selectNodeContents(e); const b = rr.getBoundingClientRect(); return { x0: b.left, y0: b.top, x1: b.right, y1: b.bottom, op: +getComputedStyle(e).opacity, text: e.textContent.trim() } }
    const cs = getComputedStyle(h)
    return { text: h.textContent.trim(), color: cs.color, opacity: +cs.opacity, rect: { x: r.left, y: r.top, w: r.width, h: r.height }, roles: box('.lab-stage .foot .roles'), state: box('.lab-stage .foot .state'), foot: getComputedStyle(document.querySelector('.lab-stage .foot')).backgroundColor }
  })
  const overlap = (o) => o && o.op > 0.01 && o.x0 < info.rect.x + info.rect.w && o.x1 > info.rect.x && o.y0 < info.rect.y + info.rect.h && o.y1 > info.rect.y
  const clip = { x: Math.floor(info.rect.x) - 2, y: Math.floor(info.rect.y) - 2, width: Math.ceil(info.rect.w) + 4, height: Math.ceil(info.rect.h) + 4 }
  const withText = await p.screenshot({ clip })
  // the same box, the hint's text hidden: only what is behind it
  await p.addStyleTag({ content: '.lab-stage .foot .hint { color: transparent !important; text-shadow: none !important; }' })
  await sleep(200)
  const behind = await p.screenshot({ clip })
  fs.writeFileSync('out/hintaa/with-text.png', withText); fs.writeFileSync('out/hintaa/behind.png', behind)
  const m = info.color.match(/[\d.]+/g).map(Number)
  const ink = lum(m[0], m[1], m[2])
  const A = await sharp(withText).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  const B = await sharp(behind).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  // the glyphs are where the two captures differ; the ratio is the hint's colour against the pixel behind each glyph
  let n = 0, under = 0, worst = Infinity
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2])
    if (d < 24) continue
    n++
    const r = ratio(ink, lum(B.data[i], B.data[i + 1], B.data[i + 2]))
    if (r < worst) worst = r
    if (r < 4.5) under++
  }
  const op = await p.evaluate(() => window.__op)
  const firstShown = op.find((e) => e[2] && e[1] > 0)
  const full = op.find((e) => e[2] && e[1] >= 1)
  console.log(`== THE BENCH'S HINT  ${path}  ${W}x${H}@${DPR}  :${port}`)
  console.log(`   text "${info.text}"  colour ${info.color}  opacity ${info.opacity}  foot ground ${info.foot}`)
  console.log(`   box ${Math.round(info.rect.x)},${Math.round(info.rect.y)} ${Math.round(info.rect.w)}×${Math.round(info.rect.h)}; overlaps .roles ${overlap(info.roles) ? 'YES' : 'no'}, .state ${overlap(info.state) ? 'YES' : 'no'} (state opacity ${info.state?.op})`)
  console.log(`   glyph pixels ${n}; worst ratio ${worst.toFixed(2)}:1; under AA (4.5:1) ${n ? ((under / n) * 100).toFixed(1) : '—'}%`)
  console.log(`   timeline: text set at ${firstShown ? firstShown[0] : '—'} ms, opacity 1 at ${full ? full[0] : '—'} ms (fade ${firstShown && full ? full[0] - firstShown[0] : '—'} ms)`)
  fs.writeFileSync('out/hintaa/result.json', JSON.stringify({ path, size: `${W}x${H}@${DPR}`, ...info, glyphPixels: n, worst, underPct: n ? under / n : null, firstShown, full }, null, 2))
  await b.close()
})()
