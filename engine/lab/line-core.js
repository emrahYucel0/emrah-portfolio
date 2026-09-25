// ─────────────────────────────────────────────────────────────────────────────
// LINE CORE — the invariant, extracted from the real source.
//
// ADAPTED FROM (read-only, never modified):
//   research/lab/sources/line-2026-09-20/src/geometry.js — builder(), resample() by true arc length,
//                                                          hemCurve()/cutSpool(), loopRect(), meander(), knot()
//   research/lab/sources/line-2026-09-20/src/engine.js   — taut()/frontAt() transition, simulate() physics
//                                                          (K 95, TENSION 2100, DAMP 7.5, pluck radius/gain)
//   research/lab/sources/line-2026-09-20/src/forms.js    — finish(): unspent length is pleated into the hem
//
// REMOVED ON PURPOSE (Phase 5 decision): the single-stroke glyph alphabet, the name, About/capability/Work
// /Contact compositions, project media and the cobalt marker colour. What remains is the mechanism:
// ONE line of ONE fixed length; every shape spends from the same length; what a shape does not spend is
// folded into the hem at the edge. That invariant is the experiment.
// ─────────────────────────────────────────────────────────────────────────────

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t

export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

// ─── builder: a polyline of ink and pen-up travel ────────────────────────────
export function builder() {
  const P = { x: [], y: [], ink: [] }
  const add = (x, y, ink) => { P.x.push(x); P.y.push(y); P.ink.push(ink) }
  const B = {
    P,
    last() { const n = P.x.length; return n ? [P.x[n - 1], P.y[n - 1]] : null },
    stroke(pts) {
      if (!pts.length) return B
      add(pts[0][0], pts[0][1], P.x.length ? 0 : 1)
      for (let i = 1; i < pts.length; i++) add(pts[i][0], pts[i][1], 1)
      return B
    },
    lineTo(x, y) { add(x, y, 1); return B },
    travel(x, y) { add(x, y, 0); return B },
    length() {
      let L = 0
      for (let i = 1; i < P.x.length; i++) L += Math.hypot(P.x[i] - P.x[i - 1], P.y[i] - P.y[i - 1])
      return L
    },
  }
  return B
}

// resample a built polyline into N nodes by TRUE arc length: node i is always the same piece of material
export function resample(P, N) {
  const n = P.x.length
  const cum = new Float64Array(n)
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(P.x[i] - P.x[i - 1], P.y[i] - P.y[i - 1]) + 1e-6
  const total = cum[n - 1]
  const X = new Float32Array(N)
  const Y = new Float32Array(N)
  const INK = new Float32Array(N)
  let j = 1
  for (let k = 0; k < N; k++) {
    const c = (total * k) / (N - 1)
    while (j < n - 1 && cum[j] < c) j++
    const seg = cum[j] - cum[j - 1]
    const t = seg > 0 ? clamp((c - cum[j - 1]) / seg, 0, 1) : 0
    X[k] = lerp(P.x[j - 1], P.x[j], t)
    Y[k] = lerp(P.y[j - 1], P.y[j], t)
    INK[k] = P.ink[j]
  }
  return { X, Y, INK, len: total }
}

// ─── the hem: unused line pleated along the bottom edge ──────────────────────
export function hemCurve(xRight, yTop, depth, maxLen, pitch) {
  const pts = []
  let x = xRight
  let k = 0
  let L = 0
  const jit = (i) => 0.7 * Math.sin(i * 0.23) + 0.35 * Math.sin(i * 1.37 + 1)
  pts.push([x, yTop + jit(0)])
  const seg = Math.hypot(pitch / 2, depth)
  while (L < maxLen) {
    k++
    x -= pitch / 2
    pts.push([x, k % 2 ? yTop + depth : yTop + jit(k)])
    L += seg
  }
  pts.reverse()
  const n = pts.length
  const cum = new Float64Array(n)
  for (let i = n - 2; i >= 0; i--) cum[i] = cum[i + 1] + Math.hypot(pts[i][0] - pts[i + 1][0], pts[i][1] - pts[i + 1][1])
  return { pts, cum }
}
function cutIndex(curve, len) {
  const { cum } = curve
  let lo = 0
  let hi = cum.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] > len) lo = mid + 1; else hi = mid }
  return lo
}
export function curveOuterPoint(curve, len) {
  const { pts, cum } = curve
  const i = cutIndex(curve, len)
  if (i === 0) return pts[0]
  const a = pts[i - 1]
  const b = pts[i]
  const seg = cum[i - 1] - cum[i]
  const t = seg > 0 ? (cum[i - 1] - len) / seg : 0
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]
}
export function cutCurve(curve, len) {
  const { pts } = curve
  const i = cutIndex(curve, len)
  const out = [curveOuterPoint(curve, len)]
  for (let j = i; j < pts.length; j++) out.push(pts[j])
  return out
}

// ─── shape vocabulary (no letters) ───────────────────────────────────────────
const arcPts = (cx, cy, r, a0, a1, n = 8) => {
  const o = []
  for (let i = 1; i <= n; i++) { const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]) }
  return o
}
export function loopRect(x, y, w, h, r) {
  w = Math.max(0, w); h = Math.max(0, h)
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  const b = y + h
  return [
    [x + r, b], [x + w - r, b], ...arcPts(x + w - r, b - r, r, 90, 0),
    [x + w, y + r], ...arcPts(x + w - r, y + r, r, 0, -90),
    [x + r, y], ...arcPts(x + r, y + r, r, -90, -180),
    [x, b - r], ...arcPts(x + r, b - r, r, 180, 90),
  ]
}
export function meander(rx, ry, rw, rh, sp) {
  const r = sp / 2
  let cols = Math.max(2, Math.round(rw / sp) + 1)
  if (cols % 2) cols--
  const mid = (cols - 2) / 2
  const turnY = (i) => (i % 2 === 0 ? ry + rh - r - 12 * Math.cos((i - mid) * 0.22) : ry + r + 12 * Math.cos((i - mid) * 0.22))
  const pts = [[rx, ry]]
  for (let c = 0; c < cols; c++) {
    const x = rx + c * sp
    if (c < cols - 1) {
      const y = turnY(c)
      pts.push([x, y])
      pts.push(...arcPts(x + r, y, r, 180, c % 2 === 0 ? 0 : 360, 10))
    } else pts.push([x, ry])
  }
  return pts
}
export function knot(cx, cy, R, len, seed = 3) {
  const r = rng(seed)
  const H = 5
  const fx = []; const fy = []; const ax = []; const ay = []; const px = []; const py = []
  for (let k = 0; k < H; k++) {
    fx.push(0.6 + k * 0.85 + r() * 0.7); fy.push(0.7 + k * 0.9 + r() * 0.7)
    ax.push(1 / (k + 1) ** 0.9); ay.push(1 / (k + 1) ** 0.9)
    px.push(r() * 6.28); py.push(r() * 6.28)
  }
  const f = (t) => {
    let x = 0; let y = 0
    for (let k = 0; k < H; k++) { x += ax[k] * Math.sin(fx[k] * t + px[k]); y += ay[k] * Math.sin(fy[k] * t + py[k]) }
    return [x, y]
  }
  const sample = (T) => {
    const pts = []; let L = 0; let mx = 0
    const n = Math.ceil(T * 24)
    for (let i = 0; i <= n; i++) {
      const p = f((T * i) / n); pts.push(p)
      mx = Math.max(mx, Math.hypot(p[0], p[1]))
      if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])
    }
    return { pts, L, mx }
  }
  let T = 20
  for (let it = 0; it < 4; it++) { const s = sample(T); T *= (s.mx * (len / s.L)) / R }
  const s = sample(T)
  const scale = len / s.L
  return s.pts.map(([x, y]) => [cx + x * scale, cy + y * scale])
}

// ─── the conservation law: every form spends from ONE fixed length L ─────────
// finish() pleats whatever the route did not spend into the hem, so total length is invariant.
export function finish(b, V, hemTop) {
  const used = b.length()
  const curve = hemCurve(V.x + V.w + 12, hemTop, V.hemDepth, V.L * 1.02 + 400, V.pitch)
  const last = b.last()
  const need = V.L - used
  let len = Math.max(20, need)
  if (last) {
    let lo = Math.max(20, need - Math.hypot(V.w, V.h) - 400)
    let hi = Math.max(20, need)
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      const o = curveOuterPoint(curve, mid)
      if (mid + Math.hypot(o[0] - last[0], o[1] - last[1]) > need) hi = mid
      else lo = mid
    }
    len = (lo + hi) / 2
  }
  b.stroke(cutCurve(curve, len))
  const F = resample(b.P, V.N)
  F.used = used
  F.spent = used / V.L
  return F
}

// ─── the writing front: one taut thread between what has moved and what has not ─
const BAND = 0.012
export function taut(A, B, r, N) {
  const out = { X: new Float32Array(N), Y: new Float32Array(N), INK: new Float32Array(N) }
  const f = clamp(r, 0, 1) * (1 + BAND)
  const jw = Math.floor((f - BAND) * (N - 1))
  const ju = clamp(Math.ceil(f * (N - 1)), 0, N - 1)
  const px = jw >= 0 ? B.X[jw] : A.X[0]
  const py = jw >= 0 ? B.Y[jw] : A.Y[0]
  const n = Math.max(1, ju - jw)
  for (let i = 0; i < N; i++) {
    if (i <= jw) { out.X[i] = B.X[i]; out.Y[i] = B.Y[i]; out.INK[i] = B.INK[i] }
    else if (i >= ju) { out.X[i] = A.X[i]; out.Y[i] = A.Y[i]; out.INK[i] = A.INK[i] }
    else { const t = (i - jw) / n; out.X[i] = lerp(px, A.X[ju], t); out.Y[i] = lerp(py, A.Y[ju], t); out.INK[i] = 1 }
  }
  out.pen = Math.max(0, jw)
  out.used = lerp(A.used, B.used, r)
  out.spent = lerp(A.spent, B.spent, r)
  return out
}

// ─── physics: spring to target + neighbour tension + damping (source values) ──
export function createPhysics(N) {
  const X = new Float32Array(N); const Y = new Float32Array(N)
  const VX = new Float32Array(N); const VY = new Float32Array(N)
  return {
    X, Y, VX, VY,
    place(F) { X.set(F.X); Y.set(F.Y); VX.fill(0); VY.fill(0) },
    energy() {
      let e = 0
      for (let i = 0; i < N; i += 7) e += Math.abs(VX[i]) + Math.abs(VY[i])
      return e / (N / 7)
    },
    impulse(px, py, vx, vy, R) {
      const R2 = R * R
      for (let i = 0; i < N; i++) {
        const qx = X[i] - px; const qy = Y[i] - py
        const d2 = qx * qx + qy * qy
        if (d2 < R2) {
          const fo = (1 - Math.sqrt(d2) / R) * 0.9
          VX[i] += vx * fo
          VY[i] += vy * fo
        }
      }
    },
    step(dt, TX, TY) {
      const K = 95; const TENSION = 2100; const DAMP = 7.5
      for (let i = 0; i < N; i++) {
        const dx = X[i] - TX[i]; const dy = Y[i] - TY[i]
        let lx = 0; let ly = 0
        if (i > 0 && i < N - 1) {
          lx = (X[i - 1] - TX[i - 1] + X[i + 1] - TX[i + 1]) * 0.5 - dx
          ly = (Y[i - 1] - TY[i - 1] + Y[i + 1] - TY[i + 1]) * 0.5 - dy
        }
        VX[i] += (-K * dx + TENSION * lx - DAMP * VX[i]) * dt
        VY[i] += (-K * dy + TENSION * ly - DAMP * VY[i]) * dt
      }
      for (let i = 0; i < N; i++) { X[i] += VX[i] * dt; Y[i] += VY[i] * dt }
      X[N - 1] = TX[N - 1]; Y[N - 1] = TY[N - 1]
      X[0] = TX[0]; Y[0] = TY[0]
    },
    snap(TX, TY) { X.set(TX); Y.set(TY); VX.fill(0); VY.fill(0) },
  }
}

// ─── the five neutral shapes, all spending the same length ───────────────────
export const SHAPES = ['straight', 'loop', 'knot', 'wire', 'boundary']

// The route of a shape, before the hem absorbs what it did not spend.
export function rawShape(name, V) {
  const b = builder()
  const midY = V.y + V.h * 0.5
  if (name === 'straight') {
    b.stroke([[V.x, midY], [V.x + V.w, midY]])
    return b
  }
  if (name === 'loop') {
    const lw = V.w * 0.42; const lh = Math.min(V.h * 0.5, lw * 0.62)
    b.stroke([[V.x, midY], [V.x + V.w * 0.2, midY]])
    b.stroke(loopRect(V.x + V.w * 0.2, midY - lh, lw, lh, Math.min(14, lh / 3)))
    b.lineTo(V.x + V.w, midY)
    return b
  }
  if (name === 'knot') {
    const R = Math.min(V.w, V.h) * 0.3
    const cx = V.x + V.w * 0.5; const cy = V.y + V.h * 0.5
    b.stroke([[V.x, cy], [cx - R - 14, cy]])
    b.stroke(knot(cx, cy, R, Math.max(400, V.L * 0.42), 11))
    b.travel(V.x + V.w, cy)
    return b
  }
  if (name === 'wire') {
    const sp = Math.max(9, V.w / 26)
    b.stroke(meander(V.x + 6, V.y + 8, V.w - 12, V.h - 16, sp))
    return b
  }
  // boundary: the hem is opened out across the whole field — the budget itself becomes the composition
  const rows = Math.max(3, Math.floor(V.h / 16))
  const pts = []
  for (let r = 0; r < rows; r++) {
    const y = V.y + 8 + (r * (V.h - 16)) / (rows - 1)
    if (r % 2 === 0) { pts.push([V.x, y], [V.x + V.w, y]) } else { pts.push([V.x + V.w, y], [V.x, y]) }
  }
  b.stroke(pts)
  return b
}

// ONE budget for every shape: the fixed length is the longest route plus a margin, so no shape can
// overspend and every shape leaves a visible hem. This mirrors computeL() in the source engine.
export function computeL(V) {
  let max = 0
  for (const s of SHAPES) max = Math.max(max, rawShape(s, V).length())
  return Math.ceil(max * 1.06 + Math.min(V.w, V.h) * 1.5 + 240)
}

export function buildShape(name, V) {
  return finish(rawShape(name, V), V, V.y + V.h - V.hemDepth - 2)
}
