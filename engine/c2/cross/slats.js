/*
 * ── THE SLATS ───────────────────────────────────────────────────────────────────────────────────────────────
 *
 * The reference (`docs/reference/cross-section-v2.html`) builds the field out of fifty-odd DOM louvers in CSS 3D.
 * This is the same field in C2's one fragment shader. The CSS transforms are mirrored here on the CPU exactly as
 * the browser composes them, and the shader asks the question C2 always asks: per pixel, WHICH ROW OF MATERIAL IS
 * HERE. It answers it by casting the eye's ray through the pixel into at most three louvers, finding the nearest
 * face or edge the ray meets, and handing C2's row machinery the material coordinate on that face — with its
 * exact gradient, so the anti-aliasing, the fusing of foreshortened rows and the level of detail are decided
 * from the map and not from a guess.
 *
 * What the louvers carry are two ordinary C2 states: SURFACE on the fronts (slot 0), DEPTH on the backs (slot 1).
 * Which one a pixel shows is which face of its louver the ray met, so the state choice is made per pixel.
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
/** the most louvers there can be (the reference clamps the count to 25..50) */
export const CS_MAX = 64

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
/**
 * The field's layout: the reference's count rule, between the site's strips. The row pitch is a third of a
 * louver, exactly as the reference rules its faces (`rowSpace = pitch / 3`), so every louver carries three whole
 * rows and no row is ever cut by a louver's edge.
 */
export function layout(V) {
  const W = V.W, h = Math.max(1, V.H - V.strip * 2)
  const count = Math.max(25, Math.min(50, Math.round(h / (W < 700 ? 20 : 21))))
  const pitch = h / count
  const louvers = Array.from({ length: count }, (_, i) => {
    const y = i / (count - 1)
    return { top: i * pitch, y, wave: Math.sin(y * Math.PI * 2.25), cw: Math.pow(Math.max(0, 1 - Math.abs(y - 0.49) * 1.9), 1.4) }
  })
  // the reference adds 0.45px to every louver so neighbours overlap and no hairline of ground shows at rest
  return { W, H: V.H, h, strip: V.strip, count, pitch, hl: pitch + 0.45, spacing: pitch / 3, louvers }
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
  const { W, h, louvers, hl } = L
  const ps = louverClock(p)
  const peak = Math.pow(Math.max(0, 1 - Math.abs(ps - 0.5) / 0.28), 1.4)
  const P = Math.max(640, W * 1.09)
  const O = [W * 0.52, h / 2]
  const pc = [W / 2, h / 2]
  const sc = 1 + 0.045 * peak
  const plane = chain(T(pc[0], pc[1], 0), T(0, 0, -36 * peak), RY(2.5 * peak), S(sc, sc, 1), T(-pc[0], -pc[1], 0))
  const out = louvers.map(({ top, y, wave, cw }) => {
    const phase = 0.035 * wave + 0.04 * (1 - cw)
    const rot = 180 * ease(ps, 0.15 + phase, 0.85 + phase)
    const z = peak * (75 * cw + 22 * wave), x = peak * wave * cw * W * 0.028
    const sx = 1 + peak * (0.18 + 0.07 * cw)
    const o = [W / 2, top + hl / 2]
    const M = chain(plane, T(o[0], o[1], -HALF), T(x, 0, z), RX(rot), RY(peak * wave * 12), S(sx), T(-o[0], -o[1], 0))
    const shimmer = Math.sin((ps - 0.5) * 12 + y * 8 + p * 6)
    const hlit = clamp((0.27 + 0.75 * peak) * (0.66 + 0.34 * shimmer))
    const ev = Math.pow(Math.abs(Math.sin(rot * DEG)), 1.35) * (0.45 + peak * 0.48)
    return { M, Minv: inverse(M), top, rot, ev, bright: 0.43 + hlit * 1.12 }
  })
  const dark = ease(ps, 0.31, 0.51)
  return { p, ps, peak, P, O, louvers: out, dark, eye: [O[0], O[1], P] }
}

/**
 * Which faces the eye can see. A louver is a thin box, so the eye is always on one side of each pair of
 * opposite faces: +1 front, -1 back; and of its two edges, -1 the top one, +1 the bottom one, 0 neither.
 */
function sides(Minv, eye, top, hl) {
  const e = apply(Minv, eye[0], eye[1], eye[2])
  return { face: e[2] > HALF ? 1 : e[2] < -HALF ? -1 : 0, edge: e[1] < top ? -1 : e[1] > top + hl ? 1 : 0 }
}

/** where louver i's centre line lands on the screen at scene x: for the per-pixel candidate lookup only */
function centreY(M, P, O, x, top, hl) {
  // a louver that is scaled and turned does not put its local x at the same screen x: find the local x that
  // lands on this column first (two Newton steps on the projected x are plenty), then its centre line there
  const proj = (lx) => {
    const q = apply(M, lx, top + hl / 2, 0)   // a point on the louver's mid-plane (its box spans z -2.25..2.25)
    const k = P / Math.max(1, P - q[2])
    return [O[0] + (q[0] - O[0]) * k, O[1] + (q[1] - O[1]) * k]
  }
  let lx = x
  for (let n = 0; n < 3; n++) {
    const a = proj(lx), b = proj(lx + 1)
    const dx = b[0] - a[0]
    if (Math.abs(dx) < 1e-6) break
    lx += (x - a[0]) / dx
  }
  return proj(lx)[1]
}

export const LUT_COLS = 33
export const LUT_STEP = 4   // CSS px per lookup row

/**
 * THE DATA THE SHADER READS, packed into a float texture: five texels per louver.
 *
 *   0..2  the three rows of the louver's INVERSE affine (scene → louver-local)
 *   3     top, height, which face is visible (+1 / -1), which edge is visible (-1 / +1 / 0)
 *   4     the edge's opacity and brightness — the reference's ev and its brightness() filter
 *
 * And a lookup over the screen: for each column of a coarse grid and each LUT_STEP px of height, the four
 * louvers whose centre lines pass nearest (RGBA, one index per channel). The shader tests those four.
 */
export function pack(L, Q, data, lut, lutRows) {
  const { hl } = L
  Q.louvers.forEach((l, i) => {
    const o = i * 20
    for (let k = 0; k < 12; k++) data[o + k] = l.Minv[k]
    const sd = sides(l.Minv, Q.eye, l.top, hl)
    data[o + 12] = l.top; data[o + 13] = hl; data[o + 14] = sd.face; data[o + 15] = sd.edge
    data[o + 16] = l.ev; data[o + 17] = l.bright; data[o + 18] = 0; data[o + 19] = 0
  })
  const n = Q.louvers.length
  const ys = new Float32Array(n)
  const order = Array.from({ length: n }, (_, i) => i)
  for (let c = 0; c < LUT_COLS; c++) {
    const x = (L.W * c) / (LUT_COLS - 1)
    for (let i = 0; i < n; i++) ys[i] = centreY(Q.louvers[i].M, Q.P, Q.O, x, Q.louvers[i].top, hl)
    /*
     * NOT "THE NEAREST AND ITS NEIGHBOURS". At the crossing the louvers swing past one another at the sides of
     * the screen, so their centre lines are not in index order there and the louvers over a pixel need not be
     * neighbours. The four whose centre lines pass nearest are found in screen order instead.
     */
    order.sort((a, b) => ys[a] - ys[b])
    let j = 0
    for (let r = 0; r < lutRows; r++) {
      const y = (r + 0.5) * LUT_STEP
      while (j < n - 1 && ys[order[j + 1]] <= y) j++
      // expand outwards from the two centres either side of y, nearest first
      let lo = j, hi = j + 1, k = 0
      const o = (r * LUT_COLS + c) * 4
      while (k < 4) {
        const dl = lo >= 0 ? Math.abs(ys[order[lo]] - y) : Infinity
        const dh = hi < n ? Math.abs(ys[order[hi]] - y) : Infinity
        if (dl === Infinity && dh === Infinity) { lut[o + k] = 255; k++; continue }
        if (dl <= dh) { lut[o + k] = order[lo]; lo-- } else { lut[o + k] = order[hi]; hi++ }
        k++
      }
    }
  }
}

// ── the shader ──────────────────────────────────────────────────────────────────────────────────────────────
/*
 * HOW A PIXEL FINDS ITS LOUVER.
 *
 * The scene is the reference's: a perspective of P px about the origin O, applied to a plane of louvers. The
 * eye is at (O, P); the pixel is at (x, y, 0). For each candidate louver the ray is taken into the louver's own
 * coordinates by its inverse affine, and met with the face the eye can see (z = ±2.25 there) and with the edge
 * it can see (y = top or top + height). The nearest hit along the ray wins.
 *
 * THE GRADIENT IS ANALYTIC. On a face, local y is e.y + (z0 - e.z)·d.y/d.z with d = A·(pixel - eye), so
 *
 *   ∂y/∂px_k = (z0 - e.z) · (A[1][k]·d.z - d.y·A[2][k]) / d.z²
 *
 * and C2's anti-aliasing, crowding and level of detail are decided from it. A louver turning towards edge-on
 * compresses its three rows into fewer and fewer pixels; the row machinery sees that in the gradient and fuses
 * them into the tone they add up to, exactly as it does for any crowded field on this site.
 *
 * WHICH STATE A PIXEL SHOWS. The base shader chooses between its two states with a sweep driven by uFront. The
 * variant redefines that name to a per-pixel value — 0 on a front face (SURFACE, slot 0), 1 on a back face
 * (DEPTH, slot 1) — so the base program's text is untouched and its choice is simply made per pixel.
 */
const PARS = `
#define CS_MAX ${CS_MAX}
#define CS_HALF ${HALF.toFixed(3)}
uniform highp sampler2D uCSdata;
uniform highp sampler2D uCSlut;
uniform int uCSn;
uniform vec3 uCSeye;          // O.x, O.y, P — in scene px
uniform vec4 uCSscene;        // strip, scene height, width, row spacing
uniform vec4 uCSlutG;         // columns, rows, column step, row step
uniform vec3 uCSgap;          // the ground between the louvers
uniform vec4 uCSatmo;         // atmosphere opacity, light opacity, warm (1) or neutral (0), line glow
uniform vec4 uCSbreak;        // x: 1 = nearest-only gradient break (calibration), y: 1 = no level of detail
float csFront = 0.0;          // which state this pixel shows: 0 the front's, 1 the back's
float csSlat = -10.0;         // the louver it belongs to, so a row of one louver never draws on another
float csKind = 0.0;           // 0 nothing, 1 a face, 2 an edge
float csCov = 0.0;            // how much of the pixel the louvers' FACES cover (the rows are the nearest face's)
float csEdgeT = 0.0, csEdgeCov = 0.0, csEdgeB = 1.0;   // an edge in front of that face, and how much of the pixel it covers
/*
 * ONE STATE, BOTH SIDES — so the rows are asked for once per pixel, not twice.
 *
 * The base program draws two states and asks the row machinery about both wherever the sweep between them is not
 * finished. A louver's front and back are never both visible in one pixel, so the two sides are packed into ONE
 * state instead: its content texture is twice the screen's height, the front's image above and the back's below,
 * and what differs between them — the row thickness, which half is read, the ink, the paper, the ground — is
 * chosen per pixel. The base program's own names are redirected to those choices AFTER the functions that read the
 * real uniforms, so its text is untouched and its second state is simply never asked for (uFront is held at 1).
 */
uniform vec4 uCSface;         // x, y: the front's and the back's row thickness; z, w: the content offset of each half
uniform vec3 uCSink0; uniform vec3 uCSink1; uniform vec3 uCSpap0; uniform vec3 uCSpap1; uniform vec3 uCSbg0; uniform vec3 uCSbg1;
vec4 csR = vec4(0.0); vec4 csK = vec4(0.0); vec3 csInk = vec3(0.0); vec3 csPap = vec3(0.0); vec3 csBg = vec3(0.0);
void csPick() {
  bool f = csFront < 0.5;
  csR = vec4(uR1.xyz, f ? uCSface.x : uCSface.y);
  csK = vec4(uK1.xyz, f ? uCSface.z : uCSface.w);
  csInk = f ? uCSink0 : uCSink1; csPap = f ? uCSpap0 : uCSpap1; csBg = f ? uCSbg0 : uCSbg1;
}
// a pixel no face covers asks the rows nothing at all
float csNone(out float o) { o = 0.0; return 0.0; }
#define uR1 csR
#define uK1 csK
#define uInk1 csInk
#define uPap1 csPap
#define uBg1 csBg
#define uFront 1.0
vec4 csTex(int i, int k) { return texelFetch(uCSdata, ivec2(k, i), 0); }
vec3 csCopper(float g) {
  // R2's copper, shaped like the reference's edge: dark at the corners, the mark in the body, a lit crest
  vec3 dk = vec3(0.235, 0.137, 0.086), mk = vec3(0.722, 0.384, 0.184), lt = vec3(0.831, 0.529, 0.353);
  vec3 c = mix(dk, mk, smoothstep(0.0, 0.34, g));
  c = mix(c, lt, smoothstep(0.34, 0.53, g) * (1.0 - smoothstep(0.53, 0.74, g)));
  c = mix(c, mix(mk, dk, 0.35), smoothstep(0.53, 0.74, g));
  return mix(c, dk, smoothstep(0.74, 1.0, g));
}
`

const WARP = `
  {
    vec2 sp = vec2(p.x, p.y - uCSscene.x);
    vec3 E = uCSeye;
    vec3 d = vec3(sp - E.xy, -E.z);
    int col = clamp(int(floor(p.x / uCSlutG.z + 0.5)), 0, int(uCSlutG.x) - 1);
    int row = clamp(int(floor(sp.y / uCSlutG.w)), 0, int(uCSlutG.y) - 1);
    vec4 cand = texelFetch(uCSlut, ivec2(col, row), 0) * 255.0 + 0.5;
    float faceT = 1e9, edgeT = 1e9; float miss = 1.0;
    float hY = 0.0, hX = 0.0; vec2 hG = vec2(0.0, 1.0);
    for (int k = 0; k < 4; k++) {
      int i = int(k == 0 ? cand.x : k == 1 ? cand.y : k == 2 ? cand.z : cand.w);
      if (i >= uCSn) continue;
      vec4 r0 = csTex(i, 0), r1 = csTex(i, 1), r2 = csTex(i, 2), r3 = csTex(i, 3);
      vec3 e = vec3(dot(r0.xyz, E) + r0.w, dot(r1.xyz, E) + r1.w, dot(r2.xyz, E) + r2.w);
      vec3 dl = vec3(dot(r0.xyz, d), dot(r1.xyz, d), dot(r2.xyz, d));
      float top = r3.x, hl = r3.y;
      // the face the eye can see
      if (r3.z != 0.0 && abs(dl.z) > 1e-7) {
        float z0 = r3.z * CS_HALF;
        float t = (z0 - e.z) / dl.z;
        vec3 h = e + t * dl;
        float q = (z0 - e.z) / (dl.z * dl.z);
        // d(local y)/d(pixel)
        vec2 gy = q * vec2(r1.x * dl.z - dl.y * r2.x, r1.y * dl.z - dl.y * r2.y);
        float gl = max(length(gy), 1e-5);
        // the louver's edge, anti-aliased against the screen: how far inside it this pixel is, in pixels
        float inside = min(h.y - top, top + hl - h.y) / gl;
        float cov = clamp(inside + 0.5, 0.0, 1.0) * step(0.0, h.x) * step(h.x, uCSscene.z);
        if (cov > 0.0) {
          miss *= 1.0 - cov;
          if (t < faceT) {
            faceT = t; csKind = 1.0; csSlat = float(i); csFront = r3.z > 0.0 ? 0.0 : 1.0;
            // the material: the front shows its image upright; the back's is turned over with the louver
            hY = r3.z > 0.0 ? h.y : 2.0 * top + hl - h.y;
            hG = r3.z > 0.0 ? gy : -gy;
            hX = h.x;
          }
        }
      }
      // the edge the eye can see: a band CS_THICK deep, lit copper, at the reference's opacity
      if (r3.w != 0.0 && abs(dl.y) > 1e-7) {
        float y0 = r3.w < 0.0 ? top : top + hl;
        float t = (y0 - e.y) / dl.y;
        vec3 h = e + t * dl;
        float q = (y0 - e.y) / (dl.y * dl.y);
        vec2 gz = q * vec2(r2.x * dl.y - dl.z * r1.x, r2.y * dl.y - dl.z * r1.y);
        float gl = max(length(gz), 1e-5);
        float inside = (CS_HALF - abs(h.z)) / gl;
        float cov = clamp(inside + 0.5, 0.0, 1.0) * step(0.0, h.x) * step(h.x, uCSscene.z);
        if (cov > 0.0 && t < edgeT) {
          vec4 r4 = csTex(i, 4);
          edgeT = t; csEdgeCov = cov * r4.x; csEdgeB = r4.y;
          csEdgeT = clamp((h.z + CS_HALF) / (2.0 * CS_HALF), 0.0, 1.0);
        }
      }
    }
    // an edge counts only where it is in front of the face the rows come from
    if (edgeT > faceT) csEdgeCov = 0.0;
    csCov = 1.0 - miss;
    // rows sit a half row below a louver's top, so the material is offset by half a row; the state's content
    // offset (strip + half a row) puts its image back in register with the screen
    float sY = uCSscene.w;
    m = hY - 0.5 * sY;
    gm = hG;
    cx = hX;
    if (uCSbreak.x > 0.5) gm = vec2(0.0, 1.0);
    csPick();
  }
  // (defined here, after the row machinery's own definition: the name inside the expansion is the real function)
  #define rows(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14) (csKind > 0.5 ? rows(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14) : csNone(a14))
`

const ROW = `
#define VARIANT_ROW(a, r, sol) ((a) * csKeep(r))
float csKeep(float r) { return abs(floor((r + 0.5) / 3.0) - csSlat) < 0.5 ? 1.0 : 0.0; }
`

const COMPOSITE = `
  {
    vec2 sp = vec2(p.x, p.y - uCSscene.x);
    float inScene = step(0.0, sp.y) * step(sp.y, uCSscene.y);
    // the ground between the louvers, and the warm air the reference keeps behind them at the crossing
    vec3 gap = uCSgap;
    vec2 ac = (sp - vec2(0.54 * uCSscene.z, 0.48 * uCSscene.y)) / vec2(0.65 * uCSscene.z, 0.52 * uCSscene.y);
    float air = (1.0 - clamp(length(ac) / 0.68, 0.0, 1.0)) * uCSatmo.x;
    gap = mix(gap, vec3(0.706, 0.47, 0.255), 0.22 * air);
    // front to back: the faces over the ground, then any edge in front of them over that
    vec3 c = mix(gap, col, csKind > 0.5 ? csCov : 0.0);
    c = mix(c, csCopper(csEdgeT) * csEdgeB, csEdgeCov);
    // the light that crosses the field at the crossing: a screen blend, as the reference's
    float lx = dot(sp / vec2(uCSscene.z, uCSscene.y) - 0.5, normalize(vec2(0.966, 0.259))) + 0.5;
    float la = smoothstep(0.18, 0.33, lx) * 0.04 + smoothstep(0.33, 0.49, lx) * (1.0 - smoothstep(0.49, 0.66, lx)) * 0.32;
    vec3 lc = mix(vec3(0.95, 0.95, 0.95), vec3(0.992, 0.792, 0.569), uCSatmo.z);
    c = 1.0 - (1.0 - c) * (1.0 - lc * la * uCSatmo.y);
    col = mix(uCSgap, c, inScene);
    inkAmt = 0.0; ground = 1.0; inkVis = 0.0;
  }
`

export const SLATS_PATCH = { pars: PARS + ROW, warp: WARP, composite: COMPOSITE }
