// THE PLOTTER. One pen, one fixed length of ink — the row that tore off the sheet. The pen
// writes the contact section: labels, then every value in a single-stroke technical hand
// (Hershey futural). It draws NO boxes: the cells are shown by the sheet itself, parting at
// their borders (src/weight/parting.js). Pen-up moves cost less time (×0.28) and leave a
// transient dashed trace. Everything the pen has FINISHED is cached offscreen and blitted;
// only the active stroke, the rails, the carriage and the ink band are live per frame.
//
// INK CONSERVATION: budget L = the torn row's length. used = lettering (at its LIVE vector
// scales) + revision clouds + the copy note;
// reserve = L − used, resting in the torn row's own track as a fused band (C2's saturation
// language). Attention stretches a word → the band visibly shortens. Structural: < 0.2 %
// at every intermediate frame, clouds included.
//
// TEMPO (user decision): labels right after the tear, the email is the FIRST value and is
// complete by p = 0.50; later values come quicker. The full storyboard lives in README.md.

import { textStrokes, textCells, ascentU, measure, strokesLength, CAP_U } from './hershey.js'
import { cloudStrokes, triangleStrokes } from './revisions.js'
import { soakGate } from './soak.js'

// air between letters, baked at WRITE time (units of the Hershey frame): the soaked bleed
// spreads ~0.17 cap each side — with this tracking, neighbours never touch (counters item)
const TRACK = 1.8
const TRACK_WRAP = 1.4 // wrapped lines are short; slightly tighter air keeps 320 px over the floor
import { LINE_INK, footHeight, padOf, isPortrait, rowSpacing, rowThick } from './theme.js'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }

const INK = LINE_INK
const TRAVEL = 0.28          // a pen-up move costs less time than drawing (reference demo)
const PX_TO_MM = 0.2646      // CSS px at 96 dpi — the counter speaks the plotter's own unit
export const LIVE_P = 0.97

// the pen set: like a plotter's, DISCRETE widths (ISO ladder feel), never under 1 CSS px.
// Which pen serves which letter size is calibrated on DPR 1/2 frames (review/E-METRICS.md).
export const penFor = (cap) => (cap < 14 ? 1 : cap < 26 ? 1.3 : cap < 52 ? 1.7 : 2.2)
const LBL_CAP = 7
const TRI_CORNER = 14 // narrow sheet: a revision's △ sits in the cell's top-left corner (clear of every layout)
// below this cap the DOM mono line takes over. 11 was the bare legibility floor (ladder);
// 14 adds the margin where a 1 px pen's anti-aliased ink is too faint to stand over the
// sheet with certainty (E4's disappearance test) — the DOM line there is crisper anyway.
export const FLOOR_CAP = 14

// p-windows: tear and fuse first, then the phases the run is scheduled into
export const P_TEAR = 0.03, P_FUSE = 0.08
// no structure phase (user decision): the cells are not drawn, the SHEET parts at their borders
// (src/weight/parting.js, opening while the pen writes the labels) — the pen writes at once
const PHASES = [
  { key: 'labels', p0: 0.08, p1: 0.14 },
  { key: 'email', p0: 0.14, p1: 0.50 },   // the first value, complete at p = 0.50
  { key: 'phone', p0: 0.50, p1: 0.60 },
  { key: 'github', p0: 0.60, p1: 0.70 },
  { key: 'linkedin', p0: 0.70, p1: 0.80 },
  { key: 'location', p0: 0.80, p1: 0.90 },
  { key: 'home', p0: 0.90, p1: 0.97 },
]
/** the sheet's partings open with the first words: 0 → 1 over p 0.04–0.14 */
export const partingAt = (p) => smooth((p - 0.04) / 0.1)
// the SOAK: the resting sheet keeps TWO levels — the email soaked (its crescendo is scroll-
// driven, 0.50–0.65, deterministic), everything else the clean pen line. For the other four,
// soaking is ATTENTION'S REWARD: the attended field grows and, if it clears the carrying
// floor, drinks; when attention leaves it returns to the pen line, crisply.
const SOAK_EMAIL_DUR = 0.15
/** reduced motion sees four stations: resting · parted + labels · email written · settled */
export const mapReducedP = (p) => (p < 0.2 ? 0 : p < 0.45 ? 0.14 : p < 0.8 ? 0.5 : 1)

export function createPlotter(S, getItems, opts = {}) {
  const soakOn = opts.soak !== false
  const hideLbl = new Set(opts.hideLabels ?? []) // the label-vs-value duplication variant (user decides)
  const attS = {} // the others' soak level: attention's reward, time-eased, crisp on release
  let V = null
  let fields = []              // {id, label, value, advU, lblAdvU}
  let phases = []              // compiled: {key, groups, T, inkCum}
  let L = 0                    // the budget: the torn row's length
  let plotInkTotal = 0
  let parkEnd = null           // pen home after the plot (the band's cut end then)
  let cacheCnv = null, cacheIdx = -1, cacheLang = ''
  let lang = 'tr'
  const revs = []              // {id, n, segs, T, ink, start, done}
  let note = null              // the copy note: { segs, T, ink, start, done, strokes }
  let outFlash = 0             // "out of ink" counter flash (theoretical guard)
  let liveGeom = null          // per-frame: { rects, divs }
  const pathCache = new Map()  // field → { key, path: Path2D, width }
  let railFade = 0
  let lastP = -1, lastPT = 0

  // ── geometry: the same stage A and B stood on ──
  function view() {
    const W = S.W, H = S.H
    const P = isPortrait(W, H)
    const m = padOf(W)
    const top = S.top
    const bot = H - footHeight(W, H)
    const fh0 = bot - top
    const sp = rowSpacing(P)
    const kTear = Math.round((fh0 * 0.86 - sp * 0.5) / sp)
    const yTear = top + kTear * sp + sp * 0.5
    const fr = { x: m, y: top + 16, w: W - 2 * m, h: yTear - (top + 16) }
    return { W, H, P, m, top, bot, sp, rowTh: rowThick(P), kTear, yTear, fr }
  }

  // ── per-field lettering layout: one rule for every sheet. Blend runs from the inline
  //    regime (label — value on one line; resting narrow bands) to the top-label regime
  //    (attended and roomy cells), so a growing band never pops between layouts. ──
  function fitField(f, r) {
    const t = smooth((r.h - 84) / 56)
    const lblK = LBL_CAP / CAP_U
    const lblW = f.lblAdvU * lblK
    const cy = r.y + r.h / 2
    const lbl = {
      cap: LBL_CAP,
      x: r.x + 14,
      y: lerp(cy + LBL_CAP / 2, r.y + 12 + LBL_CAP, t),
    }
    // the narrow sheet's CONDENSING word (the phone number — never broken over lines): as its
    // cell opens into the top-label regime it takes the cell's full width and a condensed letter
    // (one horizontal scale for the pen and the face), so one line can carry the soak
    const sx = V.P && f.condense ? lerp(1, f.condense, t) : 1
    const vx = lerp(lbl.x + lblW + 14, r.x + (sx < 1 ? 14 : 22), t)
    const availW = r.x + r.w - lerp(16, sx < 1 ? 8 : 16, t) - vx
    const availH = lerp(r.h * 0.44, (r.h - (12 + LBL_CAP + 10) - 14) * 0.6, t)
    let cap = Math.max(2, Math.min((availW / (f.advU * sx)) * CAP_U, availH))
    const labelled = !hideLbl.has(f.id)
    const lblBottom = lbl.y + 3 // (the label's baseline + its stroke)
    // the narrow sheet's crescendo: a word whose one-line cap cannot carry rows WRAPS (the
    // email: info@ / yucelemrah / .com) — the display weight survives the phone. Margins run
    // tighter than the one-line regime, so 320 px clears the carrying floor too. Its label
    // always stands at the top, and the block always BELOW it: they never overlap.
    // (a word with a line break on offer takes it only where it truly writes LARGER — so a
    //  resting narrow band keeps its one line, an attended one can carry the display weight)
    if (V.P && f.lines && wrappedCap(f, r) > cap * 1.08) {
      const lh = 1.2
      const n = f.lines.length
      const vx2 = r.x + 14
      const availW2 = r.x + r.w - 8 - vx2
      const band = 12 + LBL_CAP + 10
      const lblTop = { ...lbl, y: r.y + 12 + LBL_CAP }
      const availH2 = Math.max(4, r.h - band - 8)
      const capW = (availW2 / f.advMax) * CAP_U
      const cap2 = Math.max(2, Math.min(capW, availH2 / (1 + (n - 1) * lh + 0.34)))
      const blockH = cap2 * (1 + (n - 1) * lh)
      const top = Math.max(r.y + band, r.y + band + (r.h - band - blockH - cap2 * 0.34) / 2)
      return { cap: cap2, x: vx2, y: top + cap2, lbl: lblTop, t, wrapped: true, n, lh }
    }
    let vy = lerp(cy + cap * 0.36, r.y + (12 + LBL_CAP + 10) + (r.h - (12 + LBL_CAP + 10)) / 2 + cap * 0.36, t)
    // between the two regimes the label rises while the value slides left: whenever they share
    // columns, the value's top stays clear of the label (pushed down, or smaller if it must)
    if (labelled && vx < lbl.x + lblW + 10) {
      const asc = f.ascU / CAP_U
      const clear = lblBottom + 6
      if (vy - cap * asc < clear) vy = clear + cap * asc
      const floor = r.y + r.h - 4
      if (vy + cap * 0.34 > floor) {
        cap = Math.max(2, Math.min(cap, (floor - clear) / (asc + 0.34)))
        vy = clear + cap * asc
      }
    }
    return { cap, x: vx, y: vy, lbl, t, sx }
  }
  /** a condensed fit: every x pulled toward the value's start by fit.sx (marks included) */
  function squeeze(strokes, fit) {
    if (!(fit.sx < 1)) return strokes
    for (const st of strokes) {
      for (let i = 0; i < st.length; i += 2) st[i] = fit.x + (st[i] - fit.x) * fit.sx
      if (st.dot) st.dot = { ...st.dot, cx: fit.x + (st.dot.cx - fit.x) * fit.sx, pair: st.dot.pair * fit.sx }
    }
    return strokes
  }
  /** the cap a wrapped value would get in r (same rule as the wrapped branch above) */
  function wrappedCap(f, r) {
    const n = f.lines.length
    const availW2 = r.w - 8 - 14
    const availH2 = Math.max(4, r.h - (12 + LBL_CAP + 10) - 8)
    return Math.max(2, Math.min((availW2 / f.advMax) * CAP_U, availH2 / (1 + (n - 1) * 1.2 + 0.34)))
  }
  const valueStrokes = (f, fit) => {
    if (!fit.wrapped) return squeeze(textStrokes(f.value, fit.x, fit.y, fit.cap, TRACK), fit)
    const out = []
    f.lines.forEach((ln, i) => { for (const st of textStrokes(ln, fit.x, fit.y + i * fit.cap * fit.lh, fit.cap, TRACK_WRAP)) out.push(st) })
    return out
  }
  const labelStrokes = (f, fit) => textStrokes(f.label, fit.lbl.x, fit.lbl.y, fit.lbl.cap)


  // ── the run compiler: strokes → segments with a leading pen-up travel ──
  function compileGroups(defs, startPos) {
    let pos = startPos
    const groups = []
    for (const def of defs) {
      const segs = []
      for (const st of def.strokes) {
        const tl = Math.hypot(st[0] - pos[0], st[1] - pos[1])
        if (tl > 0.5) segs.push({ ax: pos[0], ay: pos[1], bx: st[0], by: st[1], ink: false, len: tl, t: tl * TRAVEL })
        for (let i = 2; i < st.length; i += 2) {
          const l = Math.hypot(st[i] - st[i - 2], st[i + 1] - st[i - 1])
          segs.push({ ax: st[i - 2], ay: st[i - 1], bx: st[i], by: st[i + 1], ink: true, len: l, t: l })
        }
        pos = [st[st.length - 2], st[st.length - 1]]
      }
      let T = 0, ink = 0
      for (const s of segs) { s.t0 = T; T += s.t; s.t1 = T; ink += s.ink ? s.len : 0 }
      groups.push({ ...def, segs, T, ink })
    }
    return { groups, end: pos }
  }

  /** total plot ink for one layout sample (budget sizing) */
  function sampleInk(rects) {
    let ink = 0 // (no structure: the sheet parts itself, the pen spends ink on words only)
    for (const f of fields) {
      const fit = fitField(f, rects[f.id])
      ink += (f.lblAdvU * (LBL_CAP / CAP_U)) * f.lblStrokeRatio + (f.advU * (fit.cap / CAP_U)) * f.strokeRatio
    }
    return ink
  }

  /** worst-case cloud cost for a field: its cloud at the ATTENDED size */
  function cloudCost(f, rects) {
    return strokesLength(cloudGeom(f, rects[f.id], 8).strokes)
  }
  /** a revision's geometry in cell r. Wide sheet: the cloud around the value, its △ beside
   *  it. Narrow sheet: EVERYTHING inside the cell — a small scallop, clear of the label and of
   *  the △, which stands in a fixed corner no value ever reaches (top-left: the label sits at
   *  mid-height or from x+14, the value from x+14/+22; the email's △ sits in its label band,
   *  left of the copy button). */
  function cloudGeom(f, r, n) {
    const fit = fitField(f, r)
    const box = valueBoxOf(f, r, fit)
    if (!V.P) {
      const triX = Math.min(box.x1 + 14, V.fr.x + V.fr.w - 40)
      const triY = Math.max(box.y0 - 40, V.fr.y + 8)
      const tri = triangleStrokes(triX, triY, n, 22)
      return { box, strokes: [...cloudStrokes(box), ...tri], tri, triAt: [triX + 15, triY + 10] }
    }
    const opt = { pad: 3, rMin: 5, rMax: 7 } // a soft scallop, scaled to the phone
    const m = opt.pad + opt.rMax * 0.75 + 2 // how far the scallops reach past the box
    const email = f.id === 'email'
    const c = { x0: Math.max(box.x0, r.x + (email ? 0 : TRI_CORNER) + m), y0: Math.max(box.y0, r.y + m), x1: Math.min(box.x1, r.x + r.w - m), y1: Math.min(box.y1, r.y + r.h - m) }
    if (!hideLbl.has(f.id)) {
      const lblRight = fit.lbl.x + f.lblAdvU * (LBL_CAP / CAP_U)
      if (lblRight + 4 <= fit.x) c.x0 = Math.max(c.x0, lblRight + m)
      else c.y0 = Math.max(c.y0, fit.lbl.y + 3 + m)
    }
    if (c.y1 - c.y0 < 4) c.y1 = c.y0 + 4
    const TRI = 10
    const triX = email ? r.x + r.w - 90 - 16 : r.x + 1
    const triY = r.y + 3 + TRI
    const tri = triangleStrokes(triX, triY, n, TRI)
    return { box: c, strokes: [...cloudStrokes(c, opt), ...tri], tri, triAt: [triX + 6, triY - 4] }
  }
  function valueBoxOf(f, r, fit) {
    const w = (fit.wrapped ? f.advMax : f.advU) * (fit.cap / CAP_U) * (fit.sx ?? 1)
    // the box wraps the SOAKED letterform: the ink spreads ~0.17 cap past the skeleton
    const pad = 4 + fit.cap * 0.18
    const lastBase = fit.y + (fit.wrapped ? (fit.n - 1) * fit.cap * fit.lh : 0)
    // the top clears the marks that rise past the cap (İ's dot, Ü's dots, Ğ's breve): they soak too
    const ascU = fit.wrapped ? f.ascFirstU : f.ascU
    const asc = fit.cap * (ascU / CAP_U + (ascU > CAP_U ? 0.1 : 0)) // + a soaked mark's lift
    return { x0: fit.x - pad, y0: fit.y - asc - pad, x1: Math.min(fit.x + w + pad, r.x + r.w - 6), y1: lastBase + fit.cap * 0.34 + pad * 0.6 }
  }

  // ── build: plan + schedule + budget (rest layout; called on resize / language) ──
  function build(partition, language) {
    lang = language
    V = view()
    const items = getItems()
    fields = items.map((it) => {
      const label = it.label.toLocaleUpperCase(lang)
      const f = { id: it.id, label, value: it.word, advU: measure(it.word, TRACK), lblAdvU: measure(label), condense: it.condense, narrowSoak: it.narrowSoak !== false }
      f.ascU = ascentU(it.word)
      if (it.lines) { f.lines = it.lines; f.advMax = Math.max(...it.lines.map((l) => measure(l, TRACK_WRAP))); f.ascFirstU = ascentU(it.lines[0]) }
      // stroke length per advance unit (pen path is longer than the advance): measured once
      f.strokeRatio = strokesLength(textStrokes(it.word, 0, 0, CAP_U, TRACK)) / f.advU
      f.lblStrokeRatio = strokesLength(textStrokes(label, 0, 0, CAP_U)) / f.lblAdvU
      return f
    })
    const rest = partition.sampleLayout(V.fr, null, V.P)
    const defs = [
      ...fields.filter((f) => !hideLbl.has(f.id)).map((f) => ({ key: 'labels', kind: 'label', strokes: labelStrokes(f, fitField(f, rest.rects[f.id])), w: penFor(LBL_CAP) })),
      ...fields.map((f) => {
        const fit = fitField(f, rest.rects[f.id])
        return { key: f.id, kind: 'value', field: f.id, strokes: valueStrokes(f, fit), w: penFor(fit.cap), cap: fit.cap }
      }),
    ]
    const { groups, end } = compileGroups(defs, [0, V.yTear]) // the pen wakes at the band's cut end
    plotInkTotal = groups.reduce((a, g) => a + g.ink, 0)

    // the budget: worst attention redistribution ×1.03 + FIVE clouds (each field once, at its
    // attended size) + the copy note + margin — in normal use the ink can never run out
    let worst = plotInkTotal
    for (const f of fields) {
      const s = partition.sampleLayout(V.fr, f.id, V.P)
      worst = Math.max(worst, sampleInk(s.rects))
    }
    let clouds = 0
    for (const f of fields) {
      const s = partition.sampleLayout(V.fr, f.id, V.P)
      clouds += cloudCost(f, s.rects)
    }
    const noteInk = strokesLength(textStrokes('KOPYALANDI', 0, 0, 9)) * 1.2
    L = Math.ceil(worst * 1.03 + clouds + noteInk + 300)

    // home: the cut end once the plot is paid for (rest layout)
    parkEnd = [(plotInkTotal / L) * V.W, V.yTear]
    const homeTravel = compileGroups([{ key: 'home', kind: 'home', strokes: [[end[0], end[1], parkEnd[0], parkEnd[1]]] }], end)
    homeTravel.groups[0].segs.forEach((s) => { s.ink = false; s.t = s.len * TRAVEL })
    { const g = homeTravel.groups[0]; let T = 0; for (const s of g.segs) { s.t0 = T; T += s.t; s.t1 = T }; g.T = T; g.ink = 0 }

    phases = PHASES.map((ph) => {
      const gs = ph.key === 'home' ? homeTravel.groups : groups.filter((g) => g.key === ph.key)
      const lastSegs = gs.length ? gs[gs.length - 1].segs : null
      const last = lastSegs ? lastSegs[lastSegs.length - 1] : null
      return { ...ph, groups: gs, T: gs.reduce((a, g) => a + g.T, 0), endPt: last ? [last.bx, last.by] : null }
    })
    cacheIdx = -1
    pathCache.clear()
    for (const rv of revs) rv.pathKey = null // records persist as data; they re-lay at the new size
    if (note) note.pathKey = null
  }

  // ── drawing helpers ──
  function strokePolys(ctx, strokes, width) {
    ctx.strokeStyle = INK
    ctx.lineWidth = width
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const st of strokes) {
      ctx.moveTo(st[0], st[1])
      for (let i = 2; i < st.length; i += 2) ctx.lineTo(st[i], st[i + 1])
    }
    ctx.stroke()
  }
  function drawGroupFull(ctx, g) { strokePolys(ctx, g.strokes, g.w ?? 1.3) }
  /** the active group, up to local time t; returns pen [x,y] and whether it is up */
  function drawGroupPrefix(ctx, g, t, dashes = true) {
    let pen = null, up = false
    ctx.strokeStyle = INK
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ctx.lineWidth = g.w ?? 1.3
    ctx.beginPath()
    let open = false
    for (const s of g.segs) {
      if (s.t0 > t) break
      const f = Math.min(1, (t - s.t0) / s.t)
      const bx = s.ax + (s.bx - s.ax) * f, by = s.ay + (s.by - s.ay) * f
      if (s.ink) {
        if (!open) { ctx.moveTo(s.ax, s.ay); open = true }
        ctx.lineTo(bx, by)
        up = false
      } else {
        if (open) { ctx.stroke(); ctx.beginPath(); open = false }
        if (f < 1 && dashes) { // the transient dashed trace of a pen-up move
          ctx.save()
          ctx.strokeStyle = 'rgba(21,20,18,.28)'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 5])
          ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.lineTo(bx, by); ctx.stroke()
          ctx.restore()
          ctx.lineWidth = g.w ?? 1.3; ctx.strokeStyle = INK; ctx.beginPath()
        }
        up = true
      }
      pen = [bx, by]
    }
    if (open) ctx.stroke()
    return { pen, up }
  }

  function ensureCache(idx) {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    if (cacheIdx === idx && cacheCnv && cacheLang === lang) return
    cacheCnv = cacheCnv ?? document.createElement('canvas')
    cacheCnv.width = Math.round(V.W * dpr); cacheCnv.height = Math.round(V.H * dpr)
    const c = cacheCnv.getContext('2d')
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.clearRect(0, 0, V.W, V.H)
    // values stay OUT of the cache: their pen line answers the soak per frame (fade / spine)
    for (let i = 0; i < idx; i++) for (const g of phases[i].groups) { if (g.kind !== 'value') drawGroupFull(c, g) }
    cacheIdx = idx; cacheLang = lang
  }

  /** how far a field's ink has soaked at this p: the email by SCROLL (pure, deterministic),
   *  the others by ATTENTION (their eased reward level) */
  function soakTOf(id, p) {
    if (!soakOn) return 0
    if (id === 'email') {
      const ph = PHASES.find((x) => x.key === 'email')
      return smooth(clamp((p - ph.p1) / SOAK_EMAIL_DUR, 0, 1))
    }
    // the narrow sheet: a field may never soak there (the phone number — see contact.js)
    if (V?.P && fields.find((x) => x.id === id)?.narrowSoak === false) return 0
    return attS[id] ?? 0
  }
  /** the others' soak rides the SAME flow as the growth: its target is a smooth function of
   *  the (critically damped) attention, followed by a critically damped spring — no abrupt
   *  start, no stop, no overshoot, no separate "pop". Returns true while moving */
  const soakV = {}
  function soakTick(atts, dt) {
    if (!soakOn) return false
    let moving = false
    const h = Math.min(dt, 1 / 30)
    for (const f of fields) {
      if (f.id === 'email') continue
      const target = smooth(((atts?.[f.id] ?? 0) - 0.3) / 0.55)
      const cur = attS[f.id] ?? 0
      if (S.reduced) { attS[f.id] = target; soakV[f.id] = 0; continue }
      const w = target > cur ? 11 : 14 // ω: rises with the cell, returns a touch quicker
      let v = soakV[f.id] ?? 0
      v += (w * w * (target - cur) - 2 * w * v) * h
      let nv = clamp(cur + v * h, 0, 1)
      if (Math.abs(nv - target) < 0.003 && Math.abs(v) < 0.01) { nv = target; v = 0 }
      attS[f.id] = nv; soakV[f.id] = v
      if (nv !== target) moving = true
    }
    return moving
  }
  /** the pen line over a soaking word, handed over along the SAME curve as the rows grow — no
   *  single hand-off moment. It stays whole while the rows are thin (t ≤ 0.3: the rows cannot
   *  carry yet — the disappearance rule), then yields while the rows still wear the pen's own
   *  shape (the first stage), so it is gone before they turn into the display face: its
   *  letters (a, g, @…) differ from the pen's, and a skeleton over them read as two letters. */
  function penTreatment(t) {
    if (t <= 0.3) return { alpha: 1 }
    const q = smooth((t - 0.3) / 0.25)
    // everywhere, every sheet: the ink passes into the paper — at full soak no pen trace is left
    // (a kept skeleton read as a second, thinner letter over the heavy one; user decision)
    return { alpha: 1 - q, wFix: q * 0.85 }
  }
  // the pen yields only as far as the rows' carrying gate is open (continuous: no pop at the gate)
  const gateHold = (cap) => smooth((soakGate(cap, V.sp) - 0.5) / 0.5)
  function strokeValue(ctx, strokes, w, t, cap) {
    const tr = penTreatment(t)
    if (tr.alpha <= 0.01) return
    ctx.globalAlpha = tr.alpha
    strokePolys(ctx, strokes, tr.wFix ? lerp(w, 1, tr.wFix) : w)
    ctx.globalAlpha = 1
  }

  // ── a revision is a RECORD ON AN ELASTIC SHEET: when Weight redistributes the cells, the
  //    ink moves with the fact it marks — the cloud and its triangle re-lay around the value's
  //    LIVE box (exactly as the lettering and the dividers re-lay). Its ink breathes with it;
  //    the reserve band answers, and the conservation stays structural. ──
  function revGeometry(rv) {
    const f = fields.find((x) => x.id === rv.id)
    return cloudGeom(f, liveGeom.rects[rv.id], rv.n)
  }
  function drawDoneRev(ctx, rv) {
    const g = revGeometry(rv)
    // the narrow sheet shows only the LATEST record's cloud (user decision); earlier records keep
    // their numbered △ — their ink stays spent (the record is kept, the paper is not un-inked)
    const triOnly = V.P && rv !== revs[revs.length - 1]
    const key = `${Math.round(g.box.x0)},${Math.round(g.box.y0)},${Math.round(g.box.x1)}x${Math.round(g.box.y1)}|${triOnly ? 't' : 'c'}`
    if (rv.pathKey !== key) {
      const p = new Path2D()
      for (const st of triOnly ? g.tri : g.strokes) { p.moveTo(st[0], st[1]); for (let i = 2; i < st.length; i += 2) p.lineTo(st[i], st[i + 1]) }
      rv.pathKey = key
      rv.path = p
      rv.liveInk = strokesLength(g.strokes)
      rv.triAt = g.triAt
    }
    ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.15
    ctx.stroke(rv.path)
  }
  function drawDoneNote(ctx) {
    const er = liveGeom.rects.email
    const cap = 9
    const w = measure(note.text) * (cap / CAP_U)
    const x = er.x + er.w - w - 26, y = er.y + 44
    const key = `${Math.round(x)},${Math.round(y)}`
    if (note.pathKey !== key) {
      const p = new Path2D()
      for (const st of textStrokes(note.text, x, y, cap)) { p.moveTo(st[0], st[1]); for (let i = 2; i < st.length; i += 2) p.lineTo(st[i], st[i + 1]) }
      note.pathKey = key
      note.path = p
    }
    ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1
    ctx.stroke(note.path)
  }

  // ── ink accounting ──
  function plotInkAt(tPhaseIdx, tLocal) {
    let ink = 0
    for (let i = 0; i < tPhaseIdx; i++) ink += phases[i].groups.reduce((a, g) => a + g.ink, 0)
    const ph = phases[tPhaseIdx]
    if (ph) {
      let t = tLocal
      for (const g of ph.groups) {
        if (t <= 0) break
        if (t >= g.T) { ink += g.ink; t -= g.T; continue }
        for (const s of g.segs) {
          if (s.t0 > t) break
          if (s.ink) ink += s.len * Math.min(1, (t - s.t0) / s.t)
        }
        t = -1
      }
    }
    return ink
  }
  function recordedInk() {
    let ink = revs.reduce((a, r) => a + (r.done ? (r.liveInk ?? r.ink) : r.inkAt(performance.now())), 0)
    if (note) ink += note.done ? note.ink : note.inkAt(performance.now())
    return ink
  }
  function liveUsed() {
    if (!liveGeom) return plotInkTotal
    let ink = 0
    for (const f of fields) {
      const fit = fitField(f, liveGeom.rects[f.id])
      ink += (f.lblAdvU * (LBL_CAP / CAP_U)) * f.lblStrokeRatio + (f.advU * (fit.cap / CAP_U)) * f.strokeRatio
    }
    return ink
  }

  // ── revisions (the climax) and the copy note ──
  function compileRealtime(strokeList, from, wOf) {
    const defs = strokeList.map((stroke, i) => ({ key: 'rev', kind: 'rev', strokes: [stroke], w: wOf(i) }))
    const { groups, end } = compileGroups(defs, from)
    const T = groups.reduce((a, g) => a + g.T, 0)
    const ink = groups.reduce((a, g) => a + g.ink, 0)
    return { groups, T, ink, end }
  }
  const parkNow = () => {
    const used = liveGeom ? liveUsed() + recordedInk() : plotInkTotal + recordedInk()
    return [clamp(used / L, 0, 1) * V.W, V.yTear]
  }

  function revise(id) {
    const f = fields.find((x) => x.id === id)
    if (!f || !liveGeom) return 'out'
    const existing = revs.find((r) => r.id === id)
    if (existing) {
      // the record already stands: the pen only visits its triangle (no new ink)
      const from = parkNow()
      const t = existing.triAt ?? [from[0], from[1] - 40]
      const seg = compileRealtime([[from[0], from[1], t[0], t[1]], [t[0], t[1], from[0], from[1]]], from, () => 1)
      seg.groups.forEach((g) => g.segs.forEach((s) => { s.ink = false }))
      const visit = { id: `${id}#visit`, n: existing.n }
      startRun(visit, seg, true)
      visits.push(visit)
      return 'visit'
    }
    const rv = { id, n: revs.length + 1 }
    const g = revGeometry(rv)
    const from = parkNow()
    const run = compileRealtime(g.strokes, from, (i) => (i === 0 ? 1.15 : 1.1))
    const reserve = L - (liveUsed() + recordedInk())
    if (run.ink > reserve) { outFlash = performance.now() + 2400; return 'out' } // theoretical guard: the pen stays parked
    rv.ink = run.ink
    rv.triAt = g.triAt
    startRun(rv, run, false)
    revs.push(rv)
    return 'new'
  }
  const visits = [] // pen-up visits to an existing record (no ink, pure travel)

  function copied() {
    if (note || !liveGeom?.rects?.email) return false // the note is written ONCE; a record stays
    const er = liveGeom.rects.email
    const text = lang === 'tr' ? 'KOPYALANDI' : 'COPIED'
    const cap = 9
    const w = measure(text) * (cap / CAP_U)
    const x = er.x + er.w - w - 26, y = er.y + 44
    const from = parkNow()
    const run = compileRealtime(textStrokes(text, x, y, cap), from, () => 1)
    note = { ink: run.ink, text }
    startRun(note, run, false)
    return true
  }

  function startRun(holder, run, visitOnly) {
    holder.groups = run.groups
    holder.T = run.T
    holder.rate = run.T / Math.min(0.9, Math.max(0.6, run.T / 1600)) / 1000 // 0.6–0.9 s, px-time per ms
    holder.start = performance.now()
    holder.done = false
    holder.visitOnly = visitOnly
    holder.inkAt = (now) => {
      if (holder.done) return holder.visitOnly ? 0 : holder.ink
      const t = (now - holder.start) * holder.rate
      let ink = 0, off = 0
      for (const g of holder.groups) {
        for (const s of g.segs) { if (off + s.t0 > t) break; if (s.ink) ink += s.len * Math.min(1, (t - off - s.t0) / s.t) }
        off += g.T
      }
      return ink
    }
    if (S.reduced) holder.done = true
  }

  /** draw an in-flight realtime run; returns pen (finishing frame still draws + repaints) */
  function drawRun(ctx, holder, now) {
    if (holder.done) return null
    const t = (now - holder.start) * holder.rate
    if (t >= holder.T) {
      // the finishing frame paints the whole record once; the live-following path takes over
      if (!holder.visitOnly) for (const g of holder.groups) drawGroupFull(ctx, g)
      holder.done = true
      return { pen: null, up: true, finishing: true }
    }
    let pen = null, up = false, tAcc = 0
    for (const g of holder.groups) {
      if (t <= tAcc) break
      const r = drawGroupPrefix(ctx, g, t - tAcc, true)
      if (r.pen) { pen = r.pen; up = r.up }
      tAcc += g.T
    }
    return { pen, up }
  }

  // ── the band (the torn row's remainder), rails and carriage ──
  function drawBand(ctx, reserve, birth) {
    if (birth <= 0.002) return
    const w = clamp(reserve / L, 0, 1) * V.W
    if (w < 1) return
    const h = lerp(V.rowTh, V.rowTh * 2.8, birth)
    const x = V.W - w
    ctx.globalAlpha = lerp(0.5, 0.92, birth)
    ctx.fillStyle = INK
    ctx.fillRect(x, V.yTear - h / 2, w, h)
    if (birth > 0.6) ctx.fillRect(x - 1.6, V.yTear - h * 1.3 - 1, 1.6, h * 2.6 + 2) // the cut end
    ctx.globalAlpha = 1
  }
  function drawGantry(ctx, pen, up, alpha) {
    if (!pen || alpha <= 0.01) return
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = 'rgba(21,20,18,.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, pen[1]); ctx.lineTo(V.W, pen[1])
    ctx.moveTo(pen[0], V.top); ctx.lineTo(pen[0], V.bot)
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.fillRect(pen[0] - 9, pen[1] - 3, 18, 6)
    ctx.beginPath(); ctx.arc(pen[0], pen[1], up ? 5 : 2.4, 0, Math.PI * 2)
    if (up) { ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke() } else ctx.fill()
    ctx.restore()
  }

  // ── live lettering (post-plot): vectors follow the cells; Path2D per field, re-keyed on move ──
  function drawLiveField(ctx, f, r, soakT = 0) {
    const fit = fitField(f, r)
    // the key carries the cap and which side of the floor it is on: a spring settling within a
    // pixel across the floor must never keep a stale pen path over the DOM line
    const key = `${lang}|${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)}x${Math.round(r.h)}|${Math.round(fit.cap * 4)}|${fit.cap >= FLOOR_CAP ? 1 : 0}`
    let e = pathCache.get(f.id)
    if (!e || e.key !== key) {
      const toPath = (strokes) => {
        const p = new Path2D()
        for (const st of strokes) { p.moveTo(st[0], st[1]); for (let i = 2; i < st.length; i += 2) p.lineTo(st[i], st[i + 1]) }
        return p
      }
      // below the monoline floor the pen leaves the fact to the DOM's clear mono line
      e = {
        key,
        lbl: toPath(labelStrokes(f, fit)),
        val: fit.cap >= FLOOR_CAP ? toPath(valueStrokes(f, fit)) : null,
        w: penFor(fit.cap), cap: fit.cap,
      }
      pathCache.set(f.id, e)
    }
    ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    if (!hideLbl.has(f.id)) {
      ctx.lineWidth = penFor(LBL_CAP)
      ctx.stroke(e.lbl)
    }
    if (e.val) {
      const tr = penTreatment(soakT * gateHold(e.cap))
      if (tr.alpha > 0.01) {
        ctx.globalAlpha = tr.alpha
        ctx.lineWidth = tr.wFix ? lerp(e.w, 1, tr.wFix) : e.w
        ctx.stroke(e.val)
        ctx.globalAlpha = 1
      }
    }
    return e.cap
  }

  // ── the frame's public surface ──
  return {
    build,
    layout(pt) { liveGeom = { rects: pt.rects, divs: pt.divs } },
    get tear() { return V ? { row: V.kTear, y: V.yTear, birth: clamp(lastP / P_TEAR, 0, 1) } : null },
    get view() { return V },
    get budget() { return L },
    get plotInk() { return plotInkTotal },
    revise, copied,
    get revCount() { return revs.length },
    valueBox(id) {
      const f = fields.find((x) => x.id === id)
      if (!f || !liveGeom) return null
      const fit = fitField(f, liveGeom.rects[id])
      return valueBoxOf(f, liveGeom.rects[id], fit)
    },
    capOf(id) {
      const f = fields.find((x) => x.id === id)
      return f && liveGeom ? fitField(f, liveGeom.rects[id]).cap : 99
    },
    /** the p at which a field's value is fully written (its phase's end) */
    fieldEndP(id) { return PHASES.find((ph) => ph.key === id)?.p1 ?? 1 },
    soakTOf,
    soakTick,
    /** the value's current strokes + box, for the soak variant's raster */
    valueRender(id) {
      const f = fields.find((x) => x.id === id)
      if (!f || !liveGeom) return null
      const r = liveGeom.rects[id]
      const fit = fitField(f, r)
      // per line: the pen's advance cells (the display face is registered on them)
      const lines = fit.wrapped
        ? f.lines.map((ln, i) => ({ y: fit.y + i * fit.cap * fit.lh, cells: textCells(ln, fit.x, fit.cap, TRACK_WRAP) }))
        : [{ y: fit.y, cells: textCells(f.value, fit.x, fit.cap, TRACK).map((c) => (fit.sx < 1 ? { ch: c.ch, x0: fit.x + (c.x0 - fit.x) * fit.sx, x1: fit.x + (c.x1 - fit.x) * fit.sx } : c)) }]
      let strokes = null // smoothed on demand: only a raster build needs them, not every frame
      return {
        get strokes() { return (strokes ??= valueStrokes(f, fit)) },
        cap: fit.cap, box: valueBoxOf(f, r, fit),
        cell: r, shape: fit.wrapped ? `w${fit.n}` : 'l', lines,
      }
    },
    inkState(p) {
      const now = performance.now()
      const rec = recordedInk()
      let used
      if (p >= LIVE_P - 1e-6 && liveGeom) used = liveUsed() + rec
      else {
        const { idx, tLocal } = phaseAt(p)
        used = plotInkAt(idx, tLocal) + (p > 0.9 ? rec : 0)
      }
      return {
        usedMm: Math.round(used * PX_TO_MM),
        reserveMm: Math.round(Math.max(0, L - used) * PX_TO_MM),
        rev: revs.length,
        out: now < outFlash,
      }
    },
    invariant() {
      // structural: reserve is DEFINED as L − used; the check is that used never exceeds L
      const used = (liveGeom ? liveUsed() : plotInkTotal) + recordedInk()
      return used <= L + L * 0.002
    },

    /** the one draw. `soakDrawn[id]` reports which soaks were actually PAINTED this frame:
     *  a value whose soak is not on screen keeps its pen line whole — never invisible. */
    draw(p, dt, level = 0, soakDrawn = {}) {
      const ctx = S.ctx
      const now = performance.now()
      // (reduced motion's four stations are applied by the caller, one source for every layer)
      const scrolling = lastP >= 0 && Math.abs(p - lastP) > 1e-5
      if (scrolling) lastPT = now
      lastP = p

      // 1) tear (surface fades the row via `tear`; the sag is drawn here)
      if (p <= P_TEAR && p > 0) {
        const t = p / P_TEAR
        const sag = 6 * Math.sin(Math.PI * t)
        ctx.strokeStyle = INK; ctx.lineWidth = V.rowTh * 1.4; ctx.globalAlpha = 0.6
        ctx.beginPath()
        for (let i = 0; i <= 64; i++) { const x = (i / 64) * V.W; const y = V.yTear + Math.sin((Math.PI * i) / 64) * sag
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) }
        ctx.stroke(); ctx.globalAlpha = 1
        return false
      }
      if (p <= 0) return false

      // 2) fuse: the freed row gathers into the saturated band (its whole length = the budget)
      const fuse = smooth((p - P_TEAR) / (P_FUSE - P_TEAR))
      const rec = recordedInk()
      const { idx, tLocal, done } = phaseAt(p)
      const plotInk = p >= LIVE_P ? plotInkTotal : plotInkAt(idx, tLocal)
      const used = (p >= LIVE_P && liveGeom ? liveUsed() : plotInk) + (p > 0.9 ? rec : 0)
      drawBand(ctx, L - used, fuse)
      if (fuse < 1 && p < P_FUSE) {
        // rails wake while the carriage docks at the cut end
        railFade = fuse
        drawGantry(ctx, [((used / L) * V.W), V.yTear], true, S.reduced ? 0 : fuse)
        return false
      }

      let pen = null, up = true, animating = false

      if (p < LIVE_P) {
        // ── the plot: cached completed phases + the active group, live. Value strokes are
        //    always live: their pen line answers the soak (fade / spine) per frame. ──
        ensureCache(idx)
        ctx.drawImage(cacheCnv, 0, 0, V.W, V.H)
        for (let i = 0; i < idx; i++) for (const g of phases[i].groups) {
          // the pen yields only to soak that is ACTUALLY on screen AND at full carrying gate
          if (g.kind === 'value') strokeValue(ctx, g.strokes, g.w, soakDrawn[g.field] ? soakTOf(g.field, p) * gateHold(g.cap) : 0, g.cap)
        }
        const ph = phases[idx]
        if (ph && !done) {
          let t = tLocal
          for (const g of ph.groups) {
            if (t <= 0) break
            if (t >= g.T) { drawGroupFull(ctx, g); t -= g.T; continue }
            const r = drawGroupPrefix(ctx, g, t, level < 2)
            if (r.pen) { pen = r.pen; up = r.up }
            t = -1
          }
        }
        // between phases the pen rests where the last stroke ended, not back at the cartridge
        if (!pen) pen = (idx > 0 && phases[idx - 1]?.endPt) || [((used / L) * V.W), V.yTear]
      } else {
        // ── live: the paper is elastic — its partings and the lettering follow the cells; the
        //    carriage stays parked while attention redistributes ──
        for (const f of fields) drawLiveField(ctx, f, liveGeom.rects[f.id], soakDrawn[f.id] ? soakTOf(f.id, p) : 0)
        for (const rv of revs) if (rv.done) drawDoneRev(ctx, rv)
        if (note?.done) drawDoneNote(ctx)
        pen = parkNow(); up = true
        for (const h of [...revs, ...visits, ...(note ? [note] : [])]) {
          if (h.done) continue
          const r = drawRun(ctx, h, now)
          if (r) { pen = r.pen ?? pen; up = r.up; animating = true }
        }
      }

      // rails: fully awake while the pen works, faded at rest, gone under reduced motion
      const working = (p > P_TEAR && p < LIVE_P && now - lastPT < 200) || animating
      const railTarget = working ? 1 : 0.35
      railFade += (railTarget - railFade) * (1 - Math.exp(-8 * dt))
      drawGantry(ctx, pen, up, S.reduced ? 0 : railFade)
      return animating || Math.abs(railTarget - railFade) > 0.02
    },
  }

  function phaseAt(p) {
    for (let i = 0; i < phases.length; i++) {
      const ph = phases[i]
      if (p < ph.p1) {
        if (p < ph.p0) return { idx: i, tLocal: 0, done: false }
        return { idx: i, tLocal: smooth((p - ph.p0) / (ph.p1 - ph.p0)) * ph.T, done: false }
      }
    }
    return { idx: phases.length, tLocal: 0, done: true }
  }
}
