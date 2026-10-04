// R9, STEP 2 — THE PROTOTYPES SIDE BY SIDE: off (shipped), A, B, C (docs/IMAGE-QUALITY.md). At rest and in motion.
//
//   node iqr9.cjs <port> [--cfg=WxH@dpr,...] [--variants=off,a,b,c] [--rest-only] [--motion-only]
//
// The build on <port> must carry the ?r9= key (feature/image-quality). Every variant is loaded in a fresh context, so
// nothing carries over between them.
//
// AT REST — the same bare-ground rows as iqrows.cjs (its own extraction and exclusions, imported):
//   swing   max/min of a row's light over the phases its rows occupy. 1.00 = every row equally bright.
//   bright  the mean light of a bare row, against off. Each variant is calibrated to keep it; this checks it did.
//
// IN MOTION — what the eye calls shimmer: a row's light changing while the row only moves. Columns of the backing
// store are read every frame while something moves, every row is followed from one drawn frame to the next (same
// column, its centre within 0.35 of the local pitch), and the change in its light is taken:
//   flicker p50 / p90   |ΔL| / L over every followed row that MOVED (its centre by more than 0.02 px), frame to
//                       frame: a row standing still cannot shimmer, and counting it only dilutes the number
//   moving              how many of those rows actually crossed a pixel phase (|Δphase| > 0.05)
// A row that changes width for a reason of its own (a passage thinning its field, a ripple's compression) changes
// light in every variant alike; the differences between variants are the phase part.
//
//   transition   Full-Stack → Linefield's stop (both dark: pale rows on night), by go()
//   scroll       Ege, inside, frame 0 → 1 (its own dark red ground), as a wheel would move it
//   ripple       the pointer drawn across Full-Stack's ground
//   passage      Linefield, its progress stepped 0 → 1 in 90 even steps, one drawn frame each (dark half, then cream)
const pw = require('playwright')
const fs = require('fs')
const IQ = require('./iqrows.cjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const args = process.argv.slice(2)
const port = args[0]
const opt = (k) => (args.find((a) => a.startsWith('--' + k + '=')) || '').slice(k.length + 3)
const CONFIGS = opt('cfg')
  ? opt('cfg').split(',').map((s) => { const m = /(\d+)x(\d+)@([\d.]+)/.exec(s); return [+m[1], +m[2], +m[3]] })
  : [[1920, 991, 1], [1440, 900, 1.5], [1440, 900, 2]]
const VARIANTS = (opt('variants') || 'off,a,b,c').split(',')
const REST = !args.includes('--motion-only')
const MOTION = !args.includes('--rest-only')
const OUT = 'out/iq/r9'
fs.mkdirSync(OUT, { recursive: true })
IQ.site.origin = 'http://127.0.0.1:' + port
IQ.site.loc = 'tr'

const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const LUT = Float64Array.from({ length: 256 }, (_, i) => toLin(i / 255))
const linLum = (r, g, b) => 0.2126 * LUT[r] + 0.7152 * LUT[g] + 0.0722 * LUT[b]
const hx = (h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255)
const q8 = (v) => Math.round(v * 255)
const PAPER = hx('#e7e6e0')
const NIGHT = hx('#0e0f11')
const INK = hx('#121212')
const EGE = hx('#6a1f1c')
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null)
const pct = (a, p) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : null)

// ─── at rest ────────────────────────────────────────────────────────────────
const REST_SCENES = [
  { key: 'fullstack', label: 'Full-Stack' },
  { key: 'work', label: 'Ege inside' },
  { key: 'lfdark', label: 'Linefield dark' },
  { key: 'creative', label: 'Creative (cream)' },
]
async function rest(p, scene, STOP) {
  const info = await IQ.enter(p, scene, STOP)
  const st = await IQ.stateOf(p, scene, info)
  const T = st.tex ? { tw: st.tex.tw, th: st.tex.th, d: Buffer.from(st.tex.b64, 'base64') } : null
  const env = await p.evaluate(() => ({ R: window.__lab.V.dpr * window.__lab.V.u, strip: window.__lab.V.strip, bw: window.__lab.surface.gl.drawingBufferWidth }))
  const xs = []
  for (let x = 7; x < env.bw - 7; x += 13) xs.push(x)
  const rows = []
  const FR = st.amp > 0.001 ? 4 : 1
  for (let f = 0; f < FR; f++) {
    const r = await IQ.readBacking(p, xs)
    r.cols.forEach((c, ci) => {
      const col = IQ.decodeCol(c)
      const y0 = Math.ceil(env.strip * env.R) + 2
      const y1 = Math.floor((r.H / env.R - env.strip) * env.R) - 2
      for (const row of IQ.rowsOf(col.slice(y0, y1), st.ink, st.paper, st.spacing * env.R)) {
        const x = xs[ci] / env.R
        const y = (y0 + row.c) / env.R
        if (!IQ.outside(st.boxes, x, y)) continue
        const g = IQ.groundAt(st, T, x, y)
        if (g) rows.push(row)
      }
    })
    await sleep(150)
  }
  const mL = med(rows.map((r) => r.L))
  const clean = rows.filter((r) => r.L > 0.35 * mL && r.L < 2.8 * mL)
  const B = IQ.BINS
  const sum = new Float64Array(B)
  const cnt = new Float64Array(B)
  for (const r of clean) { const b = Math.min(B - 1, Math.floor(r.phase / 0.5 * B)); sum[b] += r.L; cnt[b]++ }
  const means = [...sum].map((s, i) => (cnt[i] >= 15 ? s / cnt[i] : null)).filter((v) => v != null)
  const covered = [...cnt].map((c, i) => (c >= 15 ? i : -1)).filter((i) => i >= 0)
  return {
    n: clean.length, coverage: covered.length ? (covered.at(-1) - covered[0] + 1) * 0.5 / B : 0,
    swing: means.length ? Math.max(...means) / Math.min(...means) : null,
    meanL: clean.reduce((s, r) => s + r.L, 0) / (clean.length || 1),
  }
}

// ─── in motion ──────────────────────────────────────────────────────────────
/** every drawn frame while `act` runs: the given backing columns, or a step function driving the passage */
async function capture(p, xs, o) {
  return p.evaluate(async ({ xs, o }) => {
    const L = window.__lab
    const gl = L.surface.gl
    const H = gl.drawingBufferHeight
    const raf = () => new Promise((r) => requestAnimationFrame(r))
    const buf = new Uint8Array(H * 4)
    const frames = []
    let last = ''
    const t0 = performance.now()
    for (let i = 0; frames.length < o.maxF; i++) {
      if (o.steps) {
        if (i > o.steps) break
        L.lfSet(i / o.steps)
        await raf(); await raf()
      } else {
        if (i === 2) {
          if (o.act === 'go') L.go(L.STOP[o.to])
          if (o.act === 'frame') { const A = L.A; A.wbase = o.to; A.wpT = o.to; A.gesture = false }
        }
        await raf()
        if (performance.now() - t0 > o.dur) break
      }
      const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      let s = ''
      for (const x of xs) {
        gl.readPixels(x, 0, 1, H, gl.RGBA, gl.UNSIGNED_BYTE, buf)
        for (let y = H - 1; y >= 0; y--) s += String.fromCharCode(buf[y * 4], buf[y * 4 + 1], buf[y * 4 + 2])
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      if (s !== last) { frames.push(btoa(s)); last = s }
    }
    return { H, frames }
  }, { xs, o })
}

/** rows in one column of one frame, wherever their pitch is locally even; the ground decides which pair normalises */
function motionRows(col, pairs) {
  const n = col.length
  const ground = med(col.map((v) => linLum(v[0], v[1], v[2])))
  const [ink, paper] = ground < 0.25 ? pairs.dark : pairs.light
  const gL = linLum(q8(paper[0]), q8(paper[1]), q8(paper[2]))
  const den = linLum(q8(ink[0]), q8(ink[1]), q8(ink[2])) - gL
  const e = col.map((v) => (linLum(v[0], v[1], v[2]) - gL) / den)
  const peaks = []
  for (let i = 1; i < n - 1; i++) if (e[i] > 0.05 && e[i] >= e[i - 1] && e[i] > e[i + 1]) peaks.push(i)
  const out = []
  for (let k = 1; k < peaks.length - 1; k++) {
    const dp = peaks[k] - peaks[k - 1]
    const dn = peaks[k + 1] - peaks[k]
    if (dp < 3 || dn < 3 || Math.abs(dp - dn) > 0.08 * (dp + dn) / 2 + 1.01) continue
    const a = peaks[k] - Math.floor(dp / 2)
    const b = peaks[k] + Math.floor(dn / 2)
    if (e[a] > 0.04 || e[b] > 0.04) continue
    let L = 0
    let m1 = 0
    for (let j = a; j <= b; j++) { L += e[j]; m1 += j * e[j] }
    if (L <= 0) continue
    const c = m1 / L
    out.push({ c, L, phase: Math.abs(c - Math.round(c)), pitch: (dp + dn) / 2 })
  }
  return out
}

function flicker(cap, nCols, pairs) {
  const H = cap.H
  const per = []
  for (const f of cap.frames) {
    const raw = Buffer.from(f, 'base64')
    const cols = []
    for (let ci = 0; ci < nCols; ci++) {
      const col = []
      for (let y = 0; y < H; y++) { const o = (ci * H + y) * 3; col.push([raw[o], raw[o + 1], raw[o + 2]]) }
      cols.push(motionRows(col, pairs))
    }
    per.push(cols)
  }
  const ch = []
  const chMoving = []
  let moving = 0
  for (let t = 1; t < per.length; t++) {
    for (let ci = 0; ci < nCols; ci++) {
      const prev = per[t - 1][ci]
      const cur = per[t][ci]
      if (!prev.length || !cur.length) continue
      const mL = med(cur.map((r) => r.L))
      for (const r of cur) {
        if (r.L < 0.35 * mL || r.L > 2.8 * mL) continue
        let best = null
        for (const q of prev) if (!best || Math.abs(q.c - r.c) < Math.abs(best.c - r.c)) best = q
        if (!best || Math.abs(best.c - r.c) > 0.35 * r.pitch) continue
        const d = Math.abs(r.L - best.L) / ((r.L + best.L) / 2)
        ch.push(d)
        // a row that did not move cannot shimmer; pooling it with the ones that did only dilutes the number
        if (Math.abs(r.c - best.c) > 0.02) chMoving.push(d)
        if (Math.abs(r.phase - best.phase) > 0.05) moving++
      }
    }
  }
  return { frames: cap.frames.length, pairs: ch.length, moving, p50: med(ch), p90: pct(ch, 0.9), movedPairs: chMoving.length, mp50: med(chMoving), mp90: pct(chMoving, 0.9) }
}

const MOTIONS = [
  {
    key: 'transition', label: 'Full-Stack → Linefield',
    setup: async (p) => { await p.goto(IQ.site.origin + '/tr' + IQ.site.q, { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 90000 }); await sleep(2600); await p.evaluate(() => window.__lab.go(window.__lab.STOP.system)); await sleep(2800) },
    run: (p, xs) => capture(p, xs, { act: 'go', to: 'linefield', dur: 2600, maxF: 120 }),
    pairs: { dark: [PAPER, NIGHT], light: [INK, PAPER] },
  },
  {
    key: 'scroll', label: 'Ege, frame 0 → 1',
    setup: async (p) => { await p.goto(IQ.site.origin + '/tr/work/ege' + IQ.site.q, { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.__lab?.A.mode === 'world' && !window.__lab.A.busy, null, { timeout: 90000 }); await sleep(2800) },
    run: (p, xs) => capture(p, xs, { act: 'frame', to: 1, dur: 2400, maxF: 120 }),
    pairs: { dark: [PAPER, EGE], light: [INK, PAPER] },
  },
  {
    key: 'ripple', label: 'pointer across Full-Stack', cols: [0.28, 0.66, 70],
    setup: async (p) => { await p.goto(IQ.site.origin + '/tr' + IQ.site.q, { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 90000 }); await sleep(2600); await p.evaluate(() => window.__lab.go(window.__lab.STOP.system)); await sleep(2800) },
    run: async (p, xs, W, H) => {
      await p.mouse.move(W * 0.3, H * 0.5)
      const [cap] = await Promise.all([
        capture(p, xs, { dur: 2200, maxF: 120 }),
        // at a hand's speed, one step a frame: Playwright's own `steps` sends them all within a few milliseconds,
        // and the physics then sees one jump rather than a pointer travelling (the first trial moved 0.4% of rows)
        (async () => {
          await sleep(80)
          for (let i = 1; i <= 90; i++) {
            const t = i / 90
            const x = t < 0.6 ? 0.3 + (0.62 - 0.3) * (t / 0.6) : 0.62 - (0.62 - 0.4) * ((t - 0.6) / 0.4)
            const y = 0.5 + 0.06 * Math.sin(t * Math.PI * 2)
            await p.mouse.move(W * x, H * y)
            await sleep(16)
          }
        })(),
      ])
      return cap
    },
    pairs: { dark: [PAPER, NIGHT], light: [INK, PAPER] },
  },
  {
    key: 'passage', label: 'Linefield, 0 → 1',
    setup: async (p) => { await p.goto(IQ.site.origin + '/tr' + IQ.site.q, { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 90000 }); await sleep(2600); await p.evaluate(() => window.__lab.go(window.__lab.STOP.linefield)); await sleep(2800); await p.evaluate(() => window.__lab.lfSet(0)); await sleep(600) },
    run: (p, xs) => capture(p, xs, { steps: 90, maxF: 200 }),
    pairs: { dark: [PAPER, NIGHT], light: [INK, PAPER] },
  },
]

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const results = []
  const f2 = (v, d = 2) => (v == null ? '-' : v.toFixed(d))
  console.log('== R9 STEP 2: the prototypes side by side, http://127.0.0.1:' + port)
  for (const [W, H, dpr] of CONFIGS) {
    console.log('')
    console.log('-- ' + W + 'x' + H + '@' + dpr)
    for (const v of VARIANTS) {
      IQ.site.q = v === 'off' ? '?r9=off' : '?r9=' + v
      const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
      await ctx.addInitScript(() => {
        const o = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (t, a) { if (t === 'webgl2') a = Object.assign({}, a || {}, { preserveDrawingBuffer: true }); return o.call(this, t, a) }
      })
      const p = await ctx.newPage()
      const errs = []
      p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/preload/.test(m.text())) errs.push(m.text().slice(0, 140)) })
      p.on('pageerror', (e) => errs.push('pageerror ' + e.message))
      await p.goto(IQ.site.origin + '/tr' + IQ.site.q, { waitUntil: 'networkidle' })
      await p.waitForFunction(() => window.__lab?.A.mode === 'index', null, { timeout: 90000 })
      const STOP = await p.evaluate(() => window.__lab.STOP)
      const res = { W, H, dpr, variant: v, rest: {}, motion: {} }
      if (REST) for (const s of REST_SCENES) res.rest[s.key] = await rest(p, s, STOP)
      if (MOTION) {
        for (const m of MOTIONS) {
          await m.setup(p)
          const bw = await p.evaluate(() => window.__lab.surface.gl.drawingBufferWidth)
          const xs = []
          const [c0, c1, nC] = m.cols || [0.04, 0.96, 22]
          for (let i = 0; i < nC; i++) xs.push(Math.round(bw * (c0 + (c1 - c0) * i / (nC - 1))))
          const cap = await m.run(p, xs, W, H)
          res.motion[m.key] = flicker(cap, xs.length, m.pairs)
        }
      }
      res.errors = errs
      results.push(res)
      const r = res.rest
      const mo = res.motion
      console.log('   ' + v.padEnd(4)
        + (REST ? ' REST swing/bright: ' + REST_SCENES.map((s) => s.key + ' ' + f2(r[s.key]?.swing) + '/' + f2(r[s.key]?.meanL, 3)).join('  ') : '')
        + (MOTION ? '\n        MOTION, rows that moved, flicker p50/p90 (rows, frames): ' + MOTIONS.map((m) => m.key + ' ' + f2(mo[m.key].mp50 * 100, 1) + '/' + f2(mo[m.key].mp90 * 100, 1) + '% (' + mo[m.key].movedPairs + ', ' + mo[m.key].frames + 'f)').join('  ') : '')
        + (errs.length ? '\n        console: ' + errs.join(' | ') : ''))
      await ctx.close()
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  fs.writeFileSync(OUT + '/iqr9-' + stamp + '.json', JSON.stringify(results, null, 1))
  console.log('')
  console.log('written ' + OUT + '/iqr9-' + stamp + '.json')
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
