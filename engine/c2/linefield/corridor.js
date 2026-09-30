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

/**
 * ONE ROW IN EVERY N SURVIVES THE CORRIDOR — the ground's rows, that is; a word keeps all of them.
 *
 * The field is ruled at the pitch the TYPE needs, about nine rows through every capital, or a phone cannot
 * read the words. Sent whole down a corridor that density has nowhere to go: hundreds of rows land inside a
 * few pixels and add up to a wash with the vanishing point somewhere inside it.
 *
 * Three densities were built and reviewed on the device — every 4th, 6th and 8th row. Every 8th was chosen:
 * it is the one that reads as a countable set of rays rather than a grey field, at 1440x900 and at 390x844.
 * The switch that offered the other two is gone; this is the number.
 */
export const LF_ROW_KEEP = 8

/*
 * THE FAN CLOSES; IT DOES NOT RETREAT.
 *
 * There was a version of this that drew the far point back toward the vanishing point as the fan closed, so the
 * corridor's whole image shrank to a few per cent of the screen and what was left was a small wedge in a corner.
 * That is not the reference's passage and it left the screen nearly empty for seconds. The reference closes the
 * fan on cc ALONE: the vanishing point stays where it is, the far end stays at the screen edge, and the fan
 * flattens vertically onto the horizon until it is a needle spanning the whole width with its tip on the point.
 */
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

/**
 * THE CORRIDOR'S IMAGE: the band of screen columns the map can actually reach.
 *
 * X depends only on t, so the image is the interval between X(0) and X(1) and there is no solution anywhere
 * else — not past the vanishing point, and not past the far point once the fold-back has drawn it in. A harness
 * asks for this to know where it is entitled to find a mark, and the shader enforces it by residual.
 */
export function corridorImage(W, d, side) {
  const vx = vxOf(W, side)
  const Ex = ExOf(W, side)
  const p = 1 + 1.7 * d
  const X = (t) => {
    const tt = side === 0 ? t : 1 - t
    return t * W * (1 - d) + d * (vx + (Ex - vx) * Math.pow(Math.max(tt, 0), p))
  }
  return [Math.min(X(0), X(1)), Math.max(X(0), X(1))]
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
// and the field thins, and ends, and dissolves where its rays meet — none of which happens to type
#define VARIANT_ROW(a, r, sol) ((a) * lfKeep(r, sol) * lfExtent(r, sol) * lfWhisker(sol))

uniform vec4 uLFmap;      // x: depth d, y: the fan's opening cc, z: vx, w: vy
uniform vec4 uLFmap2;     // x: Ex, drawn in by the fold-back; y: W; z: side (0 dark, 1 cream); w: 1 + 1.7d
uniform vec4 uLFfade;     // x,y: the whisker at the point itself; z: depth fade; w: the field's own edge
uniform vec4 uLFflow;     // how far each of the four words has flowed, in flat pixels
uniform vec4 uLFband;     // the four words' centres up the flat field, in flat pixels
uniform vec2 uLFthin;     // x: keep every Nth row, y: how far the thinning has gone (0 = the full field)
uniform vec4 uLFline;     // the rust line: screen y, half height, how much of it there is, unused
uniform vec3 uLFlineCol;  // its colour — the ground's ink, taking the rust only at the crossing
uniform vec4 uLFmode;     // x: 1 while the corridor is mapping

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
 * AND THE FIELD ENDS AT ITS OWN TOP AND BOTTOM — THE GROUND DOES, ANYWAY.
 *
 * The demo has sixty-odd rows and no more: its field is a list. C2 makes a row wherever the material coordinate
 * lands, so rows from far above and below the screen were being mapped into the corridor and piling up around
 * the vanishing point — a grey halo the demo does not have. The field is given the same extent the demo's has,
 * arriving with the depth and leaving with it so that at rest the ground is still full screen.
 *
 * IT IS DECIDED PER ROW, AND TYPE IS EXEMPT. Applied to the whole pixel it clipped the top of FEEL while FEEL
 * was in flight: the word was crossing the top of the field's extent, and the extent does not know the
 * difference between a row of ground and a row inside a letter. A word is whole at every moment of its flight,
 * exactly as it keeps every row through the thinning — the same rule, for the same reason.
 *
 * r * uR1.x is where the row belongs at REST, which is what the extent is about; the corridor may have carried
 * it anywhere by the time it is drawn.
 */
/*
 * THE WHISKER AT THE POINT — AND IT IS A GROUND RULE TOO.
 *
 * Where neighbouring rays come closer than a pixel no coverage answer can keep them apart, so the last band
 * before the vanishing point is taken out rather than left to boil. That is right for ruled ground and wrong
 * for a letter: a letter is not two rays the eye is failing to separate, it is a SOLID, and the reference draws
 * its word segments as filled shapes right up to the point.
 *
 * Applied to the whole pixel it was the third thing treating type as ground — and the one that was actually
 * taking the top off FEEL in flight. The extent was the suspect; the extent was innocent, and exempting type
 * from it changed nothing, because the rows coming off the top of the word were being dissolved by this.
 *
 * Type keeps a whisker of its own, an order tighter: at the singularity itself even a solid has to go, or the
 * vanishing point is a black dot rather than a point.
 */
float lfWhisk_cur;
float lfWhiskType_cur;
float lfWhisker(float sol) { return mix(lfWhisk_cur, lfWhiskType_cur, smoothstep(0.08, 0.3, sol)); }

float lfExtent(float r, float sol) {
  float y = r * uR1.x;
  float soft = max(4.0, uRes.y * 0.02);
  float inside = smoothstep(0.0, soft, y - uRes.y * 0.07) * smoothstep(0.0, soft, uRes.y * 0.93 - y);
  return mix(1.0, mix(inside, 1.0, smoothstep(0.08, 0.3, sol)), smoothstep(0.02, 0.3, uLFmap.x));
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
      // THE GUARD KEEPS THE SIGN. Written without the second test it did not: at the vanishing point dX/dq
      // vanishes, and on the cream side, where the derivative is negative, substituting a POSITIVE epsilon sent
      // the step the wrong way — q left 0 for 1 in one move and then wandered back to an ordinary interior
      // value. That is where the dashes past the point came from.
      float gg = abs(g) < 1e-4 ? (g < 0.0 ? -1e-4 : 1e-4) : g;
      q = clamp(q - (lfX(q) - p.x) / gg, 0.0, 1.0);
    }

    /*
     * AND OUTSIDE THE CORRIDOR'S IMAGE THERE IS NOTHING.
     *
     * Newton always returns something. Past the vanishing point — and past the far point, once the fold-back
     * has drawn it in — no t maps to this column at all, so what it returns is a number with no meaning, and
     * the shader was drawing a row at it: a column of dashes just past the point and a ghost fan beyond that.
     *
     * The test is the map's own: carry the answer forward and see whether it lands on this pixel. Inside the
     * image it lands within a fraction of a pixel; outside, it cannot land at all, because the nearest column
     * the map reaches is the edge of the image. Sub-pixel tolerance, so the corridor's last column is
     * antialiased and not a saw.
     */
    float res = abs(lfX(q) - p.x);
    fade *= 1.0 - smoothstep(0.35, 1.1, res);

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
    // decided per row inside rows(), where it is known whether the row is ground or inside a letter
    lfWhisk_cur = smoothstep(uLFfade.x, uLFfade.y, spr * uDpr);
    lfWhiskType_cur = smoothstep(uLFfade.x * 0.18, uLFfade.y * 0.21, spr * uDpr);
    fade *= smoothstep(0.0, uLFfade.w, u) * smoothstep(0.0, uLFfade.w, uRes.x - u);
    fade *= 1.0 - uLFfade.z * d;
  }
`,
  /*
   * THE RUST LINE IS DRAWN ALONG THE HORIZON, ACROSS THE WHOLE WIDTH, exactly as the reference strokes it: two
   * pixels at the vanishing point's own height, from edge to edge, its opacity the flash. It appears while the
   * fan is still a needle — so it is first seen INSIDE the wedge, along its centre — and it is the last thing
   * left when the needle has closed.
   *
   * It is drawn rather than fused because a fused mass cannot be made thin, and because the accent belongs to
   * this line and to nothing else on the screen.
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
