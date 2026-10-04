/*
 * ── THE LOUVERS ───────────────────────────────────────────────────────────────────────────────────────────────
 *
 * The reference (`docs/reference/cross-section-v2.html`) builds the field out of fifty-odd DOM louvers in CSS 3D.
 * This file is that field's geometry and timeline, mirrored on the CPU exactly as the browser composes the
 * transforms — verified against the browser's own bounding rects of the demo's faces (within about 2 px at the
 * crossing). mesh.js draws it; runtime.js and the DOM layer read its clock.
 *
 * (Technique B — the same geometry ray-cast per pixel inside C2's shader — was built and measured on the Intel
 * GPU and failed; it is in the history at 1403b51 and recorded in docs/CROSS-SECTION.md.)
 *
 * Imported only where __CROSS__ is true.
 */

// ── the timeline: read off the reference's render() and its input constants ─────────────────────────────────
/** the sticky band: between these the louvers hold edge-on and the word circles the line */
export const CS_Z0 = 0.44
export const CS_Z1 = 0.56
/** how many gestures carry EDGE from behind the line to in front of it (the reference's ORBIT_STEPS) */
export const CS_ORBIT_STEPS = 2
/** louver thickness, in CSS px: the copper edge is this tall when a louver is seen edge-on */
export const CS_THICK = 4.5
const HALF = CS_THICK / 2

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t) }
export const ease = (v, a, b) => smooth((v - a) / (b - a))
const mix = (a, b, t) => a + (b - a) * t
const DEG = Math.PI / 180

/** band stops, behind → in front, as fractions of the band (the reference's ZS) */
export const bandStops = (n = CS_ORBIT_STEPS) => Array.from({ length: n + 1 }, (_, i) => 0.08 + (0.72 * i) / n)
/** the word's angle at each stop: 180 behind the line, 0 in front */
const bandAngles = (n = CS_ORBIT_STEPS) => Array.from({ length: n + 1 }, (_, i) => 180 - (180 * i) / n)

/** the reference's mapping from passage progress p to the louvers' own clock ps: the band holds them edge-on */
export function louverClock(p) {
  const zb = clamp((p - CS_Z0) / (CS_Z1 - CS_Z0))
  return p < CS_Z0 ? (p / CS_Z0) * 0.47
    : p > CS_Z1 ? 0.53 + ((p - CS_Z1) / (1 - CS_Z1)) * 0.47
      : 0.47 + 0.03 * ease(zb, 0, 0.1) + 0.03 * ease(zb, 0.85, 1)
}

/** where the word is at band fraction z: its angle around the line, 180° behind → 0° in front */
export function wordAngle(z, n = CS_ORBIT_STEPS) {
  const ZS = bandStops(n), ANG = bandAngles(n)
  if (z <= ZS[0]) return ANG[0]
  if (z >= ZS[ZS.length - 1]) return ANG[ANG.length - 1]
  for (let i = 0; i < ZS.length - 1; i++) {
    if (z <= ZS[i + 1]) { const t = (z - ZS[i]) / (ZS[i + 1] - ZS[i]); return ANG[i] + (ANG[i + 1] - ANG[i]) * t }
  }
  return 0
}

// ── the louvers ─────────────────────────────────────────────────────────────────────────────────────────────
/** the displacement C2 draws every row with when its physics is at rest: (128/255 − 0.5)·160 */
export const CS_ROW_PHASE = (128 / 255 - 0.5) * 160

/**
 * The field's layout: the reference's count rule, between the site's strips.
 *
 * THE LOUVERS FOLLOW C2'S ROW GRID, not the other way round. The faces are C2's own pictures, and C2 puts its rows
 * at r·s + CS_ROW_PHASE down the screen. A louver is three rows tall (the reference's `rowSpace = pitch / 3`), and
 * for its three rows to sit in its middle rather than on its edges, every louver must start half a row off that
 * grid — the first one at the strip. So the row spacing is chosen to make that true, as near as it can be to the
 * reference's own (h / count / 3), and the louvers are stacked down from the strip. Whatever height is left over at
 * the bottom is one shorter louver.
 */
/*
 * THE LANDSCAPE RULE (Phase C decision, 2026-10-03; built in C4). A phone on its side has less height than any laptop:
 * 844×390 leaves a 290 px field, and the reference's count rule (never fewer than 25 louvers) ruled it every 3.97 px,
 * too fine to carry the words. Below CS_SHORT_H of height the rows are no finer than the site's own phone pitch, 5.2 px,
 * so the louvers are as many as that allows (19 at 844×390). Everywhere else the rule is untouched.
 */
export const CS_SHORT_H = 520
export const CS_ROW_MIN = 5.2
export function layout(V) {
  const W = V.W, h = Math.max(1, V.H - V.strip * 2)
  let n = Math.max(25, Math.min(50, Math.round(h / (W < 700 ? 20 : 21))))
  if (V.H < CS_SHORT_H) n = Math.max(1, Math.min(n, Math.floor(h / (CS_ROW_MIN * 3))))
  const target = h / n / 3
  const N = Math.max(1, Math.round((V.strip - CS_ROW_PHASE) / target - 0.5))
  const spacing = (V.strip - CS_ROW_PHASE) / (N + 0.5)
  const pitch = spacing * 3
  const whole = Math.floor(h / pitch + 1e-6)
  const spans = Array.from({ length: whole }, (_, i) => [i * pitch, pitch])
  if (h - whole * pitch > 0.5) spans.push([whole * pitch, h - whole * pitch])
  const count = spans.length
  const louvers = spans.map(([top, height], i) => {
    const y = i / (count - 1)
    // the reference adds 0.45px to every louver so neighbours overlap and no hairline of ground shows at rest
    return { top, hl: height + 0.45, y, wave: Math.sin(y * Math.PI * 2.25), cw: Math.pow(Math.max(0, 1 - Math.abs(y - 0.49) * 1.9), 1.4) }
  })
  return { W, H: V.H, h, strip: V.strip, count, pitch, spacing, louvers }
}

// 3x4 affine matrices, row-major: [a b c d / e f g h / i j k l] → x' = a x + b y + c z + d, …
const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]
function mul(A, B) {
  const o = new Array(12)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      o[r * 4 + c] = A[r * 4] * B[c] + A[r * 4 + 1] * B[4 + c] + A[r * 4 + 2] * B[8 + c] + (c === 3 ? A[r * 4 + 3] : 0)
    }
  }
  return o
}
const T = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z]
// CSS's own matrices, in its y-down space
const RX = (a) => { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0] }
const RY = (a) => { const c = Math.cos(a * DEG), s = Math.sin(a * DEG); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0] }
const S = (x, y = 1, z = 1) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0]
const chain = (...ms) => ms.reduce((acc, m) => mul(acc, m), I())
function inverse(M) {
  const [a, b, c, d, e, f, g, h, i, j, k, l] = M
  const det = a * (f * k - g * j) - b * (e * k - g * i) + c * (e * j - f * i)
  const id = 1 / det
  const r = [
    (f * k - g * j) * id, (c * j - b * k) * id, (b * g - c * f) * id, 0,
    (g * i - e * k) * id, (a * k - c * i) * id, (c * e - a * g) * id, 0,
    (e * j - f * i) * id, (b * i - a * j) * id, (a * f - b * e) * id, 0,
  ]
  r[3] = -(r[0] * d + r[1] * h + r[2] * l)
  r[7] = -(r[4] * d + r[5] * h + r[6] * l)
  r[11] = -(r[8] * d + r[9] * h + r[10] * l)
  return r
}
const apply = (M, x, y, z) => [M[0] * x + M[1] * y + M[2] * z + M[3], M[4] * x + M[5] * y + M[6] * z + M[7], M[8] * x + M[9] * y + M[10] * z + M[11]]

/**
 * THE POSE OF EVERY LOUVER AT PROGRESS p — the reference's render(), as matrices.
 *
 * Two deliberate differences, both so that the field AT REST is exactly a flat C2 state, which is what lets the
 * passage meet Work's last frame without a handover:
 *
 *   the reference scales every louver by 1.06 even at rest; here the extra width arrives with the peak
 *   (1 + peak·(0.18 + 0.07·cw) is the reference's 1.06 + peak·(0.12 + 0.07·cw) at the peak, and 1 at rest);
 *   and the reference's front faces stand 2.25px in front of the plane, which under its perspective is a 0.14%
 *   enlargement; here the louvers sit 2.25px back, so the face that is showing at either end lies in the plane.
 */
export function pose(L, p) {
  const { W, h, louvers } = L
  const ps = louverClock(p)
  const peak = Math.pow(Math.max(0, 1 - Math.abs(ps - 0.5) / 0.28), 1.4)
  const P = Math.max(640, W * 1.09)
  const O = [W * 0.52, h / 2]
  const pc = [W / 2, h / 2]
  const sc = 1 + 0.045 * peak
  const plane = chain(T(pc[0], pc[1], 0), T(0, 0, -36 * peak), RY(2.5 * peak), S(sc, sc, 1), T(-pc[0], -pc[1], 0))
  const out = louvers.map(({ top, hl, y, wave, cw }) => {
    const phase = 0.035 * wave + 0.04 * (1 - cw)
    const rot = 180 * ease(ps, 0.15 + phase, 0.85 + phase)
    const z = peak * (75 * cw + 22 * wave), x = peak * wave * cw * W * 0.028
    const sx = 1 + peak * (0.18 + 0.07 * cw)
    const o = [W / 2, top + hl / 2]
    const M = chain(plane, T(o[0], o[1], -HALF), T(x, 0, z), RX(rot), RY(peak * wave * 12), S(sx), T(-o[0], -o[1], 0))
    const shimmer = Math.sin((ps - 0.5) * 12 + y * 8 + p * 6)
    const hlit = clamp((0.27 + 0.75 * peak) * (0.66 + 0.34 * shimmer))
    const ev = Math.pow(Math.abs(Math.sin(rot * DEG)), 1.35) * (0.45 + peak * 0.48)
    return { M, Minv: inverse(M), top, hl, rot, ev, bright: 0.43 + hlit * 1.12 }
  })
  const dark = ease(ps, 0.31, 0.51)
  return { p, ps, peak, P, O, louvers: out, dark, eye: [O[0], O[1], P] }
}

/*
 * THE BLINDS OPEN ONTO THE BENCH (C3, R14 decision 5). Past DEPTH the louvers carry on turning — 180° to 270°, edge-on
 * again — in the same wave down the field, and what shows between them is the page underneath: the bench, already
 * mounted. Nothing lifts or swings here (no peak): the passage is over and this is only the blinds opening. At r = 0
 * the pose is pose(L, 1) exactly — DEPTH, flat — so the reveal begins from the frame the visitor was looking at.
 *
 * `fade` is how much of the louvers is left: they thin to their edges and then the edges go too, so the last frame
 * is nothing at all over the bench. The edges at this second edge-on are ink, not copper: copper is the crossing's.
 */
export const CS_REVEAL_S = 1.15
/*
 * THE BLINDS ARE READ ONE SLAT AT A TIME, OR NOT AT ALL (user review, 2026-10-04). On the phone the reveal reads as
 * blinds: a slat is 3.5% of the field (390×660: 29 slats of 20 px). On a desktop the same 20 px slats are 45 across a
 * 991 px field, 2.2% each, and the same moment read as a quick dissolve through fine lines. Matching the phone in CSS
 * pixels changes nothing (they already match), so the reveal matches the phone's SHARE of the field instead: on a
 * wider screen a reveal slat is as many of the crossing's rows as it takes to be at least CS_REVEAL_SHARE of the
 * field. The crossing keeps its own louvers, and the approved phone (390×660) keeps exactly its 3-row slats.
 *
 * Only the reveal is laid out this way, and a reveal slat is still a whole number of C2's rows starting half a row off
 * its grid, like every louver, so at r = 0 it is still DEPTH exactly.
 */
export const CS_REVEAL_SHARE = 0.035
export function revealLayout(L, V, { rows = 0 } = {}) {
  // (the responsive pass, 2026-10-04: a TALL phone had the same exception and 38-42 thin slats — 390×844, 430×932 — so the
  // rule is now everyone's. A twentieth of a row's tolerance keeps the approved phones, 390×660 and 375×667, at 3 rows.)
  const m = rows || Math.max(3, Math.ceil((CS_REVEAL_SHARE * L.h) / L.spacing - 0.05))
  if (m === 3) return { ...L, rows: 3 }
  const pitch = m * L.spacing
  const whole = Math.floor(L.h / pitch + 1e-6)
  const spans = Array.from({ length: whole }, (_, i) => [i * pitch, pitch])
  if (L.h - whole * pitch > 0.5) spans.push([whole * pitch, L.h - whole * pitch])
  const count = spans.length
  const louvers = spans.map(([top, height], i) => {
    const y = count > 1 ? i / (count - 1) : 0.5
    return { top, hl: height + 0.45, y, wave: Math.sin(y * Math.PI * 2.25), cw: Math.pow(Math.max(0, 1 - Math.abs(y - 0.49) * 1.9), 1.4) }
  })
  return { ...L, count, pitch, louvers, rows: m }
}
export function revealPose(L, r, half = HALF) {
  const { W, h, louvers } = L
  const P = Math.max(640, W * 1.09)
  const O = [W * 0.52, h / 2]
  const out = louvers.map(({ top, hl, y, wave, cw }) => {
    // the same stagger as the crossing's: the wave and the centre lead, so the field opens as it closed
    const phase = 0.035 * wave + 0.04 * (1 - cw)
    const rot = 180 + 90 * ease(r, 0.04 + phase, 0.7 + phase)
    const o = [W / 2, top + hl / 2]
    const M = chain(T(o[0], o[1], -half), RX(rot), T(-o[0], -o[1], 0))
    const ev = Math.pow(Math.abs(Math.sin(rot * DEG)), 1.35) * 0.45
    return { M, Minv: inverse(M), top, hl, rot, ev, bright: 1 }
  })
  /*
   * THE STRIPS CHANGE HANDS ONE LAYER AT A TIME. The runtime's strip words (light on its dark paper) and the bench's
   * (dark on cream) sit almost on top of each other, so a crossfade of the two showed both, doubled, on a grey band.
   * The runtime's words go first, while its dark paper still covers the bench's strip; then the paper thins and the
   * bench's strip, words and all, is simply there. Going back up it is the same in reverse.
   */
  return { p: 1, ps: 1, peak: 0, P, O, louvers: out, dark: 1, eye: [O[0], O[1], P], half, fade: 1 - ease(r, 0.62, 0.97), words: 1 - ease(r, 0.06, 0.3), strip: 1 - ease(r, 0.3, 0.7) }
}

/**
 * Which faces the eye can see. A louver is a thin box, so the eye is always on one side of each pair of
 * opposite faces: +1 front, -1 back; and of its two edges, -1 the top one, +1 the bottom one, 0 neither.
 */
export function sides(Minv, eye, top, hl, half = HALF) {
  const e = apply(Minv, eye[0], eye[1], eye[2])
  return { face: e[2] > half ? 1 : e[2] < -half ? -1 : 0, edge: e[1] < top ? -1 : e[1] > top + hl ? 1 : 0 }
}
