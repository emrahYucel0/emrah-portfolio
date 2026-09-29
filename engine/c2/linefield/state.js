/*
 * ── LINEFIELD'S TWO FIELDS ──────────────────────────────────────────────────────────────────────────────────
 *
 * Four words made of the rows themselves, twice: pale on black for the backend half, ink on cream for the
 * frontend half. They are ordinary C2 states — the words go into the TYPE channel, which is the same channel the
 * hero's EMRAH / YÜCEL uses, so "the rows thicken inside the letters" is not a new effect here. It is the one
 * this site already has.
 *
 * WHAT IS NEW IS THE ROW PITCH. Every other state takes `rowSpacing(V)` — 5.2 on a phone, 7 otherwise — which is
 * a pitch chosen for the page. Here the pitch has to be chosen for the TYPE: the demo's rule is at least about
 * nine rows through every letter, because a letter carried by four rows is a letter you cannot read on a phone.
 * So the pitch is derived from the cap height that the four words actually fit at, and a phone ends up with a
 * finer field than the rest of the site — which is correct, and is why this is a per-state property.
 *
 * Imported only where __LINEFIELD__ is true.
 */
import { FAMILY, INK, NIGHT, PAPER, build, fit, mk } from '../states.js'

export const BACKEND_WORDS = ['STATE.', 'SCALE.', 'FAILURE.', 'TRUTH.']
export const FRONTEND_WORDS = ['FEEL.', 'TIMING.', 'FRICTION.', 'FIRST PAINT.']

/** how many rows must pass through a capital for the word to hold together */
const ROWS_PER_CAP = 12

/**
 * THE FACE HAS TO BE THE FACE.
 *
 * Ported from the reference demo, and kept for the reason the demo had it: a silent fallback to Impact changes
 * every word's width, which changes where the letters sit, which changes which rows carry them. The words would
 * still be legible and the composition would be wrong in a way no screenshot comparison would attribute to the
 * font. `document.fonts.check` alone says yes too readily, so the width of a real string is compared against the
 * fallback's — if they measure the same, the face never arrived.
 */
export async function faceReady() {
  try {
    await document.fonts.load(`900 100px "Big Shoulders Display Variable"`)
    await document.fonts.load(`900 100px "Big Shoulders Display"`)
    const c = document.createElement('canvas').getContext('2d')
    c.font = `900 100px ${FAMILY}`
    const a = c.measureText('FAILURE.').width
    c.font = '900 100px Impact'
    const b = c.measureText('FAILURE.').width
    return Math.abs(a - b) > 1
  } catch { return false }
}

/*
 * AS LARGE AS THE SPACE ALLOWS, AND THE SPACE IS NOT THE SCREEN.
 *
 * The site keeps a strip at the top of the screen and another at the bottom. The words have to clear both, in
 * every viewport — measured, the last word was sitting eighteen pixels from the bottom edge in all four, well
 * inside a fifty-pixel strip.
 *
 * The block is also sized and centred on its TRUE extent. Four lines of leading is not what four lines occupy:
 * the block runs from the first cap line to the last baseline, which is (n-1) leadings plus one cap height,
 * not n leadings. Centring on the wrong extent is what pushed it low.
 */
const MC = /* @__PURE__ */ (() => (typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')))()

/**
 * THE INK THESE PARTICULAR WORDS MAKE, not the ink a capital H makes.
 *
 * Everywhere else on this site a block of type is measured by the cap height, because everywhere else the type
 * is Latin capitals with nothing above them and nothing below. Here it is not: the Turkish set is Ö, Ç, Ğ, Ş, İ,
 * and every one of them puts ink outside that box — a diaeresis and a breve above the cap line, a cedilla below
 * the baseline. Measured by the cap, DURUM. sat with its Ö dots inside the header strip and ÖLÇEK.'s cedilla in
 * the top of HATA.
 *
 * So the block is measured by what it actually draws. The ascent is the highest ink in any of the four words and
 * the descent the lowest, and both the size, the leading and the placement come from those.
 */
function inkOf(words) {
  if (!MC) return words.map(() => ({ w: 1, asc: 0.72, desc: 0 }))
  MC.font = `900 100px ${FAMILY}`
  return words.map((t) => {
    const m = MC.measureText(t)
    return {
      w: Math.max(m.width / 100, 0.01),
      asc: Math.max((m.actualBoundingBoxAscent || 72) / 100, 0.6),
      desc: Math.max((m.actualBoundingBoxDescent || 0) / 100, 0),
    }
  })
}

/*
 * AS LARGE AS THE SPACE ALLOWS, AND THE SPACE IS NOT THE SCREEN.
 *
 * The site keeps a strip at the top of the screen and another at the bottom. The words have to clear both, in
 * every viewport and in both languages.
 *
 * THE LEADING IS PER PAIR, not per block. A single leading big enough for the worst pair of lines — a cedilla
 * under one and a diaeresis over the next — is applied to the three pairs that do not need it as well, and the
 * whole block shrinks to pay for it. Turkish came out visibly smaller than English for no reason anyone could
 * see. Each gap is now only as large as the two lines it separates require, so the four Turkish words are set at
 * very nearly the size the four English ones are.
 *
 * Everything is returned in EMS, because the row grid rescales the block afterwards and a measurement in pixels
 * would have to be rescaled with it.
 */
function fitStack(V, words) {
  const { W, H, P, strip, pad } = V
  const air = Math.max(pad * 0.7, strip * 0.5)
  /*
   * A LINE IS KEPT FOR THE LABEL. The reference names each half above it — BACKEND, FRONTEND — and that naming
   * is what tells a visitor what the eight words are answers to. It is drawn in the DOM rather than into the
   * material, so it localises with everything else; the block below it is therefore sized in a band that is a
   * label shorter, which costs about four per cent of the type.
   */
  const labelH = Math.round(Math.max(20, H * 0.03))
  const top = strip + air + labelH
  const bottom = H - strip - air
  const avail = Math.max(60, bottom - top)
  const maxW = W * (P ? 0.92 : 0.62)
  const ink = inkOf(words)
  const n = words.length

  // where each baseline sits relative to the first, in ems; never closer than the site's own 0.93 line
  const rel = [0]
  for (let i = 1; i < n; i++) rel.push(rel[i - 1] + Math.max(0.93, ink[i - 1].desc + ink[i].asc + 0.04))
  const ascEm = ink[0].asc
  const descEm = ink[n - 1].desc
  const blockEm = rel[n - 1] + ascEm + descEm

  const byWidth = maxW / Math.max(...ink.map((k) => k.w))
  const byHeight = avail / blockEm
  const size = Math.min(byWidth, byHeight)
  // the cap height is still what the ROW GRID is aligned to: it is what the letter bodies are made of
  const capR = fit(words[0], maxW, H).capR
  return { size, capR, cap: size * capR, rel, ascEm, descEm, blockEm, top, avail, air, labelY: strip + air, labelH }
}

/**
 * One half of Linefield.
 *
 * `side` 0 is the backend field: pale rows on black, the words set from the left. `side` 1 is the frontend
 * field: ink on cream, set from the right. They are the same construction in the same place — which is what
 * makes the collapse between them one movement rather than two scenes.
 */
export function linefieldState(V, side, words, label) {
  const { W, H, P, strip } = V
  const L = fitStack(V, words)
  // the pitch the TYPE needs, not the pitch the page uses; never coarser than the page's own rows
  const spacing = Math.max(2.6, Math.min(P ? 5.2 : 7, L.cap / ROWS_PER_CAP))
  const x = side === 0 ? W * 0.06 : W * 0.94

  /*
   * THE TYPE IS ALIGNED TO THE ROW GRID, AND THAT IS WHY NOTHING IS CLIPPED.
   *
   * Round letters — S, C, U, G, O — are drawn a little above the cap line and a little below the baseline, so
   * that they do not look smaller than the flat-topped letters beside them. A row passing through that
   * overshoot catches a sliver of curve and nothing else, and draws a short arc floating above or below the
   * word.
   *
   * The first fix clipped each line to its cap-to-baseline box, pulled in by a third of a row. It removed the
   * arcs and it also removed a third of a row from the top of EVERY letter — and where a row happened to sit
   * near the cap line, it took the whole top stroke with it. On the phone FRICTION read FRICTIUN. A fix that
   * has to be that precise about where it cuts is the wrong fix.
   *
   * So nothing is cut. The BASELINE and the CAP LINE are placed on row boundaries instead: the cap height is
   * rounded to a whole number of rows and the baseline snapped half a row off the grid, so every row inside a
   * letter is entirely inside it and no row can graze an edge. The letters keep every stroke they have.
   */
  const rowsPerCap = Math.max(ROWS_PER_CAP, Math.round(L.cap / spacing))
  const capSnap = rowsPerCap * spacing
  // the whole block is rescaled by whatever rounding the cap to whole rows cost, so its proportions survive it
  const size = L.size * (capSnap / L.cap)
  const snap = (y) => (Math.round(y / spacing - 0.5) + 0.5) * spacing
  const asc = L.ascEm * size
  const desc = L.descEm * size
  /*
   * AND THE BLOCK IS PUT BACK INSIDE THE AIR AFTER IT HAS BEEN SNAPPED.
   *
   * Snapping every baseline to the grid moves each of them by up to half a row, and that is enough to push the
   * last word into the footer strip — measured at 844x390, the last baseline sat 45 pixels from the bottom edge
   * inside a 50 pixel strip. The correction is applied in WHOLE ROWS, so the grid alignment that keeps the
   * letters clean survives it, and it is measured against the real ink, diacritics included.
   */
  let first = snap(L.top + (L.avail - L.blockEm * size) / 2 + asc)
  const under = V.strip + L.air + asc - first
  if (under > 0) first += Math.ceil(under / spacing) * spacing
  const over = first + L.rel[words.length - 1] * size + desc - (H - V.strip - L.air)
  if (over > 0) first -= Math.ceil(over / spacing) * spacing
  const baseline = L.rel.map((r) => (r === 0 ? first : snap(first + r * size)))
  const baseOf = (i) => baseline[i]
  const bands = words.map((_, i) => baseOf(i) - capSnap * 0.5)

  const img = build(V, H, ({ solid }) => {
    solid.font = `900 ${size}px ${FAMILY}`
    solid.textAlign = side === 0 ? 'left' : 'right'
    words.forEach((w, i) => solid.fillText(w, x, baseOf(i)))
    solid.textAlign = 'left'
  })

  return mk(V, {
    id: side === 0 ? 'linefield-back' : 'linefield-front',
    spacing,
    freq: P ? 0.16 : 0.1,
    /*
     * NO WAVE, AND A THIN FIELD.
     *
     * Every other state on this site breathes: the rows carry a slow wave, which is what makes the material
     * feel alive rather than printed. Here it cannot. At this pitch a letter is carried by a couple of dozen
     * rows, and displacing each of them by even a fraction of the pitch tears the letterform apart — measured
     * at amp 0.18 the four words were present and unreadable. The corridor supplies the movement instead.
     *
     * And the bare field sits back. Rows outside the words carry no tone, so they are drawn at their base
     * thickness; at 0.8 on black that is a bright grating competing with the type. Thinner, they read as the
     * ruled ground the words are cut out of — which is what they are.
     */
    amp: 0,
    thick: P ? 0.42 : 0.5,
    inkHex: side === 0 ? PAPER : INK,
    paperHex: side === 0 ? NIGHT : '#efeee9',
    bg: side === 0 ? '#0b0c0e' : '#efeee9',
    negative: side === 0,
    ...img,
    layout: { ...L, size, cap: capSnap, rowsPerCap, bands, baseline, asc, desc, x, label, words, strip },
    capacity: 1.4,
    weak: () => H * 0.5,
  })
}

/*
 * ── THE SEQUENCE ────────────────────────────────────────────────────────────────────────────────────────────
 *
 * Progress 0..1 across the whole passage, read straight off the reference demo's timeline so the two can be
 * compared frame for frame:
 *
 *   0.00-0.08   backend words, flat, readable on black
 *   0.06-0.38   the field bends into a corridor; each backend word flows past in turn
 *   0.38-0.50   every row collapses into one line, rust at the end of it
 *   0.50-0.56   the line opens onto cream
 *   0.53-0.90   the corridor flattens; each frontend word flies in and settles, one after another
 *   0.90-1.00   frontend words, flat, readable
 */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const sm = (t) => { const k = clamp01(t); return k * k * (3 - 2 * k) }
const ease = (v, a, b) => sm((v - a) / (b - a))

export function sequence(p, W) {
  const q = clamp01(p)
  const back = q < 0.5
  const depth = back ? ease(q, 0.06, 0.32) : 1 - ease(q, 0.6, 0.9)
  // the collapse: 1 is the full field, 0 is every row on one line
  const spread = back ? 1 - ease(q, 0.38, 0.5) : ease(q, 0.5, 0.56)
  const u = back ? clamp01((q - 0.08) / 0.3) : clamp01((q - 0.53) / 0.36)
  /*
   * Each word leaves, or arrives, in its turn. Backend words are carried away from the viewer's side; frontend
   * words come in from it and settle. The stagger is what makes it "one after another" rather than a block.
   */
  const flow = [0, 1, 2, 3].map((i) => (back
    ? W * 1.25 * Math.pow(ease(u, i * 0.19, i * 0.19 + 0.43), 1.25)
    : -W * 0.95 * Math.pow(1 - ease(u, i * 0.17, i * 0.17 + 0.46), 1.2)))
  // the label fades in at the ends, where there is something to label
  const labelA = back ? 1 - ease(q, 0.02, 0.1) : ease(q, 0.9, 0.97)
  // the rust line lives only at the crossing itself
  const flash = 1 - Math.min(1, Math.abs(q - 0.5) / 0.03)
  /*
   * AND THE FIELD THINS WHERE THE WORDS ARE NOT.
   *
   * It follows the words, not the corridor: dense while there is type to carry, sparse once the type has gone
   * past, dense again as the frontend words arrive. Smoothed, so no row ever pops — the whole change takes
   * about a sixth of the passage at each end.
   */
  const thin = back ? ease(q, 0.19, 0.35) : 1 - ease(q, 0.60, 0.79)
  /*
   * ── THE FOLD-BACK, THE POINT, AND THE LINE ──────────────────────────────────────────────────────────────
   *
   * cc alone closes the fan, but it does not send it away: every row scales toward the horizon while the
   * corridor keeps the full width of the screen, so the scene folds flat where it should recede. Three
   * overlapping scalars carry the last tenth of the passage, and the same three, reversed, carry the first
   * tenth of the other half:
   *
   *   pull   the far point is drawn back toward the vanishing point, so the whole corridor throws itself into
   *          the distance and what is left of the fan is a short wedge with its tip ON the point
   *   mark   the drawn mark arrives, and the field's rows leave over the same window — the tip hands over
   *   grow   the mark opens out from a point at the vanishing point into the full-width line that takes the rust
   */
  const pull = back ? ease(q, 0.4, 0.478) : 1 - ease(q, 0.522, 0.6)
  const mark = back ? ease(q, 0.468, 0.492) : 1 - ease(q, 0.508, 0.532)
  const grow = back ? ease(q, 0.486, 0.5) : 1 - ease(q, 0.5, 0.514)
  return { back, side: back ? 0 : 1, depth, spread, flow, labelA, flash, thin, pull, mark, grow }
}
