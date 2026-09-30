// SOAK — the finale's crescendo. The pen finishes a word as a hairline; then the paper drinks
// the ink and it SPREADS: full-black rows swell outward from the pen line until the lettering
// carries display weight. Rest state keeps TWO levels only: the email soaked, everything else
// the clean pen line — soaking is attention's reward (src/plotter/plotter.js drives the level).
//
// Only the LETTERS carry weight. The layer is transparent: a row gains ink where the tone map
// says a letter is, and nowhere else — between and around the letters the sheet's own rows
// stay at their paper weight (no band, no box, ever). Each field's ink is clipped to its cell.
//
// SHARP at every intermediate frame: no opacity blends. The animation interpolates between
// precomputed stage TONE MAPS and fills solid rows; the carrying gate scales the row geometry,
// never the alpha. toneData itself is untouched (verbatim engine copy).
//
// The target letter is the site's DISPLAY FACE (Archivo Var, near the hero's weight — user
// decision): the first stage bleeds the pen's own strokes (tapered terminals, marks with their
// own air), the later stages set the word in the face, each letter centred on its pen letter, so
// the finale ends in the hero's typography. The pen line fades out completely at full weight.
//
// Never per frame: stage maps are computed in the worker once the layout has SETTLED; while a
// cell moves, the field's last maps are resampled into the live box (rows stay on the sheet's
// grid, the word never drops out).

import { INK, FAMILY_VAR } from './theme.js'
import { textStrokes } from './hershey.js'
import { toneData } from '../../c2/tone-core.js'
import { note } from './debug.js'

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }

const STAGES = [0.34, 0.67, 1] // raster checkpoints between hairline and display weight
const SETTLE_MS = 120

// measured floor (E2-METRICS): below ~5.2 ROWS of cap, row typography cannot stay legible at
// ANY weight. The crossfade band is a thin 0.4 rows, only so an attention squeeze never pops.
// (Re-measured for the narrow sheet's lighter face: it does NOT lower the floor — digits at
// 4.1–4.96 rows were illegible; review/phone/ladder-*.)
export const soakMinCap = (sp) => 5.2 * sp
export const soakGate = (cap, sp) => {
  const t = (cap / sp - 5.2) / 0.4
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t * t * (3 - 2 * t)
}
// how much display weight this cap can CARRY: just-over-the-gate words stay semibold (rows
// separate, counters open), many-row words take the full weight — measured, E2-METRICS
export const soakRowFactor = (cap, sp) => clamp((cap / sp - 5.2) / 6, 0, 1)

// the canvas font shorthand only takes keyword stretches; the variable face maps them onto
// its wdth axis (62–125, styles.css)
// (no stretch token at all for 'normal': a browser that rejects the keyword keeps a valid font)
const faceFont = (wght, s, size) => (s === 'normal' ? `${wght} ${size}px ${FAMILY_VAR}` : `${wght} ${s} ${size}px ${FAMILY_VAR}`)
const STRETCH = ['extra-condensed', 'condensed', 'semi-condensed', 'normal', 'semi-expanded', 'expanded']
// dotted letters in the face: [dotless base, dots, base height ('x' | 'H')]
const DOTTED = { i: ['ı', 1, 'x'], 'İ': ['I', 1, 'H'], 'ü': ['u', 2, 'x'], 'ö': ['o', 2, 'x'], 'Ü': ['U', 2, 'H'], 'Ö': ['O', 2, 'H'] }

export function createSoak(S, getItems) {
  const AMP_TOP = 1.9 // row swell at full weight (many-row words)
  // the narrow sheet (few rows per letter — a heavy face closes its counters there): the soak's
  // target is set LIGHTER (face ~470–600 instead of 640–880, a gentler row swell), so counters
  // stay open without any pen trace (user decision (a); the denser-rows variant was dropped)
  const light = () => S.portrait
  // the tone work runs in a module worker; if this browser cannot start one (or it fails), the
  // SAME toneData runs on the main thread, one map per task — the soak degrades, never vanishes
  let worker = null
  try {
    worker = new Worker(new URL('./tone.worker.js', import.meta.url), { type: 'module' })
    worker.onerror = (e) => { note('fallback', `tone worker error (${e.message || 'unknown'}) → toneData on the main thread`); worker = null; flushPending() }
  } catch (err) {
    note('fallback', `module worker unavailable (${err.message}) → toneData on the main thread`)
  }
  const queued = new Map() // id → { buf, cw, ch } kept until the worker answers (re-run on failure)
  function postTone(id, buf, cw, ch) {
    if (worker) {
      queued.set(id, { buf: buf.slice(0), cw, ch })
      worker.postMessage({ id, buf, cw, ch }, [buf])
    } else {
      setTimeout(() => { const p = new Uint8ClampedArray(buf); toneData(p, cw, ch); receive({ id, buf: p.buffer, cw, ch }) }, 0)
    }
  }
  function flushPending() {
    for (const [id, q] of queued) postTone(id, q.buf, q.cw, q.ch)
    queued.clear()
  }
  const maps = new Map()     // `${key}|s${k}` → { tone, tw, th, t0 }
  const pending = new Map()
  const req = new Map()      // field → { key, timer } — one settle timer per field
  const cur = new Map()      // field → { key, shape, ms: [m0, m1, m2] } — last COMPLETE set
  const layers = new Map()   // field → { cnv, sig, box }
  let seq = 0

  if (worker) worker.onmessage = (e) => { queued.delete(e.data.id); receive(e.data) }
  function receive(data) {
    const { id, buf, cw, ch } = data
    const key = pending.get(id)
    pending.delete(id)
    if (!key) return
    const px = new Uint8ClampedArray(buf)
    const tone = new Uint8Array(cw * ch)
    const hist = new Uint32Array(256)
    for (let j = 0; j < tone.length; j++) { tone[j] = px[j * 4]; hist[tone[j]]++ }
    // the sheet's own level in this map (its lower quartile — most of a box is paper): only
    // tone ABOVE it is ink, so the paper between the letters keeps its paper rows
    let acc = 0, t0 = 0
    for (; t0 < 255; t0++) { acc += hist[t0]; if (acc >= tone.length * 0.25) break }
    maps.set(key, { tone, tw: cw, th: ch, t0 })
  }

  const boxKey = (id, lang, box) =>
    `${id}|${lang}|${Math.round(box.x0 / 12)},${Math.round(box.y0 / 12)},${Math.round((box.x1 - box.x0) / 12)}x${Math.round((box.y1 - box.y0) / 12)}`

  // ── rasters ──
  /** the pen's strokes with a bled pen; terminals taper so ends and joins stay clean */
  function rasterPen(x, strokes, base, cap, sp) {
    x.fillStyle = INK; x.strokeStyle = INK
    x.lineJoin = 'round'; x.lineCap = 'round'
    for (let st of strokes) {
      if (st.tail) { // the comma's tail runs on past the bled head, so it still reads as a comma
        const L = st.length
        const dx = st[L - 2] - st[L - 4], dy = st[L - 1] - st[L - 3], dl = Math.hypot(dx, dy) || 1
        st = Float64Array.from([...st, st[L - 2] + (dx / dl) * cap * 0.1, st[L - 1] + (dy / dl) * cap * 0.1])
      }
      const n = st.length / 2
      const wm = base * (st.wMul ?? 1)
      if (st.dot) {
        // a mark keeps its own round body and at least ~1.5 rows of air above its letter (lifted
        // a little if the bleed would close that air), and air from its twin (Ü, ö)
        const d = st.dot
        let r = Math.min(wm * (d.tail ? 0.42 : 0.5), Math.max(cap * 0.04, (d.pair - cap * 0.08) / 2))
        const need = base / 2 + r + 1.5 * sp
        const have = d.gap + cap * (1 / 21)
        const lift = clamp(need - have, 0, cap * 0.12)
        if (have + lift < need) r = Math.max(cap * 0.035, r - (need - have - lift))
        x.beginPath(); x.arc(d.cx, d.cy - lift, r, 0, Math.PI * 2); x.fill()
        continue
      }
      const cum = new Float64Array(n)
      for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(st[i * 2] - st[i * 2 - 2], st[i * 2 + 1] - st[i * 2 - 1])
      const Ls = cum[n - 1]
      const closed = Math.hypot(st[0] - st[st.length - 2], st[1] - st[st.length - 1]) < 0.5
      if (closed || Ls < 1e-3) { // dots and loops keep their full body
        x.lineWidth = wm
        x.beginPath(); x.moveTo(st[0], st[1]); for (let i = 1; i < n; i++) x.lineTo(st[i * 2], st[i * 2 + 1]); x.stroke()
        if (Ls < 1e-3) { x.beginPath(); x.arc(st[0], st[1], wm / 2, 0, Math.PI * 2); x.fill() }
        continue
      }
      const tl = Math.min(wm * 1.2, Ls * 0.3)
      const at = (s) => {
        let i = 1
        while (i < n - 1 && cum[i] < s) i++
        const f = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])
        return [lerp(st[i * 2 - 2], st[i * 2], f), lerp(st[i * 2 - 1], st[i * 2 + 1], f)]
      }
      const wAt = (s) => wm * (1 - 0.34 * (1 - smooth(Math.min(s, Ls - s) / tl)))
      // the body at full width, the two terminal zones in short tapering steps
      x.lineWidth = wm
      x.beginPath()
      const a = at(tl)
      x.moveTo(a[0], a[1])
      for (let i = 1; i < n; i++) if (cum[i] > tl && cum[i] < Ls - tl) x.lineTo(st[i * 2], st[i * 2 + 1])
      const b = at(Ls - tl)
      x.lineTo(b[0], b[1])
      x.stroke()
      const steps = 6
      for (const [s0, s1] of [[0, tl], [Ls - tl, Ls]]) {
        for (let j = 0; j < steps; j++) {
          const u0 = lerp(s0, s1, j / steps), u1 = lerp(s0, s1, (j + 1) / steps)
          const p0 = at(u0), p1 = at(u1)
          x.lineWidth = wAt((u0 + u1) / 2)
          x.beginPath(); x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]); x.stroke()
        }
      }
    }
  }

  let capR = 0
  // no FontFace API: build anyway (the canvas falls back to the face once it loads via CSS)
  const fontOK = () => { try { return !document.fonts || document.fonts.check(`900 40px ${FAMILY_VAR}`) } catch { return true } }
  // ── does this canvas really DRAW font-stretch, and does measureText agree? (iOS 15: no — it
  //    parses the keyword and draws normal width.) Measured once, from ink pixels, after the
  //    face is loaded. Without it the word is set at normal width and fitted by scale alone. ──
  let stretchOK = null
  function probeStretch() {
    const c = document.createElement('canvas')
    c.width = 400; c.height = 60
    const x = c.getContext('2d', { willReadFrequently: true })
    const inkW = (kw) => {
      x.clearRect(0, 0, 400, 60)
      x.font = `900 ${kw} 40px ${FAMILY_VAR}`
      x.fillStyle = '#000'; x.fillText('HHHH', 4, 48)
      const d = x.getImageData(0, 0, 400, 60).data
      let x0 = 400, x1 = -1
      for (let i = 3; i < d.length; i += 4) if (d[i] > 100) { const px = ((i - 3) / 4) % 400; if (px < x0) x0 = px; if (px > x1) x1 = px }
      return { ink: x1 - x0, meas: x.measureText('HHHH').width }
    }
    const a = inkW('condensed'), b = inkW('expanded')
    // drawn widths must differ clearly, and the measured ratio must match the drawn one
    stretchOK = b.ink > a.ink * 1.15 && Math.abs(b.meas / a.meas - b.ink / a.ink) < 0.06
    // dev: ?stretch=0 reproduces iOS 15 (the keyword ignored) on any browser
    // ?stretch=0 reproduces iOS 15 (the keyword ignored) on any browser — the compatibility check uses it
    if (new URLSearchParams(location.search).get('stretch') === '0') stretchOK = false
    window.__stretchOK = stretchOK
  }
  /** the display face: one stretch per run of letters (the widest whose word fits the pen's
   *  run), each letter centred on its pen letter's advance cell — the two hands stay registered */
  function rasterFace(x, render, wght, sp) {
    const { cap, lines } = render
    if (!capR) { x.font = `900 100px ${FAMILY_VAR}`; capR = x.measureText('H').actualBoundingBoxAscent / 100 || 0.72 }
    const size = cap / capR
    x.fillStyle = INK; x.textBaseline = 'alphabetic'; x.textAlign = 'start'
    for (const ln of lines) {
      // runs of letters (split at the arrow) — each run set in the face as a WORD, spanning the
      // same width as the pen's run: the widest stretch that fits, the rest as even letter air
      const runs = []
      let run = []
      for (const c of ln.cells) {
        if (c.ch === '↗') { if (run.length) runs.push(run); runs.push([c]); run = [] } else run.push(c)
      }
      if (run.length) runs.push(run)
      for (const r of runs) {
        while (r.length && r[r.length - 1].ch === ' ') r.pop()
        while (r.length && r[0].ch === ' ') r.shift()
        if (!r.length) continue
        if (r[0].ch === '↗') { // no arrow in the face: the pen's arrow at the face's stem
          x.strokeStyle = INK; x.lineCap = 'round'; x.lineJoin = 'round'
          x.lineWidth = cap * lerp(0.1, 0.19, (wght - 400) / 500)
          x.beginPath()
          for (const st of textStrokes('↗', r[0].x0, ln.y, cap)) { x.moveTo(st[0], st[1]); for (let i = 2; i < st.length; i += 2) x.lineTo(st[i], st[i + 1]) }
          x.stroke()
          continue
        }
        // the run may never grow past the pen's own run (which already keeps its margin to the
        // cell edge) — a 3 % air on top, in every browser
        const target = (r[r.length - 1].x1 - r[0].x0) * 0.97
        if (stretchOK === null) {
          try { probeStretch() } catch (err) { stretchOK = false; note('fallback', `font-stretch probe failed (${err.message}) → normal width + scale`) }
          note('info', `canvas font-stretch drawn: ${stretchOK ? 'yes' : 'no → normal width, fitted by scale'}`)
        }
        const stretches = stretchOK ? STRETCH : ['normal']
        let pick = stretches[0], natural = 0
        for (const s of stretches) {
          x.font = faceFont(wght, s, size)
          const w = r.reduce((a, c) => a + x.measureText(c.ch).width, 0)
          if (w <= target || s === stretches[0]) { pick = s; natural = w } else break
        }
        x.font = faceFont(wght, pick, size)
        let sx = natural > target ? target / natural : 1
        // letters centred on their pen cells can still overhang the run's ends (a wide face
        // letter on a narrow pen cell): measure the real extent and scale it back inside
        const span0 = r[0].x0, span1 = r[r.length - 1].x1
        let lo = Infinity, hi = -Infinity
        for (const c of r) {
          if (c.ch === ' ') continue
          const cw = x.measureText(c.ch).width * sx, mid = (c.x0 + c.x1) / 2
          lo = Math.min(lo, mid - cw / 2); hi = Math.max(hi, mid + cw / 2)
        }
        const mid0 = (span0 + span1) / 2
        const reach = Math.max(mid0 - lo, hi - mid0), half = ((span1 - span0) / 2) * 0.985
        const squeeze = reach > half ? half / reach : 1 // positions AND widths, about the run's centre
        sx *= squeeze
        for (const c of r) {
          if (c.ch === ' ') continue
          const cw = x.measureText(c.ch).width
          // centred on the pen letter: mid-soak, the bleeding pen and the face share one body
          const px = mid0 + ((c.x0 + c.x1) / 2 - mid0) * squeeze - (cw * sx) / 2
          x.save(); x.translate(px, 0); if (sx !== 1) x.scale(sx, 1)
          const dm = DOTTED[c.ch]
          if (!dm) x.fillText(c.ch, 0, ln.y)
          else {
            // the face's own dot sits too close to fill as rows: the dotless base, and a round
            // dot of our own with ~1.6 rows of air (İ, i, ü, ö, Ü, Ö)
            const bw = x.measureText(dm[0]).width
            x.fillText(dm[0], (cw - bw) / 2, ln.y)
            const top = ln.y - (dm[2] === 'H' ? cap : x.measureText('x').actualBoundingBoxAscent)
            const stem = cap * lerp(0.12, 0.2, clamp((wght - 400) / 500, 0, 1))
            let rr = stem * 0.55
            const dx = dm[1] === 2 ? bw * 0.2 : 0
            if (dx) rr = Math.min(rr, (2 * dx - cap * 0.07) / 2)
            const cy = top - Math.max(1.6 * sp, cap * 0.1) - rr
            for (const sgn of dm[1] === 2 ? [-1, 1] : [0]) { x.beginPath(); x.arc(cw / 2 + sgn * dx, cy, rr, 0, Math.PI * 2); x.fill() }
          }
          x.restore()
        }
      }
    }
  }

  /** one stage: rasterise the word at this stage's weight, then the real toneData */
  function build(key, render, stageIdx, sp) {
    if (maps.has(key) || [...pending.values()].includes(key)) return true
    const stageT = STAGES[stageIdx]
    const face = stageIdx > 0
    if (face && !fontOK()) { document.fonts.load(`900 40px ${FAMILY_VAR}`).catch(() => {}); return false }
    const { strokes, cap, box } = render
    const rf = soakRowFactor(cap, sp)
    const w = Math.max(2, Math.round(box.x1 - box.x0)), h = Math.max(2, Math.round(box.y1 - box.y0))
    const c = document.createElement('canvas')
    // 1000 is deliberate: toneData's neighbourhood ops are fixed-pixel, and this scale gives
    // the fat strokes the same edge treatment the Lab's images get (higher res = balloon blobs)
    const k = Math.min(1, 1000 / w)
    c.width = Math.max(2, Math.round(w * k)); c.height = Math.max(2, Math.round(h * k))
    const x = c.getContext('2d', { willReadFrequently: true })
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height)
    x.setTransform(k, 0, 0, k, -box.x0 * k, -box.y0 * k)
    if (face) {
      // near the hero's weight (900) where the rows can carry it; semibold just over the gate
      const wFin = light() ? lerp(470, 600, rf) : lerp(640, 880, rf)
      rasterFace(x, render, Math.round(stageIdx === 1 ? lerp(light() ? 360 : 420, wFin, 0.55) : wFin), sp)
    } else {
      const wEnd = Math.min(cap * (light() ? lerp(0.1, 0.15, rf) : lerp(0.13, 0.2, rf)), 0.36 * cap - 1.2 * sp)
      rasterPen(x, strokes, Math.max(1.5 / k, lerp(cap * 0.06, Math.max(cap * 0.08, wEnd), smooth(stageT))), cap, sp)
    }
    x.setTransform(1, 0, 0, 1, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height)
    const id = ++seq
    pending.set(id, key)
    postTone(id, d.data.buffer, c.width, c.height)
    return true
  }

  const ampFor = (stageT, cap, sp) => lerp(1, lerp(light() ? 1.45 : 1.5, light() ? 1.7 : AMP_TOP, soakRowFactor(cap, sp)), smooth(stageT))

  /** ink rows from two stage maps interpolated at f, resampled into the LIVE box. Transparent:
   *  a row takes ink only where a letter is (tone above the paper level) — never a band */
  function drawSwellLerp(ctx, box, mA, mB, f, geom, cap, tA, tB, gate) {
    const sp = geom.sp
    const th = sp * 0.115
    const amp = lerp(mA ? ampFor(tA, cap, sp) : 1, ampFor(tB, cap, sp), f) * gate
    const capTop = sp * 0.47
    const bw = box.x1 - box.x0, bh = box.y1 - box.y0
    const kxB = mB.tw / bw, kyB = mB.th / bh
    const kxA = mA ? mA.tw / bw : 1, kyA = mA ? mA.th / bh : 1
    const nB = 1 / Math.max(1, 255 - mB.t0), nA = mA ? 1 / Math.max(1, 255 - mA.t0) : 0
    const nx = Math.max(2, Math.ceil(bw / 3))
    const tops = new Float32Array(nx + 1), ys = new Float32Array(nx + 1), ks = new Float32Array(nx + 1)
    const parting = geom.parting, pr = [0, 1]
    const rowsB = [0, 0, 0], rowsA = [0, 0, 0], o3 = sp * 0.33
    ctx.beginPath()
    let k = Math.ceil((box.y0 - geom.top - sp * 0.5) / sp)
    for (;; k++) {
      const cy = geom.top + k * sp + sp * 0.5
      if (cy > box.y1) break
      // the tone is averaged across the row's band (three taps): a row the letter only grazes
      // at a bowl's bottom or a terminal thins away instead of leaving a lone dash (a false ç)
      // the three band taps' map rows for a row centred at screen y (no allocation per column)
      const taps = (y) => {
        rowsB[0] = clamp(Math.floor((y - o3 - box.y0) * kyB), 0, mB.th - 1) * mB.tw
        rowsB[1] = clamp(Math.floor((y - box.y0) * kyB), 0, mB.th - 1) * mB.tw
        rowsB[2] = clamp(Math.floor((y + o3 - box.y0) * kyB), 0, mB.th - 1) * mB.tw
        if (mA) {
          rowsA[0] = clamp(Math.floor((y - o3 - box.y0) * kyA), 0, mA.th - 1) * mA.tw
          rowsA[1] = clamp(Math.floor((y - box.y0) * kyA), 0, mA.th - 1) * mA.tw
          rowsA[2] = clamp(Math.floor((y + o3 - box.y0) * kyA), 0, mA.th - 1) * mA.tw
        }
      }
      taps(cy)
      // a row the sheet's parting bends: the ink row sits exactly on its paper row, and reads
      // the letter where the row actually lies
      const act = parting?.key && parting.affects(cy) ? parting.prep(cy) : null
      const bent = act && act.length > 0
      let any = false
      for (let i = 0; i <= nx; i++) {
        const u = (i / nx) * bw
        if (bent) {
          parting.at(act, box.x0 + u, pr)
          ys[i] = cy + pr[0]; ks[i] = pr[1]
          taps(ys[i])
        } else { ys[i] = cy; ks[i] = 1 }
        const xb = clamp(Math.floor(u * kxB), 0, mB.tw - 1)
        const tnB = Math.max(0, (mB.tone[rowsB[0] + xb] + mB.tone[rowsB[1] + xb] + mB.tone[rowsB[2] + xb]) / 3 - mB.t0) * nB
        let tnA = 0
        if (mA) {
          const xa = clamp(Math.floor(u * kxA), 0, mA.tw - 1)
          tnA = Math.max(0, (mA.tone[rowsA[0] + xa] + mA.tone[rowsA[1] + xa] + mA.tone[rowsA[2] + xa]) / 3 - mA.t0) * nA
        }
        const tn = lerp(tnA, tnB, f)
        // ink grows from nothing at the letter's edge: the paper row around it is untouched
        const hgt = tn < 0.17 ? 0 : Math.min(capTop, th * (0.5 + tn * 1.15) * amp * smooth((tn - 0.17) / 0.2)) * ks[i]
        tops[i] = hgt
        if (hgt > 0) any = true
      }
      if (!any) continue
      // one closed shape per inked run, so no zero-width sliver joins two letters
      let i = 0
      while (i <= nx) {
        while (i <= nx && tops[i] <= 0) i++
        if (i > nx) break
        const s = i
        while (i <= nx && tops[i] > 0) i++
        const e = i - 1
        const x0 = box.x0 + (Math.max(0, s - 1) / nx) * bw
        const x1 = box.x0 + (Math.min(nx, e + 1) / nx) * bw
        ctx.moveTo(x0, ys[Math.max(0, s - 1)])
        for (let j = s; j <= e; j++) ctx.lineTo(box.x0 + (j / nx) * bw, ys[j] - tops[j])
        ctx.lineTo(x1, ys[Math.min(nx, e + 1)])
        for (let j = e; j >= s; j--) ctx.lineTo(box.x0 + (j / nx) * bw, ys[j] + tops[j])
        // (no closePath: fill() closes every subpath itself, and per-run closePath was the
        //  single most expensive call in a sweep profile)
      }
    }
    ctx.fillStyle = INK
    ctx.fill()
  }

  function renderInto(L, box, mA, mB, frac, geom, cap, tA, tB, gate) {
    const dpr = Math.min(devicePixelRatio || 1, 2)
    const bw = box.x1 - box.x0, bh = box.y1 - box.y0
    const cw = Math.max(2, Math.round(bw * dpr)), ch = Math.max(2, Math.round(bh * dpr))
    const c2 = L.cnv.getContext('2d')
    if (L.cnv.width !== cw || L.cnv.height !== ch) { L.cnv.width = cw; L.cnv.height = ch }
    else { c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, cw, ch) }
    c2.setTransform(dpr, 0, 0, dpr, -box.x0 * dpr, -box.y0 * dpr)
    drawSwellLerp(c2, box, mA, mB, frac, geom, cap, tA, tB, gate)
    L.box = { x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1 }
  }

  const setFor = (key) => {
    const ms = STAGES.map((_, k) => maps.get(`${key}|s${k}`))
    return ms.every(Boolean) ? ms : null
  }
  /** one settle timer per field: a box in motion re-keys every frame, only its RESTING key builds */
  function want(id, key, render, sp) {
    const r = req.get(id)
    if (r && r.key === key) return
    if (r) clearTimeout(r.timer)
    const fire = () => {
      let ok = true
      for (let k = 0; k < STAGES.length; k++) ok = build(`${key}|s${k}`, render, k, sp) && ok
      if (!ok) { const again = req.get(id); if (again?.key === key) again.timer = setTimeout(fire, 200) }
    }
    req.set(id, { key, timer: setTimeout(fire, SETTLE_MS) })
  }

  return {
    /** the route is left: the worker goes with it */
    destroy() {
      for (const r of req.values()) clearTimeout(r.timer)
      req.clear()
      try { worker?.terminate() } catch {}
      worker = null
    },
    reset() {
      layers.clear(); cur.clear()
      for (const r of req.values()) clearTimeout(r.timer)
      req.clear()
    },
    /** primed right after build: the rest layout's stages compute in the worker, off the path */
    prime(plotter, lang) {
      for (const it of getItems()) {
        const render = plotter.valueRender(it.id)
        if (!render || soakGate(render.cap, plotter.view.sp) <= 0) continue
        const key = boxKey(it.id, lang, render.box)
        for (let k = 0; k < STAGES.length; k++) build(`${key}|s${k}`, render, k, plotter.view.sp)
        if (!fontOK()) want(it.id, key, render, plotter.view.sp)
      }
    },
    /**
     * under the pen strokes. Returns { busy, drawn }: `drawn[id]` is true only when this frame
     * actually PAINTED that field's soak. The pen keeps any value whose soak was not painted —
     * NO value may ever be invisible, in any frame.
     */
    draw(p, pt, plotter, lang, parting = null) {
      let busy = false
      const drawn = {}
      const geom = { sp: plotter.view.sp, top: plotter.view.top, parting }
      for (const it of getItems()) {
        const t = plotter.soakTOf(it.id, p)
        if (t <= 0.001) continue
        const render = plotter.valueRender(it.id)
        const gate = render ? soakGate(render.cap, geom.sp) : 0
        if (!render || gate <= 0) continue
        const key = boxKey(it.id, lang, render.box)
        let set = setFor(key)
        if (set) cur.set(it.id, { key, shape: render.shape, ms: set })
        else {
          want(it.id, key, render, geom.sp)
          busy = true
          // the settled maps are still computing: the field's LAST maps, resampled into the live
          // box (same letters, same place; rows stay on the sheet's grid)
          const c = cur.get(it.id)
          if (c && c.shape === render.shape) set = c.ms
        }
        if (!set) continue // nothing drawable yet: the pen line stays whole this frame
        const k = Math.min(STAGES.length - 1, Math.floor(t * STAGES.length))
        const frac = Math.min(1, t * STAGES.length - k)
        const mB = set[k], mA = k > 0 ? set[k - 1] : null
        let L = layers.get(it.id)
        if (!L) { L = { cnv: document.createElement('canvas'), sig: '', boxSig: '' }; layers.set(it.id, L) }
        const b = render.box
        const boxSig = `${Math.round(b.x0)},${Math.round(b.y0)},${Math.round(b.x1)},${Math.round(b.y1)}`
        const sig = `${set === cur.get(it.id)?.ms ? cur.get(it.id).key : key}|${k}|${Math.round(frac * 64)}|${Math.round(gate * 64)}|${boxSig}|${parting?.key ?? ''}`
        const boxMoving = boxSig !== L.boxSig
        L.boxSig = boxSig
        // each field's ink stays inside its own cell (and clear of a channel at its border)
        const r = render.cell
        const ins = parting ? parting.inset() : 1.5
        S.ctx.save()
        S.ctx.beginPath(); S.ctx.rect(r.x + ins, r.y + 1.5, r.w - 2 * ins, r.h - 3); S.ctx.clip()
        if (boxMoving) {
          // the cell is travelling: the rows go straight onto the sheet (no layer to reallocate
          // every frame); the cached layer is rebuilt once the box holds still
          drawSwellLerp(S.ctx, b, mA, mB, frac, geom, render.cap, k > 0 ? STAGES[k - 1] : 0, STAGES[k], gate)
          L.sig = ''
        } else {
          if (L.sig !== sig) {
            renderInto(L, b, mA, mB, frac, geom, render.cap, k > 0 ? STAGES[k - 1] : 0, STAGES[k], gate)
            L.sig = sig
          }
          S.ctx.drawImage(L.cnv, L.box.x0, L.box.y0, L.box.x1 - L.box.x0, L.box.y1 - L.box.y0)
        }
        S.ctx.restore()
        drawn[it.id] = true
      }
      return { busy, drawn }
    },
  }
}
