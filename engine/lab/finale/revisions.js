// REVISIONS — the visitor's act, recorded the way a technical drawing records a change:
// a revision cloud around the touched field and a numbered triangle beside it (△1, △2 …).
// Pure geometry here; the plotter compiles the strokes into a real-time pen run.

import { glyph, textStrokes } from './hershey.js'

/** the cloud: scalloped bumps along the padded box edges — one continuous polyline. The
 *  narrow sheet passes a small pad and scallop so the cloud stays inside its own cell. */
export function cloudStrokes(box, { pad = 12, rMin = 9, rMax = 16 } = {}) {
  const x0 = box.x0 - pad, y0 = box.y0 - pad, x1 = box.x1 + pad, y1 = box.y1 + pad
  const R = Math.min(rMax, Math.max(rMin, Math.min(x1 - x0, y1 - y0) * 0.09))
  const edges = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]]
  const pts = []
  for (const [ax, ay, bx, by] of edges) {
    const L = Math.hypot(bx - ax, by - ay)
    const n = Math.max(2, Math.round(L / (R * 1.7)))
    const ux = (bx - ax) / L, uy = (by - ay) / L, nx = uy, ny = -ux
    for (let i = 0; i < n; i++) {
      const s0 = i / n, s1 = (i + 1) / n
      for (let k = 0; k <= 8; k++) {
        const s = s0 + ((s1 - s0) * k) / 8
        const bump = Math.sin((k / 8) * Math.PI) * R * 0.75
        pts.push(ax + (bx - ax) * s - nx * bump, ay + (by - ay) * s - ny * bump)
      }
    }
  }
  pts.push(pts[0], pts[1])
  return [pts]
}

/** the numbered triangle: △ on the cap height with the revision number inside */
export function triangleStrokes(x, y, n, cap = 22) {
  const tri = glyph('△')
  const k = cap / 21
  const s = tri.s[0].map((v, i) => (i % 2 === 0 ? x + (v - tri.l) * k : y + v * k))
  const num = String(n)
  const digitCap = cap * 0.42
  const w = num.length * digitCap * 0.95
  const dg = textStrokes(num, x + ((tri.r - tri.l) * k) / 2 - w / 2, y - cap * 0.18, digitCap)
  return [s, ...dg]
}
