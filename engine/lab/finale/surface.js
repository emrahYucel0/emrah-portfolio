// THE SHEET — the one full-screen 2D canvas the finale is drawn on, plus the static ground beneath.
// The resting row field is the bench's bare-sheet idiom, value for value:
//   ground   flat #efeee9            — base.css :16 (--ground); the bench paints it flat
//                                      (LabBench.vue frame() :401 `c.fillStyle = '#efeee9'`), no weather
//   pitch    P ? 5.2 : 7             — states.js rowSpacing :91 / LabBench.vue geom() :76
//   thick    P ? 0.72 : 0.85         — LabBench.vue geom() :76
//   ink      rgba(18,18,18,.5)       — LabBench.vue paintTrim() :320
//   rows     TOP → H - BOT           — LabBench.vue rowsLoop() :285 with resize() :144 BOT
// The `?from=bench` opening variant reproduces the bench's registered WEIGHT field
// (LabBench.vue stepWeight :189 + paintField :292–304) so integration can bind the opening to
// whatever C2's real Lab-exit frame is.

import { GROUND, rowSpacing, rowThick, ROW_ALPHA, footHeight, isPortrait } from './theme.js'

export function createSurface(S) {
  function makePaper() {
    const c = S.paperCtx
    c.fillStyle = GROUND
    c.fillRect(0, 0, S.W, S.H)
  }

  const geometry = () => {
    const P = isPortrait(S.W, S.H)
    return {
      P,
      sp: rowSpacing(P),
      th: rowThick(P),
      top: S.top, // rows start under the strip (the strip is a frame the rows press against)
      bot: S.H - footHeight(S.W, S.H), // and stop at the foot band, as on the bench
    }
  }

  function rowsLoop(g, fn) {
    for (let row = 0; ; row++) {
      const cy = g.top + row * g.sp + g.sp * 0.5
      if (cy > g.bot) break
      fn(cy)
    }
  }

  // `tear`: { row, birth } — the torn row thins to nothing as the tear completes; its gap is
  // never refilled. The yielding band around the moving line is the LINE's own pass (it softly
  // erases this layer along its sprung path), so the rows here stay one uniform material.
  // `parting` (src/weight/parting.js): the rows part along the cells' borders — bent through
  // the lenses, cut with round ends at the channels. Rows it does not touch stay the bench's
  // exact fillRect rows (the opening frame's bit-parity is kept: at p = 0 nothing is parted).
  const STEP = 8
  const tmp = [0, 1]
  function drawRestingRows(alpha = ROW_ALPHA, tear = null, parting = null) {
    const c = S.ctx
    const g = geometry()
    c.fillStyle = `rgba(18,18,18,${alpha})`
    const bent = []
    let row = 0
    rowsLoop(g, (cy) => {
      const r = row++
      if (tear && r === tear.row && tear.birth > 0.002) {
        const h = g.th * (1 - tear.birth)
        if (h > 0.02) c.fillRect(0, cy - h * 0.5, S.W, h)
        return
      }
      if (parting?.key && parting.affects(cy)) { bent.push(cy); return }
      c.fillRect(0, cy - g.th * 0.5, S.W, g.th)
    })
    if (!bent.length) return
    // the parted rows as ONE path, rebuilt only when the parting itself changes (a scroll that
    // does not open it, a resting sheet: the cached path is just filled again)
    const pk = `${parting.key}|${S.W}x${S.H}|${g.sp}|${g.th}`
    if (pk !== partedKey) { partedPath = buildParted(bent, parting, g); partedKey = pk }
    c.fill(partedPath)
  }
  let partedKey = '', partedPath = null
  /** each parted row: a thin band whose centre follows the lens and whose thickness thins
   *  inside the opening (sampled only along the lens), straight elsewhere; channel cuts end in
   *  round caps */
  function buildParted(bent, parting, g) {
    const path = new Path2D()
    const half = g.th * 0.5
    for (const cy of bent) {
      let segs = [[0, S.W]]
      for (const [a, b] of parting.cuts(cy)) {
        segs = segs.flatMap(([s, e]) => (b <= s || a >= e ? [[s, e]] : [[s, a], [b, e]].filter(([u, v]) => v - u > 0.5)))
      }
      const lenses = parting.lensSpans(cy)
      const act = parting.prep(cy)
      for (const [s, e] of segs) {
        // sample columns: every STEP inside a lens span, just the ends outside
        const xs = [s]
        for (const [l0, l1] of lenses) {
          const a = Math.max(s, l0), b = Math.min(e, l1)
          for (let x = a; x < b; x += STEP) if (x > s) xs.push(x)
          if (b > s && b < e) xs.push(b)
        }
        xs.push(e)
        xs.sort((u, v) => u - v)
        const n = xs.length - 1
        const ys = new Float32Array(n + 1), hs = new Float32Array(n + 1)
        for (let i = 0; i <= n; i++) {
          parting.at(act, xs[i], tmp)
          ys[i] = cy + tmp[0]; hs[i] = half * tmp[1]
        }
        path.moveTo(xs[0], ys[0] - hs[0])
        for (let i = 1; i <= n; i++) path.lineTo(xs[i], ys[i] - hs[i])
        for (let i = n; i >= 0; i--) path.lineTo(xs[i], ys[i] + hs[i])
        // round ends where a channel cut the row
        if (s > 0 && hs[0] > 0.05) { path.moveTo(s, ys[0]); path.arc(s, ys[0], hs[0], Math.PI / 2, (3 * Math.PI) / 2) }
        if (e < S.W && hs[n] > 0.05) { path.moveTo(e, ys[n]); path.arc(e, ys[n], hs[n], -Math.PI / 2, Math.PI / 2) }
      }
    }
    return path
  }

  // ── the bench's registered WEIGHT field, still, for the ?from=bench opening variant ──
  // LabBench.vue: railX (geom :74), stepWeight's gaussian shares (:189–200, phase 0),
  // paintField weight rows and rules (:292–304), paintTrim (:318).
  function drawBenchWeightField(alpha = 1) {
    const c = S.ctx
    const g = geometry()
    const short = S.H < 470
    const railX = g.P ? 62 : short ? 86 : 104
    const raw = []
    let sum = 0
    for (let i = 0; i < 5; i++) {
      const d = Math.min(Math.abs(i - 0), 5 - Math.abs(i - 0)) // attention phase 0
      const v = 0.08 + Math.exp(-(d * d) / (2 * 0.62 * 0.62))
      raw.push(v); sum += v
    }
    const w = raw.map((v) => v / sum)
    c.save()
    c.globalAlpha = alpha
    // trim: the bare sheet left of the rail
    c.fillStyle = 'rgba(18,18,18,.5)'
    rowsLoop(g, (cy) => c.fillRect(0, cy - g.th * 0.5, railX, g.th))
    // field: the partition's rows, share by share
    let acc = 0
    const edges = [railX]
    for (let i = 0; i < 5; i++) { acc += w[i]; edges.push(railX + (S.W - railX) * acc) }
    c.fillStyle = '#121212'
    rowsLoop(g, (cy) => {
      for (let i = 0; i < 5; i++) {
        const share = Math.min(2.4, Math.max(0, w[i] * 5))
        const hw = g.th * (0.28 + share * 0.26)
        c.fillRect(edges[i], cy - hw, Math.max(0, edges[i + 1] - edges[i]) - 1, hw * 2)
      }
    })
    c.strokeStyle = 'rgba(18,18,18,.44)'; c.lineWidth = 1
    for (let i = 1; i < 5; i++) {
      const rx = Math.round(edges[i]) + 0.5
      c.beginPath(); c.moveTo(rx, g.top + 10); c.lineTo(rx, g.bot - 10); c.stroke()
    }
    c.restore()
  }

  function clear() { S.ctx.clearRect(0, 0, S.W, S.H) }

  return { makePaper, drawRestingRows, drawBenchWeightField, clear, geometry }
}
