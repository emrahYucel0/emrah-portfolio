/*
 * ── CROSS SECTION: THE SCENE ────────────────────────────────────────────────────────────────────────────────
 *
 * What the scene is at any progress p: the louvers' pose (slats.js), the two pictures they carry (state.js, drawn
 * by C2 itself), the louvers as geometry (mesh.js), and the two things drawn in the DOM rather than in the
 * material — the copper line and the word EDGE. EDGE is a solid, lit word that circles the line; it is not made of
 * rows, and its "behind the line" and "in front of it" are its order against the line, exactly as in the reference.
 *
 * Phase B: used by the debug entry only. Phase C binds the same object into the runtime.
 *
 * Imported only where __CROSS__ is true.
 */
import { CS_Z0, CS_Z1, bandStops, ease, layout, louverClock, pose, sides, wordAngle } from './slats.js'
import { EDGE_WORD, faceState } from './state.js'
import { createMesh } from './mesh.js'
import { FAMILY } from '../states.js'

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))

/** the warm glow at the crossing — the reference's atmosphere, light and halo. ON: user decision, R14, 2026-10-03 */
export const CS_GLOW = true

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

export function createCross(surface, { atmosphere = CS_GLOW, breakName = null } = {}) {
  const gl = surface.gl
  const mesh = createMesh(gl, { leak: breakName === 'leakgl' })
  let V = null, L = null, front = null, back = null, Q = null, count = 0
  let atmo = atmosphere

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

  // C2 draws a state, flat, into whatever framebuffer is bound: the face a louver carries is C2's own picture
  const flat = (st) => {
    // on the site this surface is the runtime's, mid-frame: whatever else it was set to draw is put aside and back
    const keep = { pen: surface.pen, overlay: surface.overlay, shiver: surface.shiver, bs: surface.beneathStart, bc: surface.beneathCount }
    surface.use?.(null)
    surface.pair(st, st, 1)
    surface.beneath(st)
    surface.features = []
    surface.strip = V.strip
    surface.onBeforeDraw = null
    surface.pen = [-99, -99, 0]; surface.overlay = 0; surface.shiver = 0; surface.beneathStart = 0; surface.beneathCount = 0
    surface.render()
    surface.pen = keep.pen; surface.overlay = keep.overlay; surface.shiver = keep.shiver; surface.beneathStart = keep.bs; surface.beneathCount = keep.bc
  }

  const api = {
    dom,
    mesh,
    get layout() { return L },
    get pose() { return Q },
    get front() { return front },
    get back() { return back },
    get atmosphere() { return atmo },
    setAtmosphere(on) { atmo = !!on; dom.classList.toggle('warm', atmo) },
    /** lay the scene out for this viewport and have C2 draw its two faces (call after surface.resize) */
    build(v, { faces = true } = {}) {
      V = v
      for (const st of [front, back]) if (st) surface.release(st)
      L = layout(V)
      front = faceState(V, L, 0)
      back = faceState(V, L, 1)
      line.style.top = `${V.strip}px`; line.style.bottom = `${V.strip}px`
      // the debug entry draws both faces now; on the site they are taken from the canvas and drawn in bands (place.js)
      if (!faces) return api
      const bw = gl.drawingBufferWidth, bh = gl.drawingBufferHeight
      // their textures are built first: building one rebinds the framebuffer, which must not happen mid-face
      surface.warm(front); surface.warm(back)
      const mips = breakName !== 'nomip'
      mesh.face(0, bw, bh, () => flat(front), { mips })
      mesh.face(1, bw, bh, () => flat(back), { mips })
      return api
    },
    /** band k of n of face i, drawn by C2 from that face's state (0 SURFACE, 1 DEPTH) */
    band(i, k, n) {
      const st = i ? back : front
      surface.warm(st)
      mesh.band(i, k, n, () => flat(st))
    },
    /** pose the scene at progress p; what is drawn follows on the next render */
    at(p) {
      Q = pose(L, clamp(p))
      count = mesh.geometry(L, Q, sides, V.strip, V.H, V.dpr * (V.u || 1))
      api.domAt(Q.p)
      return Q
    },
    /** what the ground between the louvers is at this pose: the reference's underlay, cream to night */
    gap() {
      const d = Q ? Q.dark : 0
      // cream to the DEPTH side's own paper (#111215, user decision 2026-10-03), so DEPTH at rest and DEPTH in motion
      // stand on one ground; the reference's night was #0e0f11
      return [239 + (17 - 239) * d, 238 + (18 - 238) * d, 233 + (21 - 233) * d].map((c) => Math.round(c) / 255)
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
    /** draw one frame of the pose set by at() */
    render() {
      // the reference: atmosphere at 0.8 of the peak, the light at 0.78; without the warm glow, neither is warm
      mesh.draw(V, Q, count, { gap: api.gap(), atmo: atmo ? Q.peak * 0.8 : 0, light: Q.peak * 0.78, warm: atmo ? 1 : 0 })
    },
  }
  api.setAtmosphere(atmo)
  return api
}

export { CS_Z0, CS_Z1, bandStops, louverClock }
