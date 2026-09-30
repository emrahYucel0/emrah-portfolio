// WEIGHT, bound to the frame the plotter draws. One fixed area, five cells.
//
//   Wide sheet (grid):            Narrow sheet (portrait):
//   ┌───────── email ─────────┐   five full-width bands, all of them WRITTEN —
//   ├──── phone ──┬─ github ──┤   the monoline hand stays legible far smaller than
//   └─ linkedin ──┴─ location ┘   tone rows ever could, so nothing hides.
//
// Attention (pointer dwell, keyboard focus — or, on a narrow touch sheet, the SCROLL itself)
// redistributes the rows and columns fluidly; without attention the partition breathes back to
// its defaults. The mechanism is StudyWeight.vue's (read-only source): attention→weight (:78),
// springs on the edges (:121), waterfilling with readability floors. The pen replots NOTHING
// while this moves: the sheet's partings slide with the borders (src/weight/parting.js) and the
// lettering scales as vectors (the paper is elastic; the carriage stays parked).

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t

const ROWS_GRID = [['email'], ['phone', 'github'], ['linkedin', 'location']]
const ROWS_PORTRAIT = [['email'], ['phone'], ['github'], ['linkedin'], ['location']]

export function createPartition(itemsList) {
  const leaves = itemsList.map((it) => ({ ...it, att: 0, av: 0, attT: 0 }))
  const byId = Object.fromEntries(leaves.map((l) => [l.id, l]))
  // springs: up to four row edges (fractions of the frame) and two column ratios (grid rows 2–3)
  const eH = [0, 0, 0, 0].map(() => ({ f: -1, v: 0 }))
  const eV = [0, 0].map(() => ({ f: -1, v: 0 }))
  let version = 0
  let pointer = null, focusId = null
  // the narrow TOUCH sheet: attention is carried by the SCROLL (a per-field level, set each
  // frame by the caller) — deterministic back and forth; a tap there only ever acts
  let scrollAtt = null
  let rects = {}, divs = []
  let mode = 'grid'
  // ── the pointer's attention is DELIBERATE, not a border effect: a cell earns attention only
  //    after the pointer has RESTED on it (dwell), and the attended cell is not released until
  //    the pointer has moved clearly INSIDE a neighbour (hysteresis inset) or left the field.
  //    Sweeping across the grid moves nothing; the target never escapes the cursor. ──
  const DWELL_MS = 140
  const HYST_INSET = 24
  let attended = null, hoverCand = null, hoverSince = 0

  // ── floors. The monoline hand reads at a fraction of tone's size (calibrated in
  //    review/E-METRICS.md): a resting band only needs room for one small written line.
  const MIN_ROW_GRID = 64      // label band + a legible resting value line
  const MIN_BAND_PORTRAIT = 52
  const MIN_COL = (frw) => Math.min(frw * 0.22, 210)

  // ── attention (StudyWeight weights() :78), with dwell + hysteresis ──
  const inRect = (r, p, inset) => p.x >= r.x + inset && p.x <= r.x + r.w - inset && p.y >= r.y + inset && p.y <= r.y + r.h - inset
  function attTargets(fr, now) {
    for (const L of leaves) L.attT = 0
    if (focusId && byId[focusId]) { attended = focusId; byId[focusId].attT = 1; return }
    if (pointer) {
      // a candidate must sit clearly INSIDE a cell that is not the attended one
      let cand = null
      for (const L of leaves) {
        const r = rects[L.id]
        if (!r) continue
        const inset = L.id === attended ? 0 : Math.min(HYST_INSET, r.w * 0.2, r.h * 0.2)
        if (inRect(r, pointer, inset)) { cand = L.id; break }
      }
      if (cand === attended) hoverCand = null
      else if (cand) {
        if (hoverCand !== cand) { hoverCand = cand; hoverSince = now }
        else if (now - hoverSince >= DWELL_MS) { attended = cand; hoverCand = null }
      } else if (!(pointer.x >= fr.x && pointer.x <= fr.x + fr.w && pointer.y >= fr.y && pointer.y <= fr.y + fr.h)) {
        attended = null; hoverCand = null // the pointer left the field entirely
      } // inside the field but on a border/gap: the attended cell HOLDS (hysteresis)
    } else {
      attended = null; hoverCand = null
    }
    if (attended && byId[attended]) byId[attended].attT = 1
  }
  // attention must CARRY the area (user decision): far past StudyWeight's boost, same shape
  const weightOf = (L) => L.amp * (1 + 8 * L.att) + 0.5 * L.att

  /** waterfill: share `total` by weight with a floor per row — floors never eat the signal */
  function waterfill(weights, mins, total) {
    const n = weights.length
    const out = new Array(n).fill(0)
    const fixed = new Array(n).fill(false)
    for (let pass = 0; pass < n; pass++) {
      let wSum = 0, rem = total
      for (let i = 0; i < n; i++) { if (fixed[i]) rem -= out[i]; else wSum += weights[i] }
      let changed = false
      for (let i = 0; i < n; i++) {
        if (fixed[i]) continue
        const h = (weights[i] / wSum) * rem
        if (h < mins[i]) { out[i] = mins[i]; fixed[i] = true; changed = true }
        else out[i] = h
      }
      if (!changed) break
    }
    return out
  }

  /** target edge fractions for a given attention state (pure — also the budget sampler's core) */
  function targetsFor(fr, portrait, attOf) {
    const ROWS = portrait ? ROWS_PORTRAIT : ROWS_GRID
    const w = Object.fromEntries(leaves.map((L) => [L.id, L.amp * (1 + 8 * attOf(L)) + 0.5 * attOf(L)]))
    const rowW = ROWS.map((r) => r.reduce((a, id) => a + w[id], 0))
    let mins = ROWS.map(() => (portrait ? MIN_BAND_PORTRAIT : MIN_ROW_GRID))
    const minSum = mins.reduce((a, b) => a + b, 0)
    if (minSum > fr.h * 0.98) mins = mins.map((m) => (m * fr.h * 0.98) / minSum)
    const hs = waterfill(rowW, mins, fr.h)
    const tH = []
    let acc = 0
    for (let i = 0; i < ROWS.length - 1; i++) { acc += hs[i]; tH.push(acc / fr.h) }
    let tV = null
    if (!portrait) {
      const mc = MIN_COL(fr.w)
      tV = [
        clamp(w.phone / (w.phone + w.github), mc / fr.w, 1 - mc / fr.w),
        clamp(w.linkedin / (w.linkedin + w.location), mc / fr.w, 1 - mc / fr.w),
      ]
    }
    return { tH, tV }
  }

  function layoutGrid(fr) {
    const y1 = fr.y + fr.h * eH[0].f, y2 = fr.y + fr.h * eH[1].f, fB = fr.y + fr.h
    const x1 = fr.x + fr.w * eV[0].f, x2 = fr.x + fr.w * eV[1].f
    rects = {
      email: { x: fr.x, y: fr.y, w: fr.w, h: y1 - fr.y },
      phone: { x: fr.x, y: y1, w: x1 - fr.x, h: y2 - y1 },
      github: { x: x1, y: y1, w: fr.x + fr.w - x1, h: y2 - y1 },
      linkedin: { x: fr.x, y: y2, w: x2 - fr.x, h: fB - y2 },
      location: { x: x2, y: y2, w: fr.x + fr.w - x2, h: fB - y2 },
    }
    // the four borders (the sheet parts along them): H1, H2 full width; V1, V2 between rows
    divs = [
      { x0: fr.x, y0: y1, x1: fr.x + fr.w, y1 },
      { x0: fr.x + fr.w, y0: y2, x1: fr.x, y1: y2 },
      { x0: x1, y0: y1, x1, y1: y2 },
      { x0: x2, y0: fB, x1: x2, y1: y2 },
    ].map((d) => ({ x0: d.x0, y0: d.y0, x1: d.x1 ?? d.x0, y1: d.y1 }))
  }

  function layoutPortrait(fr) {
    const ys = [fr.y, ...eH.map((e) => fr.y + fr.h * e.f), fr.y + fr.h]
    rects = {}
    ROWS_PORTRAIT.forEach((row, i) => { rects[row[0]] = { x: fr.x, y: ys[i], w: fr.w, h: Math.max(0, ys[i + 1] - ys[i]) } })
    divs = eH.map((e, i) => {
      const y = fr.y + fr.h * e.f
      return i % 2 === 0
        ? { x0: fr.x, y0: y, x1: fr.x + fr.w, y1: y }
        : { x0: fr.x + fr.w, y0: y, x1: fr.x, y1: y }
    })
  }

  const spring = (e, target, dt, reduced) => {
    if (e.f < 0 || reduced) { const d = Math.abs((e.f < 0 ? target : e.f) - target); e.f = target; e.v = 0; return d }
    // StudyWeight springEdges :121, damped to critical (ζ 0.8 → 1): no bounce at the end
    const c = 2 * Math.sqrt(150)
    const h = Math.min(dt, 1 / 30)
    e.v += ((target - e.f) * 150 - e.v * c) * h
    e.f += e.v * h
    return Math.abs(e.v) * dt
  }

  return {
    setPointer(p) { pointer = p },
    setFocus(id) { focusId = id },
    /** scroll-carried attention (narrow touch sheet): { id: 0…1 } or null to hand back */
    setScrollAttention(levels) { scrollAtt = levels },
    attOf(id) { return byId[id] ? { att: byId[id].att, attT: byId[id].attT } : null }, // dev probes
    get pointerAt() { return pointer },
    get mode() { return mode },
    tick(fr, dt, reduced, active, portrait = false) {
      const m = portrait ? 'portrait' : 'grid'
      if (m !== mode) for (const e of [...eH, ...eV]) { e.f = -1; e.v = 0 } // a rotated sheet re-lays cleanly
      mode = m
      let moving = false
      if (scrollAtt) {
        // the scroll IS the attention: levels arrive already eased; the edges below still ride
        // their critically damped springs
        for (const L of leaves) { L.attT = active ? (scrollAtt[L.id] ?? 0) : 0; L.att = L.attT; L.av = 0 }
      } else {
        attTargets(fr, performance.now())
        moving = hoverCand !== null // a dwell candidate needs frames to mature
      }
      for (const L of leaves) {
        if (scrollAtt) continue
        const target = active ? L.attT : 0
        if (reduced) { L.att = target; continue }
        // critically damped (StudyWeight press springs :196, quicker): starts from rest, glides
        // in, never overshoots — the edges below follow it, so the whole move is one S-curve
        const k = target > L.att ? 30 : 18
        const c = 2 * Math.sqrt(k)
        const h = Math.min(dt, 1 / 30)
        L.av += ((target - L.att) * k - L.av * c) * h
        L.att += L.av * h
        if (Math.abs(L.av) > 0.004 || Math.abs(target - L.att) > 0.004) moving = true
      }
      const { tH, tV } = targetsFor(fr, portrait, (L) => L.att)
      let maxd = 0
      const nH = tH.length
      for (let i = 0; i < nH; i++) maxd = Math.max(maxd, spring(eH[i], tH[i], dt, reduced))
      for (let i = 0; i < nH; i++) if (Math.abs(eH[i].v) > 0.0004) moving = true
      for (let i = 1; i < nH; i++) eH[i].f = clamp(eH[i].f, eH[i - 1].f + 0.02, 1 - (nH - i) * 0.02)
      eH[0].f = clamp(eH[0].f, 0.05, 1 - nH * 0.02)
      if (portrait) layoutPortrait(fr)
      else {
        for (let i = 0; i < 2; i++) maxd = Math.max(maxd, spring(eV[i], tV[i], dt, reduced))
        for (const e of eV) if (Math.abs(e.v) > 0.0004) moving = true
        layoutGrid(fr)
      }
      if (maxd > 0.00006) version++
      return { rects, divs, version, moving }
    },
    /**
     * a PURE layout for a hypothetical attention state (attId = null → rest): the ink budget is
     * sized against the worst redistribution before anything is drawn (no springs, no state).
     */
    sampleLayout(fr, attId, portrait = false) {
      const save = { rects, divs, eH: eH.map((e) => ({ ...e })), eV: eV.map((e) => ({ ...e })) }
      const { tH, tV } = targetsFor(fr, portrait, (L) => (L.id === attId ? 1 : 0))
      tH.forEach((t, i) => { eH[i].f = t })
      if (portrait) layoutPortrait(fr)
      else { tV.forEach((t, i) => { eV[i].f = t }); layoutGrid(fr) }
      const out = { rects, divs }
      rects = save.rects; divs = save.divs
      save.eH.forEach((e, i) => Object.assign(eH[i], e))
      save.eV.forEach((e, i) => Object.assign(eV[i], e))
      return out
    },
    get rects() { return rects },
    get divs() { return divs },
  }
}
