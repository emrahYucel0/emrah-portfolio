// 02 · LINE — the accepted focused study (research lab-reopen/focused-final/line-rich), as production code.
//
// Reproduced in behaviour, geometry untouched: the six destination states (taut, curve, aperture, gathered spool,
// released spool, quiet boundary), the parameter-morph transitions (no index-front blend: every intermediate frame is
// a valid geometry of one line), the scroll model, the one fixed budget, the physics constants (K 95 · TENSION 2100 ·
// DAMP 7.5), the colour and the base weight. The enrichment is kept too: the mark is DRAWN, not stroked (the pen
// lands and lifts, a slow hand pressure, ink pooling in the tightest turn — the mean weight unchanged); the ground is
// paper (one faint weather pass, baked per resize); the sheet is registered (a left edge with a mark per state, the
// reached ones stay printed); the ledger is a measure (a rule along the bottom edge, filled to the spent fraction).
import { builder, resample, hemCurve, cutCurve, curveOuterPoint, createPhysics } from './line-core.js'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }

const INK = '#151412'
const HEM_DEPTH = 72
const SQ = 0.94
const STEP = 4.6
const LOOPN = 220
const QW = 0.085
export const LINE_STATES = 6

// ── one winding family: a plain ring (Rin = Rout, 1 turn) and the hand-wound spool (Rin = 0, many turns) ──
function winding(cx, cy, Rout, Rin, turns, wob = 1, seed = 7) {
  const twMax = 2 * Math.PI * Math.max(0.02, turns)
  const pts = []
  let tw = 0
  while (tw <= twMax) {
    const f = tw / twMax
    const r0 = lerp(Rout, Rin, f)
    const th = twMax + 2 - tw
    const w = 1 + wob * (0.032 * Math.sin(th * 0.23 + seed) + 0.016 * Math.sin(th * 1.93 + seed * 2.1) + 0.01 * Math.sin(th * 5.1 + seed * 0.7))
    const a = Math.PI / 2 - tw
    const r = r0 * w
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a) * SQ])
    if (tw === twMax) break
    tw = Math.min(twMax, tw + Math.min(0.5, STEP / Math.max(6, r0)))
  }
  return pts
}
const polyLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L }
function turnsFor(Rout, Rin, target, wob = 1, seed = 7) {
  let T = target / (Math.PI * (Rout + Rin) || 1)
  for (let i = 0; i < 4; i++) {
    const got = polyLen(winding(0, 0, Rout, Rin, T, wob, seed))
    if (Math.abs(got - target) < 0.5) break
    T *= target / got
  }
  return T
}
function resampleLoop(pts, M) {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const tot = cum[cum.length - 1] || 1
  const out = []
  let j = 1
  for (let k = 0; k <= M; k++) {
    const c = (tot * k) / M
    while (j < pts.length - 1 && cum[j] < c) j++
    const seg = cum[j] - cum[j - 1] || 1
    const t = clamp((c - cum[j - 1]) / seg, 0, 1)
    out.push([lerp(pts[j - 1][0], pts[j][0], t), lerp(pts[j - 1][1], pts[j][1], t)])
  }
  return out
}
const arcAt = (cx, cy, r, a0, a1, n) => {
  const o = []
  for (let i = 1; i <= n; i++) { const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]) }
  return o
}
function stadiumLoop(cx, yBottom, w, h, M = LOOPN) {
  w = Math.max(0.01, w); h = Math.max(0.01, h)
  const r = Math.min(w, h) / 2
  const x = cx - w / 2, b = yBottom, y = b - h
  const raw = [
    [cx, b], [x + w - r, b], ...arcAt(x + w - r, b - r, r, 90, 0, 14),
    [x + w, y + r], ...arcAt(x + w - r, y + r, r, 0, -90, 14),
    [x + r, y], ...arcAt(x + r, y + r, r, -90, -180, 14),
    [x, b - r], ...arcAt(x + r, b - r, r, 180, 90, 14),
    [cx, b],
  ]
  return resampleLoop(raw, M)
}

/**
 * @param {{ ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, W: number, H: number, DPR: number, top: number, reduced: boolean }} S
 */
export function createLineStudy(S) {
  let V = null, phys = null, prevF = null, cur = null, reach = 0
  const cache = { k: -1, F: null }

  function view() {
    const W = S.W, H = S.H
    const P = W < H * 0.85
    const m = P ? 20 : clamp(Math.min(W, H) * 0.045, 24, 44)
    const rings = P || H < 470 ? 7 : 9
    const Rrel = Math.min(W * 0.3, (H - 2 * m) * 0.36)
    const coilLen = rings * Math.PI * Rrel
    const Rgat = Rrel * 0.5
    const cx = W * (P ? 0.5 : 0.46), cy = H * (P ? 0.48 : 0.5)
    const yc = H * (P ? 0.72 : 0.74)
    const Rend = Math.min(W * 0.11, H * 0.145)
    const lenEnd = 12 * Math.PI * Rend
    const v = {
      W, H, P, m, x: 0, y: 0, w: W, h: H,
      pitch: P ? 1.7 : 2.2, hemDepth: HEM_DEPTH, N: P ? 5200 : 9000, L: 0,
      yTaut: H * 0.44, yCurve: H * (P ? 0.52 : 0.5),
      amp: Math.min(H * 0.21, (W - 2 * m) * 0.13),
      yAp: H * (P ? 0.62 : 0.58),
      lw: P ? W - 2 * m : Math.min(W * 0.5, (H - 2 * m) * 1.6),
      cx, cy, Rgat, Rrel, coilLen,
      yc, Rend, lenEnd, cxE: W * (P ? 0.62 : 0.71),
      xKnee: W * (P ? 0.3 : 0.26), yDesc: H * (P ? 0.26 : 0.3),
      lwBase: P ? 1.05 : 1.15,
      taper: P ? 18 : 26,
    }
    v.lh = Math.min(P ? H * 0.34 : H * 0.44, v.lw * (P ? 1.05 : 0.6))
    v.Tgat = turnsFor(Rgat, 0, coilLen)
    v.Trel = turnsFor(Rrel, 0, coilLen)
    v.Tend = turnsFor(Rend, 0, lenEnd)
    v.kGat = (v.Tgat * Math.PI * Rgat) / coilLen
    v.kRel = (v.Trel * Math.PI * Rrel) / coilLen
    v.kEnd = (v.Tend * Math.PI * Rend) / lenEnd
    v.trimL = Math.max(8, Math.round(m - (P ? 10 : 15)))
    v.trimR = W - v.trimL
    v.spineY0 = Math.round(Math.max(H * (P ? 0.19 : 0.17), S.top + 24))
    v.spineY1 = Math.round(H - (P ? 96 : 104))
    if (v.spineY1 - v.spineY0 < 120) { v.spineY0 = Math.round(Math.max(H * 0.17, S.top + 12)); v.spineY1 = Math.round(H * 0.7) }
    v.ruleY = Math.round(H - (P ? 15 : 17)) + 0.5
    return v
  }

  function bentRun(y0, amp, x0, x1, n = 150) {
    const pts = []
    for (let i = 0; i <= n; i++) {
      const x = lerp(x0, x1, i / n)
      const u = (x - V.m) / Math.max(1, V.W - 2 * V.m)
      pts.push([x, y0 - Math.sin(Math.PI * u) * amp * (0.62 + 0.38 * Math.sin(Math.PI * u * 0.5))])
    }
    return pts
  }
  const bendY = (y0, amp, x) => {
    const u = (x - V.m) / Math.max(1, V.W - 2 * V.m)
    return y0 - Math.sin(Math.PI * u) * amp * (0.62 + 0.38 * Math.sin(Math.PI * u * 0.5))
  }

  function routeAt(u) {
    const b = builder()
    const { W, H, m } = V
    const seg = Math.min(Math.floor(u), LINE_STATES - 2)
    const t = clamp(u - seg, 0, 1)
    if (seg === 0) {
      const s = smooth(t)
      b.stroke(bentRun(lerp(V.yTaut, V.yCurve, s), V.amp * s, m, W - m))
      b.travel(W - m, H + 30)
      return b
    }
    if (seg === 1) {
      const s = smooth(t)
      const y0 = lerp(V.yCurve, V.yAp, s)
      const amp = V.amp * (1 - smooth(Math.min(1, t / 0.7)))
      const g = smooth(clamp((t - 0.1) / 0.9, 0, 1))
      const cxL = W / 2
      const yb = bendY(y0, amp, cxL)
      b.stroke(bentRun(y0, amp, m, cxL, 80))
      if (g > 0.002) for (const p of stadiumLoop(cxL, yb, V.lw * g, V.lh * g)) b.lineTo(p[0], p[1])
      b.stroke(bentRun(y0, amp, cxL, W - m, 80))
      b.travel(W - m, H + 30)
      return b
    }
    if (seg === 2) {
      const s = smooth(t)
      const yEnter = V.cy + V.Rgat * SQ
      if (s < 0.5) {
        const q = s / 0.5
        const y = lerp(V.yAp, yEnter, q)
        const cxL = lerp(W / 2, V.cx, q)
        const A = stadiumLoop(cxL, y, V.lw, V.lh)
        const B = resampleLoop(winding(cxL, y - V.Rgat * SQ, V.Rgat, V.Rgat, 1, 0), LOOPN)
        b.stroke([[m, y], [A[0][0], y]])
        for (let i = 0; i <= LOOPN; i++) b.lineTo(lerp(A[i][0], B[i][0], q), lerp(A[i][1], B[i][1], q))
        const ex = lerp(W - m, cxL, q)
        b.lineTo(ex, y)
        b.travel(ex, lerp(H + 30, y, q))
        return b
      }
      const q = (s - 0.5) / 0.5
      const pts = winding(V.cx, V.cy, V.Rgat, lerp(V.Rgat, 0, q), lerp(1, V.Tgat, q), q)
      b.stroke([[m, pts[0][1]], pts[0]])
      for (const p of pts) b.lineTo(p[0], p[1])
      return b
    }
    if (seg === 3) {
      const s = smooth(t)
      const R = lerp(V.Rgat, V.Rrel, s)
      const T = (V.coilLen * lerp(V.kGat, V.kRel, s)) / (Math.PI * R)
      const pts = winding(V.cx, V.cy, R, 0, T)
      b.stroke([[m, pts[0][1]], pts[0]])
      for (const p of pts) b.lineTo(p[0], p[1])
      return b
    }
    const s = smooth(t)
    const R = lerp(V.Rrel, V.Rend, s)
    const len = lerp(V.coilLen, V.lenEnd, s)
    const T = (len * lerp(V.kRel, V.kEnd, s)) / (Math.PI * R)
    const cx = lerp(V.cx, V.cxE, s)
    const cy = lerp(V.cy, V.yc - V.Rend * SQ, s)
    const pts = winding(cx, cy, R, 0, T)
    const enter = pts[0]
    const yTop = lerp(enter[1], V.yDesc, s)
    const xKnee = lerp(m + 1, V.xKnee, s)
    const lead = []
    for (let i = 0; i <= 44; i++) { const k = i / 44; lead.push([lerp(m, xKnee, k), lerp(yTop, enter[1], smooth(k))]) }
    b.stroke(lead)
    b.lineTo(enter[0], enter[1])
    for (const p of pts) b.lineTo(p[0], p[1])
    return b
  }

  function buildForm(b) {
    const Nr = V.Nroute
    const used = b.length()
    const curve = hemCurve(V.x + V.w + 12, V.hemTop, V.hemDepth, V.L * 1.02 + 400, V.pitch)
    const last = b.last()
    const need = V.L - used
    let lo = Math.max(20, need - Math.hypot(V.w, V.h) - 400)
    let hi = Math.max(20, need)
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      const o = curveOuterPoint(curve, mid)
      if (mid + Math.hypot(o[0] - last[0], o[1] - last[1]) > need) hi = mid
      else lo = mid
    }
    const hb = builder()
    hb.travel(last[0], last[1])
    hb.stroke(cutCurve(curve, (lo + hi) / 2))
    const R = resample(b.P, Nr)
    const Hm = resample(hb.P, V.N - Nr)
    const X = new Float32Array(V.N), Y = new Float32Array(V.N), INKS = new Float32Array(V.N)
    X.set(R.X, 0); Y.set(R.Y, 0); INKS.set(R.INK, 0)
    X.set(Hm.X, Nr); Y.set(Hm.Y, Nr); INKS.set(Hm.INK, Nr)
    INKS[Nr] = 0
    return { X, Y, INK: INKS, used, spent: used / V.L, len: R.len + Hm.len, hemIdx: Nr, Wd: null }
  }

  // the pressure profile, from the TARGET geometry: identical forwards and backwards, stable under the springs
  function widthsFor(F) {
    if (F.Wd) return F.Wd
    const hem = F.hemIdx, X = F.X, Y = F.Y, K = F.INK
    const raw = new Float32Array(hem)
    let i = 0
    while (i < hem) {
      if (K[i] <= 0.5) { i++; continue }
      let j = i
      while (j + 1 < hem && K[j + 1] > 0.5) j++
      let tot = 0
      for (let k = i + 1; k <= j; k++) tot += Math.hypot(X[k] - X[k - 1], Y[k] - Y[k - 1])
      let c = 0
      for (let k = i; k <= j; k++) {
        if (k > i) c += Math.hypot(X[k] - X[k - 1], Y[k] - Y[k - 1])
        const s = tot > 0 ? c / tot : 0
        const d = Math.min(c, tot - c)
        const tp = 0.34 + 0.66 * Math.sqrt(clamp(d / V.taper, 0, 1))
        const hand = 1 + 0.055 * Math.sin(6.2832 * 1.9 * s + 0.7) + 0.033 * Math.sin(6.2832 * 4.7 * s + 2.3)
        let pool = 1
        const a0 = Math.max(i, k - 4), b0 = Math.min(j, k + 4)
        if (b0 - a0 > 3) {
          const ax = X[k] - X[a0], ay = Y[k] - Y[a0], bx = X[b0] - X[k], by = Y[b0] - Y[k]
          const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by)
          if (la > 0.4 && lb > 0.4) {
            const dp = clamp((ax * bx + ay * by) / (la * lb), -1, 1)
            const curv = Math.acos(dp) / ((la + lb) / 2)
            pool = 1 + 0.17 * smooth(clamp((curv - 1 / 150) / (1 / 26 - 1 / 150), 0, 1))
          }
        }
        raw[k] = clamp(tp * hand * pool, 0.42, 1.44)
      }
      i = j + 1
    }
    const out = new Float32Array(hem)
    for (let k = 0; k < hem; k++) {
      if (raw[k] === 0) { out[k] = 0; continue }
      let a = 0, n = 0
      for (let q = -3; q <= 3; q++) { const z = k + q; if (z >= 0 && z < hem && raw[z] > 0) { a += raw[z]; n++ } }
      out[k] = a / n
    }
    F.Wd = out
    return out
  }

  function formAt(u) {
    const k = Math.round(u * 500)
    if (cache.k === k) return cache.F
    const F = buildForm(routeAt(k / 500))
    cache.k = k; cache.F = F
    return F
  }

  function makePaper() {
    const { W, H } = V
    const d = S.DPR, pc = S.paper
    pc.width = Math.max(1, Math.round(W * d))
    pc.height = Math.max(1, Math.round(H * d))
    const c = pc.getContext('2d')
    c.setTransform(d, 0, 0, d, 0, 0)
    c.fillStyle = '#efeee9'
    c.fillRect(0, 0, W, H)
    const R = Math.max(W, H)
    const blot = (fx, fy, fr, col) => {
      const g = c.createRadialGradient(W * fx, H * fy, 0, W * fx, H * fy, R * fr)
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)')
      c.fillStyle = g; c.fillRect(0, 0, W, H)
    }
    blot(0.5, 0.42, 0.88, 'rgba(255,255,255,.34)')
    blot(0.05, 0.05, 0.74, 'rgba(21,20,18,.017)')
    blot(0.96, 0.98, 0.8, 'rgba(21,20,18,.015)')
  }

  function build() {
    V = view()
    let max = 0
    for (let i = 0; i < LINE_STATES; i++) max = Math.max(max, routeAt(i).length())
    V.L = Math.ceil(max * 1.03 + (V.P ? 500 : 800))
    V.hemTop = V.H - (V.P ? 5 : 6)
    V.Nroute = Math.round(V.N * 0.8)
    cache.k = -1
    prevF = null
    makePaper()
    if (!phys || phys.X.length !== V.N) phys = createPhysics(V.N)
    phys.place(formAt(0))
  }

  function drawSpine(u) {
    const ctx = S.ctx
    const { spineY0: y0, spineY1: y1, trimL: x } = V
    const xr = x + 0.5
    ctx.lineCap = 'butt'
    ctx.beginPath(); ctx.moveTo(xr, y0); ctx.lineTo(xr, y1)
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(21,20,18,.26)'; ctx.stroke()
    ctx.beginPath()
    for (let i = 0; i <= 20; i++) { const y = Math.round(lerp(y0, y1, i / 20)) + 0.5; ctx.moveTo(xr + 1, y); ctx.lineTo(xr + (i % 5 === 0 ? 6.5 : 3.5), y) }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(21,20,18,.2)'; ctx.stroke()
    const yOf = (i) => Math.round(lerp(y0, y1, i / (LINE_STATES - 1)))
    for (let i = 0; i < LINE_STATES; i++) {
      const y = yOf(i)
      if (i <= reach + 1e-6) { ctx.fillStyle = 'rgba(21,20,18,.58)'; ctx.fillRect(xr - 1.5, y - 1.5, 3, 3) }
      else { ctx.beginPath(); ctx.moveTo(xr - 3.5, y + 0.5); ctx.lineTo(xr + 3.5, y + 0.5); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(21,20,18,.24)'; ctx.stroke() }
    }
    const yu = lerp(y0, y1, clamp(u, 0, LINE_STATES - 1) / (LINE_STATES - 1))
    ctx.fillStyle = INK; ctx.fillRect(xr - 2.5, Math.round(yu) - 2.5, 5, 5)
    ctx.beginPath(); ctx.moveTo(xr + 6, Math.round(yu) + 0.5); ctx.lineTo(xr + 21, Math.round(yu) + 0.5)
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(21,20,18,.42)'; ctx.stroke()
  }

  function drawLedgerRule(spent) {
    const ctx = S.ctx
    const y = V.ruleY, x0 = V.trimL, x1 = V.trimR, span = Math.max(1, x1 - x0)
    ctx.lineCap = 'butt'
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(21,20,18,.22)'; ctx.stroke()
    ctx.beginPath()
    for (let i = 0; i <= 10; i++) { const x = Math.round(x0 + (span * i) / 10) + 0.5; ctx.moveTo(x, y); ctx.lineTo(x, y - (i % 5 === 0 ? 6 : 3)) }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(21,20,18,.2)'; ctx.stroke()
    const xs = x0 + span * clamp(spent, 0, 1)
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xs, y); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(21,20,18,.72)'; ctx.stroke()
    ctx.fillStyle = INK; ctx.fillRect(Math.round(xs) - 2, Math.round(y) - 2, 4, 4)
  }

  function strokeVarying(X, Y, F, hem, Wd, base) {
    const ctx = S.ctx
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK
    let i = 0
    while (i < hem) {
      if (F.INK[i] <= 0.5) { i++; continue }
      let j = i
      while (j + 1 < hem && F.INK[j + 1] > 0.5) j++
      let a = i
      while (a < j) {
        const q = Math.max(1, Math.round(Wd[a] / QW))
        let b = a + 1
        while (b < j && Math.round(Wd[b] / QW) === q && b - a < 120) b++
        ctx.beginPath(); ctx.moveTo(X[a], Y[a])
        for (let k = a + 1; k <= b; k++) ctx.lineTo(X[k], Y[k])
        ctx.lineWidth = base * q * QW
        ctx.stroke()
        a = b
      }
      i = j + 1
    }
  }

  function draw(F, u) {
    const ctx = S.ctx
    const X = phys.X, Y = phys.Y
    ctx.clearRect(0, 0, V.W, V.H)
    drawSpine(u)
    drawLedgerRule(F.spent ?? 0)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath()
    let open = false
    for (let i = 0; i < V.N - 1; i++) {
      if (F.INK[i + 1] <= 0.5) { if (!open) { ctx.moveTo(X[i], Y[i]); open = true } else ctx.lineTo(X[i + 1], Y[i + 1]) } else open = false
    }
    ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(21,20,18,.08)'; ctx.stroke()
    const hem = clamp(F.hemIdx, 1, V.N - 1)
    strokeVarying(X, Y, F, hem, widthsFor(F), V.lwBase)
    ctx.beginPath()
    let drawing = false
    for (let i = hem; i < V.N; i++) {
      if (F.INK[i] > 0.5) { if (!drawing) { ctx.moveTo(X[i], Y[i]); drawing = true } else ctx.lineTo(X[i], Y[i]) } else drawing = false
    }
    ctx.lineWidth = 0.75; ctx.strokeStyle = INK; ctx.stroke()
  }

  /** one frame at progress p (0..1); returns true while the line is still moving */
  function frame(p, dt) {
    const u = clamp(p, 0, 1) * (LINE_STATES - 1)
    const F = formAt(u)
    cur = F
    if (u > reach) reach = u
    let moving = false
    if (S.reduced) phys.snap(F.X, F.Y)
    else {
      // ADVECTION: the material is carried with its target; the spring handles only the residual (plucks, settling)
      if (prevF && prevF !== F) for (let i = 0; i < V.Nroute; i++) { phys.X[i] += F.X[i] - prevF.X[i]; phys.Y[i] += F.Y[i] - prevF.Y[i] }
      prevF = F
      for (let k = 0; k < 3; k++) phys.step(dt / 3, F.X, F.Y)
      for (let i = V.Nroute; i < V.N; i++) { phys.X[i] = F.X[i]; phys.Y[i] = F.Y[i]; phys.VX[i] = 0; phys.VY[i] = 0 }
      moving = phys.energy() > 0.02
    }
    draw(F, u)
    return moving
  }

  return {
    build,
    frame,
    impulse(x, y, vx, vy) { if (phys) phys.impulse(x, y, vx, vy, 40) },
    get spent() { return cur ? clamp(cur.spent ?? 0, 0, 1) : 0 },
    get budget() { return V ? V.L : 0 },
    lens() { return Array.from({ length: LINE_STATES }, (_, i) => Math.round(formAt(i).len)) },
    invariant() { return Array.from({ length: LINE_STATES }, (_, i) => formAt(i).len).every((l) => Math.abs(l - V.L) < Math.max(4, V.L * 0.002)) },
  }
}
