// PARTING — the cells are not boxed; the SHEET shows their borders with the site's own motion
// (C2's opening: engine/c2/flat.js applyOpening, read-only source). No line is drawn:
//
//   horizontal border  the row field PARTS along it — a lens, open in the middle and closing
//                      toward both ends (exp(−|dx|^power), C2's opening profile); the rows it
//                      pushes aside are compressed over a falloff, never crossed
//   vertical border    the rows are CUT with round ends, leaving a thin channel
//
// The borders are the partition's own (they ride Weight's springs), so the partings slide with
// every redistribution. `amp` opens them (the plot's first words) — 0 is the plain sheet.
// (User decision: the parting is THE border language; the space-only variant was removed.)
//
// One mapping serves every layer that lays rows: the sheet (render/surface.js) and the soaked
// words (plotter/soak.js), so an ink row always sits exactly on its paper row.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// the lens profile along a border, |u| 0…1 from its middle to its end: C2's opening profile
// exp(−|u·1.25|⁴), closed exactly at the ends by (1 − u²) — tabulated once
const LN = 1024
const LENS = new Float32Array(LN + 1)
for (let i = 0; i <= LN; i++) { const u = i / LN, v = u * 1.25, v2 = v * v; LENS[i] = Math.exp(-v2 * v2) * (1 - u * u) }

export function createParting() {
  let hs = [] // { x0, x1, y, h } — lens borders
  let vs = [] // { x, y0, y1 } — channels
  let H = 0, F = 1, G = 0, Q = 1, key = ''

  return {
    /**
     * divs: the partition's border segments; sp: row pitch; amp: 0…1 (opening); P: narrow sheet
     */
    set(divs, sp, amp, P) {
      H = amp * sp * (P ? 1.45 : 1.7)    // half the lens's opening at its middle (≈ 3.4 rows total)
      F = Math.max(1, H * 4.5)           // compression falloff: monotone (max slope 3H/F = 0.67)
      G = amp * (P ? 4 : 5)              // channel width
      Q = sp * 0.45                      // the smooth sign's width (≈ half a row pitch)
      hs = []; vs = []
      if (amp <= 0.001) { key = ''; return }
      for (const d of divs) {
        if (Math.abs(d.y0 - d.y1) < 0.5) hs.push({ x0: Math.min(d.x0, d.x1), x1: Math.max(d.x0, d.x1), y: d.y0 })
        else vs.push({ x: d.x0, y0: Math.min(d.y0, d.y1), y1: Math.max(d.y0, d.y1) })
      }
      key = `${Math.round(H * 10)}|${hs.map((b) => `${Math.round(b.x0)},${Math.round(b.x1)},${Math.round(b.y)}`).join(';')}|${vs.map((c) => `${Math.round(c.x)},${Math.round(c.y0)},${Math.round(c.y1)}`).join(';')}`
    },
    get key() { return key },
    get channel() { return G },
    /** does the row at material y move or break anywhere? (fast reject for straight rows) */
    affects(y) {
      for (const b of hs) if (Math.abs(y - b.y) < F) return true
      for (const c of vs) if (y >= c.y0 - 1 && y <= c.y1 + 1) return true
      return false
    },
    /**
     * the row at material y, at column x → out[0] = vertical displacement, out[1] = thickness
     * factor. The side is a SMOOTH sign: a border sliding across a row carries it through the
     * opening continuously (never a jump), and a row caught in the middle of the opening thins
     * to nothing — C2's void coverage (applyOpening `inV`).
     */
    row(x, y, out) { return this.at(this.prep(y), x, out) },
    /** everything about the row at material y that does not depend on x (per lens: its push
     *  and its thinning) — a row is prepared once, then sampled along x cheaply */
    prep(y) {
      const act = []
      for (const b of hs) {
        const e = y - b.y
        const ae = Math.abs(e)
        if (ae >= F) continue
        const w = 1 - ae / F
        const sg = e / Math.sqrt(e * e + Q * Q)
        const half = (b.x1 - b.x0) / 2
        act.push({ x0: b.x0, x1: b.x1, c: b.x0 + half, inv: 1 / half, A: sg * H * w * w * w, K: 1 - Math.abs(sg) })
      }
      return act
    },
    at(act, x, out) {
      let d = 0, k = 1
      for (let i = 0; i < act.length; i++) {
        const a = act[i]
        if (x <= a.x0 || x >= a.x1) continue
        const lens = LENS[Math.round((Math.abs((x - a.c) * a.inv)) * LN)]
        d += a.A * lens
        k *= 1 - lens * a.K
      }
      out[0] = d; out[1] = k < 0 ? 0 : k
      return out
    },
    /** the lens spans [x0, x1] that bend the row at material y (empty: the row stays straight) */
    lensSpans(y) {
      const out = []
      for (const b of hs) if (Math.abs(y - b.y) < F) out.push([b.x0, b.x1])
      return out
    },
    /** channel gaps [xa, xb] crossing the row at screen y */
    cuts(y) {
      const out = []
      for (const c of vs) if (y >= c.y0 && y <= c.y1) out.push([c.x - G / 2, c.x + G / 2])
      return out
    },
    /** the soak clips each word this far inside a vertical border */
    inset() { return clamp(G / 2 + 1, 1.5, 6) },
  }
}
