// THE SURFACE — one fullscreen fragment shader, evolved from original C2's plate renderer.
// Every pixel asks: which row of material is here, what does that row carry, and is material here at all?
//
// Material coordinate m(x, y): where the row passing through this pixel "belongs" at rest.
// Rows are never created or destroyed (CONSERVATION); every map below is monotonic, so rows never cross.
// Where a map compresses, rows crowd and fuse (SATURATION). Where material has left, the canvas is
// transparent and whatever is underneath shows unprocessed (EXPOSURE). Content is sampled at material
// coordinates, so type and image are carried by the rows when they move.
//
// Maps:  OPENING  rows pushed aside around a void (a press, a statement, a pin)
//        GATHER   all material drawn into one band — solid core, rows spreading apart and vanishing at its edges
//        SQUEEZE  the rows under two fingers stay under those fingers; what is between them is compressed
// REGISTRATION: information can be split across the two alternating row sets — each set carries only its own
// fragments, and only in exact register do they meet as one image (and then the rows fill with it).

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const MAXF = 10

const COMPOSE = `#version 300 es
precision mediump float;
uniform sampler2D t0; uniform sampler2D t1; uniform sampler2D t2; uniform sampler2D t3;
uniform vec2 size;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / size;
  o = vec4(texture(t0, uv).r, texture(t1, uv).r, texture(t2, uv).r, texture(t3, uv).r);
}`

const FRAG = `#version 300 es
precision highp float;
precision highp sampler2D;

uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uShiver;
uniform sampler2D uPhys;
uniform vec3 uGrid;
uniform float uFront;
uniform float uOverlay;

// three state slots: 0 = from, 1 = to, 2 = beneath
uniform sampler2D uC0; uniform sampler2D uD0; uniform vec4 uR0; uniform vec4 uK0; uniform vec4 uG0; uniform vec4 uH0; uniform vec4 uM0; uniform vec4 uJ0; uniform vec3 uInk0; uniform vec3 uPap0; uniform float uE0; uniform float uQ0;
uniform sampler2D uC1; uniform sampler2D uD1; uniform vec4 uR1; uniform vec4 uK1; uniform vec4 uG1; uniform vec4 uH1; uniform vec4 uM1; uniform vec4 uJ1; uniform vec3 uInk1; uniform vec3 uPap1; uniform float uE1; uniform float uQ1;
uniform sampler2D uC2; uniform sampler2D uD2; uniform vec4 uR2; uniform vec4 uK2; uniform vec4 uG2; uniform vec4 uH2; uniform vec4 uM2; uniform vec4 uJ2; uniform vec3 uInk2; uniform vec3 uPap2; uniform float uE2; uniform float uQ2;
uniform float uStrip;   // UI strips are a frame the rows press against, never cross
uniform vec3 uBg0; uniform vec3 uBg1; uniform vec3 uBg2;
uniform float uFill;    // 1 = nothing lives under the surface here: its voids are the ground of the face they belong to

// features. kind 0/1 opening: F = cx, cy, h, hw   FG = reach, reachFalloff, lip, lipWidth   FK = kind, power, topSide, bottomSide
//           kind 2 gather:  F = cx, cy, sigma, hw  FG = material half-range                FK = 2, power, strength
//           kind 3 squeeze: F = cx, y1, y2, hw     FG = Y1, Y2 (where those rows started)   FK = 3, power, strength
uniform vec4 uF[${MAXF}]; uniform vec4 uFG[${MAXF}]; uniform vec4 uFK[${MAXF}];
uniform int uNF;
uniform int uBS; uniform int uBN;   // the static openings the beneath face keeps while it is being revealed

uniform vec3 uPen; uniform vec3 uPenCol;
uniform vec3 uInks[12]; uniform float uVisited[12]; uniform float uDevId;

out vec4 outColor;

float waveT(float x, float kind) {
  float s = sin(x);
  if (kind < 0.5) return s;
  if (kind < 1.5) return asin(clamp(s, -1.0, 1.0)) * 0.6366;
  if (kind < 2.5) return clamp(s * 2.6, -1.0, 1.0);
  return 0.62 * s + 0.38 * sin(x * 2.31 + 1.7);
}
float hash(float n) { return fract(sin(n * 12.9898 + 4.1414) * 43758.5453); }

// C: R tone (split: fragments of set 0) · G type (split: fragments of set 1) · B void · A static saturation
// D: R latent image · G work id · B flash map
// R: spacing, freq, wave, thick   K: fuse, total rows, content height, content offset
// G: horizontal registration (set0, set1)   J: vertical registration (set0, set1), split, fill
// H: hold, tone → row weight, set phase, tone amp   M: memory → weight, memory → agitation, flash strength, visibility
// VARIANT_PARS — a variant program inserts its own uniforms and helpers here; the base program has none.
//VARIANT_PARS

/*
 * HOW WIDE A ROW IS ON SCREEN. The base answer is: the width it was given, in screen pixels, wherever it is.
 * That is right for a field that is mapped vertically, which is every state on this site — the rows move, they
 * do not recede. A variant that maps a field in PERSPECTIVE needs the other answer, because a row seen further
 * away is thinner, and one that is not gets wider relative to its neighbours until the field fills in solid.
 */
#ifndef VARIANT_HW
#define VARIANT_HW(h, g, sol) (h)
#endif

/*
 * AND WHETHER CROWDED ROWS CLOSE UP INTO A MASS. On this site they must: rows pressed closer than the eye can
 * part them are seen as what they add up to, never as interference, and that is what a gather is FOR. A
 * perspective variant needs the opposite — rows that recede must stay apart and get thinner, or the far half
 * of the field fills in solid and its vanishing point disappears inside it.
 */
#ifndef VARIANT_FUSE
#define VARIANT_FUSE 1.0
#endif

/*
 * AND WHETHER EVERY ROW IS DRAWN AT ALL.
 *
 * A field's pitch is chosen for what it has to carry — type needs rows close enough that a letter is made of
 * twenty of them. Projected into perspective that same density has nowhere to go: hundreds of rows land inside
 * a few pixels and what they add up to is a wash, with the vanishing point somewhere inside it. A perspective
 * variant may take rows OUT as the map forms, so that what recedes is a countable set of rays.
 *
 * It is given the row's index, so the rows that stay are always the same rows and never slide.
 */
#ifndef VARIANT_ROW
#define VARIANT_ROW(a, r, sol) (a)
#endif

/*
 * HOW MUCH OF A PIXEL A ROW COVERS (R9, docs/IMAGE-QUALITY.md).
 *
 * A row is usually narrower than a pixel, and the pixel takes one sample. The answer used to be a smoothstep across
 * the row's edge, which does not preserve area: the ink a row laid down depended on where its centre fell inside the
 * pixel, and as rows moved that read as shimmer — on a dark ground up to 3x between the best position and the worst.
 * The row (a band 2·hw wide) is integrated against a tent one backing pixel in radius instead. Tents one pixel apart
 * sum to exactly one, so a row lays down the same ink at every position.
 */
float tentCdf(float x, float r) {
  if (x <= -r) return 0.0;
  if (x >= r) return 1.0;
  return x < 0.0 ? 0.5 * (x + r) * (x + r) / (r * r) : 1.0 - 0.5 * (r - x) * (r - x) / (r * r);
}
float cover(float dist, float hw) {
  float r = 1.0 / uDpr;
  return tentCdf(hw - dist, r) - tentCdf(-hw - dist, r);
}

float rows(float x, float m, vec2 gm, sampler2D C, sampler2D D, vec4 R, vec4 K, vec4 G, vec4 H, vec4 M, vec4 J, float E,
           float Q, float oc,
           float dev, float mem, float disturb, out float order) {
  float s = R.x, f = R.y, wt = R.z, th = R.w;
  float rc = floor(m / s + 0.5);
  float ink = 0.0;
  float inkSum = 0.0;   // R19: crowded conserved rows share pixels, so their coverage adds rather than the largest winning
  float t = uTime * 0.35;
  bool split = J.z > 0.5;
  float hwSum = 0.0, gl0 = 1.0;
  for (int k = -1; k <= 1; k++) {
    float r = rc + float(k);
    float vy = r * s;
    float set = mod(r, 2.0);
    float sgn = set - 0.5;
    float offA = mix(G.x, G.y, set) + sgn * disturb;
    float v = (vy + mix(J.x, J.y, set) + K.w) / K.z;
    vec2 uv = vec2((x + offA) / uRes.x, v);
    // out of register the information is unresolved (a coarser level of its own texture); in register it is exact
    vec4 TA = textureLod(C, uv, G.z);
    vec4 TD = (dev > 0.002 || M.z > 0.001) ? textureLod(D, uv, 0.0) : vec4(0.0);
    // voids and static saturation belong to the surface, not to the information: they never misregister or blur
    bool shifted = abs(offA) > 0.01 || abs(mix(J.x, J.y, set)) > 0.01 || G.z > 0.01;
    vec4 TS = shifted ? textureLod(C, vec2(x / uRes.x, (vy + K.w) / K.z), 0.0) : TA;
    float vd = TS.b;
    float info = TA.r, solid = TA.g * H.x;
    if (split) {
      // each row set carries only its own fragments; once in register the rows fill with the whole image
      info = max(set < 0.5 ? TA.r : TA.g, (TA.r + TA.g) * J.w);
      solid = 0.0;
    }
    float tone = max(mix(info, TD.r, dev), mem * M.y * (1.0 - vd));
    float A = tone * H.w * 0.47 * (1.0 - smoothstep(0.2, 0.45, solid)) * (1.0 - vd);
    float y = vy, slope = 0.0;
    if (A > 0.0005) {
      float ph = x * f + r * 2.399 + set * H.z;
      float w = waveT(ph + t, wt);
      float dw = (waveT(ph + t + 0.04, wt) - waveT(ph + t - 0.04, wt)) / 0.08;
      y = vy + A * s * w;
      slope = A * s * f * dw;
    }
    float glen = max(length(vec2(gm.x - slope * gm.y, gm.y)), 1e-4);
    float dist = abs(m - y) / glen;
    float wgain = H.y > 1.01 ? H.y : min(H.w, 1.0);
    float hw = th * (0.5 + tone * 1.15 * wgain);
    hw = mix(hw, s * 0.36, solid);
    hw = max(hw + mem * M.x, 0.0) * (1.0 - vd);
    // the variant is told whether this sample is inside a letter: type and ground are different materials, and
    // a perspective that thins one must not thin the other
    hw = VARIANT_HW(hw, glen, solid);
    // every row gives off the light it did before R9 (rowGain in JS, per state and ratio). A bare row is scaled
    // (G.w). A row a little wider than bare (tone thickens rows on a waving face) is moved by the amount a bare row
    // is; scaled, Creative came out 10% darker. A letter's row is solid in the middle and changed only at its two
    // soft edges, so it is moved by its own amount (E); moved like a bare row, the pale words on a dark ground were
    // visibly bolder. From the one to the other over a pixel and a half.
    { float ref = th * 0.5; hw = hw <= ref ? hw * G.w : mix(hw + (G.w - 1.0) * ref, hw + E, smoothstep(ref, ref + 1.5 / uDpr, hw)); }
    /*
     * R19 PROTOTYPE — THE CAPSULES' COMPRESSION CONSERVES INK (docs/IMAGE-QUALITY.md). An opening pushes the rows
     * aside and they crowd against its rim; each kept its own width, so the ink per pixel rose there and the rim read
     * as a halo. Where a state conserves (Q), a bare row is narrowed by exactly the compression the openings caused
     * (oc), as Linefield's corridor does with its own (lfHw): the ink per area is the field's. Letters keep their
     * width, and only the openings' compression counts — a gather or a squeeze is meant to close rows into a mass.
     * The thin-row fade is taken from the width before this, so the light really is conserved.
     */
    float edgeHw = hw;
    float qk = Q * (1.0 - step(0.2, solid));
    hw *= mix(1.0, 1.0 / max(oc, 1.0), qk);
    // static saturation tapers row by row along its ramp: a clean edge, not a saw
    float rfs = smoothstep(0.15, 0.95, TS.a + 0.04 * sin(r * 0.73));
    // dynamic saturation starts where information is densest: type first, then tone, then bare rows
    float fz = max(K.x, TD.b * M.z);
    float rfd = clamp(fz * 1.9 - (hash(r + 17.0) * 0.45 + (1.0 - solid) * 0.3 + (1.0 - clamp(tone * 2.0, 0.0, 1.0)) * 0.15), 0.0, 1.0);
    float rf = max(rfs, rfd);
    hw = mix(hw, s * 0.8, rf * rf);
    // saturation by crowding: rows pressed closer than the eye can part fuse into one mass (never into interference)
    float spr = s / glen;
    hw = mix(hw, max(hw, 0.62 * spr), smoothstep(2.1, 1.3, spr * uDpr) * step(0.001, hw) * VARIANT_FUSE * (1.0 - qk * smoothstep(1.0, 1.15, oc)));
    float a = cover(dist, hw) * clamp(mix(hw, edgeHw, qk) * 4.0, 0.0, 1.0);
    float keep = VARIANT_ROW(1.0, r, solid);
    a *= keep;
    if (a > ink) ink = a;
    inkSum += a;
    // the same fade the coverage above is given: a conserved row fades as the row it was (R19), or the sum of rows
    // packed closer than a pixel loses ink a second time
    hwSum += hw * clamp(mix(hw, edgeHw, qk) * 4.0, 0.0, 1.0) * keep;
    if (k == 0) gl0 = glen;
  }
  // rows packed closer than the pixel grid can hold are seen as what they add up to — never as interference
  float sp = s / gl0;
  float lod = smoothstep(1.4, 0.7, sp * uDpr);
  ink = mix(ink, min(inkSum, 1.0), Q * smoothstep(1.0, 1.15, oc));
  if (lod > 0.0) ink = mix(ink, clamp(hwSum * 2.0 / (3.0 * sp), 0.0, 1.0), lod);
  float along = clamp(x / uRes.x, 0.0, 1.0);
  if (mod(rc, 2.0) > 0.5) along = 1.0 - along;
  order = (rc + along) / K.y;
  return ink * M.w;
}

float profile(float x, vec4 F, vec4 FK, out float dsdx) {
  float dx = (x - F.x) / F.w;
  if (FK.y == 2.0) { float sx2 = exp(-dx * dx); dsdx = -2.0 * dx * sx2 / F.w; return sx2; }
  float adx = abs(dx);
  float sx = exp(-pow(adx, FK.y));
  dsdx = -sx * FK.y * pow(max(adx, 1e-5), FK.y - 1.0) * sign(dx) / F.w;
  return sx;
}

// an opening: rows pushed aside around a void; returns the void coverage
float opening(float px, vec4 F, vec4 FG, vec4 FK, inout float m, inout vec2 gm, inout float rim) {
  // far from an opening (sideways past its profile, or past the reach of its push, with no lip) it moves nothing
  bool noLip = FG.z < 0.01;
  if (noLip && (F.z < 0.01 || abs(px - F.x) / F.w > (FK.y > 2.5 ? 1.6 : 3.2))) return 0.0;
  float dsdx;
  float sx = profile(px, F, FK, dsdx);
  float h0 = F.z * sx;
  if (h0 < 0.01 && noLip) return 0.0;
  float d = m - F.y;
  float side = d < 0.0 ? FK.z : FK.w;
  float h = h0 * side;
  float ad = abs(d);
  // the push has compact reach: it ends exactly four falloffs past the rim, smoothly, and rows beyond it are untouched
  if (noLip && ad >= h + FG.x + FG.y * 4.0) return 0.0;
  float sg = d < 0.0 ? -1.0 : 1.0;
  float e = max(ad - h, 0.0);
  float lip = FG.z * clamp(h0 / 18.0, 0.0, 1.0);
  // far past the rim of an opening with a lip, the only thing left is the lip's constant shift of every row
  if (!noLip && ad >= h + FG.x + FG.y * 4.0 && e > FG.w * 12.0) { m = F.y + sg * (ad + lip); return 0.0; }
  float dhdx = F.z * dsdx;
  float over = max(ad - h - FG.x, 0.0);
  float u = clamp(1.0 - over / (FG.y * 4.0), 0.0, 1.0);
  float u3 = u * u * u;
  float gg = u3 * u;
  float dgo = over > 0.0 ? h * u3 / FG.y : 0.0;
  float le = exp(-e / FG.w);
  float md = ad - h * gg + lip * (1.0 - le);
  float dmd = 1.0 + dgo + (lip / FG.w) * le;
  float dmh = -gg - dgo - (lip / FG.w) * le;
  float inV = (1.0 - smoothstep(-0.8, 0.8, ad - h)) * smoothstep(0.0, 1.5, h);
  gm = gm * dmd + vec2(sg * dmh * dhdx * side, 0.0);
  m = F.y + sg * md;
  rim = max(rim, le * clamp(h / 20.0, 0.0, 1.0) * (1.0 - inV));
  return inV;
}

/*
 * WHERE INK AND PAPER ARE MIXED (R9): in linear light. Mixed as sRGB values, a thin pale row on a dark ground lost
 * most of its light whenever it fell across two pixels. The result is written back as sRGB, so everything
 * downstream (the sweep between faces, beneath, the pen, the page) sees what it always saw.
 */
vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 shade(vec3 pap, vec3 ink, float a) { return toSrgb(mix(toLin(pap), toLin(ink), a)); }

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec4 P = textureLod(uPhys, (p / uGrid.x + 0.5) / uGrid.yz, 0.0);
  float disp = (P.r - 0.5) * 160.0;
  float dev = P.g;
  float mem = P.b;
  float disturb = P.a * 46.0;

  float m = p.y - disp;
  vec2 gm = vec2(0.0, 1.0);
  float ground = 1.0;    // is there a surface here at all
  float oc = 1.0;        // how much the openings alone have compressed the rows here (R19)
  float inkVis = 1.0;    // can rows still be seen here (sparse rows outlive their ground)
  float beneath = 0.0;
  float rim = 0.0;

  for (int i = 0; i < ${MAXF}; i++) {
    if (i >= uNF) break;
    vec4 F = uF[i]; vec4 FG = uFG[i]; vec4 FK = uFK[i];
    if (FK.x < 1.5) {
      float g0 = length(gm);
      float inV = opening(p.x, F, FG, FK, m, gm, rim);
      oc *= length(gm) / max(g0, 1e-4);
      if (FK.x > 0.5) beneath = max(beneath, inV); else { ground *= 1.0 - inV; inkVis *= 1.0 - inV; }
    } else if (FK.x < 2.5) {
      float dsdx;
      float sx = profile(p.x, F, FK, dsdx);
      float sg = FK.z * sx;
      if (sg < 0.001) continue;
      float d = m - F.y;
      float tn = tanh(d / max(F.z, 1.0));
      float g = F.y + FG.x * tn;
      float dg = FG.x / max(F.z, 1.0) * (1.0 - tn * tn);
      gm = gm * mix(1.0, dg, sg) + vec2((g - m) * FK.z * dsdx, 0.0);
      m = mix(m, g, sg);
      ground *= mix(1.0, smoothstep(0.22, 0.75, dg), sg);
      inkVis *= mix(1.0, smoothstep(0.03, 0.14, dg), sg);
      rim = max(rim, sg * smoothstep(3.0, 8.0, dg) * 0.4);
    } else {
      float dsdx;
      float sx = profile(p.x, F, FK, dsdx);
      float sg = FK.z * sx;
      if (sg < 0.001) continue;
      float y1 = F.y, y2 = max(F.z, F.y + 1.0), Y1 = FG.x, Y2 = FG.y;
      float k = (Y2 - Y1) / (y2 - y1);
      float q = m < y1 ? m + (Y1 - y1) : (m > y2 ? m + (Y2 - y2) : Y1 + (m - y1) * k);
      float dq = (m < y1 || m > y2) ? 1.0 : k;
      gm = gm * mix(1.0, dq, sg) + vec2((q - m) * FK.z * dsdx, 0.0);
      m = mix(m, q, sg);
      rim = max(rim, sg * smoothstep(3.0, 7.0, k) * step(y1, p.y) * step(p.y, y2));
    }
  }
  m += uShiver * rim * sin(p.x * 0.63 + uTime * 71.0) * 2.2;

  /*
   * VARIANT_WARP — where a variant program may replace (p.x, m) with a warped pair.
   *
   * Everything above maps the material coordinate VERTICALLY as a function of (x, m); gm carries that map's
   * gradient, and every judgement further down — anti-aliasing, the fusing of crowded rows, the level of detail
   * — is made from it. A variant that warps both axes must therefore hand back a gradient too, or those
   * judgements are made about a field that is no longer there. fade is what a variant uses to take contrast
   * out where its own map has pushed the rows closer than the screen can hold them apart.
   */
  float fade = 1.0;
  // the coordinate the CONTENT is sampled at. Without a variant it is the screen's own x, which is what every
  // state on the site has always been drawn against; a variant that maps both axes moves it, because the
  // material under a pixel then came from somewhere else across the field as well as up it.
  float cx = p.x;
  //VARIANT_WARP

  float oA, oB, oN;
  float clip = step(uStrip, p.y) * step(p.y, uRes.y - uStrip);
  float iB = rows(cx, m, gm, uC1, uD1, uR1, uK1, uG1, uH1, uM1, uJ1, uE1, uQ1, oc, dev, mem, disturb, oB) * clip;
  float band = 2.5 / uK1.y;
  float b = uOverlay > 0.5 ? 1.0 : clamp((uFront * (1.0 + band) - oB) / band, 0.0, 1.0);
  float iA = 0.0;
  if (b < 1.0 || uOverlay > 0.5) iA = rows(cx, m, gm, uC0, uD0, uR0, uK0, uG0, uH0, uM0, uJ0, uE0, uQ0, oc, dev, mem, disturb, oA) * clip;
  // the variant's fade applies to the ROWS, before the paper is coloured by them: applied later it would have
  // thinned only the rows standing over exposed ground and left the ink on the paper at full strength
  iA *= fade; iB *= fade;

  vec3 inkB = uInk1;
  // ids are exact: fetched, never filtered (a filtered edge between two ids invents a third)
  ivec2 ts1 = textureSize(uD1, 0);
  vec4 Dd = texelFetch(uD1, clamp(ivec2(vec2(p.x / uRes.x, (m + uK1.w) / uK1.z) * vec2(ts1)), ivec2(0), ts1 - 1), 0);
  int id = int(floor(Dd.g * 255.0 + 0.5)) - 1;
  // a visited work keeps its ink; a state that exists to show history (rest) shows it at full strength
  if (id >= 0 && id < 12) inkB = mix(inkB, uInks[id], clamp((abs(float(id) - uDevId) < 0.5 ? dev * 1.4 : 0.0) + uVisited[id] * (0.6 + 0.4 * min(uM1.z, 1.0)), 0.0, 1.0));
  vec3 inkA = uInk0;
  if (uOverlay > 0.5) {
    ivec2 ts0 = textureSize(uD0, 0);
    vec4 Da = texelFetch(uD0, clamp(ivec2(vec2(p.x / uRes.x, (m + uK0.w) / uK0.z) * vec2(ts0)), ivec2(0), ts0 - 1), 0);
    int ida = int(floor(Da.g * 255.0 + 0.5)) - 1;
    if (ida >= 0 && ida < 12) inkA = mix(inkA, uInks[ida], clamp((abs(float(ida) - uDevId) < 0.5 ? dev * 1.4 : 0.0) + uVisited[ida] * 0.6, 0.0, 1.0));
  }

  float inkAmt; vec3 inkCol; vec3 col; vec3 bgc = uBg1;
  if (uOverlay > 0.5) {
    inkAmt = max(iA, iB);
    inkCol = iA > iB ? inkA : inkB;
    col = shade(uPap1, inkCol, inkAmt);
  } else {
    inkAmt = mix(iA, iB, b);
    inkCol = mix(inkA, inkB, b);
    col = mix(shade(uPap0, inkA, iA), shade(uPap1, inkB, iB), b);
    bgc = mix(uBg0, uBg1, b);
  }

  if (beneath > 0.001) {
    // the face underneath keeps its own composition while it is revealed, so nothing pops when it takes over
    float mb = p.y; vec2 gb = vec2(0.0, 1.0); float groundN = 1.0; float rimN = 0.0; float ocN = 1.0;
    for (int i = 0; i < ${MAXF}; i++) {
      if (i < uBS) continue;
      if (i >= uBS + uBN) break;
      if (uFK[i].x > 0.5) continue;
      float gb0 = length(gb);
      float inV = opening(p.x, uF[i], uFG[i], uFK[i], mb, gb, rimN);
      ocN *= length(gb) / max(gb0, 1e-4);
      groundN *= 1.0 - inV;
    }
    float iN = rows(p.x, mb, gb, uC2, uD2, uR2, uK2, uG2, uH2, uM2, uJ2, uE2, uQ2, ocN, 0.0, 0.0, 0.0, oN) * clip;
    col = mix(col, shade(uPap2, uInk2, iN), beneath);
    ground = mix(ground, groundN, beneath);
    inkVis *= 1.0 - beneath;
    bgc = mix(bgc, uBg2, beneath);
  }

  float pd = length(p - uPen.xy);
  col = mix(col, uPenCol, uPen.z * (1.0 - smoothstep(2.6, 3.8, pd)));
  col = mix(col, uPenCol, uPen.z * 0.5 * (1.0 - smoothstep(0.5, 1.3, abs(pd - 11.0))));

  // where the ground has gone, only the rows that are still there remain, over whatever is underneath
  /*
   * VARIANT_COMPOSITE — the last word. A variant that has to draw something the row machinery cannot express
   * gets it here, with the shaded field, its colour and its coverage all in scope.
   */
  //VARIANT_COMPOSITE

  float loose = inkAmt * inkVis * (1.0 - ground);
  float al = ground + loose;
  outColor = vec4(col * ground + inkCol * loose + bgc * (1.0 - al) * uFill, al + (1.0 - al) * uFill);
}`

const hex = (h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255)
export { hex }

/*
 * THE BRIGHTNESS A GROUND KEEPS (R9, docs/IMAGE-QUALITY.md).
 *
 * Integrating rows against a tent and mixing in linear light (the shader, above) makes rows even; on its own it would
 * also change how bright a field looks: pale rows on a dark ground about half as bright again, dark rows on cream
 * lighter. So each state's bare rows are scaled until the ground gives off the light it gave off before — per state,
 * at the current ratio. `rowGain` returns two numbers: k, the scale for a bare row (uG.w), and e, how far a letter's
 * row is widened or narrowed at its edges (uE), because a solid row changes only at its edges.
 *
 * BEFORE MEANS AT THE POSITIONS THE ROWS ACTUALLY SIT AT. Before R9 a row's light depended on where it fell inside a
 * pixel, so "how bright the ground was" depends on the screen. A still field's rows sit at positions fixed by its
 * pitch and the ratio — at ratio 1 a 7 px field is all at one position, at 1.5 it alternates between two — and the
 * eye knew the ground at those. Matching the average over every position left Linefield's dark half 8% darker than
 * it was at ratios 1 and 1.5 (measured; at 1.25 and 1.333 it matched to 2%), so a still state is matched at its own
 * positions. A waving state's rows travel through every position, so for it the average is the brightness.
 * tools/diag/iqr9.cjs checks the result.
 */
const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }
const lin1 = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const lumLin = (c) => 0.2126 * lin1(c[0]) + 0.7152 * lin1(c[1]) + 0.0722 * lin1(c[2])
const EVERY = Array.from({ length: 32 }, (_, i) => i / 32 - 0.5)

/*
 * R19 PROTOTYPE — WHICH FACES CONSERVE INK AT THE CAPSULES (docs/IMAGE-QUALITY.md). For the user's comparison:
 *
 *   ?r19=system   Full-Stack only
 *   ?r19=both     Full-Stack and Creative (they share one composition, so one may want what the other has)
 *   ?r19=off      neither (clears the choice)
 *
 * Without the key nothing changes. Kept for the tab, like the R9 prototype was; a badge names the choice.
 */
const R19_MODES = { system: 1, both: 2 }
let r19 = null
export function r19Mode() {
  if (r19 != null) return r19
  try {
    const q = new URLSearchParams(location.search).get('r19')
    if (q === 'off') sessionStorage.removeItem('r19')
    else if (q && R19_MODES[q]) sessionStorage.setItem('r19', q)
    r19 = R19_MODES[sessionStorage.getItem('r19')] || 0
  } catch { r19 = 0 }
  return r19
}
/** 1 where this state's rows conserve ink at its openings, 0 where they keep their width */
export function conserves(st) {
  const m = r19Mode()
  if (!m || !st) return 0
  return st.id === 'system' || (m === 2 && st.id === 'creative') ? 1 : 0
}
// the physics field at rest stores 127 of 255, so every row sits this far from its material position (physics.js)
const REST_DISP = (127 / 255 - 0.5) * 160
/**
 * where a still field's rows fall inside their pixels: the offset of each row's centre from a pixel centre, merged —
 * the offsets repeat with the pitch, so a few dozen distinct ones carry every row, each with its count
 */
function stillPhases(st, R, H, Hb) {
  const seen = new Map()
  const n = Math.min(400, Math.ceil(H / st.spacing))
  for (let r = 0; r < n; r++) {
    const ic = (r * st.spacing + REST_DISP) * R + (Hb - H * R) - 0.5
    const ph = Math.round((ic - Math.round(ic)) * 256) / 256
    seen.set(ph, (seen.get(ph) || 0) + 1)
  }
  return [...seen]
}
const EVERY_W = EVERY.map((ph) => [ph, 1])
/** the light one bare row gave off BEFORE R9 (smoothstep edge, mixed as sRGB), averaged over weighted positions */
function lightBefore(hw, R, ink, pap, phases) {
  const gp = lumLin(pap)
  const edge = Math.min(1, Math.max(0, hw * 4))
  let s = 0, n = 0
  for (const [ph, w] of phases) {
    for (let j = -4; j <= 4; j++) {
      const a = sstep(hw + 0.75 / R, hw - 0.75 / R, Math.abs(j - ph) / R) * edge
      if (!a) continue
      s += w * Math.abs(lumLin([0, 1, 2].map((k) => pap[k] + (ink[k] - pap[k]) * a)) - gp)
    }
    n += w
  }
  return s / n
}
/**
 * the half width that gives off `light` NOW. With the tent and linear mixing it needs no search: tents a pixel apart
 * sum to one, so a row's coverage adds up to its width, 2·hw·R pixels, at any position, and its light is that times the
 * ink-paper contrast in linear light — times the thin-row fade (4·hw) below a quarter.
 */
function widthFor(light, R, dL) {
  const h = light / (2 * R * dL)
  return h >= 0.25 ? h : Math.sqrt(light / (8 * R * dL))
}
/**
 * `waving` says whether the state's rows travel through every position. By default it is read from the state as it
 * is drawn; the reduced-motion renderer passes the state's normal-motion answer, so the two modes match (flat.js).
 *
 * It costs a few hundred evaluations, once per state and ratio, and surface.warm() pays it in idle time — the first
 * version searched for both numbers and took long enough to show as a long task the first time a state was drawn.
 */
export function rowGain(st, R, H, Hb, waving = st.amp * (st.ampK ?? 1) > 0.001) {
  const still = !waving
  const key = R + '|' + H + '|' + Hb + '|' + still
  if (st._gain && st._gain.key === key) return st._gain
  const ref = 0.5 * st.thick
  const phases = still ? stillPhases(st, R, H, Hb) : EVERY_W
  const dL = Math.abs(lumLin(st.ink) - lumLin(st.paper)) || 1e-6
  // a bare row: scaled; a letter's row (two backing pixels wider, solid in the middle): moved at its edges
  const k = Math.min(3, Math.max(0.2, widthFor(lightBefore(ref, R, st.ink, st.paper, phases), R, dL) / ref))
  const thickHw = ref + 2 / R
  const e = Math.min(1.5 / R, Math.max(-1.5 / R, widthFor(lightBefore(thickHw, R, st.ink, st.paper, phases), R, dL) - thickHw))
  st._gain = { key, k, e }
  return st._gain
}

export function createSurface(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' })
  if (!gl) throw new Error('WebGL2 unavailable')
  // shaders compile off the main thread where the browser allows it (KHR_parallel_shader_compile): nothing asks for a
  // compile or link status until that work is done, so the page never freezes waiting for it
  const par = gl.getExtension('KHR_parallel_shader_compile')
  const shaders = []
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); shaders.push(s); return s }
  const link = (vs, fs) => {
    const p = gl.createProgram()
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs))
    gl.bindAttribLocation(p, 0, 'aPos')
    gl.linkProgram(p)
    return p
  }
  const prog = link(VERT, FRAG)
  const cprog = link(VERT, COMPOSE)
  if (r19Mode() && typeof document !== 'undefined') {
    const tag = document.createElement('div')
    tag.textContent = r19Mode() === 2 ? 'R19 BOTH' : 'R19 FULL-STACK'
    tag.setAttribute('aria-hidden', 'true')
    tag.style.cssText = 'position:fixed;right:6px;top:6px;z-index:2147483647;font:600 11px/1 ui-monospace,monospace;padding:3px 5px;background:#1f6f43;color:#fff;pointer-events:none'
    document.body.appendChild(tag)
  }
  /*
   * VARIANTS — the same shader with one hook filled in.
   *
   * A feature that needs the field mapped differently supplies the two chunks that fill
   * VARIANT_PARS and VARIANT_WARP, and gets its own linked program built from the same source as everything else. Two
   * reasons it is done this way rather than by branching inside the one program:
   *
   *   the base program pays nothing — not a uniform, not a branch, not a line of the variant's GLSL;
   *   and the variant's source arrives from a module that is only imported when its build flag is on, so a
   *   build with the flag off has no text to strip out and nothing to find.
   *
   * Linking is deferred to the first use, off the main thread where the driver allows it, exactly as the base
   * program's is.
   */
  const variants = new Map()
  /*
   * AND THE MECHANISM ITSELF IS BEHIND THE FLAG.
   *
   * __LINEFIELD__ is replaced at transform time. With it false these methods are never installed, the Map is
   * never touched, and what is left of this file behaves exactly as it did before the feature existed — which
   * is the thing the flag-off comparison against `pre-linefield` actually asserts.
   */
  // (and the same for every other feature that brings a variant: the mechanism exists if any of them is on)
  const VARIANTS_ON = (typeof __LINEFIELD__ !== 'undefined' && __LINEFIELD__) || (typeof __CROSS__ !== 'undefined' && __CROSS__)
  const ready = new Promise((resolve, reject) => {
    const check = () => {
      if (par && ![prog, cprog].every((p) => gl.getProgramParameter(p, par.COMPLETION_STATUS_KHR))) { requestAnimationFrame(check); return }
      for (const p of [prog, cprog]) {
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { reject(new Error(`${gl.getProgramInfoLog(p)}\n${shaders.map((s) => gl.getShaderInfoLog(s)).filter(Boolean).join('\n')}`)); return }
      }
      gl.useProgram(prog)
      resolve()
    }
    check()
  })
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)   // aPos is bound to location 0 in both programs
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  /*
   * Uniform locations are per PROGRAM, so the cache is too. Keyed on the base program this was a plain object;
   * with a variant in play, a location looked up against one program and used against another is a silent
   * wrong-uniform bug, which is the kind that renders something plausible.
   */
  let active = prog
  const locs = new Map([[prog, {}]])
  const L = (n) => {
    const c = locs.get(active)
    return (c[n] ??= gl.getUniformLocation(active, n))
  }

  const makeTex = (img) => {
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, img.tw, img.th, 0, gl.RGBA, gl.UNSIGNED_BYTE, img.data)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }
  // A state's content is drawn as separate grey canvases (tone, type, voids, saturation…). They are uploaded as they
  // are and packed into one RGBA texture on the GPU — no pixel readback, no per-byte merge on the main thread.
  const CL = (n) => gl.getUniformLocation(cprog, n)
  const compose = (img) => {
    const chans = img.draw()
    const { tw, th } = img
    const dst = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, dst)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, img.mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dst, 0)
    gl.viewport(0, 0, tw, th)
    gl.useProgram(cprog)
    const tmp = []
    for (let i = 0; i < 4; i++) {
      gl.activeTexture(gl.TEXTURE0 + i)
      if (chans[i]) {
        const t = gl.createTexture(); tmp.push(t)
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, chans[i])
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      } else gl.bindTexture(gl.TEXTURE_2D, blankTex)
      gl.uniform1i(CL(`t${i}`), i)
    }
    gl.uniform2f(CL('size'), tw, th)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.deleteFramebuffer(fbo)
    tmp.forEach((t) => gl.deleteTexture(t))
    if (img.mips) { gl.bindTexture(gl.TEXTURE_2D, dst); gl.generateMipmap(gl.TEXTURE_2D) }
    gl.useProgram(active)
    gl.viewport(0, 0, canvas.width, canvas.height)
    return dst
  }
  const blankTex = makeTex({ data: new Uint8Array(4), tw: 1, th: 1 })
  const texOf = (img) => (img.tex ??= img.draw ? compose(img) : makeTex(img))

  let physTex = null, physW = 0, physH = 0
  const W = { w: 1, h: 1, dpr: 1 }
  const slots = [null, null, null]
  let front = 1
  const F = new Float32Array(MAXF * 4), FG = new Float32Array(MAXF * 4), FK = new Float32Array(MAXF * 4)

  const api = {
    gl, MAXF, ready,
    /**
     * Register a variant. `patch` is { pars, warp } — GLSL that fills the two hooks. Linking happens here, so
     * the caller decides when to pay for it; `use(null)` returns to the base program.
     */
    variant(name, patch) {
      if (!VARIANTS_ON || variants.has(name)) return
      const src = FRAG
        .replace('//VARIANT_PARS', patch.pars || '')
        .replace('//VARIANT_WARP', patch.warp || '')
        .replace('//VARIANT_COMPOSITE', patch.composite || '')
      const p2 = link(VERT, src)
      locs.set(p2, {})
      const rec = { prog: p2, linked: false }
      rec.ready = new Promise((resolve, reject) => {
        const check = () => {
          if (par && !gl.getProgramParameter(p2, par.COMPLETION_STATUS_KHR)) { requestAnimationFrame(check); return }
          if (!gl.getProgramParameter(p2, gl.LINK_STATUS)) { reject(new Error(gl.getProgramInfoLog(p2))); return }
          rec.linked = true
          resolve()
        }
        check()
      })
      variants.set(name, rec)
      return variants.get(name).ready
    },
    /*
     * SWITCHING PROGRAMS BINDS THE PROGRAM, and that is not a detail.
     *
     * `active` decides which program's uniform-location cache is used, and GL decides which program a uniform
     * is actually written to. Setting `active` without binding leaves the two disagreeing for the rest of the
     * frame, and anything that writes a uniform before the next draw — phys() writes uGrid every frame — is
     * refused with "location not for current program" and silently does nothing. The driver logged it; the
     * value was simply lost.
     *
     * And a variant is not used until it has linked. Linking is deferred and off the main thread, so between
     * the first use() and the link completing there would be nothing legal to bind; the base program draws
     * those frames, which is what it did before the variant existed.
     */
    use(name) {
      if (!VARIANTS_ON) return
      const v = name ? variants.get(name) : null
      const next = v && v.linked ? v.prog : prog
      if (next === active) return
      active = next
      gl.useProgram(active)
    },
    usingVariant: () => active !== prog,
    /** set a mat3 on whichever program is active — variants carry uniforms the base program does not have */
    mat3(name, m) { const l = L(name); if (l) gl.uniformMatrix3fv(l, false, m) },
    float(name, v) { const l = L(name); if (l) gl.uniform1f(l, v) },
    vec4(name, a2, b2, c2, d2) { const l = L(name); if (l) gl.uniform4f(l, a2, b2, c2, d2) },
    vec3(name, v) { const l = L(name); if (l) gl.uniform3fv(l, v) },
    vec2(name, a2, b2) { const l = L(name); if (l) gl.uniform2f(l, a2, b2) },
    time: 0, shiver: 0, strip: 0, devId: -1, overlay: 0, beneathStart: 0, beneathCount: 0, fill: 1,
    pen: [-99, -99, 0], penCol: [0, 0, 0], onBeforeDraw: null,
    inks: new Float32Array(36), visited: new Float32Array(12),
    features: [],
    resize(w, h, dpr) {
      W.w = w; W.h = h; W.dpr = dpr
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    },
    phys(P) {
      if (!physTex || physW !== P.cols || physH !== P.rows) {
        if (physTex) gl.deleteTexture(physTex)
        physTex = makeTex({ data: P.data, tw: P.cols, th: P.rows }); physW = P.cols; physH = P.rows
      } else {
        gl.bindTexture(gl.TEXTURE_2D, physTex)
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, P.cols, P.rows, gl.RGBA, gl.UNSIGNED_BYTE, P.data)
      }
      gl.uniform3f(L('uGrid'), P.cell, P.cols, P.rows)
    },
    pair(a, b, f) { slots[0] = a; slots[1] = b; front = f },
    beneath(n) { slots[2] = n },
    clear() { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT) },
    // build a state's textures now (in idle time) rather than on the frame it is first shown
    warm(st) { if (st) { texOf(st.c); texOf(st.d); rowGain(st, W.dpr, W.h, canvas.height) } },
    // diagnostics: read back a few texels of a state's content texture
    probe(st, pts = [[0.5, 0.5], [0.2, 0.3], [0.5, 0.01]]) {
      const tex = texOf(st.c), { tw, th } = st.c
      const fbo = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
      const px = new Uint8Array(4)
      const out = pts.map(([u, v]) => { gl.readPixels(Math.floor(u * tw), Math.floor(v * th), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [...px] })
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fbo)
      return { status, err: gl.getError(), draw: !!st.c.draw, out }
    },
    release(st) {
      for (const img of [st?.c, st?.d]) if (img?.tex && !img.shared) { gl.deleteTexture(img.tex); img.tex = null }
    },
    render() {
      // build any missing texture first: composing changes texture units and the program, so it must never happen mid-binding
      for (let i = 0; i < 3; i++) { const st = slots[i] || slots[1]; texOf(st.c); texOf(st.d) }
      gl.useProgram(active)
      gl.uniform2f(L('uRes'), W.w, W.h)
      gl.uniform1f(L('uDpr'), W.dpr)
      gl.uniform1f(L('uTime'), api.time)
      gl.uniform1f(L('uShiver'), api.shiver)
      gl.uniform1f(L('uFront'), front)
      gl.uniform1f(L('uOverlay'), api.overlay)
      gl.uniform1f(L('uStrip'), api.strip)
      gl.uniform1f(L('uFill'), api.fill)
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, physTex); gl.uniform1i(L('uPhys'), 0)
      for (let i = 0; i < 3; i++) {
        const st = slots[i] || slots[1]
        gl.activeTexture(gl.TEXTURE1 + i * 2); gl.bindTexture(gl.TEXTURE_2D, texOf(st.c)); gl.uniform1i(L(`uC${i}`), 1 + i * 2)
        gl.activeTexture(gl.TEXTURE2 + i * 2); gl.bindTexture(gl.TEXTURE_2D, texOf(st.d)); gl.uniform1i(L(`uD${i}`), 2 + i * 2)
        const r = st.reg
        gl.uniform4f(L(`uR${i}`), st.spacing, st.freq, st.wave, st.thick)
        gl.uniform4f(L(`uK${i}`), st.fuse, st.total, st.texH, st.offY)
        const gain = rowGain(st, W.dpr, W.h, canvas.height)
        gl.uniform4f(L(`uG${i}`), r.a0, r.a1, st.lod ?? 0, gain.k)
        gl.uniform1f(L(`uE${i}`), gain.e)
        gl.uniform1f(L(`uQ${i}`), conserves(st))
        gl.uniform4f(L(`uJ${i}`), r.va0, r.va1, st.split ? 1 : 0, st.fill ?? 0)
        gl.uniform4f(L(`uH${i}`), r.holdA, st.toneThick ?? 1, r.phase, st.amp * (st.ampK ?? 1))
        gl.uniform4f(L(`uM${i}`), st.memThick ?? 0.5, st.memTone ?? 0.1, st.flash ?? 0, st.vis ?? 1)
        gl.uniform3fv(L(`uInk${i}`), st.ink)
        gl.uniform3fv(L(`uPap${i}`), st.paper)
        gl.uniform3fv(L(`uBg${i}`), st.bgv || st.paper)
      }
      const fs = api.features.slice(0, MAXF)
      F.fill(0); FG.fill(0); FK.fill(0)
      fs.forEach((f, i) => {
        const o = i * 4
        if (f.kind === 2) {
          F.set([f.cx, f.cy, Math.max(1, f.sigma), Math.max(1, f.hw)], o); FG.set([f.Lm, 0, 0, 0], o); FK.set([2, f.power, f.s, 0], o)
        } else if (f.kind === 3) {
          F.set([f.cx, f.y1, f.y2, Math.max(1, f.hw)], o); FG.set([f.Y1, f.Y2, 0, 0], o); FK.set([3, f.power, f.s, 0], o)
        } else {
          F.set([f.cx, f.cy, Math.max(0, f.h), Math.max(1, f.hw)], o)
          FG.set([f.reach, Math.max(1, f.falloff), f.lip, Math.max(1, f.lipW)], o)
          FK.set([f.kind, f.power, f.top, f.bottom], o)
        }
      })
      gl.uniform4fv(L('uF[0]'), F); gl.uniform4fv(L('uFG[0]'), FG); gl.uniform4fv(L('uFK[0]'), FK)
      gl.uniform1i(L('uNF'), fs.length)
      gl.uniform1i(L('uBS'), api.beneathStart)
      gl.uniform1i(L('uBN'), api.beneathCount)
      gl.uniform3fv(L('uPen'), api.pen)
      gl.uniform3fv(L('uPenCol'), api.penCol)
      gl.uniform3fv(L('uInks[0]'), api.inks)
      gl.uniform1fv(L('uVisited[0]'), api.visited)
      gl.uniform1f(L('uDevId'), api.devId)
      // a variant sets its own uniforms here: the program is bound and every base uniform is in place, and it
      // is still one draw. Setting them around render() instead meant rendering twice, which is both wasteful
      // and a lie to anything measuring how long a frame takes.
      if (VARIANTS_ON) api.onBeforeDraw?.()
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
  }
  return api
}

// a parting of the material. defaults describe a local press; callers override for releases and windows.
export function feature(o = {}) {
  return { cx: 0, cy: 0, h: 0, hw: 200, reach: 0, falloff: 30, lip: 0, lipW: 8, kind: 0, power: 2, top: 1, bottom: 1, ...o }
}
// all material drawn into one band
export function gather(o = {}) {
  return { kind: 2, cx: 0, cy: 0, sigma: 100, Lm: 400, hw: 1e5, power: 2, s: 1, ...o }
}
// two fingers holding two rows
export function squeeze(o = {}) {
  return { kind: 3, cx: 0, y1: 0, y2: 1, Y1: 0, Y2: 1, hw: 260, power: 2, s: 1, ...o }
}
