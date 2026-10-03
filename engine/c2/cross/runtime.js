/*
 * ── CROSS SECTION: THE SCENE ────────────────────────────────────────────────────────────────────────────────
 *
 * What the scene is at any progress p: the louvers' pose (slats.js), the two states they carry (state.js), the
 * data the variant reads, and the two things drawn in the DOM rather than in the material — the copper line and
 * the word EDGE. EDGE is a solid, lit word that circles the line; it is not made of rows, and its "behind the
 * line" and "in front of it" are its order against the line, exactly as in the reference.
 *
 * Phase B: used by the debug entry only. Phase C binds the same object into the runtime.
 *
 * Imported only where __CROSS__ is true.
 */
import { CS_MAX, CS_Z0, CS_Z1, LUT_COLS, LUT_STEP, SLATS_PATCH, bandStops, ease, layout, louverClock, pack, pose, wordAngle } from './slats.js'
import { EDGE_WORD, faceState, pairState } from './state.js'
import { FAMILY } from '../states.js'

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))

/*
 * THE COPPER. R2's tokens: the mark (#b8622f) on light ground, its night form (#d4875a) on black. The line stands
 * on black at the crossing, so it takes the night form; its glow is the same copper, thinner.
 */
const CSS = `
.cs-dom{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.cs-line{position:absolute;left:50%;width:1px;background:#d4875a;opacity:0;transform:translateX(-50%);
  box-shadow:0 0 18px 5px rgba(212,135,90,.42);z-index:3}
.cs-word{position:absolute;left:0;top:0;white-space:nowrap;opacity:0;will-change:transform,opacity;
  font:900 clamp(46px,9.5vw,150px)/.8 ${FAMILY};letter-spacing:-.01em;color:#f3dcbd}
.cs-dom.warm .cs-word{text-shadow:0 0 34px rgba(255,187,108,.28)}
`

export function createCross(surface, { atmosphere = true, breakName = null } = {}) {
  const gl = surface.gl
  let V = null, L = null, front = null, back = null, pair = null, Q = null
  let atmo = atmosphere
  const data = new Float32Array(5 * 4 * CS_MAX)
  let lut = new Uint8Array(1), lutRows = 1
  let dataTex = null, lutTex = null

  // ── the DOM: the line and the word ─────────────────────────────────────────────────────────────────────────
  const dom = document.createElement('div')
  dom.className = 'cs-dom'
  dom.setAttribute('aria-hidden', 'true')
  const line = document.createElement('div'); line.className = 'cs-line'
  const word = document.createElement('div'); word.className = 'cs-word'; word.textContent = EDGE_WORD
  dom.append(line, word)
  if (!document.getElementById('cs-css')) {
    const st = document.createElement('style'); st.id = 'cs-css'; st.textContent = CSS
    document.head.appendChild(st)
  }

  const textures = () => {
    if (!dataTex) {
      dataTex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, dataTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 5, CS_MAX, 0, gl.RGBA, gl.FLOAT, null)
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
    }
    if (!lutTex) {
      lutTex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, lutTex)
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
    }
  }

  const locs = new Map()
  const loc = (name) => {
    const pr = gl.getParameter(gl.CURRENT_PROGRAM)
    let c = locs.get(pr); if (!c) locs.set(pr, (c = {}))
    return (c[name] ??= gl.getUniformLocation(pr, name))
  }

  const api = {
    dom,
    patch: SLATS_PATCH,
    get layout() { return L },
    get pose() { return Q },
    get front() { return front },
    get back() { return back },
    get atmosphere() { return atmo },
    setAtmosphere(on) { atmo = !!on; dom.classList.toggle('warm', atmo) },
    prepare() { return surface.variant('slats', SLATS_PATCH) },
    build(v) {
      V = v
      for (const st of [front, back, pair]) if (st) surface.release(st)
      L = layout(V)
      front = faceState(V, L, 0)
      back = faceState(V, L, 1)
      pair = pairState(V, L)
      lutRows = Math.ceil(L.h / LUT_STEP) + 1
      lut = new Uint8Array(LUT_COLS * lutRows * 4)
      line.style.top = `${V.strip}px`; line.style.bottom = `${V.strip}px`
      return api
    },
    /** pose the scene at progress p; what is drawn follows on the next render */
    at(p) {
      Q = pose(L, clamp(p))
      pack(L, Q, data, lut, lutRows)
      api.domAt(Q.p)
      return Q
    },
    /** what the ground between the louvers is at this pose */
    gap() {
      const d = Q ? Q.dark : 0
      return [239 + (14 - 239) * d, 238 + (15 - 238) * d, 233 + (17 - 233) * d].map((c) => Math.round(c) / 255)
    },
    /** bind the variant and its data: call with the variant's program bound, i.e. inside onBeforeDraw */
    apply() {
      textures()
      gl.activeTexture(gl.TEXTURE7)
      gl.bindTexture(gl.TEXTURE_2D, dataTex)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 5, CS_MAX, gl.RGBA, gl.FLOAT, data)
      gl.uniform1i(loc('uCSdata'), 7)
      gl.activeTexture(gl.TEXTURE8)
      gl.bindTexture(gl.TEXTURE_2D, lutTex)
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, LUT_COLS, lutRows, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut)
      gl.uniform1i(loc('uCSlut'), 8)
      gl.activeTexture(gl.TEXTURE0)
      gl.uniform1i(loc('uCSn'), L.count)
      gl.uniform3f(loc('uCSeye'), Q.eye[0], Q.eye[1], Q.eye[2])
      gl.uniform4f(loc('uCSscene'), L.strip, L.h, L.W, L.spacing)
      gl.uniform4f(loc('uCSlutG'), LUT_COLS, lutRows, L.W / (LUT_COLS - 1), LUT_STEP)
      const g = api.gap()
      gl.uniform3f(loc('uCSgap'), g[0], g[1], g[2])
      // the reference: atmosphere at 0.8 of the peak, the light at 0.78; without the warm glow, neither is warm
      gl.uniform4f(loc('uCSatmo'), atmo ? Q.peak * 0.8 : 0, Q.peak * 0.78, atmo ? 1 : 0, 0)
      gl.uniform4f(loc('uCSbreak'), breakName === 'grad' ? 1 : 0, 0, 0, 0)
      const sd = pair.sides
      gl.uniform4f(loc('uCSface'), sd.front.thick, sd.back.thick, sd.offY[0], sd.offY[1])
      gl.uniform3fv(loc('uCSink0'), sd.front.ink); gl.uniform3fv(loc('uCSink1'), sd.back.ink)
      gl.uniform3fv(loc('uCSpap0'), sd.front.paper); gl.uniform3fv(loc('uCSpap1'), sd.back.paper)
      gl.uniform3fv(loc('uCSbg0'), sd.front.bgv); gl.uniform3fv(loc('uCSbg1'), sd.back.bgv)
    },
    /*
     * THE WORD AT THE EDGE, the reference's own geometry: it arrives behind the copper line, circles it in stops
     * and lands in front, then turns edge-on and becomes the line. Positions are in screen px.
     */
    domAt(p) {
      const W = V.W, H = V.H, cx = W / 2
      const ps = louverClock(p)
      const peak = Math.pow(Math.max(0, 1 - Math.abs(ps - 0.5) / 0.28), 1.4)
      line.style.opacity = String(peak * peak * 0.85)
      const ZS = bandStops()
      const z = clamp((p - CS_Z0) / (CS_Z1 - CS_Z0))
      const R = Math.min(W * (W < 700 ? 0.36 : 0.3), H * 0.5), tilt = 0.16, cy = H / 2 - R * tilt
      const inWord = ease(z, 0, ZS[0]), turnOff = ease(z, ZS[ZS.length - 1], 1)
      const deg = wordAngle(z), land = 1 - deg / 180
      const th = (deg * Math.PI) / 180
      const sx = Math.sin(th), cz = Math.cos(th)
      const persp = 1 / (1 - cz * 0.28)
      const x = cx + R * sx, y = cy + R * tilt * cz
      const wBox = word.offsetWidth || 1, hBox = word.offsetHeight || 1
      const sc = (0.55 + 0.45 * land) * persp
      const edgeOn = Math.max(0.001, 1 - turnOff)
      word.style.transform = `translate(${(x - wBox / 2).toFixed(1)}px,${(y - hBox / 2).toFixed(1)}px) scale(${(sc * edgeOn).toFixed(3)},${sc.toFixed(3)})`
      word.style.opacity = (z > 0 && z < 1 ? inWord * (cz < 0 ? 0.45 : 1) : 0).toFixed(3)
      word.style.zIndex = cz < 0 ? '1' : '4'
    },
    /** draw one frame: the two states, the variant bound, its data set inside the draw */
    render() {
      surface.pair(pair, pair, 1)
      surface.beneath(pair)
      surface.features = []
      surface.strip = V.strip
      surface.use('slats')
      surface.onBeforeDraw = () => api.apply()
      surface.render()
    },
  }
  api.setAtmosphere(atmo)
  return api
}

export { CS_Z0, CS_Z1, bandStops, louverClock }
