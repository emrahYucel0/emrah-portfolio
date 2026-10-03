/*
 * ── CROSS SECTION, ON ITS OWN (Phase B) ─────────────────────────────────────────────────────────────────────
 *
 * The scene with nothing else attached to it: its own canvas and its own surface, so the index spine, the stops
 * and the gestures are untouched. Reached only as `?cross=1` on a locale route, in development, in a build where
 * __CROSS__ is true. Modelled on linefield/debug.js, including its once-only mount.
 *
 *   ?csatmo=0|1        without / with the reference's warm glow at the crossing (R14 decision 4; default 1)
 *   ?steps=1..8        how many gestures carry EDGE around the line (default CS_ORBIT_STEPS = 2)
 *   ?cstempo=step|scroll  one gesture per free part (default), or the reference's continuous scroll
 *   ?csbreak=grad      calibration: the gradient handed to the rows is wrong (constant), so foreshortened rows
 *                      are anti-aliased as if they were flat. A shimmer or moiré measure must read it worse.
 */
import '@fontsource-variable/big-shoulders-display'
import { createSurface } from '../surface.js'
import { CS_ORBIT_STEPS, CS_Z0, CS_Z1, bandStops, louverClock } from './slats.js'
import { createCross } from './runtime.js'
import { CS_FREE_PX, CS_FREE_RATE, CS_QUIET, CS_STEP_GAP, CS_STEP_TH, createPacer } from './input.js'
import { FAMILY } from '../states.js'

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

export function mountCross() {
  window.__csMounting ??= mount()
  return window.__csMounting
}

async function faceReady() {
  try {
    await document.fonts.load(`900 100px "Big Shoulders Display Variable"`)
    const c = document.createElement('canvas').getContext('2d')
    c.font = `900 100px ${FAMILY}`; const a = c.measureText('SURFACE').width
    c.font = '900 100px Impact'; const b = c.measureText('SURFACE').width
    return Math.abs(a - b) > 1
  } catch { return false }
}

async function mount() {
  const qs = new URLSearchParams(location.search)
  const atmo = qs.get('csatmo') !== '0'
  const stepsQ = Number.parseInt(qs.get('steps') ?? '', 10)
  const steps = stepsQ >= 1 && stepsQ <= 8 ? stepsQ : CS_ORBIT_STEPS
  const breakName = qs.get('csbreak')

  const host = document.createElement('div')
  host.id = 'cs'
  host.style.cssText = 'position:fixed;inset:0;z-index:60;background:#efeee9;overflow:hidden;touch-action:none;user-select:none'
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
  host.appendChild(canvas)
  const sr = document.createElement('p')
  sr.style.cssText = 'position:absolute;left:-9999px'
  sr.textContent = 'The page is made of thin slats. SURFACE is printed on their fronts and DEPTH on their backs. Scrolling turns them over; halfway, they are seen edge-on, and only their copper edges and a copper line remain, around which the word EDGE turns.'
  host.appendChild(sr)
  document.body.appendChild(host)
  document.documentElement.dataset.c2 = 'off'

  const faceOk = await faceReady()
  const surface = createSurface(canvas)
  await surface.ready
  const cross = createCross(surface, { atmosphere: atmo, breakName })
  await cross.prepare()
  surface.use('slats')
  host.appendChild(cross.dom)

  // the site's strips, as furniture: the scene runs between them and the material never crosses into one
  const bar = (top) => {
    const b = document.createElement('div')
    b.style.cssText = `position:absolute;left:0;right:0;${top ? 'top' : 'bottom'}:0;z-index:10;display:flex;align-items:center;`
      + 'justify-content:space-between;padding:0 clamp(18px,2.6vw,42px);font:400 10px/1.4 "Geist Mono",ui-monospace,Consolas,monospace;'
      + `letter-spacing:.08em;border-${top ? 'bottom' : 'top'}:1px solid rgba(18,18,18,.14)`
    return b
  }
  const topbar = bar(true), bottombar = bar(false)
  topbar.innerHTML = '<span>EMRAH YÜCEL</span><span>TR / EN</span>'
  bottombar.innerHTML = '<span data-where>İŞLER</span><span data-side>CROSS SECTION</span>'
  host.append(topbar, bottombar)

  const V = { W: 1, H: 1, u: 1, P: false, T: false, S: false, dpr: 1, pad: 18, strip: 50 }
  const measure = () => {
    V.W = innerWidth; V.H = innerHeight
    V.P = V.W < V.H * 0.8; V.T = V.P && V.W >= 700; V.S = !V.P && V.H < 520
    V.dpr = Math.min(devicePixelRatio || 1, V.W < 700 ? 1.75 : 1.5)
    V.strip = V.P && !V.T ? 44 : 50
    for (const b of [topbar, bottombar]) b.style.height = `${V.strip}px`
    surface.resize(V.W, V.H, V.dpr)
    // the physics grid at rest: displacement at its midpoint, everything else zero (see linefield/debug.js)
    const grid = new Uint8Array(4 * 4 * 4)
    for (let i = 0; i < grid.length; i += 4) grid[i] = 128
    surface.phys({ data: grid, cols: 4, rows: 4, cell: Math.max(V.W, V.H) / 3 })
    cross.build(V)
  }
  measure()

  // ── the frame ───────────────────────────────────────────────────────────────────────────────────────────────
  let p = 0, control = false
  const times = []
  const chrome = () => {
    const ps = louverClock(p), night = ps > 0.42
    for (const b of [topbar, bottombar]) {
      b.style.color = night ? '#e7e6e0' : '#121212'
      b.style.borderColor = night ? 'rgba(231,230,224,.16)' : 'rgba(18,18,18,.14)'
    }
    bottombar.querySelector('[data-where]').textContent = ps < 0.5 ? 'İŞLER' : 'LAB'
    host.style.background = `rgb(${cross.gap().map((c) => Math.round(c * 255)).join(',')})`
  }
  const draw = () => {
    const t0 = performance.now()
    cross.at(p)
    if (control) {
      // the control: the same state through the BASE program — what an ordinary flat place on this site costs
      surface.use(null); surface.pair(cross.front, cross.front, 1); surface.beneath(cross.front)
      surface.features = []; surface.strip = V.strip; surface.onBeforeDraw = null
      surface.render()
    } else cross.render()
    times.push(performance.now() - t0)
    if (times.length > 120) times.shift()
    chrome()
  }

  // ── the dock ────────────────────────────────────────────────────────────────────────────────────────────────
  const dock = document.createElement('div')
  dock.style.cssText = 'position:absolute;left:50%;bottom:calc(var(--cs-strip,50px) + 14px);z-index:61;transform:translateX(-50%);display:flex;'
    + 'flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;padding:8px 10px;background:rgba(239,238,233,.94);color:#121212;'
    + 'border:1px solid rgba(18,18,18,.14);font:400 10px/1 ui-monospace,Consolas,monospace;max-width:calc(100vw - 24px)'
  host.style.setProperty('--cs-strip', `${V.strip}px`)
  const btn = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'border:0;background:transparent;font:inherit;padding:6px 4px;cursor:pointer;min-height:32px'; b.onclick = fn; return b }
  const scrub = document.createElement('input')
  scrub.type = 'range'; scrub.min = '0'; scrub.max = '1000'; scrub.value = '0'
  scrub.style.cssText = 'width:clamp(90px,20vw,260px);accent-color:#b8622f'
  const pct = document.createElement('span')
  pct.style.cssText = 'min-width:96px;text-align:right;font-variant-numeric:tabular-nums'
  const note = document.createElement('span')
  note.textContent = faceOk ? '' : 'FONT FALLBACK'
  note.style.color = '#b8622f'

  let trace = null
  const pacer = createPacer((v) => {
    p = v
    if (trace) trace.push([performance.now(), v, pacer.stop])
    show(); draw()
  }, { steps, tempo: qs.get('cstempo') === 'scroll' ? 'scroll' : 'step' })
  const setProgress = (v) => pacer.set(clamp01(v))

  const atmoBtn = btn(atmo ? 'GLOW ON' : 'GLOW OFF', () => { cross.setAtmosphere(!cross.atmosphere); atmoBtn.textContent = cross.atmosphere ? 'GLOW ON' : 'GLOW OFF'; draw() })
  const tempoBtn = btn(`TEMPO ${pacer.tempo.toUpperCase()}`, () => { pacer.tempo = pacer.tempo === 'step' ? 'scroll' : 'step'; tempoBtn.textContent = `TEMPO ${pacer.tempo.toUpperCase()}` })
  const ZS = bandStops(steps)
  const stopBtns = ZS.map((_, i) => btn(i === 0 ? 'BEHIND' : i === ZS.length - 1 ? 'FRONT' : `STOP ${i}`, () => pacer.toStop(i)))
  let playing = 0
  const play = (from, to, ms) => new Promise((resolve) => {
    const t0 = performance.now(), id = ++playing
    const step = () => {
      if (id !== playing) return resolve()
      const k = clamp01((performance.now() - t0) / ms)
      setProgress(from + (to - from) * k)
      if (k < 1) requestAnimationFrame(step); else resolve()
    }
    step()
  })
  dock.append(
    btn('0', () => setProgress(0)), btn('PLAY', () => play(p >= 0.999 ? 0 : p, 1, 6000 * (1 - (p >= 0.999 ? 0 : p)))), btn('BACK', () => play(p, 0, 6000 * p)),
    scrub, pct, ...stopBtns, btn('1', () => setProgress(1)), atmoBtn, tempoBtn, note,
    btn('HIDE', () => { dock.style.display = 'none' }),
  )
  host.appendChild(dock)
  const show = () => {
    scrub.value = String(Math.round(p * 1000))
    const ms = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0
    pct.textContent = `${(p * 100).toFixed(1)}%${pacer.stop >= 0 ? ` · stop ${pacer.stop}` : ''} · ${ms.toFixed(1)}ms`
  }

  scrub.addEventListener('input', () => { playing++; setProgress(Number(scrub.value) / 1000) })
  addEventListener('wheel', (e) => { if (e.target === scrub) return; e.preventDefault(); playing++; pacer.wheel(e) }, { passive: false })
  addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); pacer.impulse(140, true) }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); pacer.impulse(-140, true) }
    if (e.key === 'Home') setProgress(0)
    if (e.key === 'End') setProgress(1)
    if (e.key === 'h' || e.key === 'H') dock.style.display = dock.style.display === 'none' ? 'flex' : 'none'
  })
  host.addEventListener('pointerdown', (e) => {
    if (dock.contains(e.target)) return
    playing++
    pacer.dragStart(e.clientY)
    host.setPointerCapture?.(e.pointerId)
  })
  host.addEventListener('pointermove', (e) => pacer.dragMove(e.clientY, V.H))
  host.addEventListener('pointerup', () => pacer.dragEnd())
  host.addEventListener('pointercancel', () => pacer.dragEnd())
  let rt
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); host.style.setProperty('--cs-strip', `${V.strip}px`); draw() }, 140) })

  // ── what a harness can ask ─────────────────────────────────────────────────────────────────────────────────
  const gl = surface.gl
  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
  const sync = () => { const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px) }
  const frameAt = (v, ctl) => { const keep = control; control = ctl; p = v; draw(); control = keep }

  window.__cs = {
    setProgress,
    impulse: (dy, fresh) => pacer.impulse(dy, fresh),
    toStop: (i) => pacer.toStop(i),
    get progress() { return p },
    get stop() { return pacer.stop },
    get tempo() { return pacer.tempo },
    set tempo(m) { pacer.tempo = m },
    faceOk, renderer, steps, breakName,
    constants: () => ({ Z0: CS_Z0, Z1: CS_Z1, steps, stops: ZS, freePx: CS_FREE_PX, freeRate: CS_FREE_RATE, quiet: CS_QUIET, stepTh: CS_STEP_TH, stepGap: CS_STEP_GAP }),
    layout: () => { const L = cross.layout; return { count: L.count, pitch: L.pitch, spacing: L.spacing, strip: L.strip, h: L.h, W: L.W, H: L.H, dpr: V.dpr, backing: [canvas.width, canvas.height] } },
    pose: () => { const Q = cross.pose; return { p: Q.p, ps: Q.ps, peak: Q.peak, dark: Q.dark, rots: Q.louvers.map((l) => l.rot) } },
    setAtmosphere: (on) => { cross.setAtmosphere(on); atmoBtn.textContent = on ? 'GLOW ON' : 'GLOW OFF'; draw() },
    get atmosphere() { return cross.atmosphere },
    dock: (on) => { dock.style.display = on ? 'flex' : 'none' },
    chrome: (on) => { for (const b of [topbar, bottombar]) b.style.visibility = on ? 'visible' : 'hidden'; cross.dom.style.visibility = on ? 'visible' : 'hidden' },
    word: () => { const r = cross.dom.querySelector('.cs-word').getBoundingClientRect(); const s = getComputedStyle(cross.dom.querySelector('.cs-word')); return { x: r.x, y: r.y, w: r.width, h: r.height, opacity: +s.opacity, z: s.zIndex } },
    line: () => +getComputedStyle(cross.dom.querySelector('.cs-line')).opacity,
    trace: (on) => { trace = on ? [] : null; return trace },
    traced: () => trace || [],
    play,
    frameMs: () => (times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0),
    /*
     * THE COST, measured three ways — and what each one is NOT.
     *
     * sync(): n frames, each followed by a one-pixel readPixels, which waits for the GPU to finish the frame. The
     *   time is CPU submission + GPU execution + the readback's own round trip; it is an upper bound on the
     *   GPU's work and the only one that cannot be fooled by the compositor.
     * gpu(): EXT_disjoint_timer_query_webgl2 where the browser exposes it — the GPU's own clock for the draw.
     * raf(): a continuous sweep on requestAnimationFrame; intervals cannot go below the refresh period, so this
     *   is KEEPING UP, not cost. It is what the pass criterion is stated in.
     *
     * Every mode has its CONTROL: the same front state through the base program, at the same size.
     */
    sync: (n = 90, ctl = false, from = 0, to = 1) => {
      const out = []
      for (let i = 0; i < n; i++) {
        const v = n > 1 ? from + ((to - from) * i) / (n - 1) : from
        const t0 = performance.now(); frameAt(v, ctl); sync(); out.push(performance.now() - t0)
      }
      return out
    },
    gpu: (n = 90, ctl = false, from = 0, to = 1) => new Promise((resolve) => {
      const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2')
      if (!ext) { resolve(null); return }
      const qs2 = []
      let i = 0
      const issue = () => {
        if (i < n) {
          const v = n > 1 ? from + ((to - from) * i) / (n - 1) : from
          const q = gl.createQuery()
          gl.beginQuery(ext.TIME_ELAPSED_EXT, q); frameAt(v, ctl); gl.endQuery(ext.TIME_ELAPSED_EXT)
          qs2.push(q); i++
          requestAnimationFrame(issue)
          return
        }
        const collect = () => {
          if (!qs2.every((q) => gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE))) { requestAnimationFrame(collect); return }
          const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT)
          resolve({ disjoint, ms: qs2.map((q) => gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6) })
          qs2.forEach((q) => gl.deleteQuery(q))
        }
        collect()
      }
      issue()
    }),
    raf: (ms = 4000, ctl = false, from = 0, to = 1) => new Promise((resolve) => {
      const iv = []
      const t0 = performance.now()
      let last = t0
      const step = (now) => {
        iv.push(now - last); last = now
        const k = clamp01((now - t0) / ms)
        frameAt(from + (to - from) * k, ctl)
        if (k < 1) requestAnimationFrame(step); else resolve(iv.slice(2))
      }
      requestAnimationFrame((now) => { last = now; step(now) })
    }),
  }
  setProgress(0)
  return window.__cs
}
