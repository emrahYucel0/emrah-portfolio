// Single-stroke technical lettering for the plotter: Hershey "futural" (Simplex), the classic
// engineering hand (nearest neighbour of ISO 3098). Glyph data in ./hershey-data.js (generated,
// with the required acknowledgements). Units: y DOWN, baseline 0 after normalisation, cap 21,
// x-height 14, descender 7. Turkish letters are COMPOSED in the pen's own language: the base
// glyph plus an extra stroke — the same diamond tick futural itself uses for i's dot, a small
// cedilla hook, a shallow breve arc. 'ı' is 'i' with its dot stroke left uninked.

import { GLYPHS } from './hershey-data.js'

export const CAP_U = 21   // 'H': y −12 … baseline +9 in raw units
export const XH_U = 14
export const DESC_U = 7
const BASE = 9            // raw-unit baseline; we shift every stroke so the baseline is y = 0

const shift = (s) => s.map((st) => { const o = st.slice(); for (let i = 1; i < o.length; i += 2) o[i] -= BASE; return o })

// futural's own dot (the diamond from 'i'), centred at (cx, cy) in normalised units
const dot = (cx, cy) => [cx - 1, cy, cx, cy + 1, cx + 1, cy, cx, cy - 1, cx - 1, cy]
const cedilla = (cx) => [cx + 0.6, 0.6, cx - 0.2, 2.2, cx + 1.8, 2.0, cx + 2.4, 3.6, cx + 0.8, 4.6, cx - 1.0, 4.2]
const breve = (cx, yt) => [cx - 3.2, yt, cx - 2.2, yt + 1.9, cx, yt + 2.6, cx + 2.2, yt + 1.9, cx + 3.2, yt]

const cache = new Map()

/** normalised glyph {l, r, s} for one character, Turkish composition included */
export function glyph(ch) {
  if (cache.has(ch)) return cache.get(ch)
  const make = (base, extra = [], drop = 0) => {
    const g = GLYPHS[base.charCodeAt(0)]
    const s = shift(g.s.slice(drop))
    return { l: g.l, r: g.r, s: [...s, ...extra] }
  }
  const mid = (g) => (GLYPHS[g.charCodeAt(0)].l + GLYPHS[g.charCodeAt(0)].r) / 2
  let out
  switch (ch) {
    case 'İ': out = make('I', [dot(mid('I'), -25)]); break
    case 'ı': out = make('i', [], 1); break // 'i' minus its dot stroke
    case 'Ş': out = make('S', [cedilla(mid('S'))]); break
    case 'ş': out = make('s', [cedilla(mid('s'))]); break
    case 'Ç': out = make('C', [cedilla(mid('C'))]); break
    case 'ç': out = make('c', [cedilla(mid('c'))]); break
    case 'Ğ': out = make('G', [breve(mid('G'), -27.5)]); break
    case 'ğ': out = make('g', [breve(mid('g'), -19.5)]); break
    case 'Ü': out = make('U', [dot(mid('U') - 3, -25), dot(mid('U') + 3, -25)]); break
    case 'ü': out = make('u', [dot(mid('u') - 3, -18), dot(mid('u') + 3, -18)]); break
    case 'Ö': out = make('O', [dot(mid('O') - 3, -25), dot(mid('O') + 3, -25)]); break
    case 'ö': out = make('o', [dot(mid('o') - 3, -18), dot(mid('o') + 3, -18)]); break
    case '△': { // the revision marker: an equilateral triangle on the cap height
      const s = CAP_U / 0.866
      out = { l: -1, r: s + 1, s: [[0, 0, s / 2, -CAP_U, s, 0, 0, 0]] }
      break
    }
    case '↗': { // the outward arrow, in the pen's own hand: a shaft and a two-winged head
      out = { l: 0, r: 17, s: [[0, -1, 12, -13], [4, -13, 12, -13, 12, -5]] }
      break
    }
    default: {
      const g = GLYPHS[ch.charCodeAt(0)] || GLYPHS[63] // '?'
      out = { l: g.l, r: g.r, s: shift(g.s) }
      // the comma is one stroke (head diamond + tail): split so the soak sees a head and a tail
      if (ch === ',' && out.s.length === 1 && out.s[0].length === 14) out.s = [out.s[0].slice(0, 10), out.s[0].slice(8)]
    }
  }
  cache.set(ch, out)
  return out
}

/** advance of a text in font units; `track` adds air between letters (baked at WRITE time —
 *  ink spreads later, letters never move — so soaked neighbours cannot touch) */
export function measure(text, track = 0) {
  let a = 0, n = 0
  for (const ch of text) { const g = glyph(ch); a += g.r - g.l; n++ }
  return a + track * Math.max(0, n - 1)
}

// glyphs whose counters are tighter than the bleed can afford: the soak rasters them with a
// leaner pen so their inner air survives the display weight (item: counters stay open)
const WMUL = { '@': 0.62, '0': 0.85, '8': 0.85, 'ğ': 0.85, 'g': 0.85, 'a': 0.88, 'e': 0.88 }

// ── smoothing: at large sizes the Hershey polygons read as facets (o, @, 0). Each stroke is
//    split at its TRUE corners (turns sharper than ~45° — M, k, 7 keep their angles) and every
//    smooth run between them is refined with Chaikin passes chosen by the drawn size, endpoints
//    pinned. The pen draws this refined path, so the ink budget is measured on it too. ──
function chaikinOpen(pts) {
  const n = pts.length / 2
  if (n < 3) return pts
  const out = [pts[0], pts[1]]
  for (let i = 0; i < n - 1; i++) {
    const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[i * 2 + 2], by = pts[i * 2 + 3]
    out.push(ax + (bx - ax) * 0.25, ay + (by - ay) * 0.25, ax + (bx - ax) * 0.75, ay + (by - ay) * 0.75)
  }
  out.push(pts[pts.length - 2], pts[pts.length - 1])
  return out
}
function smoothStroke(st, iters) {
  if (iters <= 0 || st.length < 6) return st
  // split at sharp corners; smooth each run on its own so real angles survive
  const runs = []
  let start = 0
  for (let i = 2; i < st.length - 2; i += 2) {
    const v1x = st[i] - st[i - 2], v1y = st[i + 1] - st[i - 1]
    const v2x = st[i + 2] - st[i], v2y = st[i + 3] - st[i + 1]
    const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y)
    if (l1 < 1e-6 || l2 < 1e-6) continue
    const cos = (v1x * v2x + v1y * v2y) / (l1 * l2)
    if (cos < 0.7071) { runs.push(st.slice(start, i + 2)); start = i } // > 45°: a true corner
  }
  runs.push(st.slice(start))
  const out = []
  for (const run of runs) {
    let r = run
    for (let k = 0; k < iters; k++) r = chaikinOpen(r)
    if (out.length) out.pop(), out.pop() // runs share their corner point
    for (const v of r) out.push(v)
  }
  return Float64Array.from(out)
}
const itersFor = (cap) => (cap < 22 ? 0 : cap < 48 ? 1 : cap < 96 ? 2 : 3)

// ── the MARKS (i/j dots, İ's dot, Ü/Ö/ü/ö dots, the comma's head): small closed diamonds. The
//    soak gives them their own body — a round dot that keeps its air from the letter below and
//    from its twin — so no mark melts into its letter at display weight. Units, per glyph. ──
const markCache = new Map()
function marksOf(g) {
  if (markCache.has(g)) return markCache.get(g)
  const out = new Map()
  const info = g.s.map((st) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (let i = 0; i < st.length; i += 2) { x0 = Math.min(x0, st[i]); x1 = Math.max(x1, st[i]); y0 = Math.min(y0, st[i + 1]); y1 = Math.max(y1, st[i + 1]) }
    const closed = Math.hypot(st[0] - st[st.length - 2], st[1] - st[st.length - 1]) < 0.01
    return { x0, x1, y0, y1, dot: closed && x1 - x0 <= 2.6 && y1 - y0 <= 2.6 }
  })
  info.forEach((d, i) => {
    if (!d.dot) return
    // the air under the dot: down to the nearest other ink that shares its columns
    let gap = 99
    info.forEach((o, j) => { if (j !== i && !o.dot && o.x1 >= d.x0 - 2 && o.x0 <= d.x1 + 2 && o.y0 >= d.y1) gap = Math.min(gap, o.y0 - d.y1) })
    let pair = 99
    info.forEach((o, j) => { if (j !== i && o.dot) pair = Math.min(pair, Math.abs((o.x0 + o.x1) / 2 - (d.x0 + d.x1) / 2)) })
    // a head with a tail (the comma): the head stays small so the tail still reads
    const tail = gap === 99 && info.some((o, j) => j !== i && !o.dot)
    out.set(i, { cx: (d.x0 + d.x1) / 2, cy: (d.y0 + d.y1) / 2, gap, pair, tail })
  })
  markCache.set(g, out)
  return out
}

/**
 * strokes for a text laid on the baseline at (x, y), scaled so the CAP height is `cap` px.
 * Returns world-coordinate polylines [ [x0,y0,x1,y1,…], … ] in drawing (reading) order,
 * smoothed for the drawn size (no facets in large letters).
 */
export function textStrokes(text, x, y, cap, track = 0) {
  const k = cap / CAP_U
  const iters = itersFor(cap)
  const out = []
  let pen = x
  for (const ch of text) {
    const g = glyph(ch)
    const marks = marksOf(g)
    g.s.forEach((st, si) => {
      const w = new Float64Array(st.length)
      for (let i = 0; i < st.length; i += 2) { w[i] = pen + (st[i] - g.l) * k; w[i + 1] = y + st[i + 1] * k }
      const sm = smoothStroke(w, iters)
      if (WMUL[ch]) sm.wMul = WMUL[ch]
      const m = marks.get(si)
      if (m) sm.dot = { cx: pen + (m.cx - g.l) * k, cy: y + m.cy * k, gap: m.gap * k, pair: m.pair * k, tail: m.tail }
      if (ch === ',' && si === 1) sm.tail = true // the soak lengthens it a little: it must outgrow the head
      out.push(sm)
    })
    pen += (g.r - g.l + track) * k
  }
  return out
}

/** the advance cells of a text as textStrokes lays it: [{ ch, x0, x1 }] (px) — the soak centres
 *  each display-face letter on its pen letter, so the two hands stay registered */
export function textCells(text, x, cap, track = 0) {
  const k = cap / CAP_U
  const out = []
  let pen = x
  for (const ch of text) {
    const g = glyph(ch)
    out.push({ ch, x0: pen, x1: pen + (g.r - g.l) * k })
    pen += (g.r - g.l + track) * k
  }
  return out
}

/** highest ink above the baseline in font units (İ's dot, Ğ's breve rise past the cap) */
export function ascentU(text) {
  let top = CAP_U
  for (const ch of text) for (const st of glyph(ch).s) for (let i = 1; i < st.length; i += 2) top = Math.max(top, -st[i])
  return top
}

/** total inked length of a set of strokes (px) */
export function strokesLength(strokes) {
  let L = 0
  for (const st of strokes) for (let i = 2; i < st.length; i += 2) L += Math.hypot(st[i] - st[i - 2], st[i + 1] - st[i - 1])
  return L
}
