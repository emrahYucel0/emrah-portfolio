// R9 AND REDUCED MOTION — does the 2D path (flat.js) need the change the shader got?
//
//   node r9flat.cjs <port> [--cfg=WxH@dpr,...]
//
// Reduced motion draws every place still, in Canvas 2D: no wave, no travel, no pointer ripple. Nothing moves, so
// nothing can shimmer; what is left to compare is (1) how even the rows are at rest and (2) whether the two renderers
// still agree on how bright a ground is, now that the WebGL one is calibrated to keep the old brightness.
//
// The same scenes as iqr9.cjs, read the same way in both modes: the canvas's own pixels (WebGL: readPixels with
// preserveDrawingBuffer; 2D: getImageData), rows found with iqrows.cjs's rowsOf, kept outside every opening's reach
// and the side edges, and within 0.35-2.8 times the median light (which drops rows inside letters). No content
// texture is read — the 2D path has none on the GPU — so the selection is the same in both modes.
const pw = require('playwright')
const IQ = require('./iqrows.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const port = args[0]
const cfgArg = (args.find((a) => a.startsWith('--cfg=')) || '').slice(6)
const CONFIGS = cfgArg ? cfgArg.split(',').map((s) => { const m = /(\d+)x(\d+)@([\d.]+)/.exec(s); return [+m[1], +m[2], +m[3]] }) : [[1920, 991, 1], [1440, 900, 1.5]]
const SCENES = ['fullstack', 'work', 'lfdark', 'creative']
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null)

async function scene(p, key) {
  if (key === 'work') {
    await p.goto(`http://127.0.0.1:${port}/tr/work/ege`, { waitUntil: 'networkidle' })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'world', null, { timeout: 90000 })
    await sleep(2600)
    return
  }
  await p.goto(`http://127.0.0.1:${port}/tr`, { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 })
  await sleep(2000)
  const place = key === 'fullstack' ? 'system' : key === 'creative' ? 'creative' : 'linefield'
  await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), place)
  await sleep(2600)
  if (key === 'lfdark') { await p.evaluate(() => window.__lab.lfSet && window.__lab.lfSet(0)); await sleep(800) }
}

async function read(p, key) {
  return p.evaluate((key) => {
    const L = window.__lab
    const s = key === 'work' ? L.WORLD()[L.A.k][Math.round(L.A.wp)] : L.IDX()[L.STOP[key === 'fullstack' ? 'system' : key === 'creative' ? 'creative' : 'linefield']]
    const boxes = []
    for (const f of s.features || []) {
      if (f.kind !== 0 && f.kind != null) continue
      const ry = Math.max(0, f.h) + (f.reach || 0) + 4 * (f.falloff || 30) + 6
      boxes.push([f.cx - 1.3 * f.hw, f.cy - ry, f.cx + 1.3 * f.hw, f.cy + ry])
    }
    for (const r of s.lines || []) boxes.push([r.x - 12, r.y - 12, r.x + r.w + 12, r.y + r.h + 12])
    if (key === 'work') for (const r of L.frames(L.A.k)[Math.round(L.A.wp)].voids || []) boxes.push([r.x - 40, r.y - 40, r.x + r.w + 40, r.y + r.h + 40])
    boxes.push([-1e9, -1e9, 24, 1e9], [L.V.W - 24, -1e9, 1e9, 1e9])
    const c = document.querySelector('canvas#surface') || document.querySelector('canvas')
    const R = L.V.dpr * L.V.u
    const W = c.width, H = c.height
    const xs = []
    for (let x = 7; x < W - 7; x += 13) xs.push(x)
    const cols = []
    const gl = L.surface.gl
    if (gl) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      const buf = new Uint8Array(H * 4)
      for (const x of xs) {
        gl.readPixels(x, 0, 1, H, gl.RGBA, gl.UNSIGNED_BYTE, buf)
        let str = ''
        for (let y = H - 1; y >= 0; y--) str += String.fromCharCode(buf[y * 4], buf[y * 4 + 1], buf[y * 4 + 2], buf[y * 4 + 3])
        cols.push(btoa(str))
      }
    } else {
      const ctx = c.getContext('2d')
      for (const x of xs) {
        const d = ctx.getImageData(x, 0, 1, H).data
        let str = ''
        for (let i = 0; i < d.length; i++) str += String.fromCharCode(d[i])
        cols.push(btoa(str))
      }
    }
    return { mode: gl ? 'webgl' : '2d', xs, cols, R, strip: L.V.strip, ink: [...s.ink], paper: [...s.paper], spacing: s.spacing, boxes, id: s.id }
  }, key)
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  console.log('== R9 and reduced motion, http://127.0.0.1:' + port)
  for (const [W, H, dpr] of CONFIGS) {
    console.log('-- ' + W + 'x' + H + '@' + dpr)
    const out = {}
    for (const reduced of [false, true]) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr, reducedMotion: reduced ? 'reduce' : 'no-preference' })
      await ctx.addInitScript(() => {
        const o = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (t, a) { if (t === 'webgl2') a = Object.assign({}, a || {}, { preserveDrawingBuffer: true }); return o.call(this, t, a) }
      })
      const p = await ctx.newPage()
      const errs = []
      p.on('pageerror', (e) => errs.push(e.message))
      for (const key of SCENES) {
        await scene(p, key)
        const r = await read(p, key)
        const rows = []
        r.cols.forEach((c, ci) => {
          const raw = Buffer.from(c, 'base64')
          const col = []
          for (let i = 0; i < raw.length; i += 4) col.push([raw[i], raw[i + 1], raw[i + 2], raw[i + 3]])
          const y0 = Math.ceil(r.strip * r.R) + 2
          const y1 = col.length - Math.ceil(r.strip * r.R) - 2
          for (const row of IQ.rowsOf(col.slice(y0, y1), r.ink, r.paper, r.spacing * r.R)) if (IQ.outside(r.boxes, r.xs[ci] / r.R, (y0 + row.c) / r.R)) rows.push(row)
        })
        const mL = med(rows.map((x) => x.L))
        const clean = rows.filter((x) => x.L > 0.35 * mL && x.L < 2.8 * mL)
        const B = IQ.BINS
        const sum = new Float64Array(B)
        const cnt = new Float64Array(B)
        for (const x of clean) { const bi = Math.min(B - 1, Math.floor(x.phase / 0.5 * B)); sum[bi] += x.L; cnt[bi]++ }
        const means = [...sum].map((v, i) => (cnt[i] >= 15 ? v / cnt[i] : null)).filter((v) => v != null)
        out[key] = out[key] || {}
        out[key][reduced ? 'flat' : 'webgl'] = { mode: r.mode, n: clean.length, swing: means.length ? Math.max(...means) / Math.min(...means) : null, meanL: clean.reduce((v, x) => v + x.L, 0) / (clean.length || 1) }
      }
      if (errs.length) console.log('   ' + (reduced ? 'reduced' : 'normal') + ' pageerrors: ' + errs.join(' | '))
      await ctx.close()
    }
    for (const key of SCENES) {
      const g = out[key].webgl
      const f = out[key].flat
      console.log('   ' + key.padEnd(10) + ' WebGL (' + g.mode + ') swing ' + g.swing?.toFixed(2) + ' bright ' + g.meanL.toFixed(3) + '   reduced (' + f.mode + ') swing ' + f.swing?.toFixed(2) + ' bright ' + f.meanL.toFixed(3) + '   reduced/WebGL ' + ((f.meanL / g.meanL - 1) * 100).toFixed(1) + '%   rows ' + g.n + '/' + f.n)
    }
  }
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
