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
/*
 * R21 PROTOTYPE (docs/IMAGE-QUALITY.md; until the user's choice): ?r21=18 or ?r21=24 caps the words' size on large
 * screens at that many rows per capital. The pitch stays where it is (7 px past the phone); the type is set smaller,
 * so the block takes less of the field. Without the key nothing changes.
 */
const R21_MAX = (typeof location !== 'undefined' && Number(new URLSearchParams(location.search).get('r21'))) || 0

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
  const rowsPerCap = Math.min(Math.max(ROWS_PER_CAP, Math.round(L.cap / spacing)), R21_MAX > ROWS_PER_CAP ? R21_MAX : Infinity)
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

  /*
   * AND THE OPTICAL OVERSHOOT IS CUT OFF, WHICH IS ONLY SAFE BECAUSE OF THE SNAPPING ABOVE.
   *
   * S, C, U, O and G are drawn a little past the cap line and a little past the baseline so they do not look
   * smaller than the flat letters beside them. At a pitch of seven pixels that is not a nicety, it is a
   * detached mark: the first row below the baseline sits 1.33px below it and is 2.17px thick, and the overshoot
   * reaches 2.40px — so the row's top edge is inside the overshoot and draws a short bar under every round
   * letter. STATE. reads as ŞTATE.
   *
   * NO PHASE OF THE ROW GRID CAN CLEAR IT. To leave room for the overshoot on both sides the pitch would have
   * to exceed 2 x (overshoot + row half-width) = 9.14px, and it is 7. Snapping alone was never enough; it was
   * marginal with the Turkish words, whose tighter fit made the type smaller, and became visible when the
   * English set made it larger.
   *
   * So the overshoot is removed rather than accommodated. Each line is clipped to exactly its cap line and its
   * baseline — and because the snapping puts BOTH of those exactly halfway between two rows, no row is cut by
   * the clip. Only the ink outside them goes, which is the overshoot and nothing else. (The eight words are
   * capitals: nothing in them genuinely descends.)
   */
  const img = build(V, H, ({ solid }) => {
    solid.font = `900 ${size}px ${FAMILY}`
    solid.textAlign = side === 0 ? 'left' : 'right'
    words.forEach((w, i) => {
      const base = baseOf(i)
      solid.save()
      solid.beginPath()
      solid.rect(0, base - capSnap, W, capSnap)
      solid.clip()
      solid.fillText(w, x, base)
      solid.restore()
    })
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
  /*
   * IT CLOSES EARLY AND OPENS LATE. The reference's window for the single rust line is about two per cent of
   * the passage, which at this site's scrolling is a third of a wheel notch — a visitor at a normal pace
   * simply misses it. The fan is closed from 46% to 54% instead, so the line is alone for eight per cent, and
   * the drive eases through that window as well (LF_DWELL in input.js). The needle still closes into it and
   * opens out of it; what changed is how long it is worth looking at.
   */
  const spread = back ? 1 - ease(q, 0.38, 0.47) : ease(q, 0.53, 0.62)
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
  // full while the field is collapsed, and fading in before that so it is first seen inside the needle
  const flash = 1 - sm((Math.abs(q - 0.5) - 0.035) / 0.04)
  /*
   * AND THE FIELD THINS WHERE THE WORDS ARE NOT.
   *
   * It follows the words, not the corridor: dense while there is type to carry, sparse once the type has gone
   * past, dense again as the frontend words arrive. Smoothed, so no row ever pops — the whole change takes
   * about a sixth of the passage at each end.
   */
  /*
   * AND THE DENSITY COMES BACK AS THE WORDS LEAVE.
   *
   * It thins while there is type to carry, because a field ruled for type cannot be sent whole down a corridor
   * — hundreds of rows inside a few pixels are a wash. Once the words have gone past, that reason has gone with
   * them, and a fan of a dozen rays makes a weak needle. So the thinning eases back off through the deep part
   * of the passage: the rays the corridor is made of come back, and they come back by FADING IN rather than by
   * changing which rows are kept, so nothing pops and nothing slides.
   */
  const thin = back ? ease(q, 0.15, 0.26) : 1 - ease(q, 0.7, 0.83)
  /*
   * ...AND IT COMES BACK BY LEVELS. 3 is every 8th row, 1 is every 2nd — the density the reference itself is
   * drawn at. It stays at every 8th while the words are going past, because that is where a dense field turns
   * into a wash, and falls to every 2nd through the deep part of the passage, where the reason has gone with
   * the words and a fan of a dozen rays makes a weak needle. It rises again as the frontend words arrive.
   */
  /*
   * IT STOPS AT EVERY THIRD ROW, NOT EVERY SECOND. Taken all the way to every 2nd the rays crowd near the
   * vanishing point and cross-hatch: the half of the frame nearest the point filled with a grey wash and a
   * visible interference pattern, which is the exact fault the thinning exists to prevent. Every 3rd carries
   * the fan without it.
   */
  const level = back ? 3 - 1.4 * ease(q, 0.21, 0.35) : 3 - 1.4 * (1 - ease(q, 0.6, 0.76))
  /*
   * ── THE PASSAGE IS cc, AND NOTHING ELSE ─────────────────────────────────────────────────────────────────
   *
   * The fan closes on `spread` (the reference's cc) alone. The vanishing point does not move and the far end
   * stays at the screen edge; what happens is that every row is scaled toward the horizon until they are all on
   * it, so the fan flattens into a needle spanning the whole width with its tip on the point, and then into
   * nothing. The rust line is `flash`, which the reference already gave us: two pixels along the horizon, from
   * edge to edge, appearing while the needle is still open — so it is first seen along the needle's own centre
   * — and left alone when the needle has closed. Every part of it moves; there is no held frame anywhere in it.
   *
   * An earlier version drew the far point IN as well, so the corridor retreated into a corner and the screen
   * stood nearly empty for seconds. That is not this passage, and it is gone.
   */
  return { back, side: back ? 0 : 1, depth, spread, flow, labelA, flash, thin, level }
}
