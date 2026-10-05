// R19 — DOES THE MESH AT THE RIMS SHIMMER IN MOTION? The same frame-to-frame measure as R9, in the capsules' most
// compressed zone.
//
//   node r19mesh.cjs <port> [--cfg=WxH@dpr,...] [--modes=off,both] [--param=r19]
//
// With the rule on, rows crowded against a capsule's rim are narrowed instead of fused into a mass, so at DPR 1 the
// zone right at the rim is rows closer than a pixel — a fine mesh. The question is whether that mesh flickers as
// things move. Full-height blocks of the backing store are read every drawn frame (iqr9.cjs's capture: one readback
// per block, and the capacity governor reported), across each capsule's flat middle, while:
//
//   ripple       the pointer drawn along just outside the lower capsule's top rim, at a hand's speed
//   to-system    Creative -> Full-Stack (the faces swap; the zone forms)
//   to-creative  Full-Stack -> Creative
//
// In each frame and column the zone is 0-40 px out from each rim (the rim found as the void's edge, as iqhalo.cjs does).
// Two numbers, frame to frame:
//
//   rows    R9's measure: every row the zone can still resolve (local pitch 2 px or more) followed from one drawn frame
//           to the next, |dL| / L over the rows that moved — p50 / p90
//   dens    the same rows, but their ink per their own pitch: with the rule on, a row's ink is MEANT to follow its
//           compression (ink per area is what is kept), so this is the part of the change that is not the rule's
//   mesh    where rows are closer than that and cannot be told apart: the ink in fixed 4 px windows of the zone,
//           |d ink| / the zone's mean ink, over the windows whose ink changed — p50 / p90
//
// The open field's numbers from R9 (iqr9.cjs, B) are the bar: about 0.5-2% p50.
const pw = require('playwright')
const fs = require('fs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)
const port = args[0]
const opt = (k) => (args.find((a) => a.startsWith('--' + k + '=')) || '').slice(k.length + 3)
const CONFIGS = opt('cfg') ? opt('cfg').split(',').map((s) => { const m = /(\d+)x(\d+)@([\d.]+)/.exec(s); return [+m[1], +m[2], +m[3]] }) : [[1920, 991, 1], [1440, 900, 1]]
const MODES = (opt('modes') || 'off,both').split(',')
const PARAM = opt('param') || 'r19'
const OUT = 'out/iq/r19mesh'
fs.mkdirSync(OUT, { recursive: true })
const toLin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const LIN = Float64Array.from({ length: 256 }, (_, i) => toLin(i))
const med = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null)
const pct = (a, q) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * q))] : null)

async function capture(p, blocks, o) {
  return p.evaluate(async ({ blocks, o }) => {
    const L = window.__lab
    const gl = L.surface.gl
    const H = gl.drawingBufferHeight
    const raf = () => new Promise((r) => requestAnimationFrame(r))
    const buf = new Uint8Array(Math.max(...blocks.map((b) => b[1])) * H * 4)
    const frames = []
    let constrained = 0
    let last = ''
    const t0 = performance.now()
    for (let i = 0; frames.length < o.maxF; i++) {
      if (i === 2 && o.act === 'go') L.go(L.STOP[o.to])
      await raf()
      if (performance.now() - t0 > o.dur) break
      const fb = gl.getParameter(gl.FRAMEBUFFER_BINDING)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      let s = ''
      for (const [x0, w] of blocks) {
        gl.readPixels(x0, 0, w, H, gl.RGBA, gl.UNSIGNED_BYTE, buf)
        for (let c = 0; c < w; c++) for (let y = H - 1; y >= 0; y--) { const o4 = (y * w + c) * 4; s += String.fromCharCode(buf[o4], buf[o4 + 1], buf[o4 + 2]) }
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      if (L.A.constrained) constrained++
      if (s !== last) { frames.push(btoa(s)); last = s }
    }
    return { H, frames, constrained }
  }, { blocks, o })
}

/** one column of one frame, as ink (0 paper, 1 ink) for the given pair */
function inkCol(raw, ci, H, lp, li) {
  const e = new Float64Array(H)
  for (let y = 0; y < H; y++) { const o = (ci * H + y) * 3; e[y] = (0.2126 * LIN[raw[o]] + 0.7152 * LIN[raw[o + 1]] + 0.0722 * LIN[raw[o + 2]] - lp) / (li - lp) }
  return e
}
/** the zones of a column: [start, end) pixel ranges 0-40 px out from each rim of each capsule */
function zonesOf(e, caps, R) {
  const z = []
  for (const cap of caps) {
    for (const dir of [-1, 1]) {
      let y = Math.round(cap.cy * R)
      if (e[y] > 0.03) continue   // no void here this frame (mid-swap): no rim to measure from
      while (y > 0 && y < e.length - 1 && e[y] < 0.03) y += dir
      const a = y, b = y + dir * Math.round(40 * R)
      z.push([Math.max(0, Math.min(a, b)), Math.min(e.length, Math.max(a, b))])
    }
  }
  return z
}
function rowsIn(e, a, b) {
  const pk = []
  for (let i = a + 1; i < b - 1; i++) if (e[i] > 0.05 && e[i] >= e[i - 1] && e[i] > e[i + 1]) pk.push(i)
  const out = []
  for (let k = 1; k < pk.length - 1; k++) {
    const dp = pk[k] - pk[k - 1], dn = pk[k + 1] - pk[k]
    if (dp < 2 || dn < 2) continue
    const lo = pk[k] - Math.floor(dp / 2), hi = pk[k] + Math.floor(dn / 2)
    let L = 0, m1 = 0
    for (let j = lo; j <= hi; j++) { L += Math.max(0, e[j]); m1 += j * Math.max(0, e[j]) }
    if (L > 0) out.push({ c: m1 / L, L, pitch: (dp + dn) / 2 })
  }
  return out
}

;(async () => {
  const b = await pw.chromium.launch({ channel: 'chrome' })
  const results = []
  console.log(`== R19: the rims' zone in motion, http://127.0.0.1:${port}`)
  for (const [W, H, dpr] of CONFIGS) {
    for (const mode of MODES) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dpr })
      await ctx.addInitScript(() => {
        const o = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (t, a) { if (t === 'webgl2') a = Object.assign({}, a || {}, { preserveDrawingBuffer: true }); return o.call(this, t, a) }
      })
      const p = await ctx.newPage()
      await p.goto(`http://127.0.0.1:${port}/tr?${PARAM}=${mode}`, { waitUntil: 'load', timeout: 90000 })
      await p.waitForFunction(() => window.__lab && window.__lab.A.mode === 'index', null, { timeout: 90000 })
      await sleep(1800)
      const line = []
      for (const sc of ['ripple', 'to-system', 'to-creative']) {
        const from = sc === 'to-system' ? 'creative' : 'system'
        await p.evaluate((n) => window.__lab.go(window.__lab.STOP[n]), from)
        await sleep(2800)
        const g = await p.evaluate((n) => {
          const L = window.__lab
          const st = L.IDX()[L.STOP[n]]
          return { R: L.V.dpr * L.V.u, bw: L.surface.gl.drawingBufferWidth, caps: (st.features || []).filter((f) => !f.kind).map((f) => ({ cx: f.cx, cy: f.cy, h: f.h, hw: f.hw })), pairs: { system: [L.IDX()[L.STOP.system].ink, L.IDX()[L.STOP.system].paper], creative: [L.IDX()[L.STOP.creative].ink, L.IDX()[L.STOP.creative].paper] } }
        }, from)
        // blocks across the capsules' flat middle
        const blocks = []
        for (const cap of g.caps) for (const f of [-0.25, 0, 0.25]) blocks.push([Math.round((cap.cx + f * cap.hw) * g.R), 8])
        let cap
        if (sc === 'ripple') {
          const low = g.caps[1]
          const y = (low.cy - low.h - 14)
          await p.mouse.move((low.cx - low.hw * 0.4) * g.R / dpr, y)
          ;[cap] = await Promise.all([
            capture(p, blocks, { dur: 2200, maxF: 140 }),
            (async () => { await sleep(80); for (let i = 1; i <= 90; i++) { const t = i / 90; await p.mouse.move((low.cx + low.hw * (-0.4 + 0.8 * (t < 0.5 ? t * 2 : 2 - t * 2))) * g.R / dpr, y + Math.sin(t * 9) * 5); await sleep(16) } })(),
          ])
        } else {
          cap = await capture(p, blocks, { act: 'go', to: sc === 'to-system' ? 'system' : 'creative', dur: 2600, maxF: 140 })
        }
        const nCols = blocks.reduce((n, x) => n + x[1], 0)
        // which ground each frame shows is the face it is on; ink from that face's pair
        const lum = (c) => 0.2126 * toLin(Math.round(c[0] * 255)) + 0.7152 * toLin(Math.round(c[1] * 255)) + 0.0722 * toLin(Math.round(c[2] * 255))
        const rowsCh = [], densCh = [], meshCh = []
        let prev = null
        for (const f of cap.frames) {
          const raw = Buffer.from(f, 'base64')
          const cur = []
          for (let ci = 0; ci < nCols; ci++) {
            // the face: dark ground is Full-Stack's
            const mid = raw[(ci * cap.H + Math.round(cap.H / 2)) * 3]
            const [ink, paper] = mid < 128 ? g.pairs.system : g.pairs.creative
            const e = inkCol(raw, ci, cap.H, lum(paper), lum(ink))
            const zones = zonesOf(e, g.caps, g.R)
            cur.push({ e, zones, rows: zones.map(([a, z]) => rowsIn(e, a, z)) })
          }
          if (prev) {
            for (let ci = 0; ci < nCols; ci++) {
              const A = prev[ci], B = cur[ci]
              B.zones.forEach(([a, z], zi) => {
                const pa = A.zones[zi]
                if (!pa) return
                // rows: R9's measure on what the zone can resolve
                for (const r of B.rows[zi]) {
                  let best = null
                  for (const q of A.rows[zi] || []) if (!best || Math.abs(q.c - r.c) < Math.abs(best.c - r.c)) best = q
                  if (!best || Math.abs(best.c - r.c) > 0.35 * r.pitch || Math.abs(best.c - r.c) < 0.02) continue
                  rowsCh.push(Math.abs(r.L - best.L) / ((r.L + best.L) / 2))
                  const d1 = r.L / r.pitch, d0 = best.L / best.pitch
                  densCh.push(Math.abs(d1 - d0) / ((d1 + d0) / 2))
                }
                // mesh: fixed 4 px windows where rows are closer than 2 px
                let zs = 0, zn = 0
                for (let j = a; j < z; j++) { zs += Math.max(0, B.e[j]); zn++ }
                const zm = zn ? zs / zn : 0
                if (!(zm > 0.01)) return
                for (let j = a; j + 4 <= z; j += 4) {
                  // a window is mesh when it holds three or more peaks (rows closer than 2 px)
                  let pk = 0
                  for (let k = j; k < j + 4; k++) if (B.e[k] > 0.05 && B.e[k] >= (B.e[k - 1] ?? 0) && B.e[k] > (B.e[k + 1] ?? 0)) pk++
                  let w0 = 0, w1 = 0
                  for (let k = j; k < j + 4; k++) { w0 += Math.max(0, A.e[k]); w1 += Math.max(0, B.e[k]) }
                  const d = Math.abs(w1 - w0) / 4 / zm
                  if (pk >= 2 && d > 0.001) meshCh.push(d)
                }
              })
            }
          }
          prev = cur
        }
        const r = { scene: sc, frames: cap.frames.length, constrained: cap.constrained, rows: { n: rowsCh.length, p50: med(rowsCh), p90: pct(rowsCh, 0.9) }, dens: { p50: med(densCh), p90: pct(densCh, 0.9) }, mesh: { n: meshCh.length, p50: med(meshCh), p90: pct(meshCh, 0.9) } }
        results.push({ W, H, dpr, mode, ...r })
        const f1 = (v) => (v == null ? '-' : (v * 100).toFixed(1))
        line.push(`${sc}: rows ${f1(r.rows.p50)}/${f1(r.rows.p90)}% (${r.rows.n}) dens ${f1(r.dens.p50)}/${f1(r.dens.p90)}%  mesh ${f1(r.mesh.p50)}/${f1(r.mesh.p90)}% (${r.mesh.n})  ${r.frames}f${r.constrained ? ' CONSTRAINED ' + r.constrained : ''}`)
      }
      console.log(`   ${(W + 'x' + H + '@' + dpr).padEnd(13)} ${mode.padEnd(5)} ` + line.join('   |   '))
      await ctx.close()
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  fs.writeFileSync(`${OUT}/r19mesh-${stamp}.json`, JSON.stringify(results, null, 1))
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
