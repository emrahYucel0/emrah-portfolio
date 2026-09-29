/*
 * ── THE CORRIDOR ────────────────────────────────────────────────────────────────────────────────────────────
 *
 * LINEFIELD's one piece of new rendering: the flat row field bent into a receding corridor, so the words flow
 * toward the viewer and past. Imported only where __LINEFIELD__ is true — a build with the flag off never
 * references this module, so none of the GLSL below exists in it.
 *
 * WHY A HOMOGRAPHY, AND NOT THE DEMO'S MAPPING.
 *
 * The reference demo bends the field with `pow(t, 1 + 1.7 * d)`, which looks right and is not a perspective: it
 * has no closed-form inverse and no closed-form gradient. That matters here far more than it did there, because
 * C2 does not draw rows — it asks, per pixel, "which row is here", and then decides how to anti-alias it, when
 * to fuse it with its neighbours, and when to drop to a level of detail. Every one of those judgements is made
 * from the GRADIENT of the map. A map whose gradient has to be estimated by finite differences would make those
 * judgements out of focus exactly where the rows converge — which is the one place shimmer is unforgivable.
 *
 * A homography is a real perspective, its inverse is another homography, and its Jacobian is four lines of
 * arithmetic. So the shader maps the screen point BACK to the flat field, hands the exact gradient to the
 * existing machinery, and every anti-aliasing and fusing decision C2 already makes stays correct in the
 * corridor without being rewritten.
 *
 * WHAT IS UPLOADED. One mat3 (screen -> flat field, in pixels), a fade band, the four word offsets and the four
 * word bands. The per-frame cost on the CPU is one 3x3 inverse; per pixel it is a matrix multiply, a divide and
 * four multiply-adds.
 */

/** the four words are stacked, so a word's horizontal flow is a function of WHERE UP THE FIELD it is */
export const LF_BANDS = 4

/*
 * The unit square's corners, in the order the closed form below expects: (0,0) (1,0) (1,1) (0,1).
 * Heckbert's solution for a projective map from the unit square to an arbitrary quadrilateral.
 */
function unitToQuad(q) {
  const [x0, y0] = q[0], [x1, y1] = q[1], [x2, y2] = q[2], [x3, y3] = q[3]
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    // the quad is a parallelogram: the map is affine and the projective terms vanish
    return [x1 - x0, x2 - x1, x0, y1 - y0, y2 - y1, y0, 0, 0, 1]
  }
  const den = dx1 * dy2 - dy1 * dx2
  const g = (dx3 * dy2 - dy3 * dx2) / den
  const h = (dx1 * dy3 - dy1 * dx3) / den
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1]
}

/** a 3x3 inverse, row-major in and out */
function inverse3(m) {
  const [a, b, c, d, e, f, g, h, i] = m
  const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g
  const det = a * A + b * B + c * C
  if (Math.abs(det) < 1e-12) return null
  const s = 1 / det
  return [
    A * s, (c * h - b * i) * s, (b * f - c * e) * s,
    B * s, (a * i - c * g) * s, (c * d - a * f) * s,
    C * s, (b * g - a * h) * s, (a * e - b * d) * s,
  ]
}

const mul3 = (m, n) => {
  const o = new Array(9)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      o[r * 3 + c] = m[r * 3] * n[c] + m[r * 3 + 1] * n[3 + c] + m[r * 3 + 2] * n[6 + c]
    }
  }
  return o
}

const lerp = (a, b, t) => a + (b - a) * t

/**
 * THE CORRIDOR'S SHAPE, as a quadrilateral on the screen that the flat field is mapped into.
 *
 * At depth 0 it is the screen rectangle itself, so the map is the identity and the field is exactly the flat
 * field every other state on this site is drawn as. As depth goes to 1 one edge collapses toward a vanishing
 * point and the opposite edge opens past the frame — a real corridor, with the viewer inside its near end.
 *
 * `side` 0 recedes to the left (the backend half), 1 to the right (the frontend half, the same corridor seen
 * from the other end), which is what makes the two halves one continuous movement through the collapse.
 */
export function corridorQuad(W, H, d, side, V = null) {
  const vx = side === 0 ? W * 0.12 : W * 0.88
  const vy = H * 0.5
  // the far edge never collapses to a true point: a degenerate quad has no inverse, and a corridor whose far
  // end is a mathematical point has a pixel there that belongs to every row at once
  /*
   * How tightly the far edge closes decides how much of the frame is packed past the pixel grid. At 0.035 the
   * whole field height was crushed into sixty pixels, the rows there were closer together than the screen
   * could hold over nearly half the frame, and what should have been a fan of rays converging on a point came
   * out as a white mass with a point somewhere inside it. The reference keeps its rays apart until much closer
   * in; this is the number that does that.
   */
  const eps = H * (V ? V.eps : 0.22)
  const openX = W * (V ? V.openX : 0.22) * d
  const openY = H * (V ? V.openY : 0.24) * d
  const L = (a, b) => lerp(a, b, d)
  /*
   * The corners stay in the unit square's order — (0,0) (1,0) (1,1) (0,1) — for BOTH sides. Side 1 is built
   * explicitly rather than by mirroring side 0: mirroring the quad also mirrors the field that is mapped into
   * it, and the frontend words would have arrived backwards.
   */
  return side === 0
    ? [
        [L(0, vx), L(0, vy - eps)],
        [L(W, W + openX), L(0, -openY)],
        [L(W, W + openX), L(H, H + openY)],
        [L(0, vx), L(H, vy + eps)],
      ]
    : [
        [L(0, -openX), L(0, -openY)],
        [L(W, vx), L(0, vy - eps)],
        [L(W, vx), L(H, vy + eps)],
        [L(0, -openX), L(H, H + openY)],
      ]
}

/**
 * The matrix the shader wants: SCREEN pixels -> FLAT FIELD pixels.
 *
 * Built as (unit -> flat) composed with the inverse of (unit -> screen quad), so the flat field's own pixel
 * coordinates come back out and rows() can go on working in the units it has always worked in.
 */
export function corridorMatrix(W, H, d, side, V = null) {
  const toScreen = unitToQuad(corridorQuad(W, H, d, side, V))
  const inv = inverse3(toScreen)
  if (!inv) return null
  const toFlat = [W, 0, 0, 0, H, 0, 0, 0, 1]
  const m = mul3(toFlat, inv)
  // GLSL mat3 is column-major
  return new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]])
}

/*
 * THE GLSL. Two chunks: what the variant declares, and what it does at the hook.
 *
 * The Jacobian is the point of the whole file. For u = (a*x + b*y + c) / w and v = (d*x + e*y + f) / w with
 * w = g*x + h*y + i, differentiating the quotient gives
 *
 *     du/dx = (a - g*u) / w        du/dy = (b - h*u) / w
 *     dv/dx = (d - g*v) / w        dv/dy = (e - h*v) / w
 *
 * which is exact, four multiply-adds, and is what makes the corridor's converging rows anti-alias and fuse by
 * the same rules as the flat field's.
 */
export const CORRIDOR_PATCH = {
  pars: `
/*
 * A ROW SEEN FURTHER DOWN THE CORRIDOR IS THINNER.
 *
 * The base shader gives every row the same width in screen pixels wherever it is. In a flat field that is
 * correct. In a corridor it is not, and the consequence is not subtle: the spacing shrinks with distance while
 * the width does not, so the proportion of the field covered by ink climbs toward one and the far half of the
 * corridor fills in as a solid white mass with a vanishing point buried somewhere inside it.
 *
 * Dividing the width by the map's own gradient keeps the RATIO of ink to ground constant, which is what a real
 * perspective does and what the reference shows: a dark field, thin rays, all the way in. The floor stops a row
 * disappearing entirely before it reaches the point, and it is at the floor — only in the last pixels — that
 * the rays finally meet and the point goes solid.
 */
#define VARIANT_HW(h, g) ((g) <= 1.0 ? (h) : max((h) / (g), 0.30))
// and crowded rows are NOT closed up into a mass here; see the note at VARIANT_FUSE in surface.js
#define VARIANT_FUSE 0.0
// and the field thins as the corridor forms; see lfKeep below
#define VARIANT_ROW(a, r) ((a) * lfKeep(r))

uniform mat3 uLFinv;      // screen -> flat field, in pixels
uniform vec4 uLFfade;     // spacing where the rows go out, spacing where they are full, depth fade, edge softness
uniform vec4 uLFflow;     // how far each of the four words has flowed, in flat pixels
uniform vec4 uLFband;     // the four words' centres up the flat field, in flat pixels
uniform vec2 uLFthin;     // x: keep every Nth row, y: how far the thinning has gone (0 = the full field)
uniform vec4 uLFmode;     // x: on, y: depth, z: how spread the field is (0 = every row on one line), w: horizon
uniform vec4 uLFline;     // the drawn passage: screen y, half height, how much of it there is, unused
uniform vec3 uLFlineCol;  // its colour — the ground's ink, taking the rust only at the crossing

/*
 * THE FIELD THINS AS THE CORRIDOR FORMS.
 *
 * The pitch this field is ruled at is the pitch the WORDS need — a capital carried by twenty-odd rows, or it
 * cannot be read on a phone. Sent down a corridor, that density has nowhere to go: hundreds of rows land
 * inside a few pixels, they add up to a wash, and the vanishing point is buried in it. The reference has
 * perhaps eighty rows with wide gaps, and that is why its rays stay countable all the way to the point.
 *
 * So while the words are there the field stays dense and legible, and as they flow out every row but each Nth
 * goes. Smoothly, and by INDEX — the rows that stay are the same rows throughout, so nothing slides and
 * nothing pops. Reversed on the frontend side: sparse rays in the corridor, the field filling back in as the
 * words arrive.
 */
float lfKeep(float r) {
  float k = max(2.0, uLFthin.x);
  // 1 on the rows that survive, 0 on the rest; r is an integer row index, so this is exact
  float kept = 1.0 - step(0.5, mod(abs(r), k));
  return mix(1.0, kept, clamp(uLFthin.y, 0.0, 1.0));
}

/*
 * WHICH WORD A ROW BELONGS TO — decided, not blended.
 *
 * The first version weighted the four offsets by distance, so a row between two words carried a little of each.
 * A word is a rigid thing: given two different offsets at its cap and at its baseline it shears, and the letters
 * came out slanted and smeared. The nearest band wins outright. Nothing is lost by the hard edge, because the
 * rows between two words carry no ink to be shifted.
 */
float lfFlowAt(float v) {
  float best = uLFflow[0];
  float bd = abs(v - uLFband[0]);
  for (int i = 1; i < 4; i++) {
    float dv = abs(v - uLFband[i]);
    if (dv < bd) { bd = dv; best = uLFflow[i]; }
  }
  return best;
}
`,
  warp: `
  if (uLFmode.x > 0.5) {
    vec3 q = uLFinv * vec3(p.x, m, 1.0);
    float w = q.z;
    // behind the viewer: there is no field here at all, and sampling it would fold the far wall onto the near one
    if (w <= 1e-4) { fade = 0.0; w = 1e-4; }
    float iw = 1.0 / w;
    vec2 fpt = q.xy * iw;
    // the homography's exact Jacobian (see the note in corridor.js)
    float du_dx = (uLFinv[0][0] - uLFinv[0][2] * fpt.x) * iw;
    float du_dy = (uLFinv[1][0] - uLFinv[1][2] * fpt.x) * iw;
    float dv_dx = (uLFinv[0][1] - uLFinv[0][2] * fpt.y) * iw;
    float dv_dy = (uLFinv[1][1] - uLFinv[1][2] * fpt.y) * iw;

    /*
     * THE COLLAPSE, IN THE FLAT FIELD AND NOT ON THE SCREEN.
     *
     * Every row drawing toward one line is a scaling of the field about its horizon, and this shader runs the
     * pipeline BACKWARDS: a screen pixel is un-projected to the field, so the collapse must be un-done too.
     * Hence the division. Multiplying — collapsing after un-projecting instead of before — is a different
     * scene altogether: the lines of constant field height in a corridor are the rays through its vanishing
     * point, so the collapse drew a starburst instead of a line. It looked deliberate, which is how it nearly
     * survived review.
     *
     * The gradient divides with it, which is the whole trick: as the field closes, its rows crowd in screen
     * terms, and the shader's existing rule for rows packed tighter than the screen can hold — fuse them into
     * one mass, never let them interfere — is what turns the last of the collapse into a single solid line.
     * Nothing here draws that line. The floor under the scale is what stops it thinning to nothing: at a true
     * zero the whole field is one row and the band it makes has no height at all.
     */
    // the rows carry the collapse while they can still be told apart, and no further: past this the band
    // would only go solid, and the drawn line takes over instead
    float sp = max(uLFmode.z, 0.16);
    float vflat = uLFmode.w + (fpt.y - uLFmode.w) / sp;
    dv_dx /= sp;
    dv_dy /= sp;

    // MINUS, because this moves the SAMPLE and not the content. To carry a word to the right of the screen the
    // field must be read from further to the left; added, the words left the field the instant they began to
    // flow and the corridor came up empty.
    cx = fpt.x - lfFlowAt(fpt.y);
    m = vflat;
    // the variant owns the map here, so it owns the gradient: LINEFIELD carries no features of its own, and a
    // gradient left over from a map that no longer applies would mis-size every row in the corridor
    gm = vec2(dv_dx, dv_dy);

    /*
     * THE ROWS THIN, THEY DO NOT FADE.
     *
     * The first version took contrast out wherever the screen-space row spacing fell below a couple of pixels.
     * It removed the moire and it removed the corridor with it: the rays dissolved into a haze long before they
     * met, so the vanishing point — the one thing that makes a corridor read as depth — never appeared.
     *
     * The shader already has the right answer and it is a COVERAGE answer, not a contrast one. Where rows are
     * packed tighter than the grid can hold them apart, rows() stops trying to resolve individual rows and
     * returns what they add up to over the pixel. Carried all the way in, that tends to 1 — which is a bright
     * sharp point, exactly what the reference shows. Nothing needs to be faded for that to happen; the fade was
     * the only thing preventing it.
     *
     * What is left here is the field's own edge, and a whisker at the point itself where even the coverage
     * answer is asking about more rows than a float can separate.
     */
    fade *= smoothstep(0.0, uLFfade.w, fpt.x) * smoothstep(0.0, uLFfade.w, uRes.x - fpt.x);
    float spr = uR1.x / max(length(vec2(dv_dx, dv_dy)), 1e-4);
    fade *= smoothstep(uLFfade.x, uLFfade.y, spr * uDpr);
    /*
     * AND THE FIELD LEAVES AS THE LINE ARRIVES.
     *
     * Below the point where the rows can still be told apart there is nothing left for them to say: what is
     * drawn there is the sampling grid arguing with a field magnified past it. The rows go out over the last
     * of the collapse and the drawn line takes over, so the two are never both on screen at full strength.
     */
    fade *= smoothstep(0.0, 0.17, uLFmode.z);
  }
`,
  /*
   * THE PASSAGE IS DRAWN, NOT FUSED.
   *
   * The collapse used to be left to the rows: magnify the field far enough and every row lands in one band,
   * and the shader's crowding rule turns that band solid. What it turned solid was the whole screen — every
   * pixel found a row, coverage went to one everywhere, and the signature moment played as two seconds of
   * full-frame rust.
   *
   * So the last of the collapse is a line this file draws. The rows carry the movement while they can still be
   * told apart, and hand over to an explicit line, one or two pixels on the ground colour, which is the only
   * thing that takes the rust. A fused mass cannot be made thin; a drawn line is thin by construction.
   */
  composite: `
  if (uLFmode.x > 0.5 && uLFline.z > 0.001) {
    float half_ = max(0.5, uLFline.y);
    float d0 = abs(p.y - uLFline.x);
    float ln = (1.0 - smoothstep(half_ - 0.5, half_ + 0.5, d0)) * uLFline.z;
    col = mix(col, uLFlineCol, ln);
    inkCol = mix(inkCol, uLFlineCol, ln);
    inkAmt = max(inkAmt, ln);
    ground = max(ground, ln);
  }
`,
}
