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
import { CS_SHORT_H, CS_THICK, CS_Z0, CS_Z1, bandStops, ease, layout, louverClock, pose, revealLayout, revealPose, sides, wordAngle } from './slats.js'
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
.cs-still{position:absolute;left:0;right:0;z-index:0;display:none;background-color:#111215}
.cs-still.on{display:block}
html[data-c2='cs'] body #surface{display:block;z-index:60}
html[data-c2='cs'] body #ui{display:block;z-index:61}
html[data-c2='cs'] body #ui,html[data-c2='cs'] body #ui *{pointer-events:none!important}
html[data-c2='cs'],html[data-c2='cs'] body{overflow:hidden;overscroll-behavior:none}
html[data-c2='cs'] body #ui{--paper:#e7e6e0;--ink:#121212;--night:#0e0f11;--fg:var(--ink);
  --mono:'Geist Mono',ui-monospace,monospace;--sans:'Geist Variable','Geist',system-ui,sans-serif;
  --act-text:#9a4f22;--act-mark:#b8622f;--act-night:#d4875a;--act:var(--act-text);--act-rule:var(--act-mark);
  font-family:var(--sans);-webkit-font-smoothing:antialiased;font-feature-settings:'ss01' on;-webkit-user-select:none;user-select:none}
html[data-c2='cs'] body[data-tone=dark] #ui{--fg:var(--paper);--act:var(--act-night);--act-rule:var(--act-night)}
html[data-c2='cs'] body[data-tone=media] #ui{--fg:var(--paper);--act:var(--paper);--act-rule:var(--paper)}
`
/*
 * (The runtime's type and its custom properties are declared on html[data-c2='on'], engine/c2/style.css, so in 'cs'
 * the strip's words fell back to the host's and changed face under opaque DEPTH: measured, 4866 px at 1440×900. The
 * same values are given to #ui alone here — not to the page, whose bench must not change — and must follow style.css.)
 */
/*
 * THE SEAM TO THE BENCH OWNS THE SCREEN A THIRD WAY (C3). 'on' is the runtime's screen and nothing else is shown; with
 * no data-c2 at all it is the host's, and the runtime's DOM is hidden (base.css). 'cs' is both: the page the host has
 * mounted underneath — the bench — and the canvas and the runtime's strip on top of it, taking no pointer, while the
 * blinds open onto the page or close over it. Neither scrolls meanwhile. These rules ship only with the flag.
 */

/*
 * ── THE LINE, THE WORD AND (IN REDUCED MOTION) THE EDGE STILL ──────────────────────────────────────────────────────
 *
 * The DOM half of the scene, apart from WebGL, so reduced motion has it too. Reduced motion draws the surface in 2D
 * (flat.js) and shows each position as a cut (R14 decision 2); its band positions are the EDGE moment as a STILL: the
 * louvers seen edge-on as straight copper bars, one at the middle of every louver, on the dark ground under the warm
 * glow, with the copper line and EDGE where that stop puts it. Nothing in it moves.
 */
export function createCrossDom({ atmosphere = CS_GLOW } = {}) {
  const dom = document.createElement('div')
  dom.className = 'cs-dom'
  dom.setAttribute('aria-hidden', 'true')
  const still = document.createElement('div'); still.className = 'cs-still'
  const line = document.createElement('div'); line.className = 'cs-line'
  const word = document.createElement('div'); word.className = 'cs-word'; word.textContent = EDGE_WORD
  dom.append(still, line, word)
  if (!document.getElementById('cs-css')) {
    const st = document.createElement('style'); st.id = 'cs-css'; st.textContent = CSS
    document.head.appendChild(st)
  }
  let V = null
  const D = {
    dom, line, word, still,
    setAtmosphere(on) { dom.classList.toggle('warm', !!on) },
    /** lay the DOM out for this viewport and these louvers */
    layoutTo(v, L) {
      V = v
      line.style.top = `${V.strip}px`; line.style.bottom = `${V.strip}px`
      // on a short screen (a phone on its side) EDGE is sized from the field's height, at the share it has on a desktop
      // (0.17), so it keeps its proportion to SURFACE and DEPTH, which are sized from the height already (state.js)
      word.style.fontSize = V.H < CS_SHORT_H ? `${Math.round(Math.min(0.095 * V.W, 0.17 * (V.H - 2 * V.strip)))}px` : ''
      // the still: a copper bar at the middle of every louver (R2's copper, shaped as the edge is in mesh.js)
      const t = CS_THICK, pitch = L.pitch, c = pitch / 2
      still.style.top = `${V.strip}px`; still.style.height = `${L.h}px`
      still.style.backgroundImage = [
        `radial-gradient(${(0.65 * 0.68 * L.W).toFixed(0)}px ${(0.52 * 0.68 * L.h).toFixed(0)}px at 54% 48%, rgba(180,120,65,${atmosphere ? 0.18 : 0}), rgba(180,120,65,0))`,
        `repeating-linear-gradient(to bottom, transparent 0, transparent ${(c - t / 2).toFixed(2)}px, #3c2316 ${(c - t / 2).toFixed(2)}px, #b8622f ${(c - t * 0.16).toFixed(2)}px, #d4875a ${c.toFixed(2)}px, #b8622f ${(c + t * 0.16).toFixed(2)}px, #3c2316 ${(c + t / 2).toFixed(2)}px, transparent ${(c + t / 2).toFixed(2)}px, transparent ${pitch.toFixed(2)}px)`,
      ].join(',')
    },
    /*
     * THE WORD AT THE EDGE, the reference's own geometry: it arrives behind the copper line, circles it in stops
     * and lands in front, then turns edge-on and becomes the line. Positions are in screen px. `showStill`: reduced
     * motion's EDGE still under it.
     */
    at(p, { showStill = false } = {}) {
      if (!V) return
      still.classList.toggle('on', showStill)
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
  }
  D.setAtmosphere(atmosphere)
  return D
}

export function createCross(surface, { atmosphere = CS_GLOW, breakName = null, revealRows = 0, revealThick = 0 } = {}) {
  const gl = surface.gl
  const mesh = createMesh(gl, { leak: breakName === 'leakgl' })
  let V = null, L = null, RL = null, front = null, back = null, Q = null, count = 0
  let atmo = atmosphere

  // ── the DOM: the line and the word (createCrossDom) ────────────────────────────────────────────────────────
  const D = createCrossDom({ atmosphere })
  const dom = D.dom

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
    get revealLayout() { return RL },
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
      // the reveal's own slats (slats.js): on a wide screen fewer and taller than the crossing's, and as much thicker
      RL = revealLayout(L, V, { rows: revealRows })
      front = faceState(V, L, 0)
      back = faceState(V, L, 1)
      D.layoutTo(V, L)
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
    /** the line and the word where the scene puts them (createCrossDom) */
    domAt(p) { D.at(p) },
    /** the blinds opening onto the bench (C3): r = 0 is DEPTH, flat; r = 1 is nothing left over the page */
    revealAt(r) {
      Q = revealPose(RL, clamp(r), (revealThick || CS_THICK * (RL.pitch / L.pitch)) / 2)
      count = mesh.geometry(L, Q, sides, V.strip, V.H, V.dpr * (V.u || 1))
      api.domAt(1)
      return Q
    },
    /** draw one frame of the pose set by at() or revealAt() */
    render() {
      // the reference: atmosphere at 0.8 of the peak, the light at 0.78; without the warm glow, neither is warm
      const reveal = Q.fade != null ? { fade: Q.fade, strip: Q.strip } : null
      mesh.draw(V, Q, count, { gap: api.gap(), atmo: atmo ? Q.peak * 0.8 : 0, light: Q.peak * 0.78, warm: atmo ? 1 : 0, reveal })
    },
  }
  api.setAtmosphere(atmo)
  return api
}

export { CS_Z0, CS_Z1, bandStops, louverClock }
