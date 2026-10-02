// Surface states. Each state is a rule set for the rows, what the rows carry, and a composition:
// the static partings / gathers that give it its space. Same material, different spatial consequence.
// Content texture C:  R tone · G type · B void (no rows) · A static saturation
//   (split states: R = fragments of row set 0, G = fragments of row set 1 — see surface.js)
// Beneath texture D:  R latent image · G work id (for its ink) · B flash map
//
// Layout is computed when a state is made; its pixels are drawn only when the surface first needs them
// (surface.js composes the channels on the GPU). Media tone is cached per image, not per layout, so a resize
// re-lays the composition without re-processing any image.
import { hex, feature } from './surface.js'
import { toneOf, drawCover, fragments } from './media.js'
import { capabilities, works, previewOf } from './content.js'

export const FAMILY = '"Big Shoulders Display Variable", "Big Shoulders Display", Impact, sans-serif'
export const PAPER = '#e7e6e0'
export const INK = '#121212'
export const NIGHT = '#0e0f11'
const BG_LIGHT = '#efeee9', BG_DARK = '#0b0c0e'
export const LOD_OFF = 2.1   // how unresolved information is out of register

const BLANK_D = { data: new Uint8Array(16), tw: 2, th: 2, shared: true }
const MCTX = document.createElement('canvas').getContext('2d')   // for measuring type before anything is drawn

function channels(tw, th, sx, sy, n) {
  return Array.from({ length: n }, () => {
    const c = document.createElement('canvas'); c.width = tw; c.height = th
    const x = c.getContext('2d')
    x.fillStyle = '#000'; x.fillRect(0, 0, tw, th); x.setTransform(sx, 0, 0, sy, 0, 0)
    x.fillStyle = '#fff'
    x.sx = sx
    return x
  })
}
// exact per-axis scale, so the last texel column/row is fully covered (no half-void seam at the edge)
// exported so a feature's own states are built the same way every state on this site is, rather than by a
// second copy of this logic that could drift from it
export function build(V, texH, drawC, drawD, mips = false) {
  const S = V.W < 700 ? 0.75 : 0.6
  const tw = Math.max(2, Math.round(V.W * S)), th = Math.max(2, Math.round(texH * S))
  const sx = tw / V.W, sy = th / texH
  const out = {
    c: { tw, th, mips, draw: () => { const cs = channels(tw, th, sx, sy, 4); drawC({ tone: cs[0], solid: cs[1], voids: cs[2], fuse: cs[3] }); return cs.map((x) => x.canvas) } },
    d: BLANK_D,
  }
  if (drawD) out.d = { tw, th, mips: false, draw: () => { const ds = channels(tw, th, sx, sy, 3); drawD({ lat: ds[0], id: ds[1], flash: ds[2] }); return [...ds.map((x) => x.canvas), null] } }
  return out
}

export function mk(V, o) {
  const texH = o.texH || V.H
  const st = {
    freq: 0.12, wave: 0, thick: 0.85, amp: 1, fuse: 0, offY: 0, flash: 0, vis: 1, ampK: 1, split: false, fill: 0, lod: 0,
    inkHex: INK, paperHex: PAPER, bg: BG_LIGHT, negative: false, beneath: null, capacity: 1.5,
    features: [], weak: (x, y) => y, layout: {},
    ...o,
    texH, total: V.H / o.spacing + 2,
  }
  st.ink = hex(st.inkHex); st.paper = hex(st.paperHex); st.bgv = hex(st.bg)
  st.reg = { a0: 0, a1: 0, va0: 0, va1: 0, holdA: 1, phase: 0 }
  return st
}

export function fit(text, maxW, maxCap) {
  MCTX.font = `900 100px ${FAMILY}`
  const w = MCTX.measureText(text).width
  const cap = MCTX.measureText('H').actualBoundingBoxAscent / 100
  const size = Math.min((100 * maxW) / w, maxCap / cap)
  return { size, cap: size * cap, width: (w * size) / 100, capR: cap }
}
const strips = (v, V, texH = V.H) => { v.fillRect(0, 0, V.W, V.strip); v.fillRect(0, texH - V.strip, V.W, V.strip) }
function weather(ctx, V, blobs, a) {
  for (const [bx, by, br] of blobs) {
    const g = ctx.createRadialGradient(V.W * bx, V.H * by, 0, V.W * bx, V.H * by, Math.max(V.W, V.H) * br)
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, V.W, V.H)
  }
}
// a void with feathered edges: the rows thin out towards the text instead of stopping at a box. `depth` is how much
// of the rows it takes: 1 clears them, less thins them (the shader scales a row's width by 1 - void)
function softRect(ctx, r, feather, depth = 1) {
  ctx.save(); ctx.globalAlpha = depth
  ctx.shadowColor = '#fff'; ctx.shadowBlur = feather * ctx.sx; ctx.shadowOffsetX = 20000
  ctx.fillStyle = '#fff'
  ctx.fillRect(r.x - 20000 / ctx.sx, r.y, r.w, r.h)
  ctx.restore()
}
// an image, split: this row set's fragments only
function drawFragments(ctx, rects, tc, r) {
  ctx.save()
  ctx.beginPath(); for (const t of rects) ctx.rect(t.x, t.y, t.w, t.h); ctx.clip()
  drawCover(ctx, tc, r)
  ctx.restore()
}
const rowSpacing = (V) => (V.P ? 5.2 : 7)
const opening = (r, padX, padY, o = {}) => feature({ kind: 0, cx: r.x + r.w / 2, cy: r.y + r.h / 2, h: r.h / 2 + padY, hw: r.w / 2 + padX, power: 8, falloff: 34, ...o })
// a room exactly around a piece of media: flat across its width, closing just past its corners
export const room = (r) => feature({ kind: 0, cx: r.x + r.w / 2, cy: r.y + r.h / 2, h: r.h * 0.55 + 8, hw: r.w * 0.625 + 6, power: 12, falloff: 30 })
// the largest rect of an aspect ratio inside a box
export function fitRect(aspect, box, align = 'center') {
  let w = box.w, h = w / aspect
  if (h > box.h) { h = box.h; w = h * aspect }
  const x = align === 'left' ? box.x : align === 'right' ? box.x + box.w - w : box.x + (box.w - w) / 2
  return { x: Math.round(x), y: Math.round(box.y + (box.h - h) / 2), w: Math.round(w), h: Math.round(h) }
}

export function blank(V) {
  return mk(V, { id: 'blank', spacing: rowSpacing(V), inkHex: PAPER, c: { data: new Uint8Array(16), tw: 2, th: 2 }, d: BLANK_D })
}

// ─── identity: original C2's name plate ───────────────────────────────────────
export function name(V) {
  const { W, H, P, pad, strip } = V
  const avail = H - strip * 2
  const a = fit('EMRAH', W - pad * 2, (avail * 0.9) / 2.3)
  const b = fit('YÜCEL', W - pad * 2, (avail * 0.9) / 2.3)
  const size = Math.min(a.size, b.size), cap = Math.min(a.cap, b.cap)
  const gap = cap * (P ? 0.42 : 0.3)
  const top = strip + (avail - (cap * 2 + gap)) / 2
  const lay = { top, cap, gap, gapY: top + cap + gap * 0.5, bottom: top + cap * 2 + gap }
  const img = build(V, H, ({ tone, solid, voids }) => {
    weather(tone, V, P ? [[0.2, 0.25, 0.5], [0.8, 0.7, 0.6]] : [[0.18, 0.3, 0.45], [0.72, 0.2, 0.35], [0.88, 0.8, 0.5]], 0.34)
    solid.font = `900 ${size}px ${FAMILY}`
    solid.fillText('EMRAH', pad - size * 0.02, top + cap)
    solid.fillText('YÜCEL', pad - size * 0.02, top + cap * 2 + gap)
    strips(voids, V)
  })
  return mk(V, {
    id: 'name', spacing: rowSpacing(V), freq: P ? 0.2 : 0.12, thick: P ? 0.72 : 0.85, ...img, layout: lay,
    beneath: 'about', capacity: 1.45, weak: () => lay.gapY,
  })
}

// ─── two faces: a light, open surface (creative) over a dense system (full-stack) ─────
// The faces differ in density, not in layout: parting one shows the other in the same place.
export function face(V, which) {
  const { W, H, P, pad, strip } = V
  const neg = which === 'system'
  const word = capabilities[neg ? 'system' : 'surface'].word
  let lay, draw
  if (!P) {
    const S = V.S
    const posBlock = S ? { x: pad, y: strip + 14, w: Math.round(W * 0.5), h: Math.round(H * 0.3) } : { x: pad, y: strip + 46, w: Math.min(W * 0.56, 840), h: Math.round(H * 0.25) }
    let size = Infinity, capR = 0.72
    for (const w of [capabilities.surface.word, capabilities.system.word]) { const f = fit(w, W - pad * 2, H * 0.3); if (f.size < size) { size = f.size; capR = f.capR } }
    const cap = size * capR
    const base = H - strip - 28
    MCTX.font = `900 ${size}px ${FAMILY}`
    const wordW = MCTX.measureText(word).width
    const listBlock = S
      ? { x: Math.round(W * 0.56), y: strip + 14, w: Math.round(W * 0.44 - pad), h: Math.max(80, Math.round(base - cap - 20 - strip - 14)) }
      : { x: Math.round(W * 0.62), y: posBlock.y + posBlock.h + 34, w: Math.round(W * 0.38 - pad), h: 176 }
    const roleRight = pad + wordW + 22
    const role = S ? null : W - pad - roleRight > 250 ? { x: roleRight, y: base - 30 } : { x: pad, y: base - cap - 40 }
    lay = { posBlock, listBlock, cap, base, wordTop: base - cap, role, weakY: Math.round((listBlock.y + listBlock.h + base - cap) / 2) }
    draw = (solid) => { solid.font = `900 ${size}px ${FAMILY}`; solid.fillText(word, pad - size * 0.02, base) }
  } else {
    // portrait: the word turns and runs up the left edge; the statement takes the rest of the width
    let size = Infinity, capR = 0.72
    for (const w of [capabilities.surface.word, capabilities.system.word]) {
      MCTX.font = `900 100px ${FAMILY}`
      const w100 = MCTX.measureText(w).width, r = MCTX.measureText('H').actualBoundingBoxAscent / 100
      const s = Math.min(((H - strip * 2 - 34) * 100) / w100, (W * 0.3) / r)
      if (s < size) { size = s; capR = r }
    }
    const cap = size * capR
    const colX = pad + cap + 18, colW = W - colX - pad
    const pos = { x: colX, y: strip + 22, w: colW, h: Math.round(H * 0.3) }
    const list = { x: colX, y: pos.y + pos.h + 26, w: colW, h: Math.round(H * 0.38) }
    lay = { posBlock: pos, listBlock: list, cap, base: 0, wordTop: 0, role: null, weakY: Math.round(pos.y + pos.h + 13), portrait: true }
    draw = (solid, voids) => {
      solid.save(); solid.font = `900 ${size}px ${FAMILY}`
      solid.translate(pad + cap, H - strip - 16); solid.rotate(-Math.PI / 2); solid.fillText(word, 0, 0)
      solid.restore()
      softRect(voids, pos, 14); softRect(voids, list, 14)
    }
  }
  const img = build(V, H, ({ tone, solid, voids }) => {
    weather(tone, V, neg ? [[0.7, 0.8, 0.5], [0.2, 0.2, 0.4]] : [[0.3, 0.75, 0.5], [0.85, 0.3, 0.4]], neg ? 0.18 : 0.26)
    strips(voids, V)
    draw(solid, voids)
  })
  // both faces share one composition (same openings, same softness), so either can take over from the other without a jump
  const features = P ? [] : [opening(lay.posBlock, 150, 16, { falloff: 56 }), opening(lay.listBlock, 90, 12, { falloff: 48 })]
  return mk(V, {
    id: neg ? 'system' : 'creative',
    spacing: neg ? (P ? 4.2 : 5) : (P ? 7.4 : 11), thick: neg ? (P ? 0.72 : 0.78) : (P ? 0.72 : 0.78),
    freq: neg ? 0.16 : 0.07, amp: neg ? 0.25 : 0.45,
    inkHex: neg ? PAPER : INK, paperHex: neg ? NIGHT : PAPER, bg: neg ? BG_DARK : BG_LIGHT, negative: neg,
    ...img, layout: lay, features, beneath: 'state', capacity: 1.3,
    weak: () => lay.weakY,
  })
}

// ─── work field: every work is in the material on its own registration key ─────
// The real interface is split into complementary fragments across the two row sets: out of register they are
// two incompatible, unresolved patchworks; in exact register they meet as one sharp picture and the rows fill with it.
// The frame takes the capture's own proportions — a wide hero stays wide, a phone capture stays tall.
const POCKET = 0.6
const LINE_PAD = 4   // around a line's box, so the glyphs' own overhang and the texture's sampling stay clear
function clearLines(voids, lines) {
  for (const r of lines) softRect(voids, { x: r.x - LINE_PAD, y: r.y - LINE_PAD, w: r.w + LINE_PAD * 2, h: r.h + LINE_PAD * 2 }, 6)
}
export function workFrame(V, w) {
  const { W, H, P, pad, strip } = V
  const item = previewOf(w, P, V.T)
  const col = P ? { x: 0, y: strip, w: W, h: Math.round(H * (V.T ? 0.34 : H < 640 ? 0.5 : H < 760 ? 0.44 : 0.4)) } : { x: 0, y: strip, w: Math.round(W * (V.S ? 0.34 : 0.28)), h: H - strip * 2 }
  if (P) {
    const y0 = col.y + col.h + 26
    const area = { x: pad, y: y0, w: W - pad * 2, h: H - strip - 24 - y0 }
    // a tablet capture keeps its own proportions in the frame; a phone fills the width as before
    return { col, item, frame: V.T ? fitRect(item.aspect, area, 'center') : area }
  }
  const box = V.S
    ? { x: Math.round(W * 0.39), y: strip + 16, w: Math.round(W * 0.61 - pad), h: H - strip * 2 - 32 }
    : { x: Math.round(W * 0.33), y: strip + 40, w: Math.round(W * 0.67 - pad), h: H - strip * 2 - 80 }
  return { col, item, frame: fitRect(item.aspect, box, 'center') }
}
/*
 * THE REGISTERED WORK'S NAME, SUBTITLE AND DOOR GET THE SAME POCKET AS A CASE STUDY (R8).
 *
 * On a phone those three sit at the BOTTOM of the index column, and the column's night fades out there. On a tall
 * viewport they stay on the night and read at 15:1. But a real Safari has toolbars: at the 620-760 px of visible
 * height an iPhone actually gives, the block falls past the fade onto the cream row field, and the rows run
 * straight through the words — measured at 390x700: the subtitle 38% of its pixels below AA with three rows
 * crossing it, the door 57% and 1.01:1. Reported from a real iPhone, 2026-10-02.
 *
 * So the rows are cleared behind each line of type here exactly as they are behind a case study's, from boxes
 * measured in the DOM (main.js, currentPocket) and handed to this state in `lines`. The ink is chosen separately,
 * by the ground each line actually sits on — that is the DOM's business and lives in main.js.
 */
export function workState(V, w, i) {
  const { P } = V
  const { col, item, frame } = workFrame(V, w)
  const [fa, fb] = fragments(frame, i + 3)
  const lines = []
  /*
   * THE COLUMN'S FOOT REACHES THE BLOCK, BECAUSE THE BLOCK CANNOT STRADDLE THE FADE.
   *
   * `foot.y` is where the night stops being solid. It starts at the column's own height and is raised by main.js
   * (currentPocket) to clear the registered work's name, subtitle and door once they have been laid out. Without
   * it the three fall into the gradient on a short viewport — measured at 390x700, the block sits at y 287-343
   * while the night is solid only to 282 and fades to 392, so the words sit on a HALF-fused ground: the rows show
   * through them, and no choice of ink can be right because the ground is a gradient under the line rather than
   * one colour. Reported from a real iPhone, 2026-10-02.
   */
  const foot = { y: col.y + col.h }
  const img = build(V, V.H, ({ tone, solid, voids, fuse }) => {
    strips(voids, V)
    // the index lives in material saturated into one solid mass; its edge tapers row by row
    const g = P ? fuse.createLinearGradient(0, foot.y - 70, 0, foot.y + 40) : fuse.createLinearGradient(col.x + col.w - 22, 0, col.x + col.w + 8, 0)
    g.addColorStop(0, '#fff'); g.addColorStop(1, '#000')
    fuse.fillStyle = g
    fuse.fillRect(col.x, col.y, col.w + (P ? 0 : 8), (P ? foot.y + 40 : col.y + col.h) - col.y)
    const tc = toneOf(item.im)
    if (tc) { drawFragments(tone, fa, tc, frame); drawFragments(solid, fb, tc, frame) }
    // after the tone, so a line's pocket is not painted over by the preview's fragments
    clearLines(voids, lines)
  }, ({ lat, id, flash }) => {
    const tc = toneOf(item.im)
    if (tc) drawCover(lat, tc, frame)
    id.fillStyle = `rgb(${i + 1},${i + 1},${i + 1})`; id.fillRect(frame.x - 20, frame.y - 20, frame.w + 40, frame.h + 40)
    flash.globalAlpha = 0.6; if (tc) drawCover(flash, tc, frame)
  }, true)
  return mk(V, {
    id: `work-${i}`, spacing: rowSpacing(V), freq: P ? 0.2 : 0.13, thick: P ? 0.66 : 0.8, amp: 0, toneThick: 2.7, split: true, lod: LOD_OFF,
    ...img, lines, foot, layout: { col, frame }, beneath: 'work', capacity: 1.15, workIndex: i,
    weak: () => frame.y + frame.h / 2,
  })
}

// ─── lab: open rows and nothing else — the composition is made by what is held here ───
/**
 * THE LAB STOP IS A HANDOFF, NOT A SCENE. The Lab is its own route now — the registered bench — so this place on
 * the index no longer has a composition of its own to show. It used to: a caption room held open in the sheet by
 * an `opening`, which is the white capsule the visitor still saw for a moment on the way through, after the room
 * IA it belonged to had been retired. That opening, and the room it framed, are gone.
 *
 * What is left is the sheet itself — the same rows, the same strips, at rest — which is the field every transition
 * on this site passes through. Travelling to the Lab now crosses neutral material and arrives at the bench.
 */
export function labState(V) {
  const { H, P } = V
  const img = build(V, H, ({ voids }) => {
    strips(voids, V)
  })
  return mk(V, {
    id: 'lab', spacing: rowSpacing(V), freq: 0.1, thick: P ? 0.72 : 0.82, amp: 0, memThick: 0.8, memTone: 0,
    ...img,
  })
}

// ─── rest: every row lies straight, and carries the visit ─────────────────────────
/**
 * THE CONTACT STOP IS A HANDOFF TOO. Contact is its own route now — the plotter finale, /[locale]/contact — and the
 * stop hands over to it when travel settles on it, as the Lab stop does (main.js). The room it used to open in the
 * sheet (a wedge where the About mark had given way, and the contact block set in it) is gone with the old Contact.
 * What stays is the material: straight rows carrying one thread of each work the visitor opened.
 */
export function rest(V, visitOrder = [], mark = null) {
  const { W, H, P, strip } = V
  // history is art-directed: at most three threads carry full weight, the oldest thin out
  const threads = visitOrder.slice(-3)
  const img = build(V, H, ({ voids }) => {
    strips(voids, V)
  }, ({ id, flash }) => {
    // one thread of each work the visitor opened, in the order they opened them: saturated solid, in that work's ink
    threads.forEach((k, j) => {
      const s = rowSpacing(V), y = H - strip - (P ? 34 : 48) - j * s * 6
      const wgt = j === threads.length - 1 ? 1.5 : 1
      id.fillStyle = `rgb(${k + 1},${k + 1},${k + 1})`; id.fillRect(0, y - s * 1.5 * wgt, W, s * 3 * wgt)
      flash.fillRect(0, y - s * wgt, W, s * 2 * wgt)
    })
  })
  return mk(V, {
    id: 'rest', spacing: rowSpacing(V), freq: 0.12, thick: P ? 0.72 : 0.85, amp: 0, memThick: 1.2, memTone: 0.3, flash: 1,
    ...img,
    beneath: null, capacity: Infinity, visitKey: `${visitOrder.join(',')}|${mark ? 'a' : 'd'}`,
  })
}

// ─── work → lab: the whole field folded into one stored band that carries the visit ───────
// Rows only (a gather draws them from far outside the screen, so no strip voids); the opened projects lie in the
// middle of the material as saturated threads in their own inks, in the order they were opened.
export function bridgeState(V, visitOrder = []) {
  const { W, H, P } = V
  const s = rowSpacing(V)
  const threads = visitOrder.slice(-3)
  const img = build(V, H, () => {}, threads.length ? ({ id, flash }) => {
    threads.forEach((k, j) => {
      const y = H / 2 + (j - (threads.length - 1) / 2) * s * 4
      id.fillStyle = `rgb(${k + 1},${k + 1},${k + 1})`; id.fillRect(0, y - s * 1.5, W, s * 3)
      flash.fillRect(0, y - s, W, s * 2)
    })
  } : null)
  return mk(V, {
    id: 'bridge', spacing: s, freq: 0.12, thick: P ? 0.72 : 0.85, amp: 0, flash: 1, memThick: 0.8, memTone: 0,
    ...img, visitKey: `b${threads.join(',')}`,
  })
}

// ─── project world: the same material in the work's ink ────────────────────────
const worldRows = (V, dense) => ({ spacing: dense ? (V.P ? 4.2 : 4.6) : (V.P ? 5.2 : 6.5), freq: V.P ? 0.2 : 0.14, thick: dense ? 0.62 : (V.P ? 0.7 : 0.8) })
// rows only (bands, seams, absence). No strip voids here: a gather draws rows from far outside the screen,
// and a void at the texture's edge would erase every one of them. The strips are clipped on screen instead.
export function worldOpen(V, w, k) {
  const img = build(V, V.H, () => {})
  return mk(V, { id: `w${k}-open`, ...worldRows(V, false), amp: 0, inkHex: PAPER, paperHex: w.ink, negative: true, bg: BG_DARK, ...img })
}
/*
 * A WORK'S READING POCKET PARTS THE ROWS AND CLEARS ONLY THE LINES (R8, user decision 2026-10-02). Behind a frame's
 * words the rows used to be cleared outright, and in a work the ground beneath is the work's ink: every frame
 * carried a soft-edged dark block the size of its text box (AUDIT-01 item 20). The pocket now only thins the rows,
 * to two fifths of their width — and thinned rows behind the type cost it AA (panelfit: 106 lines, worst 1.97:1),
 * so the ground right behind each line of text is still cleared whole. Those lines are the type's own boxes, measured
 * in the DOM once the words are set (main.js, pocketLines) and handed to the frame in `lines`; until then, and
 * wherever there is no type, the rows only part.
 */
// the whole surface returned: text voids, rooms holding media, or the public interface carried as tone
export function worldSurface(V, w, k, fr, i) {
  const lines = []
  const img = build(V, V.H, ({ tone, voids }) => {
    for (const r of fr.voids || []) softRect(voids, r, 24, POCKET)
    clearLines(voids, lines)
    if (fr.tone) { const tc = toneOf(fr.tone.item.im); if (tc) drawCover(tone, tc, fr.tone.rect) }
  }, null, false)
  return mk(V, {
    id: `w${k}-${i}`, ...worldRows(V, fr.dense), amp: 0, toneThick: 2.4, inkHex: PAPER, paperHex: w.ink, negative: true, bg: BG_DARK,
    ...img, lines, features: (fr.rooms || []).map(room), layout: { rooms: fr.rooms || [] },
  })
}
// the last frame: what it added up to, and the next work arriving out of register
export function worldFull(V, w, k) {
  const { W, H, P, pad, strip } = V
  const next = (k + 1) % works.length
  const item = previewOf(works[next], P, V.T)
  const text = P ? { x: pad, y: strip + 20, w: W - pad * 2, h: Math.round(H < 760 ? Math.max(H * 0.36, Math.min(290, H * 0.48)) : H * 0.36) } : V.S ? { x: pad, y: strip + 12, w: Math.round(W * 0.4), h: H - strip * 2 - 24 } : { x: pad, y: strip + 60, w: Math.round(W * 0.36), h: H - strip * 2 - 120 }
  const area = P
    ? { x: pad, y: text.y + text.h + 50, w: W - pad * 2, h: H - strip - 24 - (text.y + text.h + 50) }
    : { x: Math.round(W * 0.44), y: strip + 70, w: Math.round(W * 0.56 - pad), h: H - strip * 2 - 140 }
  const frame = P && !V.T ? area : fitRect(item.aspect, area, 'center')
  const [fa, fb] = fragments(frame, next + 3)
  const lines = []
  const img = build(V, H, ({ tone, solid, voids }) => {
    strips(voids, V)
    softRect(voids, text, 26, POCKET)
    clearLines(voids, lines)
    const tc = toneOf(item.im)
    if (tc) { drawFragments(tone, fa, tc, frame); drawFragments(solid, fb, tc, frame) }
  }, ({ lat, id, flash }) => {
    const tc = toneOf(item.im)
    if (tc) drawCover(lat, tc, frame)
    id.fillStyle = `rgb(${next + 1},${next + 1},${next + 1})`; id.fillRect(frame.x - 20, frame.y - 20, frame.w + 40, frame.h + 40)
    flash.globalAlpha = 0.6; if (tc) drawCover(flash, tc, frame)
  }, true)
  return mk(V, {
    id: `w${k}-full`, ...worldRows(V, false), thick: P ? 0.66 : 0.78, amp: 0, toneThick: 2.5, split: true, lod: LOD_OFF,
    inkHex: PAPER, paperHex: w.ink, negative: true, bg: BG_DARK, ...img, lines,
    layout: { text, frame, next }, beneath: 'next', capacity: 1.1, weak: () => frame.y + frame.h / 2,
  })
}
