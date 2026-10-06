// R21 — LINEFIELD'S WORDS ON LARGE SCREENS: TODAY AGAINST A SIZE LIMIT IN ROWS PER CAPITAL.
//
//   node r21.cjs <port> [--sizes=390x844@3,1440x900@2,2560x1440@1,3840x2160@1] [--limits=24,18] [--out=dir]
//
// The build carries the prototype key ?r21=N (linefield/state.js): past N rows per capital the words are set smaller,
// the pitch unchanged. Per size and variant (today, then each limit), normal motion, the passage held at four points:
// 0 (the backend words at rest), 0.22 and 0.72 (mid-corridor, a word on its way past), 1 (the frontend words at rest).
//
// Three sheets per size in out/iq/r21/:
//   <size>-overview.png  the whole screen at every point, scaled down — what the composition becomes
//   <size>-1to1.png      the first word of each side at rest, at 1:1 device pixels — what the screen shows
//   <size>-same.png      the same crops scaled so a capital is 120 px tall on every sheet — the rows per letter compared
//                        at one letter size (the "same physical size" view)
// and `R21-SAME.png`: every size's `same` crops on one sheet. Page captures only (the test window's own).
const pw = require('playwright')
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const port = args.find((a) => /^\d+$/.test(a)) || '4977'
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d }
const SIZES = opt('sizes', '390x844@3,1440x900@2,2560x1440@1,3840x2160@1').split(',').map((s) => s.split(/[x@]/).map(Number))
const LIMITS = opt('limits', '24,18').split(',').map(Number)
const OUT = opt('out', path.join(__dirname, 'out', 'iq', 'r21'))
fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true })
const POINTS = [0, 0.22, 0.72, 1]
const label = (text, w, h = 30, size = 17) => Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#1f4f6f"/><text x="8" y="${Math.round(h * 0.68)}" font-family="Consolas, monospace" font-size="${size}" fill="#fff">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`)
async function sheet(file, rows, cellW, title) {
  // rows: [{ name, cells: [{ buf, caption }] }]
  const gap = 10, head = 34
  const cols = Math.max(...rows.map((r) => r.cells.length))
  const parts = [{ input: label(title, cols * (cellW + gap), head, 20), top: 0, left: 0 }]
  let y = head + gap
  for (const r of rows) {
    let x = 0, h = 0
    for (const c of r.cells) {
      const m = await sharp(c.buf).metadata()
      parts.push({ input: c.buf, top: y, left: x })
      parts.push({ input: label(`${r.name} · ${c.caption}`, Math.min(cellW, 460), 26, 15), top: y, left: x })
      x += cellW + gap; h = Math.max(h, m.height)
    }
    y += h + gap
  }
  await sharp({ create: { width: cols * (cellW + gap), height: y, channels: 3, background: '#f4f3ee' } }).composite(parts).png().toFile(file)
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const sameAll = []
  for (const [W, H, dpr] of SIZES) {
    const tag = `${W}x${H}@${dpr}`
    const variants = [['today', ''], ...LIMITS.map((n) => [`limit ${n}`, `?r21=${n}`])]
    const overview = [], oneToOne = [], same = []
    for (const [name, q] of variants) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, isMobile: W < 700, hasTouch: W < 700 })
      const p = await ctx.newPage()
      await p.goto(`http://127.0.0.1:${port}/tr${q}`, { waitUntil: 'load', timeout: 120000 })
      await p.waitForFunction(() => window.__lab?.A.mode === 'index' && !window.__lab.A.busy, null, { timeout: 120000 })
      await p.evaluate(() => document.fonts.ready)
      await p.evaluate(() => window.__lab.go(window.__lab.STOP.linefield))
      await p.waitForFunction(() => { const A = window.__lab.A; return A.p === A.base && !A.busy }, null, { timeout: 30000 })
      const info = await p.evaluate(() => {
        const L = window.__lab, lf = L.lf()
        const g = (st) => ({ x: st.layout.x, base: st.layout.baseline[0], cap: st.layout.cap, rows: st.layout.rowsPerCap })
        return { u: L.V.u, R: L.V.dpr * L.V.u, back: g(lf.back), front: g(lf.front) }
      })
      const rowsTxt = `${info.back.rows}${info.front.rows !== info.back.rows ? '/' + info.front.rows : ''} rows per capital`
      const ov = { name: `${name} (${rowsTxt})`, cells: [] }
      for (const at of POINTS) {
        await p.evaluate((v) => window.__lab.lfSet(v), at)
        await sleep(900)
        const shot = await p.screenshot({ type: 'png' })
        fs.writeFileSync(path.join(OUT, 'raw', `${tag}-${name.replace(' ', '')}-${at}.png`), shot)
        ov.cells.push({ buf: await sharp(shot).resize({ width: 460 }).png().toBuffer(), caption: at === 0 ? 'backend, at rest' : at === 1 ? 'frontend, at rest' : `corridor ${at}` })
        if (at === 0 || at === 1) {
          const side = at === 0 ? info.back : info.front
          const k = info.u * dpr   // composition px -> device px
          const meta = await sharp(shot).metadata()
          const cap = side.cap * k
          // 1:1: a fixed 900 x 520 device-pixel window on the first word's top corner
          const w1 = Math.min(900, meta.width), h1 = Math.min(520, meta.height)
          const l1 = Math.round(Math.min(Math.max(0, at === 0 ? side.x * k - 0.2 * cap : side.x * k + 0.2 * cap - w1), meta.width - w1))
          const t1 = Math.round(Math.min(Math.max(0, side.base * k - 1.25 * cap), meta.height - h1))
          const crop1 = await sharp(shot).extract({ left: l1, top: t1, width: w1, height: h1 }).png().toBuffer()
          ;(oneToOne[variants.findIndex((v) => v[0] === name)] ||= { name: `${name} (${rowsTxt})`, cells: [] }).cells.push({ buf: crop1, caption: `${at === 0 ? 'backend' : 'frontend'}, 1:1` })
          // same letter size: 4.2 capitals wide, 1.5 high, scaled to a 120 px capital
          const ws = Math.min(Math.round(4.2 * cap), meta.width), hs = Math.min(Math.round(1.5 * cap), meta.height)
          const ls = Math.round(Math.min(Math.max(0, at === 0 ? side.x * k - 0.15 * cap : side.x * k + 0.15 * cap - ws), meta.width - ws))
          const ts = Math.round(Math.min(Math.max(0, side.base * k - 1.25 * cap), meta.height - hs))
          const crop2 = await sharp(shot).extract({ left: ls, top: ts, width: ws, height: hs }).resize({ height: 180, kernel: 'lanczos3' }).png().toBuffer()
          ;(same[variants.findIndex((v) => v[0] === name)] ||= { name: `${name} (${rowsTxt})`, cells: [] }).cells.push({ buf: crop2, caption: `${at === 0 ? 'backend' : 'frontend'}, capital ${Math.round(cap)} device px → 120` })
        }
      }
      overview.push(ov)
      console.log(`${tag} ${name}: ${rowsTxt}, capital ${Math.round(info.back.cap * info.u)} css px, ratio ${info.R.toFixed(2)}`)
      await ctx.close()
    }
    await sheet(path.join(OUT, `${tag}-overview.png`), overview, 460, `${tag} · Linefield, whole screen · today against a size limit`)
    await sheet(path.join(OUT, `${tag}-1to1.png`), oneToOne, 900, `${tag} · the first word at rest, 1:1 device pixels`)
    await sheet(path.join(OUT, `${tag}-same.png`), same, 640, `${tag} · the first word at one letter size (capital = 120 px)`)
    for (const r of same) sameAll.push({ name: `${tag} ${r.name}`, cells: r.cells })
  }
  await sheet(path.join(OUT, 'R21-SAME.png'), sameAll, 640, 'Linefield · every size and variant at one letter size (capital = 120 px)')
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
