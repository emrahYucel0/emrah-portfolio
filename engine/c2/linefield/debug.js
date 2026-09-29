/*
 * ── LINEFIELD, ON ITS OWN ───────────────────────────────────────────────────────────────────────────────────
 *
 * Phase B's entry: the corridor with nothing else attached to it. It builds its own canvas and its own surface,
 * so the index spine, the stops and the gestures are untouched — the navigation is Phase C's work, and until it
 * is approved this must not be able to affect the site at all.
 *
 * Reached only as `?linefield=1` on a locale route, and only in a build where __LINEFIELD__ is true.
 */
import { createSurface, hex } from '../surface.js'
import { CORRIDOR_PATCH, corridorMatrix } from './corridor.js'
import { BACKEND_WORDS, FRONTEND_WORDS, faceReady, linefieldState, sequence } from './state.js'

const RUST = hex('#b8622f')
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

export async function mountLinefield() {
  const host = document.createElement('div')
  host.id = 'lf'
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;inset:0;z-index:60;background:#0e0f11'
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block'
  host.appendChild(canvas)

  // the words in the DOM, for anyone who cannot see the field: the same text the rows carry
  const sr = document.createElement('p')
  sr.style.cssText = 'position:absolute;left:-9999px'
  sr.textContent = `${BACKEND_WORDS.join(' ')} — ${FRONTEND_WORDS.join(' ')}`
  host.appendChild(sr)
  document.body.appendChild(host)
  document.documentElement.dataset.c2 = 'off'

  /*
   * DELIBERATELY BROKEN BUILDS, for calibrating the shimmer measure.
   *
   * A measurement that has only ever been run against the build it is meant to approve has not been shown to
   * measure anything. `?lfbreak=` swaps in a corridor that is wrong in a known way — the row width and fusing
   * left as the flat field's (which fills the far half solid), or the exact Jacobian replaced by a coarse
   * finite difference (which is what an estimated gradient does to converging rows). The measure must read
   * clearly higher on these than on the real one.
   */
  const broke = new URLSearchParams(location.search).get('lfbreak')
  let patch = CORRIDOR_PATCH
  if (broke === 'fade') {
    patch = {
      ...CORRIDOR_PATCH,
      pars: CORRIDOR_PATCH.pars
        .replace('#define VARIANT_HW(h, g) ((g) <= 1.0 ? (h) : max((h) / (g), 0.30))', '#define VARIANT_HW(h, g) (h)')
        .replace('#define VARIANT_FUSE 0.0', '#define VARIANT_FUSE 1.0'),
    }
  } else if (broke === 'jacobian') {
    patch = {
      ...CORRIDOR_PATCH,
      warp: CORRIDOR_PATCH.warp
        .replace(
          'float dv_dx = (uLFinv[0][1] - uLFinv[0][2] * fpt.y) * iw;',
          `vec3 qx = uLFinv * vec3(p.x + 1.0, m, 1.0);
           vec3 qy = uLFinv * vec3(p.x, m + 1.0, 1.0);
           float dv_dx = qx.y / qx.z - fpt.y;`,
        )
        .replace('float dv_dy = (uLFinv[1][1] - uLFinv[1][2] * fpt.y) * iw;', 'float dv_dy = qy.y / qy.z - fpt.y;'),
    }
  }

  const surface = createSurface(canvas)
  await surface.ready
  await surface.variant('corridor', patch)
  surface.use('corridor')

  const faceOk = await faceReady()

  const V = { W: 1, H: 1, u: 1, P: false, T: false, S: false, dpr: 1, pad: 36, strip: 0 }
  let back = null
  let front = null

  const measure = () => {
    V.W = innerWidth
    V.H = innerHeight
    V.dpr = Math.min(2, devicePixelRatio || 1)
    V.P = V.W < V.H * 0.9
    V.u = Math.min(V.W, V.H) / 900
    surface.resize(V.W, V.H, V.dpr)
    back = linefieldState(V, 0, BACKEND_WORDS, 'BACKEND — HOW I THINK')
    front = linefieldState(V, 1, FRONTEND_WORDS, 'FRONTEND — HOW I THINK')
    /*
     * THE PHYSICS GRID, AT REST — and rest is not "all one value".
     *
     * The shader reads displacement as (R - 0.5) * 160 and deviation, memory and disturbance straight off G, B
     * and A. Filled with 128 everywhere, that reads as: every pixel displaced, half deviated, half remembered,
     * and disturbed by twenty-three pixels. The words came out shredded into short offset dashes, which looked
     * like a font or a registration fault and was neither. Neutral is R at the midpoint and the rest at zero.
     */
    const grid = new Uint8Array(4 * 4 * 4)
    for (let i = 0; i < grid.length; i += 4) grid[i] = 128
    surface.phys({ data: grid, cols: 4, rows: 4, cell: Math.max(V.W, V.H) / 3 })
  }
  measure()

  // ── the frame ───────────────────────────────────────────────────────────────────────────────────────────────
  const inkBack = back.ink.slice()
  const inkFront = front.ink.slice()
  let p = 0
  const times = []

  const draw = () => {
    const t0 = performance.now()
    const q = sequence(p, V.W)
    const st = q.back ? back : front
    const base = q.back ? inkBack : inkFront
    /*
     * THE FIELD KEEPS ITS OWN COLOUR. The rust used to be mixed into the state's ink, which tinted every row on
     * the screen — and at the crossing, where coverage is total, that was a full frame of orange. The accent
     * belongs to the drawn line and to nothing else.
     */
    for (let i = 0; i < 3; i++) st.ink[i] = base[i]
    // the passage: it arrives as the rows hand over, and it is one or two pixels on the ground
    const lineAmt = 1 - Math.min(1, q.spread / 0.16)
    const lineCol = base.map((c, i) => c + (RUST[i] - c) * q.flash)

    surface.pair(st, st, 1)
    surface.beneath(st)
    surface.features = []

    const m = corridorMatrix(V.W, V.H, q.depth, q.side)
    surface.use('corridor')
    // set inside the draw, where the variant's program is bound and the base uniforms are already in place
    surface.onBeforeDraw = () => {
      surface.mat3('uLFinv', m)
      // x,y: the whisker at the point itself, in device pixels — NOT a haze across the corridor.
      // z: a slight depth fade, as the reference has. w: the softness of the field's own edge.
      surface.vec4('uLFfade', 0.06, 0.34, 0.12, Math.max(8, V.W * 0.012))
      surface.vec4('uLFflow', q.flow[0], q.flow[1], q.flow[2], q.flow[3])
      surface.vec4('uLFband', st.layout.bands[0], st.layout.bands[1], st.layout.bands[2], st.layout.bands[3])
      surface.vec4('uLFmode', 1, q.depth, q.spread, V.H * 0.5)
      surface.vec4('uLFline', V.H * 0.5, 0.85, lineAmt, 0)
      surface.vec3('uLFlineCol', lineCol)
    }
    surface.render()

    const dt = performance.now() - t0
    times.push(dt)
    if (times.length > 120) times.shift()
  }

  // ── the dock ────────────────────────────────────────────────────────────────────────────────────────────────
  const dock = document.createElement('div')
  dock.style.cssText = 'position:fixed;left:50%;bottom:18px;z-index:61;transform:translateX(-50%);display:flex;'
    + 'align-items:center;gap:12px;padding:9px 12px;background:rgba(239,238,233,.94);color:#121212;'
    + 'border:1px solid rgba(18,18,18,.14);font:400 10px/1 ui-monospace,Consolas,monospace;white-space:nowrap'
  const scrub = document.createElement('input')
  scrub.type = 'range'; scrub.min = '0'; scrub.max = '1000'; scrub.value = '0'
  scrub.style.cssText = 'width:clamp(120px,24vw,320px);accent-color:#af784e'
  const pct = document.createElement('span')
  pct.style.cssText = 'min-width:62px;text-align:right;font-variant-numeric:tabular-nums'
  const note = document.createElement('span')
  note.textContent = faceOk ? 'LINEFIELD' : 'LINEFIELD — FONT FALLBACK'
  note.style.color = faceOk ? '#121212' : '#b8622f'
  dock.append(note, scrub, pct)
  host.appendChild(dock)

  const show = () => {
    scrub.value = String(Math.round(p * 1000))
    const ms = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0
    pct.textContent = `${Math.round(p * 100)}% · ${ms.toFixed(1)}ms`
  }
  const setProgress = (v) => { p = clamp01(v); target = p; show(); draw() }

  /*
   * ── PACING ──────────────────────────────────────────────────────────────────────────────────────────────
   *
   * A wheel notch used to move the scene by a twentieth, so a gesture or two threw the words off the screen and
   * the one thing worth watching — a word sliding along the corridor, toward the viewer and past — never
   * happened. Input now moves a TARGET, and what is drawn eases toward it, so every notch is a glide.
   *
   * NOTCH is sized so the whole passage takes about eighteen of them: far enough that a single word's journey
   * is several, short enough that the scene never feels held back. The touch distance is set to about one and a
   * half screen heights end to end, which is a comfortable two or three swipes on a phone.
   */
  const NOTCH = 1 / 18
  let target = 0
  let raf = 0
  const ease = () => {
    raf = 0
    const d = target - p
    if (Math.abs(d) < 2e-4) { p = target; show(); draw(); return }
    p = clamp01(p + d * 0.14)
    show()
    draw()
    raf = requestAnimationFrame(ease)
  }
  const nudge = (dv) => {
    target = clamp01(target + dv)
    if (!raf) raf = requestAnimationFrame(ease)
  }

  scrub.addEventListener('input', () => setProgress(Number(scrub.value) / 1000))
  addEventListener('wheel', (e) => {
    if (e.target === scrub) return
    e.preventDefault()
    // one notch is one notch, whatever the device reports: a trackpad's flood is not eighteen wheel clicks
    nudge(Math.sign(e.deltaY) * Math.min(1, Math.abs(e.deltaY) / 100) * NOTCH)
  }, { passive: false })
  addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); nudge(NOTCH) }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); nudge(-NOTCH) }
    if (e.key === 'Home') setProgress(0)
    if (e.key === 'End') setProgress(1)
  })

  /*
   * AND A FINGER MOVES IT. On the phone the scene could only be driven by the slider, which is not how anyone
   * reads a page. A drag of about one and a half screen heights carries the whole passage.
   */
  let drag = null
  const TOUCH_SPAN = () => Math.max(520, V.H * 1.5)
  host.addEventListener('pointerdown', (e) => {
    if (e.target === scrub || dock.contains(e.target)) return
    drag = { y: e.clientY, at: target }
    host.setPointerCapture?.(e.pointerId)
  })
  host.addEventListener('pointermove', (e) => {
    if (!drag) return
    target = clamp01(drag.at + (drag.y - e.clientY) / TOUCH_SPAN())
    if (!raf) raf = requestAnimationFrame(ease)
  })
  const endDrag = () => { drag = null }
  host.addEventListener('pointerup', endDrag)
  host.addEventListener('pointercancel', endDrag)
  let rt
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); setProgress(p) }, 140) })

  /*
   * THE HARNESS ASKS THE SCENE, not a screenshot of it. Frame time is measured around the draw itself, and a
   * sweep can be driven at an exact progress so two runs photograph the same moment.
   */
  window.__lf = {
    setProgress,
    notch: NOTCH,
    touchSpan: () => TOUCH_SPAN(),
    nudge,
    get progress() { return p },
    faceOk,
    frameMs: () => (times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0),
    worstMs: () => (times.length ? Math.max(...times) : 0),
    resetTimes: () => { times.length = 0 },
    sequence: () => sequence(p, V.W),
    spacing: () => ({ back: back.spacing, front: front.spacing, cap: back.layout.cap }),
    // a continuous run, so shimmer can be measured in motion rather than between two stills
    play: (from, to, ms) => new Promise((resolve) => {
      const t0 = performance.now()
      const step = () => {
        const k = clamp01((performance.now() - t0) / ms)
        setProgress(from + (to - from) * k)
        if (k < 1) requestAnimationFrame(step); else resolve()
      }
      step()
    }),
  }
  setProgress(0)
  return window.__lf
}
