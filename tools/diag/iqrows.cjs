// R9, STEP 1 — DOES THE SUB-PIXEL MODEL EXPLAIN THE DARK-GROUND SHIMMER? Measurement only; nothing in the engine changes.
//
//   node iqrows.cjs <port> [locale] [--only=<scene>] [--cfg=WxH@dpr,...]
//
// THE MODEL (docs/ROADMAP.md, R9, 2026-10-04). A row is narrower than a backing pixel. The shader takes one sample per
// pixel, its edge is a smoothstep (aa = 0.75 / uDpr) that does not preserve area, and ink and paper are mixed as sRGB
// values. So the light a row gives off depends on where its centre falls inside a pixel: by the model, 2.2-2.4 times
// between the best and the worst position on a dark ground at ratio 1, and only 1.19 times on cream.
//
// WHAT IS READ.
//   backing  the canvas's own pixels, with readPixels. An init script creates the WebGL2 context with
//            preserveDrawingBuffer, so the pixels can be read after they are presented. They are the same pixels.
//   screen   a screenshot: what the compositor shows. At DPR 2 that is the 1.5 backing store, upscaled.
//
// THE ESTIMATOR, applied identically to the real pixels and to synthetic rows drawn by a JS copy of the shader's
// coverage, so whatever bias it has cancels. For each row in a set of columns:
//   L      the row's light in LINEAR luminance, as a fraction of the ink-paper contrast, summed over one pitch;
//   phase  how far the row's centroid is from a pixel centre, 0 to 0.5.
// Only rows on BARE GROUND count: both neighbours at the nominal pitch (sub-pixel centres, +-6%), nothing at the
// window's edges, fully opaque, outside every opening's reach, every pocket and text line, 24 px clear of the side
// edges (Linefield fades its rows there), and with no type, void or saturation in the state's own content texture
// within a pitch.
//
// NO FREE PARAMETER. Each row's width is read from the state's content texture: hw = thick * (0.5 + tone * 1.15 *
// wgain), as surface.js rows() computes it. Each row is predicted AT ITS OWN measured phase, and the bins only group
// the residuals. The single best-fitting width is printed beside it as a diagnostic.
//
// THE MODEL HOLDS for a config when the rows cover a phase range of at least 0.25 and
//   1. the binned L(phase) curve is within 5% RMS of the prediction;
//   2. the measured max/min of L over the covered bins is within 15% of the prediction's over the same bins.
// Narrower coverage is reported as NOT TESTABLE, never as a pass.
//
// HOW THE TEST CHANGED AFTER THE FIRST RUNS (2026-10-04), so nobody reads it as fixed in advance. Fixed in advance:
// the 5% and 15% thresholds and the 0.25 coverage rule. Changed, each for a reason found in the data:
//   - a third criterion, "the fitted width within 15% of 0.5 x thick", was dropped. That expected value left out the
//     tone term the shader adds; the width is now read per row from the texture instead of fitted;
//   - bins compare each row with the model at its own phase (rows cluster inside a bin, the curve is steep near 0);
//   - the exclusions above were added: a work's pocket (rows at 40%), the openings' reach, the type, Linefield's edges.
const pw = require('playwright')
const sharp = require('sharp')
const fs = require('fs')
const { stopsOf } = require('./stops.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const args = process.argv.slice(2)
const port = args[0]
const loc = args[1] && !args[1].startsWith('--') ? args[1] : 'tr'
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7)
const cfgArg = (args.find((a) => a.startsWith('--cfg=')) || '').slice(6)
const OUT = 'out/iq/rows'
fs.mkdirSync(OUT, { recursive: true })

// the user's own screen first (1920x991), a common laptop size, and one large screen at DPR 1 (u = 1.333): the class
// R20 is about, and the one configuration where a 7 px row lands at many different phases
const CONFIGS = cfgArg
  ? cfgArg.split(',').map((s) => { const m = s.match(/(\d+)x(\d+)@([\d.]+)/); return [+m[1], +m[2], +m[3]] })
  : [[1920, 991, 1], [1440, 900, 1], [1920, 991, 1.5], [1440, 900, 1.5], [1920, 991, 2], [1440, 900, 2], [2560, 1440, 1]]
const SCENES = [
  { key: 'fullstack', label: 'Full-Stack (dark)', dark: true },
  { key: 'work', label: 'Ege, inside (dark)', dark: true },
  { key: 'lfdark', label: 'Linefield dark half', dark: true },
  { key: 'creative', label: 'Creative (cream control)', dark: false },
].filter((s) => !only || s.key === only)

// ─── colour ─────────────────────────────────────────────────────────────────
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const LUT = Float64Array.from({ length: 256 }, (_, i) => toLin(i / 255))
const linLum = (r, g, b) => 0.2126 * LUT[r] + 0.7152 * LUT[g] + 0.0722 * LUT[b]
const srgbLum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const q8 = (v) => Math.max(0, Math.min(255, Math.round(v * 255)))

// ─── the estimator ──────────────────────────────────────────────────────────
/**
 * Rows in one column. `px` is an array of [r, g, b, a] bytes from top to bottom; `ink` and `paper` are 0..1 sRGB
 * triples; `pitch` is the nominal row pitch in the pixels of this column. Returns { L, phase, peak, c } per clean row.
 */
function rowsOf(px, ink, paper, pitch) {
  const gL = linLum(q8(paper[0]), q8(paper[1]), q8(paper[2]))
  const iL = linLum(q8(ink[0]), q8(ink[1]), q8(ink[2]))
  const gS = srgbLum(q8(paper[0]), q8(paper[1]), q8(paper[2]))
  const den = iL - gL
  const n = px.length
  const e = new Float64Array(n)
  const sl = new Float64Array(n)
  const op = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const [r, g, b, a] = px[i]
    e[i] = (linLum(r, g, b) - gL) / den
    sl[i] = Math.abs(srgbLum(r, g, b) - gS)
    op[i] = a === 255 ? 1 : 0
  }
  const h = Math.floor(pitch / 2)
  const peaks = []
  for (let i = 1; i < n - 1; i++) {
    if (e[i] < 0.05 || e[i] < e[i - 1] || e[i] <= e[i + 1]) continue
    if (peaks.length && i - peaks[peaks.length - 1] < pitch * 0.6) { if (e[i] > e[peaks[peaks.length - 1]]) peaks[peaks.length - 1] = i; continue }
    peaks.push(i)
  }
  // every peak's window first; the neighbour test is made on the sub-pixel centres, not on the integer peaks
  const win = peaks.map((p) => {
    if (p - h < 0 || p + h >= n) return null
    let L = 0
    let m1 = 0
    let peak = 0
    let opaque = true
    for (let j = p - h; j <= p + h; j++) { L += e[j]; m1 += j * e[j]; peak = Math.max(peak, sl[j]); if (!op[j]) opaque = false }
    if (L <= 0) return null
    return { L, c: m1 / L, peak, ok: opaque && e[p - h] <= 0.03 && e[p + h] <= 0.03 }
  })
  const out = []
  const tol = pitch * 0.06 + 0.15
  for (let k = 1; k < win.length - 1; k++) {
    const w = win[k]
    if (!w || !w.ok || !win[k - 1] || !win[k + 1]) continue
    if (Math.abs(w.c - win[k - 1].c - pitch) > tol || Math.abs(win[k + 1].c - w.c - pitch) > tol) continue
    out.push({ L: w.L, c: w.c, phase: Math.abs(w.c - Math.round(w.c)), peak: w.peak })
  }
  return out
}

// ─── the model: the shader's coverage, in JS ─────────────────────────────────
const smoothstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }
/** one synthetic backing column with a single row at y0 (backing px), drawn as surface.js rows() draws it */
function synthBacking(y0, hw, R, ink, paper, n) {
  const aa = 0.75 / R
  const col = []
  for (let j = 0; j < n; j++) {
    const dist = Math.abs(j - y0) / R
    const a = smoothstep(hw + aa, hw - aa, dist) * Math.min(1, Math.max(0, hw * 4))
    col.push([0, 1, 2].map((c) => paper[c] + (ink[c] - paper[c]) * a))
  }
  return col
}
/** the compositor's upscale of a backing column by k (bilinear, in sRGB values), 8-bit at the end */
function toDevice(col, k, n) {
  const out = []
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / k - 0.5
    const x0 = Math.max(0, Math.min(col.length - 1, Math.floor(x)))
    const x1 = Math.min(col.length - 1, x0 + 1)
    const f = Math.min(1, Math.max(0, x - x0))
    out.push([0, 1, 2].map((c) => q8(col[x0][c] * (1 - f) + col[x1][c] * f)).concat(255))
  }
  return out
}
/**
 * The model's L and peak as functions of the ESTIMATED phase, tabulated finely. R is backing px per composition px,
 * k the screen's upscale of the backing store (1 when the screen is read at the backing's own size).
 *
 * Why per sample and not per bin: the estimator pulls a narrow row's centroid towards the pixel centre, so the curve
 * is steep near phase 0, and the real rows do not fall evenly inside a bin — at an integer pitch most of them share
 * one phase. A bin's average is then a different average in the data and in a uniform model. Each measured row is
 * compared with the model AT ITS OWN measured phase instead, and the bins only group the residuals.
 */
const BINS = 10
const FINE = 200
const cache = new Map()
function modelTable(hw, R, k, ink, paper, pitch) {
  const key = [hw.toFixed(4), R, k, ink, paper, pitch].join('|')
  if (cache.has(key)) return cache.get(key)
  const sumL = new Float64Array(FINE)
  const sumP = new Float64Array(FINE)
  const cnt = new Float64Array(FINE)
  // a periodic train of rows at the real pitch, so the window sees its neighbours' tails exactly as in the data; tall
  // enough that the middle rows have both neighbours at any pitch
  const spacingB = pitch / k
  const N = Math.max(32, Math.ceil(spacingB * 10))
  const n = Math.ceil(N * k)
  const STEPS = 240
  for (let s = 0; s < STEPS; s++) {
    const y0 = N / 2 + (s / STEPS) * 3   // three backing px: every alignment of the 4:3 upscale is visited
    const col = []
    for (let j = 0; j < N; j++) col.push([paper[0], paper[1], paper[2]])
    for (let r = -6; r <= 6; r++) {
      const one = synthBacking(y0 + r * spacingB, hw, R, ink, paper, N)
      for (let j = 0; j < N; j++) for (let c = 0; c < 3; c++) if (Math.abs(one[j][c] - paper[c]) > Math.abs(col[j][c] - paper[c])) col[j][c] = one[j][c]
    }
    const dev = k === 1 ? col.map((v) => v.map(q8).concat(255)) : toDevice(col, k, n)
    const rows = rowsOf(dev, ink, paper, pitch)
    for (const r of rows) {
      const b = Math.min(FINE - 1, Math.floor(r.phase / 0.5 * FINE))
      sumL[b] += r.L; sumP[b] += r.peak; cnt[b]++
    }
  }
  // fill the empty fine bins by interpolation between their filled neighbours
  const fill = (sum) => {
    const v = [...sum].map((s, i) => (cnt[i] ? s / cnt[i] : null))
    const idx = v.map((x, i) => (x == null ? -1 : i)).filter((i) => i >= 0)
    return v.map((x, i) => {
      if (x != null) return x
      const lo = idx.filter((j) => j < i).pop()
      const hi = idx.find((j) => j > i)
      if (lo == null) return v[hi]
      if (hi == null) return v[lo]
      return v[lo] + (v[hi] - v[lo]) * (i - lo) / (hi - lo)
    })
  }
  const t = { L: fill(sumL), P: fill(sumP), lo: [...cnt].findIndex((c) => c > 0) * 0.5 / FINE, hi: (FINE - [...cnt].reverse().findIndex((c) => c > 0)) * 0.5 / FINE }
  cache.set(key, t)
  return t
}
const at = (t, ph, which = 'L') => {
  const x = Math.min(FINE - 1, Math.max(0, ph / 0.5 * FINE - 0.5))
  const i = Math.floor(x)
  const j = Math.min(FINE - 1, i + 1)
  return t[which][i] + (t[which][j] - t[which][i]) * (x - i)
}

/**
 * per bin of measured phase: the measured mean of L and the model's mean of L at the same rows' phases. `tOf(row)`
 * gives the model table a row is predicted from — its own width, read from the texture, or one fitted width.
 */
function compare(rows, tOf) {
  const sd = new Float64Array(BINS)
  const sm = new Float64Array(BINS)
  const pd = new Float64Array(BINS)
  const pm = new Float64Array(BINS)
  const cnt = new Float64Array(BINS)
  for (const r of rows) {
    const t = tOf(r)
    const b = Math.min(BINS - 1, Math.floor(r.phase / 0.5 * BINS))
    sd[b] += r.L; sm[b] += at(t, r.phase); pd[b] += r.peak; pm[b] += at(t, r.phase, 'P'); cnt[b]++
  }
  const m = (s) => [...s].map((v, i) => (cnt[i] ? v / cnt[i] : null))
  return { data: m(sd), model: m(sm), pData: m(pd), pModel: m(pm), cnt: [...cnt] }
}
const sseOf = (c) => {
  let sse = 0
  let nb = 0
  for (let i = 0; i < BINS; i++) if (c.cnt[i] >= 15) { sse += (c.data[i] - c.model[i]) ** 2; nb++ }
  return { sse, nb }
}

/** a DIAGNOSTIC only: the one width that fits best, to compare with the widths the texture gives */
function fit(rows, R, k, ink, paper, pitch) {
  let best = null
  for (let hw = 0.25; hw <= 0.651; hw += 0.005) {
    const t = modelTable(hw, R, k, ink, paper, pitch)
    const c = compare(rows, () => t)
    const { sse, nb } = sseOf(c)
    if (nb && (!best || sse < best.sse)) best = { hw, sse, nb, t, c }
  }
  return best
}

const ratioOver = (arr, use) => {
  const v = arr.filter((x, i) => use[i] && x != null)
  return v.length ? Math.max(...v) / Math.min(...v) : null
}

// ─── the page ───────────────────────────────────────────────────────────────
async function readBacking(p, xs) {
  return p.evaluate((xs) => {
    const gl = window.__lab.surface.gl
    const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING)
    const rfb = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    const H = gl.drawingBufferHeight
    const buf = new Uint8Array(H * 4)
    const cols = []
    for (const x of xs) {
      gl.readPixels(x, 0, 1, H, gl.RGBA, gl.UNSIGNED_BYTE, buf)
      // GL's origin is the bottom: flip, so index 0 is the top of the screen
      let s = ''
      for (let y = H - 1; y >= 0; y--) for (let c = 0; c < 4; c++) s += String.fromCharCode(buf[y * 4 + c])
      cols.push(btoa(s))
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    if (rfb !== fb) gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rfb)
    return { H, cols }
  }, xs)
}
const decodeCol = (b64) => {
  const raw = Buffer.from(b64, 'base64')
  const out = []
  for (let i = 0; i < raw.length; i += 4) out.push([raw[i], raw[i + 1], raw[i + 2], raw[i + 3]])
  return out
}

async function enter(p, scene, STOP) {
  if (scene.key === 'work') {
    await p.goto('http://127.0.0.1:' + port + '/' + loc + '/work/ege', { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'world' && !window.__lab.A.busy, null, { timeout: 90000 })
    await sleep(2600)
    // the first frame the surface actually draws, with rows over most of its height
    const n = await p.evaluate(() => window.__lab.frames(window.__lab.A.k).length)
    for (let j = 0; j < n; j++) {
      await p.evaluate((j) => { const A = window.__lab.A; A.wbase = j; A.wpT = j; A.gesture = false; A.lastInput = -1e9 }, j)
      await sleep(2600)
      const st = await p.evaluate((j) => { const s = window.__lab.WORLD()[window.__lab.A.k]?.[j]; return s ? { id: s.id, voids: (s.layout?.rooms || []).length } : null }, j)
      const probe = await readBacking(p, [Math.round((await p.evaluate(() => window.__lab.surface.gl.drawingBufferWidth)) * 0.08)])
      const col = decodeCol(probe.cols[0])
      const opaque = col.filter((v) => v[3] === 255).length / col.length
      if (st && opaque > 0.85) return { frame: j, id: st.id }
    }
    throw new Error('no drawn frame in the work')
  }
  await p.goto('http://127.0.0.1:' + port + '/' + loc, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 })
  await sleep(2800)
  const place = scene.key === 'fullstack' ? 'system' : scene.key === 'creative' ? 'creative' : 'linefield'
  if (STOP && STOP[place] === undefined) throw new Error('no place ' + place)
  await p.evaluate((i) => window.__lab.go(i), STOP[place])
  await sleep(2600)
  if (scene.key === 'lfdark') { await p.evaluate(() => window.__lab.lfSet(0)); await sleep(800) }
  return { place }
}

async function stateOf(p, scene, info) {
  return p.evaluate(({ key, info }) => {
    const L = window.__lab
    let s
    if (key === 'work') s = L.WORLD()[L.A.k][info.frame]
    else s = L.IDX()[L.STOP[info.place]]
    /*
     * WHERE THE ROWS ARE NOT BARE GROUND, in composition px. An opening moves rows across its whole reach (R19's
     * pile-up lives there), a work's pocket thins them to 40% and a text line clears them: each is a different row
     * width, and mixing widths in one curve tests nothing. Rows inside these boxes are left out.
     */
    const boxes = []
    for (const f of s.features || []) {
      if (f.kind !== 0 && f.kind != null) continue
      const ry = Math.max(0, f.h) + (f.reach || 0) + 4 * (f.falloff || 30) + 6
      boxes.push([f.cx - 1.3 * f.hw, f.cy - ry, f.cx + 1.3 * f.hw, f.cy + ry])
    }
    // and the screen's own side edges: Linefield fades its rows there on purpose (corridor.js, uLFfade.w), which a
    // first run read as 92 rows the model could not explain — every one of them in the outermost two columns
    boxes.push([-1e9, -1e9, 24, 1e9], [L.V.W - 24, -1e9, 1e9, 1e9])
    const pad = (r, m) => [r.x - m, r.y - m, r.x + r.w + m, r.y + r.h + m]
    for (const r of s.lines || []) boxes.push(pad(r, 12))
    if (key === 'work') for (const r of L.frames(L.A.k)[info.frame].voids || []) boxes.push(pad(r, 40))
    if (key === 'work' && s.layout?.text) boxes.push(pad(s.layout.text, 40))
    /*
     * AND WHAT THE STATE CARRIES UNDER EACH ROW: its content texture, read back whole. R tone, G type, B void, A static
     * saturation (states.js). The tone sets a row's width (surface.js rows(): hw = thick * (0.5 + tone * 1.15 * wgain)),
     * so every row's expected width is known and the model has no free parameter; type, voids and saturation mark the
     * rows that are not bare ground.
     */
    const gl = L.surface.gl
    let tex = null
    if (s.c && s.c.tex) {
      const fb0 = gl.getParameter(gl.FRAMEBUFFER_BINDING)
      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, s.c.tex, 0)
      const { tw, th } = s.c
      const buf = new Uint8Array(tw * th * 4)
      gl.readPixels(0, 0, tw, th, gl.RGBA, gl.UNSIGNED_BYTE, buf)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb0)
      gl.deleteFramebuffer(fbo)
      let str = ''
      for (let i = 0; i < buf.length; i += 8192) str += String.fromCharCode.apply(null, buf.subarray(i, i + 8192))
      tex = { tw, th, b64: btoa(str) }
    }
    const H = { y: s.toneThick ?? 1, w: s.amp * (s.ampK ?? 1) }
    const wgain = H.y > 1.01 ? H.y : Math.min(H.w, 1)
    return {
      id: s.id, spacing: s.spacing, thick: s.thick, amp: s.amp * (s.ampK ?? 1), ink: [...s.ink], paper: [...s.paper], boxes,
      tex, texH: s.texH, offY: s.offY || 0, VW: L.V.W, wgain, split: !!s.split,
    }
  }, { key: scene.key, info })
}
/**
 * For a row at (x, y) in composition px: is the ground around it bare (no type, void or saturation within a pitch
 * above and below), and what tone does it carry? null when it is not bare.
 */
function groundAt(st, T, x, y) {
  if (!T) return { tone: 0 }
  const tx = Math.round(x * T.tw / st.VW)
  const reach = Math.ceil(st.spacing * T.th / st.texH)
  const ty0 = Math.round((y + st.offY) * T.th / st.texH)
  let tone = 0
  for (let dy = -reach; dy <= reach; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = tx + dx
    const yy = ty0 + dy
    if (xx < 0 || yy < 0 || xx >= T.tw || yy >= T.th) return null
    const o = (yy * T.tw + xx) * 4
    if (T.d[o + 1] > 4 || T.d[o + 2] > 4 || T.d[o + 3] > 4) return null
    if (dx === 0 && dy === 0) tone = T.d[o] / 255
  }
  return { tone }
}
const hwOf = (st, tone) => st.thick * (0.5 + tone * 1.15 * st.wgain)
const outside = (boxes, x, y) => !boxes.some((b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3])

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const results = []
  console.log('== R9 STEP 1: the sub-pixel model against the real build, http://127.0.0.1:' + port + '/' + loc)
  for (const [W, H, dpr] of CONFIGS) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
    await ctx.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        if (type === 'webgl2') attrs = Object.assign({}, attrs || {}, { preserveDrawingBuffer: true })
        return orig.call(this, type, attrs)
      }
    })
    const p = await ctx.newPage()
    const errors = []
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text().slice(0, 160)) })
    await p.goto('http://127.0.0.1:' + port + '/' + loc, { waitUntil: 'networkidle', timeout: 120000 })
    await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 })
    const STOP = await stopsOf(p)
    for (const scene of SCENES) {
      const info = await enter(p, scene, STOP)
      const st = await stateOf(p, scene, info)
      const T = st.tex ? { tw: st.tex.tw, th: st.tex.th, d: Buffer.from(st.tex.b64, 'base64') } : null
      st.tex = T ? { tw: T.tw, th: T.th } : null
      // a measured row is kept only on bare ground, and carries the width the shader gives it there
      const onGround = (row, x, y) => {
        if (!outside(st.boxes, x, y)) return false
        const g = groundAt(st, T, x, y)
        if (!g) return false
        row.tone = g.tone
        row.hw = hwOf(st, g.tone)
        row.x = x
        row.y = y
        return true
      }
      const env = await p.evaluate(() => {
        const L = window.__lab
        const gl = L.surface.gl
        const ext = gl.getExtension('WEBGL_debug_renderer_info')
        return {
          R: L.V.dpr * L.V.u, u: L.V.u, vdpr: L.V.dpr, dpr: devicePixelRatio, bw: gl.drawingBufferWidth, bh: gl.drawingBufferHeight,
          strip: L.V.strip, constrained: !!L.A.constrained, gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '?',
        }
      })
      // columns: every 13th backing px across the width, inside the strips
      const xs = []
      for (let x = 7; x < env.bw - 7; x += 13) xs.push(x)
      const FR = st.amp > 0.001 && !env.constrained ? 8 : 2
      const back = []
      const tracks = []
      for (let f = 0; f < FR; f++) {
        const r = await readBacking(p, xs)
        r.cols.forEach((c, ci) => {
          const col = decodeCol(c)
          const y0 = Math.ceil(env.strip * env.R) + 2
          const y1 = Math.floor((r.H / env.R - env.strip) * env.R) - 2
          const rows = rowsOf(col.slice(y0, y1), st.ink, st.paper, st.spacing * env.R)
            .filter((row) => onGround(row, xs[ci] / env.R, (y0 + row.c) / env.R))
          for (const row of rows) { back.push(row); tracks.push({ ci, f, c: row.c, L: row.L, phase: row.phase, hw: row.hw }) }
        })
        await sleep(120)
      }
      // screen: hide the DOM, read the same columns from a screenshot at the device's own pixels
      await p.evaluate(() => document.querySelectorAll('.layer, .strip, #__nuxt').forEach((e) => { e.style.visibility = 'hidden' }))
      await sleep(200)
      const png = await p.screenshot()
      const img = await sharp(png).raw().toBuffer({ resolveWithObject: true })
      await p.evaluate(() => document.querySelectorAll('.layer, .strip, #__nuxt').forEach((e) => { e.style.visibility = '' }))
      const screen = []
      const sw = img.info.width
      const sh = img.info.height
      const ch = img.info.channels
      for (let x = 7; x < sw - 7; x += 13) {
        const col = []
        for (let y = 0; y < sh; y++) { const o = (y * sw + x) * ch; col.push([img.data[o], img.data[o + 1], img.data[o + 2], 255]) }
        const y0 = Math.ceil(env.strip * env.u * dpr) + 2
        const y1 = sh - Math.ceil(env.strip * env.u * dpr) - 2
        // in device px a composition px is u * dpr wide
        const cs = env.u * dpr
        for (const row of rowsOf(col.slice(y0, y1), st.ink, st.paper, st.spacing * cs)) if (onGround(row, x / cs, (y0 + row.c) / cs)) screen.push(row)
      }
      const tag = scene.key + '-' + W + 'x' + H + '@' + dpr
      await sharp(png).extract({ left: Math.round(sw * 0.3), top: Math.round(sh * 0.45), width: Math.min(80, sw - Math.round(sw * 0.3)), height: 60 }).resize({ width: 640, kernel: 'nearest' }).toFile(OUT + '/CROP-' + tag + '.png')

      const q = (hw) => Math.round(hw / 0.005) * 0.005
      const analyse = (rows, R, k, pitch) => {
        const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : 0)
        const mL = med(rows.map((r) => r.L))
        const clean = rows.filter((r) => r.L > 0.35 * mL && r.L < 2.8 * mL)
        if (!clean.length) return { n: 0, coverage: 0, verdict: 'NOT TESTABLE' }
        // THE TEST: every row predicted from its own width, read from the texture. No free parameter.
        const tOf = (r) => modelTable(q(r.hw), R, k, st.ink, st.paper, pitch)
        const c = compare(clean, tOf)
        const { sse, nb } = sseOf(c)
        const use = c.cnt.map((n) => n >= 15)
        const covered = use.map((u2, i) => (u2 ? i : -1)).filter((i) => i >= 0)
        const coverage = covered.length ? (covered.at(-1) - covered[0] + 1) * (0.5 / BINS) : 0
        const meanL = covered.length ? covered.reduce((s2, i) => s2 + c.data[i], 0) / covered.length : 0
        const rms = nb ? Math.sqrt(sse / nb) / meanL : null
        const ratioData = ratioOver(c.data, use)
        const ratioModelSame = ratioOver(c.model, use)
        const verdict = coverage < 0.25 || !nb ? 'NOT TESTABLE'
          : (rms <= 0.05 && Math.abs(ratioData / ratioModelSame - 1) <= 0.15) ? 'HOLDS' : 'FAILS'
        // what the model says over EVERY phase, at the scene's median width: the best row position against the worst
        const hwMed = med(clean.map((r) => r.hw))
        const t = modelTable(q(hwMed), R, k, st.ink, st.paper, pitch)
        const tl = t.L.slice(Math.ceil(t.lo / 0.5 * FINE), Math.floor(t.hi / 0.5 * FINE))
        const tp = t.P.slice(Math.ceil(t.lo / 0.5 * FINE), Math.floor(t.hi / 0.5 * FINE))
        const spread = (a) => { const v = a.filter((x, i) => use[i] && x != null); return v.length ? Math.max(...v) - Math.min(...v) : null }
        // diagnostic: the single width that would fit best
        const best = fit(clean, R, k, st.ink, st.paper, pitch)
        return {
          n: clean.length, coverage, hwMed, hwMin: Math.min(...clean.map((r) => r.hw)), hwMax: Math.max(...clean.map((r) => r.hw)), hwFit: best ? best.hw : null, rms, verdict,
          ratioData, ratioModelSame, ratioModelFull: Math.max(...tl) / Math.min(...tl),
          peakSpreadData: spread(c.pData), peakSpreadModelSame: spread(c.pModel), peakSpreadModelFull: Math.max(...tp) - Math.min(...tp),
          bins: { data: c.data, model: c.model, cnt: c.cnt }, tOf,
        }
      }
      const kScreen = (env.u * dpr) / env.R
      const aB = analyse(back, env.R, 1, st.spacing * env.R)
      const aS = analyse(screen, env.R, kScreen, st.spacing * env.u * dpr)

      // the shimmer itself: how much one row's light changes from frame to frame, against what its own phases predict
      let crawl = null
      if (FR > 2 && aB.tOf) {
        const predict = (t) => at(aB.tOf(t), t.phase)
        const byKey = new Map()
        for (const t of tracks.filter((t) => t.f === 0)) byKey.set(t.ci + ':' + t.c.toFixed(1), [t])
        for (const t of tracks.filter((t) => t.f > 0)) for (const [, s] of byKey) if (s[0].ci === t.ci && Math.abs(s[0].c - t.c) < 1 && s.length === t.f) { s.push(t); break }
        const cvs = []
        for (const [, s] of byKey) {
          if (s.length !== FR) continue
          const ms = s.map((t) => predict(t)).filter((v) => v != null)
          if (ms.length !== FR) continue
          const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length
          const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) }
          cvs.push([sd(s.map((t) => t.L)) / mean(s.map((t) => t.L)), sd(ms) / mean(ms)])
        }
        const med2 = (a) => [...a].sort((x, y) => x - y)[a.length >> 1]
        if (cvs.length) crawl = { rows: cvs.length, measured: med2(cvs.map((c) => c[0])), predicted: med2(cvs.map((c) => c[1])) }
      }

      if (args.includes('--dump')) fs.writeFileSync(OUT + '/DUMP-' + tag + '.json', JSON.stringify(back.map((r) => [+r.x.toFixed(1), +r.y.toFixed(2), +r.L.toFixed(4), +r.phase.toFixed(3)])))
      delete aB.tOf
      delete aS.tOf
      const res = { scene: scene.key, label: scene.label, W, H, dpr, info, state: st, env, backing: aB, screen: aS, crawl, frames: FR, consoleErrors: errors.splice(0) }
      results.push(res)
      const f2 = (v, d = 2) => (v == null ? '-' : v.toFixed(d))
      console.log('')
      console.log('-- ' + scene.label + '  ' + W + 'x' + H + '@' + dpr + '  ratio ' + f2(env.R, 3) + '  backing ' + env.bw + 'x' + env.bh + '  pitch ' + f2(st.spacing) + ' comp px  thick ' + st.thick + '  amp ' + f2(st.amp) + (env.constrained ? '  CONSTRAINED' : '') + '  [' + st.id + ']')
      for (const [nm, a] of [['backing', aB], ['screen ', aS]]) {
        console.log('   ' + nm + '  rows ' + String(a.n).padEnd(6) + 'phases ' + f2(a.coverage) + '  hw from texture ' + f2(a.hwMin, 3) + '-' + f2(a.hwMax, 3) + ' (median ' + f2(a.hwMed, 3) + '; best single fit ' + f2(a.hwFit, 3) + ')  rms ' + f2(a.rms == null ? null : a.rms * 100, 1) + '%'
          + '  L max/min: data ' + f2(a.ratioData) + ' model ' + f2(a.ratioModelSame) + ' (all phases ' + f2(a.ratioModelFull) + ')'
          + '  peak spread (sRGB levels): data ' + f2(a.peakSpreadData, 1) + ' model ' + f2(a.peakSpreadModelSame, 1) + ' (all phases ' + f2(a.peakSpreadModelFull, 1) + ')  -> ' + a.verdict)
      }
      if (crawl) console.log('   crawl    ' + crawl.rows + ' rows tracked over ' + FR + ' frames: light changes ' + f2(crawl.measured * 100, 1) + '% (sd/mean), the model predicts ' + f2(crawl.predicted * 100, 1) + '% from the same rows\' phases')
      if (res.consoleErrors.length) console.log('   console: ' + res.consoleErrors.join(' | '))
    }
    await ctx.close()
  }
  const gpu = results[0]?.env.gpu
  console.log('')
  console.log('GPU: ' + gpu)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  fs.writeFileSync(OUT + '/iqrows-' + stamp + '.json', JSON.stringify(results, null, 1))
  console.log('written ' + OUT + '/iqrows-' + stamp + '.json')
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
