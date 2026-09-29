/*
 * ── THE CORRIDOR ────────────────────────────────────────────────────────────────────────────────────────────
 *
 * The reference demo's own mapping, in C2's renderer. Imported only where __LINEFIELD__ is true.
 *
 * WHY NOT THE HOMOGRAPHY IT USED TO BE. A homography maps straight lines to straight lines. The demo's motion
 * begins with the rows FLEXING — their ends curving away before they become rays — and that bend is where its
 * breathing quality comes from. A projective map cannot produce it at any setting, so the previous version
 * could match the demo's end frames and never its movement.
 *
 * THE DEMO'S MAP, from linefield-v2.html's pt():
 *
 *     s  = tt ^ (1 + 1.7 d)            tt = t on the dark side, 1 - t on the cream side
 *     fx = t W                         fy = vy + (y0 - vy) cc
 *     px = vx + (Ex - vx) s            py = vy + (Ey - vy) s,   Ey = vy + (y0 - vy) 3.4 cc
 *     screen = mix(flat, persp, d)
 *
 * The exponent on s is what curves the rows: at d = 0 it is linear, and as d grows the ends are dragged toward
 * the vanishing point faster than the middle. That is phases 1 and 2 of the choreography — bend, then
 * straighten. Phases 3 and 4 follow from cc alone, because cc scales every row toward the horizon: the fan
 * closes, and what is left is one line. There is no separate gather; the collapse IS this map.
 *
 * INVERTING IT. C2 asks, per pixel, which row is here — so the map has to run backwards. The saving grace is
 * that X DEPENDS ONLY ON t, not on the row. So the inverse is a one-dimensional root find for t, and the row
 * then falls out in closed form:
 *
 *     A  = (Y - vy) / G,   G = 1 + d (3.4 s - 1)
 *     y0 = vy + A / cc
 *
 * X(t) is monotonic on both sides — both of its terms increase with t — so Newton from the flat position
 * converges in a few steps and cannot fall off the branch. The Jacobian is then analytic from the forward map,
 * which is what the existing anti-aliasing, fusing and level-of-detail logic needs.
 */

/** the four words are stacked, so a word's horizontal flow is a function of WHERE UP THE FIELD it is */
export const LF_BANDS = 4

/** how many Newton steps the shader takes; lfResidual() measures what that is worth */
export const LF_ITERS = 5

const vxOf = (W, side) => (side === 0 ? W * 0.1 : W * 0.9)
const ExOf = (W, side) => (side === 0 ? W * 1.1 : -W * 0.1)

/*
 * The same arithmetic as the shader, on the CPU, so the iteration can be MEASURED rather than asserted.
 * Returns the worst absolute error in screen pixels over a grid across the frame.
 */
export function lfResidual(W, d, side, iters = LF_ITERS) {
  const vx = vxOf(W, side)
  const Ex = ExOf(W, side)
  const p = 1 + 1.7 * d
  const X = (t) => {
    const tt = side === 0 ? t : 1 - t
    return t * W * (1 - d) + d * (vx + (Ex - vx) * Math.pow(Math.max(tt, 0), p))
  }
  const dX = (t) => {
    const tt = side === 0 ? t : 1 - t
    const sgn = side === 0 ? 1 : -1
    return W * (1 - d) + d * (Ex - vx) * p * Math.pow(Math.max(tt, 1e-6), p - 1) * sgn
  }
  /*
   * ONLY WHERE THE MAP REACHES. At full depth the corridor's image starts at the vanishing point: X(0) is vx,
   * and no t maps to a screen column beyond it. Measured across the whole frame the "residual" is just the
   * distance to the nearest reachable column — 144px at d=1, which is vx exactly, and says nothing about the
   * iteration. Outside the range there is no solution to converge to, and the field's own edge fade is what
   * covers it.
   */
  const lo = Math.min(X(0), X(1))
  const hi = Math.max(X(0), X(1))
  let worst = 0
  for (let k = 0; k <= 200; k++) {
    const target = lo + ((hi - lo) * k) / 200
    let t = Math.min(1, Math.max(0, target / W))
    for (let i = 0; i < iters; i++) {
      const g = dX(t)
      t = Math.min(1, Math.max(0, t - (X(t) - target) / (Math.abs(g) < 1e-4 ? 1e-4 : g)))
    }
    worst = Math.max(worst, Math.abs(X(t) - target))
  }
  return worst
}

/** where the vanishing point lands on screen, so a harness can look in the right place */
export function vanishingPoint(W, H, d, side) {
  const flatX = side === 0 ? 0 : W
  return [flatX + (vxOf(W, side) - flatX) * d, H * 0.5]
}

/** what the shader needs, per frame */
export function corridorUniforms(W, H, d, side) {
  return {
    map: [d, 0, vxOf(W, side), H * 0.5],
    map2: [ExOf(W, side), W, side, 1 + 1.7 * d],
  }
}

export const CORRIDOR_PATCH = {
  pars: `
/*
 * A ROW SEEN FURTHER DOWN THE CORRIDOR IS THINNER. The base shader gives every row the same width in screen
 * pixels wherever it is, which is right for a field mapped vertically and fills a receding one in solid.
 */
#define VARIANT_HW(h, g, sol) lfHw(h, g, sol)
// crowded rows are NOT closed up into a mass here: a corridor should thin out, not turn into a bar
#define VARIANT_FUSE 0.0
// and the field thins as the corridor forms; see lfKeep below
#define VARIANT_ROW(a, r, sol) ((a) * lfKeep(r, sol))

uniform vec4 uLFmap;      // x: depth d, y: the fan's opening cc, z: vx, w: vy
uniform vec4 uLFmap2;     // x: Ex, y: W, z: side (0 dark, 1 cream), w: the exponent 1 + 1.7d
uniform vec4 uLFfade;     // x,y: the whisker at the point itself; z: depth fade; w: the field's own edge
uniform vec4 uLFflow;     // how far each of the four words has flowed, in flat pixels
uniform vec4 uLFband;     // the four words' centres up the flat field, in flat pixels
uniform vec2 uLFthin;     // x: keep every Nth row, y: how far the thinning has gone (0 = the full field)
uniform vec4 uLFline;     // the drawn passage: screen y, half height, how much of it there is, unused
uniform vec3 uLFlineCol;  // its colour — the ground's ink, taking the rust only at the crossing
uniform vec2 uLFmode;     // x: 1 while the corridor is mapping at all

/*
 * THE FIELD THINS AS THE CORRIDOR FORMS.
 *
 * The pitch this field is ruled at is the pitch the WORDS need — a capital carried by twenty-odd rows, or it
 * cannot be read on a phone. Sent down a corridor that density has nowhere to go: hundreds of rows land inside
 * a few pixels and add up to a wash. So while the words are there the field stays dense, and as they flow out
 * every row but each Nth goes — smoothly, and by INDEX, so the rows that stay are the same rows throughout and
 * nothing slides or pops.
 */
float lfKeep(float r, float sol) {
  float k = max(2.0, uLFthin.x);
  float kept = 1.0 - step(0.5, mod(abs(r), k));
  /*
   * THE WORDS KEEP EVERY ROW THEY HAVE. The thinning is for the GROUND — a field ruled for type cannot be sent
   * whole down a corridor. A word is not ground: taking seven rows in eight out of a letter while it flows
   * past leaves a thin grey ghost where the reference has a thick bright bar.
   */
  return mix(mix(1.0, kept, clamp(uLFthin.y, 0.0, 1.0)), 1.0, smoothstep(0.08, 0.3, sol));
}

/*
 * HOW WIDE A ROW IS, AND IT DEPENDS ON WHAT IT CARRIES.
 *
 * Ground: a row further down the corridor is thinner, so its width is divided by the map's gradient and the
 * ink-to-ground ratio stays constant. Type: the reference does the OPPOSITE — a word segment is
 * P * 0.62 * ((1-d) + d*(0.1 + 1.9 s)) * (0.35 + 0.65 cc) — so it WIDENS toward the viewer, which is what
 * makes the near letters read as thick bright bars instead of lines among the rays.
 */
float lfS_cur;
float lfCC_cur;
float lfD_cur;
float lfHw(float h, float g, float sol) {
  float ground = (g <= 1.0) ? h : max(h / g, 0.30);
  float ws = (1.0 - lfD_cur) + lfD_cur * (0.1 + 1.9 * lfS_cur);
  float word = uR1.x * 0.31 * ws * (0.35 + 0.65 * lfCC_cur);
  return mix(ground, max(word, 0.35), smoothstep(0.08, 0.3, sol));
}

/*
 * EVERYTHING IS SOLVED IN q, NOT IN t.
 *
 * q is the reference's tt: the distance along the corridor from the vanishing point, so q -> 0 AT the point on
 * both sides. On the cream side t is near 1 there, and 1 - t in float32 throws away most of its significant
 * digits exactly where the map is most sensitive. On the phone that showed as a sandy grain on the cream side
 * with a vertical seam across it — the line where the cancellation began to bite. Solved in q, there is no
 * subtraction of two nearly equal numbers anywhere.
 */
float lfT(float q) { return uLFmap2.z < 0.5 ? q : 1.0 - q; }
float lfS(float q) { return pow(max(q, 0.0), uLFmap2.w); }
float lfX(float q) {
  return lfT(q) * uLFmap2.y * (1.0 - uLFmap.x) + uLFmap.x * (uLFmap.z + (uLFmap2.x - uLFmap.z) * lfS(q));
}
/** ds/dq is positive on both sides; dt/dq carries the sign */
float lfDs(float q) { return uLFmap2.w * pow(max(q, 1e-6), uLFmap2.w - 1.0); }
float lfDx(float q) {
  float dtdq = uLFmap2.z < 0.5 ? 1.0 : -1.0;
  return dtdq * uLFmap2.y * (1.0 - uLFmap.x) + uLFmap.x * (uLFmap2.x - uLFmap.z) * lfDs(q);
}

// which word a row belongs to — decided, not blended: a word is rigid, and two offsets across one shears it
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
    float d = uLFmap.x;
    float cc = max(uLFmap.y, 0.0025);
    float vy = uLFmap.w;

    /*
     * THE INVERSE, one dimension of it. X depends only on t, and X(t) is monotonic on both sides, so Newton
     * from the flat position converges quickly and cannot leave the branch. The worst residual across the
     * frame is measured by lfResidual() on the CPU and reported rather than assumed.
     */
    float tGuess = clamp(p.x / uLFmap2.y, 0.0, 1.0);
    float q = uLFmap2.z < 0.5 ? tGuess : 1.0 - tGuess;
    for (int i = 0; i < ITERS; i++) {
      float g = lfDx(q);
      q = clamp(q - (lfX(q) - p.x) / (abs(g) < 1e-4 ? 1e-4 : g), 0.0, 1.0);
    }

    float s = lfS(q);
    float G = 1.0 + d * (3.4 * s - 1.0);
    float Gs = abs(G) < 1e-4 ? 1e-4 : G;
    float y0 = vy + (m - vy) / (Gs * cc);
    float u = lfT(q) * uLFmap2.y;

    /*
     * THE JACOBIAN, analytic from the forward map. The anti-aliasing, the rule that fuses crowded rows and the
     * level of detail are all decided from it, so an estimate would put those decisions out of focus exactly
     * where the rays converge.
     */
    float dxdq = lfDx(q);
    float dqdX = 1.0 / (abs(dxdq) < 1e-4 ? 1e-4 : dxdq);
    float dGdq = d * 3.4 * lfDs(q);
    float dy0dY = 1.0 / (cc * Gs);
    float dy0dX = -(m - vy) / (cc * Gs * Gs) * dGdq * dqdX;

    // handed to lfHw, which runs inside rows() after this
    lfS_cur = s;
    lfCC_cur = uLFmap.y;
    lfD_cur = d;

    cx = u - lfFlowAt(y0);
    m = y0;
    // the variant owns the map, so it owns the gradient
    gm = vec2(dy0dX, dy0dY);

    /*
     * THE ROWS THIN, THEY DO NOT FADE. The shader's own coverage answer is what makes the point: carried all
     * the way in it tends to one, which is a sharp point. What is faded is only the whisker at the point
     * itself, where no coverage answer can keep neighbouring rays apart, and the field's own edge.
     */
    float spr = uR1.x / max(length(vec2(dy0dX, dy0dY)), 1e-4);
    fade *= smoothstep(uLFfade.x, uLFfade.y, spr * uDpr);
    fade *= smoothstep(0.0, uLFfade.w, u) * smoothstep(0.0, uLFfade.w, uRes.x - u);
    /*
     * AND THE FIELD ENDS AT ITS OWN TOP AND BOTTOM.
     *
     * The demo has sixty-odd rows and no more: its field is a list. C2 makes a row wherever the material
     * coordinate lands, so rows from far above and below the screen were being mapped into the corridor and
     * piling up around the vanishing point — a grey halo the demo does not have, and the clearest difference
     * left in the side-by-side. The field is given the same extent the demo's has.
     */
    /*
     * ...BUT ONLY ONCE THERE IS A CORRIDOR. At rest this site's field is full screen, always; clipping it to
     * the reference's extent left empty bands top and bottom and the ruled ground read as a panel behind the
     * words. The extent arrives with the depth and leaves with it, smoothly, the way the thinning does.
     */
    float top = uRes.y * 0.07;
    float bot = uRes.y * 0.93;
    float inside = smoothstep(0.0, uLFfade.w, y0 - top) * smoothstep(0.0, uLFfade.w, bot - y0);
    fade *= mix(1.0, inside, smoothstep(0.02, 0.3, d));
    fade *= 1.0 - uLFfade.z * d;
    // and the field leaves over the last of the fan's closing, as the drawn line takes over
    fade *= smoothstep(0.0, 0.05, uLFmap.y);
  }
`,
  /*
   * THE PASSAGE IS DRAWN, NOT FUSED. A fused mass cannot be made thin; a drawn line is thin by construction,
   * it is handed over to as the fan finishes closing, and it is the only thing that takes the rust.
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

// the loop bound has to be a constant in GLSL ES 3.00, so it is substituted rather than passed as a uniform
CORRIDOR_PATCH.warp = CORRIDOR_PATCH.warp.replace('ITERS', String(LF_ITERS))
