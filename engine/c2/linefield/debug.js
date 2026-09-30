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
import { CORRIDOR_PATCH, LF_ROW_KEEP, corridorImage, corridorUniforms, vanishingPoint } from './corridor.js'
import { patchFor } from './breaks.js'
import { LF_FOLLOW, LF_KEY_STEP, LF_MAX_VEL, LF_MOMENTUM_TAU, LF_TOUCH_SPAN, LF_WHEEL_SPAN, createPacer } from './input.js'
import { BACKEND_WORDS, FRONTEND_WORDS, faceReady, linefieldState, sequence } from './state.js'

const RUST = hex('#b8622f')
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/*
 * ONCE, HOWEVER OFTEN IT IS ASKED FOR.
 *
 * The composable's start() is idempotent for the runtime, but this entry returns before the part that makes it
 * so, and the dev server calls start() twice. That produced two hosts, two WebGL contexts and two docks:
 * window.__lf drove one of them and the other was the one on screen, so setProgress moved a scene nobody could
 * see and a harness photographed a frame that never changed. The static build mounts once and never showed it —
 * which is exactly why this belongs here and not in the harness.
 *
 * The claim is staked on the first CALL, not on the first completed mount: mounting is asynchronous, and a
 * second call arriving while the first is still compiling its shader would otherwise pass any check on __lf.
 */
export function mountLinefield() {
  window.__lfMounting ??= mount()
  return window.__lfMounting
}

async function mount() {
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
   * THE DENSITY IS SETTLED. Three were built — every 4th, 6th and 8th row — and reviewed on the device; every
   * 8th was chosen, and it is LF_ROW_KEEP in corridor.js now rather than a switch on the dock. `?lfv=` is
   * accepted and ignored, so an old bookmark still opens the scene.
   */
  const qs = new URLSearchParams(location.search)
  /*
   * ONE DELIBERATELY BROKEN BUILD, and it is the one that calibrates a measure that works.
   *
   * `?lfbreak=dense` sends the field down the corridor at the density the WORDS need, with no thinning — the
   * fault the density measure exists to detect. It reads roughly two and a half times the high-frequency
   * energy of the real build, which is what makes that number mean something.
   *
   * There were two others, aimed at the shimmer ratio. They patched text belonging to the homography this
   * corridor no longer uses, so they had silently stopped substituting anything; and the ratio they were meant
   * to calibrate never discriminated between builds in the first place, and was reported as untrustworthy
   * rather than used. They are gone rather than left to look like coverage.
   */
  const broke = qs.get('lfbreak')
  const patch = patchFor(broke)

  const surface = createSurface(canvas)
  await surface.ready
  await surface.variant('corridor', patch)
  surface.use('corridor')

  const faceOk = await faceReady()

  // the strip the site keeps at the top and the bottom. The debug entry does not draw it, but the words have
  // to clear it, because on the site it is there.
  const V = { W: 1, H: 1, u: 1, P: false, T: false, S: false, dpr: 1, pad: 36, strip: 50 }
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
    const lineCol = base.map((c, i) => c + (RUST[i] - c) * q.flash)
    /*
     * THE MARK: a point at the vanishing point, then the line.
     *
     * It arrives where the corridor's tip left off — on the vanishing point — and opens out from there to a
     * little past both edges of the screen, which is where the demo's rust line runs. Its half-height comes
     * down from a point's to a line's over the same opening, so the moment it reads as a dot is a real moment
     * and not a very short line.
     */
    const [vpx] = vanishingPoint(V.W, V.H, q.depth, q.side)
    const a = vpx + (-40 - vpx) * q.grow
    const b = vpx + (V.W + 40 - vpx) * q.grow
    const lineAmt = q.mark

    surface.pair(st, st, 1)
    surface.beneath(st)
    surface.features = []

    const U = corridorUniforms(V.W, V.H, q.depth, q.side, q.pull)
    surface.use('corridor')
    // set inside the draw, where the variant's program is bound and the base uniforms are already in place
    surface.onBeforeDraw = () => {
      // cc is the fan: 1 is the full field, 0 is every row on the horizon. It is the collapse, in the map.
      surface.vec4('uLFmap', U.map[0], q.spread, U.map[2], U.map[3])
      surface.vec4('uLFmap2', U.map2[0], U.map2[1], U.map2[2], U.map2[3])
      // x,y: the whisker at the point itself, in device pixels — NOT a haze across the corridor.
      // z: a slight depth fade, as the reference has. w: the softness of the field's own edge.
      // x,y: the whisker at the point itself, in device pixels. The rays are left alone everywhere else; this
      // takes out only the last band, where the spacing is under two pixels and no coverage answer can keep
      // neighbouring rays apart. z: a slight depth fade, as the reference has. w: the field's own edge.
      surface.vec4('uLFfade', 0.22, 0.85, 0.12, Math.max(8, V.W * 0.012))
      surface.vec4('uLFflow', q.flow[0], q.flow[1], q.flow[2], q.flow[3])
      surface.vec4('uLFband', st.layout.bands[0], st.layout.bands[1], st.layout.bands[2], st.layout.bands[3])
      // z: the field leaves exactly as the mark arrives, so the tip hands over rather than fading out early
      surface.vec4('uLFmode', 1, (a + b) / 2, 1 - q.mark, 0)
      // the `dense` break sends the full field down the corridor, which is the fault this revision was about
      surface.vec2('uLFthin', LF_ROW_KEEP, broke === 'dense' ? 0 : q.thin)
      surface.vec4('uLFline', V.H * 0.5, 2.4 + (0.85 - 2.4) * q.grow, lineAmt, Math.max(2.4, (b - a) / 2))
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

  /*
   * ── PACING ──────────────────────────────────────────────────────────────────────────────────────────────
   *
   * All of it is in linefield/input.js, because Phase C drives the same progress from the site's own wheel,
   * touch and key handling and it has to feel the same there. This entry supplies only the two things that are
   * its own: where a frame is drawn, and how far a finger travels on this canvas.
   */
  let trace = null
  const pacer = createPacer((v) => {
    p = v
    if (trace) trace.push([performance.now(), v])
    show()
    draw()
  }, () => LF_TOUCH_SPAN(V.H))
  const setProgress = (v) => pacer.set(clamp01(v))

  scrub.addEventListener('input', () => setProgress(Number(scrub.value) / 1000))
  addEventListener('wheel', (e) => {
    if (e.target === scrub) return
    e.preventDefault()
    pacer.wheel(e)
  }, { passive: false })
  addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); pacer.nudge(LF_KEY_STEP) }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); pacer.nudge(-LF_KEY_STEP) }
    if (e.key === 'Home') setProgress(0)
    if (e.key === 'End') setProgress(1)
  })

  /*
   * AND A FINGER MOVES IT — and lets go of it. The drag is one to one with the finger at the tuned distance;
   * a flick hands the pacer a velocity and the scene carries on and decelerates, which is what a phone
   * expects and what the old build did not do.
   */
  host.addEventListener('pointerdown', (e) => {
    if (e.target === scrub || dock.contains(e.target)) return
    pacer.dragStart(e.clientY)
    host.setPointerCapture?.(e.pointerId)
  })
  host.addEventListener('pointermove', (e) => pacer.dragMove(e.clientY))
  host.addEventListener('pointerup', () => pacer.dragEnd())
  host.addEventListener('pointercancel', () => pacer.dragEnd())
  let rt
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); setProgress(p) }, 140) })

  /*
   * THE HARNESS ASKS THE SCENE, not a screenshot of it. Frame time is measured around the draw itself, and a
   * sweep can be driven at an exact progress so two runs photograph the same moment.
   */
  window.__lf = {
    setProgress,
    nudge: (dv) => pacer.nudge(dv),
    // the tuning, so a report quotes the values the build actually runs on rather than the ones it was told
    input: () => ({
      follow: LF_FOLLOW,
      momentumTau: LF_MOMENTUM_TAU,
      maxVel: LF_MAX_VEL,
      wheelSpan: LF_WHEEL_SPAN,
      touchSpan: LF_TOUCH_SPAN(V.H),
      keyStep: LF_KEY_STEP,
    }),
    touchSpan: () => LF_TOUCH_SPAN(V.H),
    velocity: () => pacer.velocity,
    /*
     * EVERY FRAME THAT WAS DRAWN, with the time it was drawn at.
     *
     * "A flick must never skip the collapse" is a statement about frames, not about where the progress ends up,
     * and no screenshot can answer it. With the trace on, the harness can ask what the largest single-frame
     * step was and whether a frame was actually drawn at the crossing.
     */
    trace: (on) => { trace = on ? [] : null; return trace },
    traced: () => trace || [],
    get progress() { return p },
    get target() { return pacer.target },
    faceOk,
    rowKeep: LF_ROW_KEEP,
    frameMs: () => (times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0),
    worstMs: () => (times.length ? Math.max(...times) : 0),
    resetTimes: () => { times.length = 0 },
    sequence: () => sequence(p, V.W),
    // the colour a pixel carrying nothing comes out: what "ground only" means, exactly, rather than sampled
    ground: () => {
      const st = sequence(p, V.W).back ? back : front
      return st.paper.map((c) => Math.round(c * 255))
    },
    // and the colour a pixel carrying a letter comes out: full ink, which is what a word is made of
    inkColour: () => {
      const st = sequence(p, V.W).back ? back : front
      return st.ink.map((c) => Math.round(c * 255))
    },
    // where the corridor's image ENDS, so a harness can look on the right side of it
    vp: () => {
      const q = sequence(p, V.W)
      const [vx, vy] = vanishingPoint(V.W, V.H, q.depth, q.side)
      return { vx, vy, side: q.side, depth: q.depth }
    },
    // and the whole band of columns the map can reach: outside it there is no solution and nothing may be drawn
    image: () => {
      const q = sequence(p, V.W)
      const [lo, hi] = corridorImage(V.W, q.depth, q.side, q.pull)
      return { lo, hi, mark: q.mark, grow: q.grow, pull: q.pull, lineY: V.H * 0.5 }
    },
    spacing: () => ({ back: back.spacing, front: front.spacing, cap: back.layout.cap }),
    strip: () => V.strip,
    // the dock is this entry's own furniture; a harness measuring where the WORDS are has to be able to
    // take it out of the frame, or it measures the dock
    dock: (on) => { dock.style.display = on ? 'flex' : 'none' },
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
