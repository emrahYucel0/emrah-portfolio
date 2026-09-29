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
export function corridorQuad(W, H, d, side) {
  const vx = side === 0 ? W * 0.12 : W * 0.88
  const vy = H * 0.5
  // the far edge never collapses to a true point: a degenerate quad has no inverse, and a corridor whose far
  // end is a mathematical point has a pixel there that belongs to every row at once
  const eps = H * 0.035
  const openX = W * 0.3 * d
  const openY = H * 0.42 * d
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
 * coordinates come back out and `rows()` can go on working in the units it has always worked in.
 */
export function corridorMatrix(W, H, d, side) {
  const toScreen = unitToQuad(corridorQuad(W, H, d, side))
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
uniform mat3 uLFinv;      // screen -> flat field, in pixels
uniform vec4 uLFfade;     // spacing where the rows go out, spacing where they are full, depth fade, edge softness
uniform vec4 uLFflow;     // how far each of the four words has flowed, in flat pixels
uniform vec4 uLFband;     // the four words' centres up the flat field, in flat pixels
uniform vec4 uLFmode;     // x: on, y: depth, z: how spread the field is (0 = every row on one line), w: horizon

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
    float sp = max(uLFmode.z, 0.02);
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

    // AND THE ROWS GO OUT BEFORE THEY CAN BEAT.
    // The screen-space distance between two rows is the field's spacing over the length of the gradient. Where
    // that falls below a pixel or two, no amount of anti-aliasing can keep neighbouring rows apart and what is
    // left is interference. C2 already FUSES crowded rows into one mass, which is right for a gather and wrong
    // for a corridor — a corridor should thin out and vanish, not turn into a bar. So contrast is taken out on
    // the same measure, just before fusing would take over.
    float spr = uR1.x / max(length(vec2(dv_dx, dv_dy)), 1e-4);
    fade *= smoothstep(uLFfade.x, uLFfade.y, spr * uDpr);
    // and the field ends where it ends: past its own edges there is nothing to sample but a clamped edge texel
    fade *= smoothstep(0.0, uLFfade.w, fpt.x) * smoothstep(0.0, uLFfade.w, uRes.x - fpt.x);
    fade *= 1.0 - uLFfade.z * uLFmode.y;
    // while the field is closing, the crowding is the POINT and must not be faded away as if it were moiré
    fade = mix(1.0, fade, smoothstep(0.0, 0.35, uLFmode.z));
  }
`,
}
