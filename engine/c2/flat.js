// THE FLAT SURFACE — the same material, drawn directly in 2D, for reduced motion.
//
// Reduced motion has no transitions to show, so nothing here samples one: every destination is drawn at rest,
// once, from the same canonical state objects the WebGL surface is given (states.js masks, the same features,
// the same spacing / thickness / ink). It is the renderer that changes, not the composition.
//
// It is a direct renderer, not a copy of a WebGL frame: the pixels the visitor sees are produced by this file's
// fillRect calls. Reduced motion therefore has no WebGL presentation step at all, so a frame that WebKit declines
// to present cannot leave the visitor looking at an old picture.
//
// It is the static-first hero plate (main.js paintStaticHero, POST-M5 PERF) generalised: the same row loop, the
// same masks, the same sub-texel taper — extended with the material map so that a state's openings (the About
// room, a face's blocks, the Lab caption, the rest wedge, a project's rooms) move the rows exactly as the
// shader's opening() does.
//
// At rest the shader's per-pixel work collapses:
//   physics is still            → disp = dev = mem = disturb = 0
//   the ambient amplitude is 0  → every row lies straight (reduced motion sets ampK = 0 on the index states)
//   nothing is in flight        → one state, front 0 or 1, no overlay, no pen, no shiver
// so a row's screen position is where the material map puts it, and its half-thickness is the shader's own hw.
// What is deliberately not drawn here: the ambient wave, the pen, the shiver, the crossfade between two states,
// the press reveal and the physics imprint — all of them are motion, and reduced motion asks for none of it.

import { rowGain, conserves } from './surface.js'

const MAXF = 10
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t) }

// ─── the material map ────────────────────────────────────────────────────────
// surface.js opening(), in JS and without the parts that only matter while something moves.
// Returns the material coordinate for a screen y, and carries the stretch and the void coverage with it.
function applyOpening(px, f, st) {
  const noLip = !(f.lip > 0.01)
  const hwF = Math.max(1, f.hw)
  const power = f.power ?? 2
  if (noLip && (!(f.h > 0.01) || Math.abs(px - f.cx) / hwF > (power > 2.5 ? 1.6 : 3.2))) return 0
  const dx = (px - f.cx) / hwF
  const adx = Math.abs(dx)
  const sx = Math.exp(-Math.pow(adx, power))
  const h0 = Math.max(0, f.h) * sx
  if (h0 < 0.01 && noLip) return 0
  const d = st.m - f.cy
  const side = d < 0 ? (f.top ?? 1) : (f.bottom ?? 1)
  const h = h0 * side
  const ad = Math.abs(d)
  const reach = f.reach ?? 0, fall = Math.max(1, f.falloff ?? 30), lipW = Math.max(1, f.lipW ?? 8)
  if (noLip && ad >= h + reach + fall * 4) return 0
  const sg = d < 0 ? -1 : 1
  const e = Math.max(ad - h, 0)
  const lip = (f.lip ?? 0) * clamp(h0 / 18, 0, 1)
  if (!noLip && ad >= h + reach + fall * 4 && e > lipW * 12) { st.m = f.cy + sg * (ad + lip); return 0 }
  const over = Math.max(ad - h - reach, 0)
  const u = clamp(1 - over / (fall * 4), 0, 1)
  const u3 = u * u * u
  const gg = u3 * u
  const dgo = over > 0 ? (h * u3) / fall : 0
  const le = Math.exp(-e / lipW)
  const md = ad - h * gg + lip * (1 - le)
  const dmd = 1 + dgo + (lip / lipW) * le
  const inV = (1 - smoothstep(-0.8, 0.8, ad - h)) * smoothstep(0, 1.5, h)
  st.g *= dmd
  st.m = f.cy + sg * md
  return inV
}
// a gather: all material drawn into one band (the opening and the intro use it; at rest only a Lab pin can)
function applyGather(px, f, st) {
  const hwF = Math.max(1, f.hw)
  const dx = (px - f.cx) / hwF
  const sx = Math.exp(-dx * dx)
  const sg = (f.s ?? 1) * sx
  if (sg < 0.001) return
  const sigma = Math.max(1, f.sigma)
  const d = st.m - f.cy
  const tn = Math.tanh(d / sigma)
  const g = f.cy + f.Lm * tn
  const dg = (f.Lm / sigma) * (1 - tn * tn)
  st.g *= 1 + (dg - 1) * sg
  st.m = st.m + (g - st.m) * sg
  st.ground *= 1 + (smoothstep(0.22, 0.75, dg) - 1) * sg
}

// A state's masks are drawn once and read back once; they die with the state (a resize rebuilds every state).
// Only one byte of each channel carries anything, so the readback is compacted to one plane per channel — a
// quarter of the RGBA it arrives as — and a channel a state never draws into is dropped rather than stored.
function masksOf(st) {
  if (st.c._flat !== undefined) return st.c._flat
  if (!st.c.draw) return (st.c._flat = null)
  const [tone, solid, voids, fuse] = st.c.draw()
  const { tw, th } = st.c
  const read = (cv) => {
    if (!cv) return null
    const d = cv.getContext('2d').getImageData(0, 0, tw, th).data
    const out = new Uint8Array(tw * th)
    let any = 0
    for (let i = 0, j = 0; j < out.length; i += 4, j++) { const v = d[i]; out[j] = v; any |= v }
    return any ? out : null
  }
  return (st.c._flat = { tw, th, tone: read(tone), solid: read(solid), voids: read(voids), fuse: read(fuse) })
}
// the masks are drawn at texture resolution: sampled the way the shader samples them, bilinear on the row centres
function bilinear(D, tw, th, fy, fx) {
  if (!D) return 0
  const y0 = clamp(Math.floor(fy), 0, th - 1), y1 = Math.min(th - 1, y0 + 1), ky = clamp(fy - y0, 0, 1)
  const x0 = clamp(Math.floor(fx), 0, tw - 1), x1 = Math.min(tw - 1, x0 + 1), kx = clamp(fx - x0, 0, 1)
  const a = D[y0 * tw + x0] * (1 - kx) + D[y0 * tw + x1] * kx
  const b = D[y1 * tw + x0] * (1 - kx) + D[y1 * tw + x1] * kx
  return (a * (1 - ky) + b * ky) / 255
}

// ─── one state, at rest, in 2D ───────────────────────────────────────────────
// The single drawing primitive: the reduced-motion surface and the software renderer's static hero plate are
// both this call. `amp` is the tone gain the rows carry (the shader's ambient amplitude, 0 at rest).
export function paintFlat(ctx, st, o) {
  const { W: Wd, H: Hd, dpr, strip = 0, features = [], fill = 1, mask = null } = o
  const amp = o.amp ?? st.amp * (st.ampK ?? 1)
  const M = masksOf(st)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, Math.round(Wd * dpr), Math.round(Hd * dpr))
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // the ground: the page's own colour behind everything, the state's paper where material lies
  if (fill) { ctx.fillStyle = st.bg; ctx.fillRect(0, 0, Wd, Hd) }
  ctx.fillStyle = st.paperHex
  ctx.fillRect(0, 0, Wd, Hd)

  const s = st.spacing, thick = st.thick, texH = st.texH, offY = st.offY || 0
  const split = !!st.split, fillK = st.fill ?? 0, holdA = st.reg?.holdA ?? 1
  /*
   * TONE THICKENS A ROW IN REDUCED MOTION TOO (R29, 2026-10-05). The shader takes a row's tone weight from the
   * ambient amplitude, and reduced motion stops that amplitude (ampK = 0) — which was right for the wave and wrong
   * for the weight: Full-Stack came out 14% lighter than in normal motion at DPR 1, Creative 6–9%. The reduced
   * renderer passes `toneAmp`, the amplitude the state was made with; the rows still lie straight.
   */
  const wgain = (st.toneThick ?? 1) > 1.01 ? (st.toneThick ?? 1) : Math.min(o.toneAmp ?? amp, 1)
  const tw = M?.tw ?? 2, th = M?.th ?? 2
  const sub = Wd < 700 ? 3 : 2
  const cols = Math.max(8, Math.round(tw * sub)), cw = Wd / cols

  // the material map is smooth across the screen (every profile falls off over tens of pixels), so it is
  // solved on a coarse grid of columns and read between them; the masks are still sampled column by column
  const fs = features.slice(0, MAXF).filter((f) => f && (f.kind === 0 || f.kind === 2 || f.kind == null))
  const XN = fs.length ? 96 : 1
  const step = Math.max(0.75, s / 3)
  const rowsN = Math.ceil(Hd / s) + 2
  const Ys = new Float32Array(XN * rowsN).fill(-1e4)
  const Gs = new Float32Array(XN * rowsN).fill(1)
  // every run of void down each column: a column can cross more than one opening (two rooms stacked on a phone),
  // and the material between them is still there
  const voids = Array.from({ length: XN }, () => [])
  for (let ix = 0; ix < XN; ix++) {
    const px = XN === 1 ? Wd / 2 : (ix / (XN - 1)) * Wd
    let prevM = null, prevY = 0, runTop = null
    for (let y = -s * 2; y <= Hd + s * 2; y += step) {
      const stt = { m: y, g: 1, ground: 1 }
      let inV = 0
      for (const f of fs) {
        if (f.kind === 2) applyGather(px, f, stt)
        else { const v = applyOpening(px, f, stt); if ((f.kind ?? 0) < 0.5) { stt.ground *= 1 - v; inV = Math.max(inV, v) } }
      }
      // no surface here: inside an opening, or where a gather has drawn the material away (a seam's two halves)
      if (inV > 0.5 || stt.ground <= 0.5) { if (runTop == null) runTop = y }
      else if (runTop != null) { voids[ix].push(runTop, y - step); runTop = null }
      // inside an opening the surface is not there: the rows whose material the map carries across the void
      // are not seen (the shader's inkVis), and recording them here would take the place of the crowded rows
      // that really hold them, just outside the rim
      if (prevM != null && stt.m > prevM && inV <= 0.5 && stt.ground > 0.5) {
        const r0 = Math.ceil(prevM / s - 1e-9), r1 = Math.floor(stt.m / s + 1e-9)
        for (let r = r0; r <= r1; r++) {
          const vy = r * s
          if (vy < prevM || vy > stt.m || r < 0 || r >= rowsN) continue
          const k = (vy - prevM) / (stt.m - prevM)
          Ys[ix * rowsN + r] = prevY + k * (y - prevY)
          Gs[ix * rowsN + r] = Math.max(1e-4, (stt.m - prevM) / (y - prevY))
        }
      }
      prevM = stt.m; prevY = y
    }
    if (runTop != null) voids[ix].push(runTop, Hd + s * 2)
  }
  // where the ground has gone the state's paper is not there: the page shows through it — the page's own colour
  // on the index (fill), and on a project whatever lies under the surface, the work itself (the shader's
  // `bgc * (1 - al) * uFill`: with fill 0 an opening is transparent)
  if (fs.length) {
    ctx.fillStyle = st.bg
    for (let ix = 0; ix < XN; ix++) {
      const runs = voids[ix]
      if (!runs.length) continue
      const x0 = XN === 1 ? 0 : ((ix - 0.5) / (XN - 1)) * Wd, x1 = XN === 1 ? Wd : ((ix + 0.5) / (XN - 1)) * Wd
      const L = Math.max(0, x0), w = Math.min(Wd, x1) - L
      for (let i = 0; i < runs.length; i += 2) {
        if (fill) ctx.fillRect(L, runs[i], w, runs[i + 1] - runs[i])
        else ctx.clearRect(L, runs[i], w, runs[i + 1] - runs[i])
      }
    }
  }

  /*
   * R9 — THE ROWS AS THE SHADER NOW DRAWS THEM (docs/IMAGE-QUALITY.md). With a `mask` (reduced motion, createFlat)
   * the rows are not filled onto the picture in their ink. Canvas 2D would blend each partly covered pixel as sRGB
   * values, so a thin pale row on a dark ground gave off much less light when it straddled two pixels than when it
   * sat on one — measured before R9, reduced motion was up to 57% darker than normal motion on Linefield's dark half
   * at DPR 1, partly because these rows sit 0.31 px from the shader's (the physics field's resting offset). Instead
   * the rows' coverage is drawn into the mask (box-filtered by Canvas 2D, which preserves area exactly as the
   * shader's tent does) and mixed into the picture in linear light at the end, and each bare row's width is scaled
   * by the shader's own rowGain. Without a mask (the first-paint hero plate) nothing here changes.
   */
  const rowCtx = mask || ctx
  let gain = null
  if (mask) {
    mask.setTransform(1, 0, 0, 1, 0, 0)
    mask.clearRect(0, 0, mask.canvas.width, mask.canvas.height)
    mask.setTransform(dpr, 0, 0, dpr, 0, 0)
    mask.fillStyle = '#fff'
    // matched to how this place looks in normal motion, where its rows may wave (reduced motion stops them)
    gain = rowGain(st, dpr, Hd, ctx.canvas.height, (o.toneAmp ?? st.amp) > 0.001)
  }
  const ref = thick * 0.5
  // R19: the capsules' compression conserves ink here too (the shader's rule; Gs is the openings' compression at rest —
  // a face holds no gather while it stands)
  const Q = mask ? conserves(st) : 0
  ctx.fillStyle = st.inkHex
  for (let r = 0; r < rowsN; r++) {
    const vy = r * s
    const fy = ((vy + offY) / texH) * th - 0.5
    const set = ((r % 2) + 2) % 2
    let runX = 0, runHw = -1, runY = 0, runEdge = 0
    for (let cx = 0; cx <= cols; cx++) {
      let hw = 0, Y = 0, eh = 0
      if (cx < cols) {
        const fx = (cx + 0.5) / sub - 0.5
        const px = (cx + 0.5) * cw
        let glen = 1
        if (XN === 1) Y = vy
        else {
          const t = clamp((px / Wd) * (XN - 1), 0, XN - 1)
          const i0 = Math.floor(t), i1 = Math.min(XN - 1, i0 + 1), k = t - i0
          const y0 = Ys[i0 * rowsN + r], y1 = Ys[i1 * rowsN + r]
          if (y0 < -1e3 || y1 < -1e3) Y = -1e4
          else {
            Y = y0 + (y1 - y0) * k
            glen = Gs[i0 * rowsN + r] + (Gs[i1 * rowsN + r] - Gs[i0 * rowsN + r]) * k
          }
        }
        if (Y > -1e3 && Y >= strip && Y <= Hd - strip) {
          const vd = bilinear(M?.voids, tw, th, fy, fx)
          const tone0 = bilinear(M?.tone, tw, th, fy, fx)
          const type0 = bilinear(M?.solid, tw, th, fy, fx)
          const sat = bilinear(M?.fuse, tw, th, fy, fx)
          // a split state carries its picture across the two row sets; in register they meet as one
          const info = split ? Math.max(set < 0.5 ? tone0 : type0, (tone0 + type0) * fillK) : tone0
          const solid = split ? 0 : type0 * holdA
          hw = thick * (0.5 + info * 1.15 * wgain)
          hw += (s * 0.36 - hw) * solid
          hw = Math.max(hw, 0) * (1 - vd)
          // the shader's rule, as it is written there: a bare row scaled, a letter's row moved at its edges
          if (gain) {
            if (hw <= ref) hw *= gain.k
            else { const t = smoothstep(ref, ref + 1.5 / dpr, hw); hw = (hw + (gain.k - 1) * ref) * (1 - t) + (hw + gain.e) * t }
          }
          const edgeHw = hw
          const qk = Q && solid < 0.2 ? 1 : 0
          if (qk) hw /= Math.max(glen, 1)
          // static saturation tapers row by row along its ramp, exactly as the shader's does
          const rfs = smoothstep(0.15, 0.95, sat + 0.04 * Math.sin(r * 0.73))
          const rfd = clamp((st.fuse || 0) * 1.9 - (1 - solid) * 0.3 - (1 - clamp(info * 2, 0, 1)) * 0.15, 0, 1)
          const rf = Math.max(rfs, rfd)
          hw = hw + (s * 0.8 - hw) * (rf * rf)
          // rows pressed closer than the eye can part are seen as the mass they add up to
          const spr = s / glen
          const cr = smoothstep(2.1, 1.3, spr * dpr) * (1 - qk * smoothstep(1, 1.15, glen))
          if (cr > 0 && hw > 0.001) hw = hw + (Math.max(hw, 0.62 * spr) - hw) * cr
          // widths are quantised so neighbouring columns merge into one fillRect; the rows R9 narrows (a dark
          // ground's, by rowGain) are thin enough that sixteenths moved their light by 6%, so the mask path uses 64ths
          hw = mask ? Math.round(hw * 64) / 64 : Math.round(hw * 16) / 16
          Y = Math.round(Y * 8) / 8
          // the width the thin-row fade is read from: a conserved row fades as the row it was before R19 narrowed it
          eh = qk ? edgeHw : hw
        } else hw = 0
      }
      if (cx === cols || hw !== runHw || Y !== runY) {
        if (runHw > (mask ? 0.005 : 0.05)) {
          // the shader fades a row thinner than a quarter pixel-unit (clamp(hw * 4)); with a mask, so does this
          if (mask) mask.globalAlpha = Math.min(1, runEdge * 4)
          rowCtx.fillRect(runX, runY - runHw, cx * cw - runX, runHw * 2)
        }
        runX = cx * cw; runHw = hw; runY = Y; runEdge = eh
      }
    }
  }
  if (mask) mixRows(ctx, mask, st.ink)
}

// sRGB ↔ linear, as tables: one entry per byte one way, 4096 steps of linear light the other
const TO_LIN = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) })
const TO_SRGB = Uint8ClampedArray.from({ length: 4096 }, (_, i) => { const l = i / 4095; return Math.round((l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055) * 255) })
/**
 * the rows' coverage (the mask's alpha) mixed into the picture in linear light, over whatever each pixel holds.
 *
 * It runs once per paint over the whole canvas, so it is written for that: pixels are read as 32-bit words, and the
 * mix is a table — for each ground colour met, the 256 colours its coverage levels give — built the first time that
 * ground is met and reused while the next pixel has the same one (almost every pixel is the same paper).
 */
function mixRows(ctx, mask, ink) {
  const w = ctx.canvas.width, h = ctx.canvas.height
  const m32 = new Uint32Array(mask.getImageData(0, 0, w, h).data.buffer)
  const img = ctx.getImageData(0, 0, w, h)
  const d32 = new Uint32Array(img.data.buffer)
  const i8 = [Math.round(ink[0] * 255), Math.round(ink[1] * 255), Math.round(ink[2] * 255)]
  const iL = [TO_LIN[i8[0]], TO_LIN[i8[1]], TO_LIN[i8[2]]]
  const LE = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1
  const pack = (r, g, b, a) => (LE ? ((a << 24) | (b << 16) | (g << 8) | r) >>> 0 : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0)
  const tables = new Map()
  const tableFor = (px) => {
    let t = tables.get(px)
    if (t) return t
    t = new Uint32Array(256)
    const r = LE ? px & 255 : px >>> 24, g = LE ? (px >>> 8) & 255 : (px >>> 16) & 255, b = LE ? (px >>> 16) & 255 : (px >>> 8) & 255
    const al = LE ? px >>> 24 : px & 255
    for (let a8 = 0; a8 < 256; a8++) {
      if (!al) { t[a8] = pack(i8[0], i8[1], i8[2], a8); continue }   // empty: the row is ink at its own coverage
      const a = a8 / 255
      const mix = (c, k) => TO_SRGB[Math.round((TO_LIN[c] + (iL[k] - TO_LIN[c]) * a) * 4095)]
      t[a8] = pack(mix(r, 0), mix(g, 1), mix(b, 2), al)
    }
    tables.set(px, t)
    return t
  }
  const ashift = LE ? 24 : 0
  let lastPx = -1, lastT = null
  for (let i = 0; i < m32.length; i++) {
    const a8 = (m32[i] >>> ashift) & 255
    if (!a8) continue
    const px = d32[i]
    if (px !== lastPx) { lastPx = px; lastT = tableFor(px) }
    d32[i] = lastT[a8]
  }
  ctx.putImageData(img, 0, 0)
}

// ─── the renderer ────────────────────────────────────────────────────────────
export function createFlat(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })
  // the rows' coverage, drawn apart from the picture and mixed into it in linear light (paintFlat, R9)
  const maskEl = document.createElement('canvas')
  const mask = maskEl.getContext('2d', { willReadFrequently: true })
  const W = { w: 1, h: 1, dpr: 1 }
  const slots = [null, null, null]
  let front = 1

  const api = {
    MAXF, ready: Promise.resolve(), flat: true,
    time: 0, shiver: 0, strip: 0, devId: -1, overlay: 0, beneathStart: 0, beneathCount: 0, fill: 1,
    pen: [-99, -99, 0], penCol: [0, 0, 0],
    inks: new Float32Array(36), visited: new Float32Array(12),
    features: [],
    resize(w, h, dpr) {
      W.w = w; W.h = h; W.dpr = dpr
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      maskEl.width = canvas.width; maskEl.height = canvas.height
    },
    phys() {},                      // the imprint is a physical memory of motion: reduced motion keeps none
    pair(a, b, f) { slots[0] = a; slots[1] = b; front = f },
    beneath(n) { slots[2] = n },
    warm(st) { if (st && st.c?.draw) masksOf(st) },
    // the masks are dropped, not marked empty: the next render of this state reads them back again
    release(st) { for (const img of [st?.c, st?.d]) if (img && !img.shared) delete img._flat },
    probe: () => ({ status: true, err: 0, draw: true, out: [] }),
    clear() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height) },
    render() {
      // at rest one state holds the screen; front only ever sits at an end in reduced motion
      const st = (front < 0.5 ? slots[0] : slots[1]) || slots[1] || slots[0]
      if (!st) return
      paintFlat(ctx, st, { W: W.w, H: W.h, dpr: W.dpr, strip: api.strip, features: api.features || [], fill: api.fill, mask, toneAmp: st.toneAmp ?? st.amp })
    },
  }
  return api
}
