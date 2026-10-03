/*
 * ── WHAT THE LOUVERS CARRY ──────────────────────────────────────────────────────────────────────────────────
 *
 * Two ordinary C2 states, one per side of the louvers. The words go into the TYPE channel, the channel the
 * hero's name uses: inside a letter the rows thicken until they read as the letter. The ground between them is
 * the reference's ruling — one row every third of a louver, so each louver carries exactly three.
 *
 * The words stay English in both languages (R14, 2026-10-02): they are the material's names, not the page's text.
 *
 * Imported only where __CROSS__ is true.
 */
import { FAMILY, build, mk } from '../states.js'

export const FRONT_WORD = 'SURFACE'
export const BACK_WORD = 'DEPTH'
export const EDGE_WORD = 'EDGE.'

const MC = /* @__PURE__ */ (() => (typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')))()

/**
 * The reference's word image, exactly: sized from the scene's height (0.46 of it, 0.3 on a narrow screen), held
 * inside 0.86 (0.9) of the width, set at 5% from its own side, on a baseline at 0.74 (0.66) of the height.
 */
export function wordPlacement(L, word, align) {
  const w = L.W, h = L.h, narrow = w < 700
  let fs = h * (narrow ? 0.3 : 0.46)
  MC.font = `900 ${fs}px ${FAMILY}`
  const maxW = w * (narrow ? 0.9 : 0.86)
  const mw = MC.measureText(word).width
  if (mw > maxW) fs *= maxW / mw
  return { fs, x: align === 'left' ? w * 0.05 : w * 0.95, y: h * (narrow ? 0.66 : 0.74), align }
}

/** side 0: SURFACE, ink on cream (the louvers' fronts). side 1: DEPTH, pale on black (their backs). */
export function faceState(V, L, side) {
  const word = side === 0 ? FRONT_WORD : BACK_WORD
  const at = wordPlacement(L, word, side === 0 ? 'left' : 'right')
  const narrow = L.W < 700
  const img = build(V, V.H, ({ solid }) => {
    solid.font = `900 ${at.fs}px ${FAMILY}`
    solid.textAlign = at.align
    solid.textBaseline = 'alphabetic'
    solid.fillText(word, at.x, L.strip + at.y)
    solid.textAlign = 'left'
  })
  return mk(V, {
    id: side === 0 ? 'cross-front' : 'cross-back',
    spacing: L.spacing,
    freq: 0.1,
    // no wave: the louvers are the movement, and a breathing row would tear the letters across three louvers
    amp: 0,
    // the reference's ruling: 0.85px lines (0.7 on a narrow screen), 15% heavier on the dark side
    thick: side === 0 ? (narrow ? 0.7 : 0.85) : (narrow ? 0.8 : 0.98),
    inkHex: side === 0 ? '#121212' : '#e7e6e0',
    paperHex: side === 0 ? '#efeee9' : '#111215',
    bg: side === 0 ? '#efeee9' : '#0b0c0e',
    negative: side === 1,
    // the material coordinate is scene-local and half a row up (slats.js); this puts the image back in register
    offY: L.strip + L.spacing / 2,
    ...img,
    layout: { word, ...at },
    capacity: 1.4,
  })
}

/**
 * BOTH SIDES IN ONE STATE (see slats.js, "one state, both sides"): the content texture is twice the screen's height,
 * the front's word in the upper half and the back's in the lower, each in screen coordinates. The variant chooses
 * per pixel which half is read, and with which ink, paper and row thickness — so the row machinery is asked once.
 */
export function pairState(V, L) {
  const front = faceState(V, L, 0), back = faceState(V, L, 1)
  const fa = front.layout, ba = back.layout
  const img = build(V, V.H * 2, ({ solid }) => {
    solid.font = `900 ${fa.fs}px ${FAMILY}`
    solid.textBaseline = 'alphabetic'
    solid.textAlign = fa.align
    solid.fillText(fa.word, fa.x, L.strip + fa.y)
    solid.font = `900 ${ba.fs}px ${FAMILY}`
    solid.textAlign = ba.align
    solid.fillText(ba.word, ba.x, V.H + L.strip + ba.y)
    solid.textAlign = 'left'
  })
  const st = mk(V, { ...front, id: 'cross-pair', ...img, texH: V.H * 2 })
  st.sides = { front, back, offY: [L.strip + L.spacing / 2, V.H + L.strip + L.spacing / 2] }
  return st
}
