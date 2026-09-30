// EMRAH YÜCEL — C2-SURFACE
// Original C2: one raster of rows; every state is a plate; scroll rescans the page. Here that raster is a material:
//   CONSERVATION  rows are never made or lost — opening space pushes rows somewhere
//   PRESSURE/LOAD holding loads the rows; SATURATION: where rows crowd they fuse; YIELD: past capacity it gives way
//   EXPOSURE      where material has left, what is underneath shows exactly as it is
//   REGISTRATION  information is split across the two row sets and only resolves where they agree
//   MEMORY        the sheet keeps what happened: scars, rooms, the ink of opened work, the room it once made for Emrah
//   NEGATIVE      beneath the creative face is the system face
//   RELEASE       load → saturation → yield → the material is taken away → the real work
import '@fontsource-variable/big-shoulders-display'
import '@fontsource-variable/geist'
import '@fontsource/geist-mono/400.css'
import './style.css'
import gsap from 'gsap'
import { createSurface, feature, gather, squeeze } from './surface.js'
import { createFlat, paintFlat } from './flat.js'
import { createPhysics } from './physics.js'
import * as ST from './states.js'
import { framesFor, GEOM, ABSENT, psiHTML } from './world.js'
import { identity, about, capabilities, workIntro, works, lab, contact, previewOf, ui as TXT, applyLocale } from './content.js'
import { termHtml } from '../../shared/content/term'
import { mediaElement, placeMedia, loadImage, prepareTone, setMediaScale } from './media.js'

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
const TOUCH = matchMedia('(pointer: coarse)').matches
const RM = REDUCED ? 5 : 1
if (REDUCED) gsap.globalTimeline.timeScale(6)
// POST-M5 PERF: authored time is real time. Where a frame takes most of a second (WebGL rendered in software), GSAP's
// default lag smoothing (a gap over 500 ms advances only 33 ms) and a 50 ms frame step stretched the 3.5 s opening to
// ~26 s. Gaps up to STALL now advance by the time that passed; a longer gap is a stall (a hidden tab, a debugger) and
// is still smoothed. At 60 fps nothing changes.
const STALL = 2
gsap.ticker.lagSmoothing(STALL * 1000, 33)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt))
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t) }
const ez = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
// M5: a device only vibrates after the visitor has interacted; before that Chrome logs every call as an error
const haptic = (p) => { try { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; navigator.vibrate?.(p) } catch {} }
const $ = (s, r = document) => r.querySelector(s)
const inRect = (x, y, r, m = 0) => x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m
const idle = typeof requestIdleCallback === 'function' ? (f) => requestIdleCallback(f, { timeout: 700 }) : (f) => setTimeout(() => f({ timeRemaining: () => 12 }), 40)

// routes: /about is a state of the same surface, so this visit's history survives going there and coming back
// M1 TRANSPLANT: the host application owns routing (its routes are locale-prefixed) and receives the
// semantic checkpoints. The defaults below reproduce the standalone prototype exactly.
const ROOT = location.pathname.replace(/about\/?$/, '') || '/'
let HOME_URL = ROOT + location.search, ABOUT_URL = `${ROOT}about${location.search}`, LAB_URL = `${ROOT}lab${location.search}`
let isAboutPath = () => /\/about\/?$/.test(location.pathname)
/**
 * The place the visitor asked for on their way back from the Lab. The bench is a route of its own, so leaving it
 * is a route change and the runtime is mounted again already owing the visitor a destination. The host keeps that
 * intent on the history entry — not in the URL — and hands it over here, once.
 */
let takeArrival = () => null
const HOST = {
  push: (url, state) => history.pushState(state, '', url),
  // replacing the current entry, for a change of URL that is not a step the visitor took
  replace: (url, state) => history.replaceState(state, '', url),
  back: () => history.back(),
  emit: () => {},
  // M2: the same page in the other language, supplied by the host (the runtime never builds locale URLs)
  localeHref: '',
}
export function configure(o = {}) {
  if (o.homeUrl) HOME_URL = o.homeUrl
  if (o.aboutUrl) ABOUT_URL = o.aboutUrl
  if (o.labUrl) LAB_URL = o.labUrl
  if (o.isAboutPath) isAboutPath = o.isAboutPath
  if (o.arrival) takeArrival = o.arrival
  if (o.push) HOST.push = o.push
  if (o.replace) HOST.replace = o.replace
  if (o.back) HOST.back = o.back
  if (o.emit) HOST.emit = o.emit
  if (o.localeHref) { HOST.localeHref = o.localeHref; if (D.lang) D.lang.href = o.localeHref }
}
// document titles follow the active language; the host sets them on its own route changes too
const TITLE = () => TXT.meta.home.title, TITLE_ABOUT = () => TXT.meta.about.title

const canvas = $('#surface')
// POST-M5 PERF — SOFTWARE RENDERER PROBE. Before the full-size surface exists, a 1×1 canvas asks the graphics stack one
// question: is WebGL here rendered in software? Two signals, either is enough: the browser refuses a context that
// asks to fail on a major performance caveat, or the renderer names a known software rasteriser. Nothing is sent or
// kept; both probe contexts are released at once. Browser, user agent or automation are never looked at.
const SOFTWARE_GL = (() => {
  const release = (gl) => { try { gl?.getExtension('WEBGL_lose_context')?.loseContext() } catch {} }
  const probe = () => { const c = document.createElement('canvas'); c.width = c.height = 1; return c }
  let strict = null, plain = null, soft = false
  try {
    strict = probe().getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (!strict) soft = true
    const gl = strict || (plain = probe().getContext('webgl2') || probe().getContext('webgl'))
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    if (info && /swiftshader|llvmpipe|softpipe|basic render driver/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)))) soft = true
  } catch {}
  release(strict); release(plain)
  return soft
})()
// Reduced motion draws the surface directly in 2D (flat.js): the visible pixels are produced by that renderer, so
// there is no WebGL frame to present and nothing that can be presented late. Normal motion is the WebGL engine,
// unchanged. The two renderers take the same state objects and the same features — one composition, two renderers.
const surface = REDUCED ? createFlat(canvas) : createSurface(canvas)
const phys = createPhysics()

const V = { W: 1, H: 1, u: 1, P: false, T: false, S: false, dpr: 1, pad: 36, strip: 50 }
// M3 SAFE-AREA — a notch, rounded corners or a home indicator (viewport-fit=cover) take room from the screen edges.
// Read from CSS env() on every measure; on a screen without them every inset is 0 and nothing below changes.
let safeProbe = null
function safeInsets() {
  if (!safeProbe) {
    safeProbe = document.createElement('div')
    safeProbe.setAttribute('aria-hidden', 'true')
    safeProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'
    document.body.appendChild(safeProbe)
  }
  const cs = getComputedStyle(safeProbe), n = (v) => Math.round(parseFloat(v) || 0)
  return { t: n(cs.paddingTop), r: n(cs.paddingRight), b: n(cs.paddingBottom), l: n(cs.paddingLeft) }
}
function measure() {
  // M3 RESPONSIVE GEOMETRY — the large-screen limit. Past 1920 × 1080 the composition does not keep spreading: every
  // fixed measure (type, blocks, rooms, rows) would stay 1080p-sized in an ever larger field of material. The surface is
  // composed at the largest authored size (a 1920-wide or 1080-high field, whichever the screen reaches first) and that
  // composition is shown at the screen's own size — at most 1.6×, so a 4K or ultrawide screen still gains real room.
  // At 1920 × 1080 and below u is exactly 1 and nothing changes.
  const u = V.u = clamp(Math.min(innerWidth / 1920, innerHeight / 1080), 1, 1.6)
  V.W = Math.round(innerWidth / u); V.H = Math.round(innerHeight / u)
  for (const el of [document.getElementById('ui'), document.getElementById('media')]) {
    if (!el) continue
    Object.assign(el.style, u > 1
      ? { right: 'auto', bottom: 'auto', width: `${V.W}px`, height: `${V.H}px`, transform: `scale(${innerWidth / V.W})`, transformOrigin: '0 0' }
      : { right: '', bottom: '', width: '', height: '', transform: '', transformOrigin: '' })
  }
  setMediaScale(u)
  V.P = V.W < V.H * 0.8
  // M3 RESPONSIVE GEOMETRY — two composition classes the portrait / landscape split did not have. A tablet held upright
  // is portrait, but not a phone: it keeps the portrait laws with its own measure and its own (tablet) captures.
  // A phone on its side is landscape, but has less height than any laptop: the landscape laws, packed tighter.
  V.T = V.P && V.W >= 700
  V.S = !V.P && V.H < 520
  V.dpr = Math.min(devicePixelRatio || 1, V.W < 700 ? 1.75 : 1.5)
  const safe = V.safe = safeInsets()
  // the composition stays symmetrical: the larger side inset moves both margins, the larger of top/bottom both strips
  V.pad = Math.max(V.T ? clamp(V.W * 0.04, 28, 48) : V.P ? 18 : clamp(V.W * 0.025, 16, 36), safe.l, safe.r)
  V.strip = (V.P && !V.T ? 44 : 50) + Math.max(safe.t, safe.b)
  document.documentElement.dataset.c2Shape = V.T ? 'tablet' : V.P ? 'phone' : V.S ? 'short' : 'wide'
  const root = document.documentElement.style
  root.setProperty('--pad', `${V.pad}px`)
  root.setProperty('--strip', `${V.strip}px`)
  root.setProperty('--safe-t', `${safe.t}px`)
  root.setProperty('--safe-b', `${safe.b}px`)
}

/*
 * ── THE STOPS ARE NAMED, NOT NUMBERED ────────────────────────────────────────────────────────────────────────
 *
 * The index is a spine of places, and for the life of this site their positions have been written as the numbers
 * 0 to 5 wherever they were needed — in the travel, in the arrivals, in the hints, in the focus tables, in the
 * physics. That was survivable while the list never changed. It stops being survivable the moment a place is
 * INSERTED: every number after it means a different place, and nothing in the source says so.
 *
 * So the spine is a list of names and every position is derived from it. The rule this project works to now is
 * that stops are named, not numbered — see CLAUDE.md. Adding, removing or reordering a place is an edit to this
 * one list.
 */
const LINEFIELD = typeof __LINEFIELD__ !== 'undefined' && __LINEFIELD__
const SPINE = LINEFIELD
  ? ['name', 'creative', 'system', 'linefield', 'work', 'lab', 'rest']
  : ['name', 'creative', 'system', 'work', 'lab', 'rest']
const STOP = Object.fromEntries(SPINE.map((n, i) => [n, i]))
// the corridor and everything it is made of, loaded once at boot and only where the flag is on
let LF = null
/*
 * THE ONE PLACE THE NAME IS WRITTEN. Everything else says LFS, so with the flag off this whole expression folds
 * to -1 at build time and the word does not appear in the published JavaScript at all — which is the gate this
 * feature has been held to since Phase A, and a stop number compared against -1 is simply never any stop.
 */
const LFS = LINEFIELD ? STOP.linefield : -1
const LAST = SPINE.length - 1
const N = works.length
let IDX = [], WORKS = [], WORLD = {}, FR = {}, BLANK = null, MEDIA = {}, BRIDGE = null
const framesOf = (k) => (FR[k] ??= framesFor(V, works[k]))
const lastFrame = (k = A.k) => framesOf(k).length - 1
const worldFor = (k) => {
  if (!WORLD[k]) {
    const w = works[k]
    let open = null
    WORLD[k] = framesOf(k).map((fr, i) => {
      if (fr.full) return ST.worldFull(V, w, k)
      if (fr.g === 'full') return ST.worldSurface(V, w, k, fr, i)
      return (open ??= ST.worldOpen(V, w, k))
    })
  }
  return WORLD[k]
}

const A = {
  mode: 'intro', busy: false,
  p: 0, pT: 0, base: 0, prevBase: 0, wp: 0, wpT: 0, wbase: 0, gesture: false, lastInput: -1e9, exitAccum: 0,
  from: null, to: null, front: 1, k: 0,
  features: new Set(), press: null, about: null, aboutOpen: false, aboutDetail: false, detailPushed: false, squeeze: null, introF: null,
  world: gather(), worldOn: false, faceF: feature({ kind: 1 }),
  constrained: false, timeHeld: 0,   // POST-M5 PERF: render capacity (see noteFrame)
  staticHero: false,                 // POST-M5 PERF: software renderer, WebGL not yet drawn (see startStaticHero)
  introReg: 1, nameAmp: 1, restReg: 0, restOpen: 0, nextReg: 1, nextArmed: false, regDrag: 0, regDragT: 0, quality: {}, shiver: 0,
  wt: 0, wT: 0, wLocked: -1, visited: new Set(), visitOrder: [], releaseK: null,
  yieldMarks: [], seeded: 0, aboutMark: null,
  learned: { open: false, face: false, work: false, pinch: false, lab: false, world: false, next: false }, arrivedAt: 0,
  pending: null, lastIdx: 0, lastTo: null, cleared: false,
  // the Lab stop hands over to the bench when travel settles on it, never when a state is restored onto it
  labArmed: false, hush: 0,
  aboutDetailK: 0, bridgeF: null, bridgePK: 0,
  // LINEFIELD: the passage's own progress, 0 at the backend field and 1 at the frontend one. It is to this
  // place what A.wt is to the work field — the axis INSIDE the stop, which the spine does not travel.
  lfp: 0, lfExit: 0,
}
const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0, hover: false, touch: false, down: false, downT: 0, sx: 0, sy: 0, moved: 0, axis: null, rub: 0, ui: false }
const touches = new Map()

// ─── build ───────────────────────────────────────────────────────────────────
const hexArr = (h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255)
// the surface carries an interface from its small tone source; the full-size image is only ever the pristine media
const loadItem = async (it) => { if (it && !it.im) it.im = await loadImage(it.toneSrc); return it }
// what a world carries as material (a page as tone) is prepared before that world's textures are built
function prepareWorld(k) {
  const items = [...new Set(framesOf(k).filter((f) => f.tone).map((f) => f.tone.item))]
  return Promise.all(items.map(loadItem)).then(() => Promise.all(items.map((it) => prepareTone(it.im)))).then(() => {
    if (!WORLD[k]) return
    framesOf(k).forEach((fr, i) => { if (fr.tone && WORLD[k][i]?.c?.tex) surface.release(WORLD[k][i]) })
    lastSig = ''
  })
}
// previews load before the surface starts; their tone is prepared in a worker in the background, and nothing that
// needs it is built until it is ready — the opening never shares the main thread with image processing
let tonesReady = Promise.resolve()
const ensurePreviews = async () => {
  const items = [...new Set(works.map((w) => previewOf(w, V.P, V.T)))]
  await Promise.all(items.map(loadItem))
  tonesReady = Promise.all(items.map((it) => prepareTone(it.im)))
}

function rebuild() {
  const old = new Set([...IDX, ...WORKS, ...Object.values(WORLD).flat(), BLANK])
  BLANK = ST.blank(V)
  WORKS = works.map((w, i) => ST.workState(V, w, i))
  // the spine, built from its names: one entry per SPINE name, in SPINE order
  const PLACE = {
    name: () => ST.name(V),
    creative: () => ST.face(V, 'surface'),
    system: () => ST.face(V, 'system'),
    work: () => WORKS[0],
    lab: () => ST.labState(V),
    rest: () => ST.rest(V, A.visitOrder, A.aboutMark),
    ...(LINEFIELD ? { linefield: () => LF.build(V, TXT.linefield) } : {}),
  }
  IDX = SPINE.map((n) => PLACE[n]())
  if (REDUCED) for (const s of IDX) s.ampK = 0
  capReset()
  WORLD = {}; FR = {}
  for (const list of Object.values(MEDIA)) list.flat().forEach((me) => me.el.remove())
  MEDIA = {}; mediaShown = ''
  old.forEach((s) => { if (s) { s.dead = true; surface.release(s) } })
  surface.resize(V.W, V.H, V.dpr * V.u)
  phys.resize(V.W, V.H)
  lastSig = ''
  works.forEach((w, i) => { if (i < 12) surface.inks.set(hexArr(w.ink), i * 3) })
  gsap.killTweensOf(A)
  A.features.forEach((f) => gsap.killTweensOf(f)); A.features.clear()
  A.press = null; A.squeeze = null; A.busy = false; A.shiver = 0; A.introF = null; A.nameAmp = REDUCED ? 0 : 1
  if (A.aboutOpen) { A.about = aboutFeature(1); A.features.add(A.about) }
  if (BRIDGE) { BRIDGE.dead = true; surface.release(BRIDGE); BRIDGE = null }
  if (A.mode === 'bridge') { A.mode = 'index'; A.p = A.pT = A.base = A.prevBase = STOP.lab; A.bridgeF = null; A.bridgePK = 1 }
  if (A.mode === 'intro') { A.mode = 'index'; A.introReg = 0 }
  if (A.staticHero) { A.nameAmp = 0; paintStaticHero() }
  if (A.mode === 'exit') { A.mode = 'index'; A.p = A.pT = A.base = A.prevBase = STOP.work; A.worldOn = false }
  if (A.base === STOP.rest) A.restOpen = 1
  layoutDOM()
  if (A.mode === 'world') { mediaFor(A.k); fillWorldDOM(A.k); Object.assign(A.world, worldGeom(A.wp)) }
  queueWarm([IDX[STOP.creative], IDX[STOP.system], IDX[STOP.lab], IDX[STOP.rest]])
  const built = WORKS
  tonesReady.then(() => { if (WORKS === built) queueWarm(WORKS.slice(0, 3)) })
}

// textures are built in idle time, one state at a time, so nothing is built on the frame it is first needed
const warmQ = []
let warming = false
function queueWarm(list) {
  for (const s of list) if (s && !s.dead && !warmQ.includes(s)) warmQ.push(s)
  if (!warming && warmQ.length) { warming = true; idle(warmStep) }
}
function warmStep(deadline) {
  // nothing is built while the opening plays
  if (A.mode === 'intro') { setTimeout(() => idle(warmStep), 400); return }
  let n = 0
  while (warmQ.length && (n === 0 || deadline.timeRemaining() > 14)) { const s = warmQ.shift(); if (!s.dead) { surface.warm(s); n++ } }
  if (warmQ.length) idle(warmStep); else warming = false
}

// ─── input ───────────────────────────────────────────────────────────────────
const settledAt = (i) => A.mode === 'index' && A.base === i && Math.abs(A.p - i) < 0.04
/*
 * scrollBy() speaks in STOPS: one unit is one place, and a 100px wheel notch is about 0.11 of one. The passage
 * speaks in its own units, where a 100px notch is 0.067 (see LF_WHEEL_SPAN). This is the ratio between them, so
 * the tuning measured in Phase B is the tuning the site runs on and there is not a second set of numbers.
 */
const LF_PUSH = 0.067 / (100 * 0.0011)
/** is a vertical finger right now the passage's own drag rather than travel between places */
/*
 * AND THE MODULE HAS TO BE THERE. LINEFIELD is a build-time constant and is what lets the bundler drop all of
 * this; LF is the module, and it arrives one dynamic import after the page does. The frame loop never runs
 * before it, but a pointerup, a key or a wheel can — WebKit found it as "null is not an object (evaluating
 * LF.drive)" on a pointer event during boot. Both guards, everywhere an event can reach LF.
 */
const lfDrag = () => LINEFIELD && LF && settledAt(LFS) && !A.busy && !A.aboutOpen
/*
 * A FINGER HELD AT EITHER END CARRIES ON ALONG THE SPINE. The drive clamps at 0 and 1, so a drag that has
 * arrived at an end would otherwise sit there pulling against nothing. What it pulls against is measured — the
 * finger's distance past where the end was reached — and once it is a real gesture's worth, the spine takes it.
 */
function lfEdge(now) {
  const t = LF.drive.target
  if (t > 0.0005 && t < 0.9995) { A.lfExit = 0; A.lfEdgeY = null; return }
  const dir = t > 0.5 ? 1 : -1
  A.lfEdgeY ??= ptr.y
  const past = (A.lfEdgeY - ptr.y) * dir
  if (past < V.H * 0.14) return
  A.lfEdgeY = null
  A.lfExit = 0
  LF.drive.stop()
  A.gesture = false
  A.leftWork = now
  endGesture()
  A.base = A.pT = clamp(LFS + dir, 0, LAST)
}
function scrollBy(d, touch = false) {
  const now = performance.now()
  // A gesture that already carried the visitor to this place does not also carry them past it. Leaving the Lab
  // hands over on the threshold, while the finger is still down and while a trackpad is still coasting, so the
  // runtime takes the screen back mid-gesture: what arrives here first is a tail with no gesture behind it. It is
  // spent, not obeyed — the hush re-arms for as long as the tail keeps coming and ends at the first real gap.
  if (A.hush) { if (now < A.hush) { A.hush = now + 140; return } A.hush = 0 }
  if (A.busy || A.squeeze || A.mode === 'intro') return
  // in the long About the wheel reads; it never throws the reader out of the room
  if (A.aboutOpen) { if (!A.aboutDetail && A.aboutDetailK < 0.01 && now - A.lastInput > 120) closeAbout(); A.lastInput = now; return }
  if (A.mode === 'index') {
    // the rest of a gesture that just carried the visitor off the work field does not also carry them past the next place
    if (now - (A.leftWork || 0) < 650) { A.lastInput = now; return }
    /*
     * THE PASSAGE IS THE STOP'S OWN AXIS, and scrolling drives it — the work field's rule, on the axis of travel
     * rather than across it. At either end the gesture is allowed a little further, and then it becomes what it
     * plainly is: the visitor continuing along the spine. One gesture stays one stop, because leaving sets
     * A.gesture false and arms the same tail guard the work field uses.
     */
    if (LINEFIELD && LF && settledAt(LFS)) {
      const t = LF.drive.target
      const atEnd = (d > 0 && t > 0.9995) || (d < 0 && t < 0.0005)
      if (atEnd) {
        A.lfExit += Math.abs(d)
        if (A.lfExit > LF.exitMargin) {
          A.lfExit = 0
          A.gesture = false
          A.leftWork = now
          A.base = A.pT = clamp(LFS + Math.sign(d), 0, LAST)
        }
        A.lastInput = now
        return
      }
      A.lfExit = 0
      LF.drive.push(d * LF_PUSH)
      A.lastInput = now
      return
    }
    // wheel tunes the work field; a finger tunes it sideways and swipes vertically between places
    if (settledAt(STOP.work) && !touch) {
      A.wT += d * 2.6   // two notches of a wheel carry one work out of register and the next one in
      A.lastInput = now
      // back off the near end of the work field is back to whatever place comes before it — which is Full-Stack
      // on a published build and the passage on a Linefield one. Named, so inserting a place cannot skip it.
      if (A.wT < -0.45) { A.wT = 0; A.base = STOP.work - 1; A.pT = A.base + 0.35; A.gesture = false; A.leftWork = now }
      else if (A.wT > N - 1 + 0.45) { A.wT = N - 1; A.gesture = false; startBridge() }
      return
    }
    // a finger swiping on past the work field carries the whole field into the Lab
    if (settledAt(STOP.work) && touch && d > 0) { A.bridgeAcc = (A.bridgeAcc || 0) + d; if (A.bridgeAcc > 0.12) { A.bridgeAcc = 0; startBridge() } A.lastInput = now; return }
    A.pT = clamp(A.pT + d, 0, LAST)
  } else if (A.mode === 'world') {
    const last = lastFrame()
    if (A.wbase === last && d > 0 && A.wp > last - 0.03) { A.exitAccum += d; if (A.exitAccum > 0.3) { A.exitAccum = 0; exit() } A.lastInput = now; return }
    A.exitAccum = 0
    A.wpT = clamp(A.wpT + d, 0, last)
    A.learned.world = true
  } else return
  A.gesture = true; A.lastInput = now; A.labArmed = true
}
function go(i) {
  if (A.mode === 'index') { if (i === STOP.lab && settledAt(STOP.work)) { startBridge(); return } A.base = A.pT = clamp(i, 0, LAST) }
  else if (A.mode === 'world') { A.wbase = A.wpT = clamp(i, 0, lastFrame()) }
  A.gesture = false; A.lastInput = -1e9; A.labArmed = true
}
const canScroll = (el, dy) => (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)
addEventListener('wheel', (e) => {
  if (!owns()) return
  const sc = e.target.closest?.('.scroll')
  if (sc && canScroll(sc, e.deltaY)) return   // reading text scrolls the text, not the surface
  e.preventDefault()
  scrollBy((e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY) * 0.0011)
}, { passive: false })
// M3 MOBILE BUG FIX — a gesture can end without the page ever hearing it end. On iOS a long press on media hands
// the touch to the native callout and no pointerup / pointercancel follows; a system gesture or an alert can do the
// same. The finger then stayed in `touches`, so every later single finger counted as a second one: it started a
// squeeze (or nothing, where no squeeze is possible), and swiping never worked again. One idempotent ending, used
// by every path that can end a gesture, puts the input back to rest; a non-forced press releases itself on the
// next frame exactly as if the finger had lifted.
/**
 * ROUTE-LOCAL HANDOFF. The runtime keeps running and keeps its visit, but on a route it does not own — the Lab,
 * where the document scrolls and a study reads that scroll — it answers nothing and draws nothing. Ownership is
 * the same flag the shell uses to show the surface at all, so the two can never disagree.
 */
const owns = () => document.documentElement.dataset.c2 === 'on'

function endGesture() {
  touches.clear()
  if (A.squeeze) endSqueeze()
  ptr.down = false; ptr.axis = null; ptr.ui = false; ptr.rub = 0
  if (ptr.touch) ptr.hover = false
}
addEventListener('pointerdown', (e) => {
  if (!owns()) return
  A.kbd = false   // M4 A11Y: a pointer is in use — nothing moves focus on its behalf
  // the first finger of a gesture: nothing else is on the glass, whatever an interrupted gesture left behind
  if (e.pointerType === 'touch' && e.isPrimary && (touches.size || ptr.down)) endGesture()
  /*
   * A CONTROL ON THE MATERIAL CANNOT BE A DEAD PATCH OF SCREEN. Every other control on the surface sits in a strip
   * or in an opened room, at the edge of what the thumb does; the hero's About sits in the middle of the field,
   * where a swipe naturally begins. Marked `data-through`, the gesture is still tracked, so it travels to Creative
   * from there like anywhere else — but the pointer stays marked as UI, so it never loads the material and never
   * taps it, and the click a swipe ends in is swallowed below. One gesture still means one thing.
   */
  const on = e.target.closest('a, button, .scroll')
  if (on && !on.hasAttribute('data-through')) { ptr.ui = true; return }
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, { x: e.clientX / V.u, y: e.clientY / V.u })
    if (touches.size === 2) { startSqueeze(); return }
    if (touches.size > 2) return
  }
  Object.assign(ptr, { down: true, downT: performance.now(), sx: e.clientX / V.u, sy: e.clientY / V.u, x: e.clientX / V.u, y: e.clientY / V.u, moved: 0, axis: null, rub: 0, ui: !!on, swiped: false, touch: e.pointerType !== 'mouse' })
})
addEventListener('pointermove', (e) => {
  if (!owns()) return
  const now = performance.now(), dts = Math.max(8, now - ptr.t) / 1000
  if (e.pointerType === 'touch' && touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX / V.u, y: e.clientY / V.u })
  if (A.squeeze) return
  const cx = e.clientX / V.u, cy = e.clientY / V.u
  const dx = cx - ptr.x, dy = cy - ptr.y
  if (ptr.t) { ptr.vx = lerp(ptr.vx, dx / dts, 0.5); ptr.vy = lerp(ptr.vy, dy / dts, 0.5) }
  ptr.x = cx; ptr.y = cy; ptr.t = now
  ptr.touch = e.pointerType !== 'mouse'; ptr.hover = !ptr.touch
  if (!ptr.down) return
  ptr.moved += Math.hypot(dx, dy)
  ptr.rub = damp(ptr.rub, clamp(Math.hypot(ptr.vx, ptr.vy) / 700, 0, 1), 10, dts)
  if (ptr.touch) {
    // swipe vs hold is decided by displacement, not by time: rubbing stays near where it started, a swipe leaves
    const ox = cx - ptr.sx, oy = cy - ptr.sy
    // M3 MOBILE BUG FIX — a hold that has already taken load used to ignore the finger leaving: the room kept
    // growing under a swipe and the swipe never scrolled. Rubbing stays near where it started; a decisive vertical
    // departure is a swipe, whatever the load. The hold then ends as if the finger had lifted (a Lab room keeps
    // what it made). Below 0.22 of load nothing changes.
    const loaded = A.press && A.press.L >= 0.22
    const leaves = loaded ? Math.abs(oy) > Math.max(56, V.H * 0.08) && Math.abs(oy) > Math.abs(ox) * 2 : Math.hypot(ox, oy) > 16
    if (!ptr.axis && leaves) {
      ptr.axis = Math.abs(oy) > Math.abs(ox) ? 'y' : 'x'
      if (A.press && !A.press.forced && !loaded) cancelPress(A.press)
      /*
       * ON THE PASSAGE, A VERTICAL FINGER IS THE PASSAGE'S OWN DRAG.
       *
       * Everywhere else a vertical swipe is a stop's worth of travel and goes through scrollBy(), which measures
       * in half screens. Here it drives the corridor at the distance tuned for it, one to one with the finger,
       * and hands the drive its velocity when it lifts — which is where the momentum comes from. Routing it
       * through scrollBy() instead would have run it at about twice the tuned speed and thrown the flick away.
       */
      if (ptr.axis === 'y' && lfDrag()) LF.drive.dragStart(cy - dy)
      else if (ptr.axis === 'y') scrollBy(-(oy - dy) / (V.H * 0.5), true)
    }
    if (ptr.axis === 'y') {
      if (lfDrag()) { LF.drive.dragMove(cy); A.lastInput = now; lfEdge(now) }
      else scrollBy(-dy / (V.H * 0.5), true)
    }
    if (ptr.axis === 'x') {
      // the thumb moves the layers directly: one work per half screen of travel
      if (settledAt(STOP.work)) { A.wT = clamp(A.wT - dx / (V.W * 0.5), -0.3, N - 1 + 0.3); A.lastInput = now }
      else A.regDragT += dx
    }
  }
})
const up = (e) => {
  const now = performance.now()
  if (e?.pointerType === 'touch') {
    touches.delete(e.pointerId)
    if (A.squeeze) { if (touches.size < 2) endSqueeze(); return }
  }
  // a cancelled gesture was not a tap
  if (e?.type !== 'pointercancel' && ptr.down && !ptr.ui && now - ptr.downT < 200 && ptr.moved < 8) tap(ptr.x, ptr.y)
  if (LINEFIELD && LF && LF.drive.dragging) LF.drive.dragEnd()
  // a gesture that travelled was not a click on what it started on (see the swallow in the UI's click handler)
  ptr.swiped = ptr.down && (ptr.axis !== null || ptr.moved > 12)
  ptr.down = false; ptr.axis = null; ptr.ui = false; ptr.rub = 0
  if (ptr.touch) ptr.hover = false
  A.lastInput = now
}
addEventListener('pointerup', up)
addEventListener('pointercancel', up)
// M3 MOBILE BUG FIX — every way the page can lose a gesture ends it
addEventListener('blur', endGesture)
addEventListener('pagehide', endGesture)
document.addEventListener('visibilitychange', () => { if (document.hidden) { endGesture(); capReset() } })
// WebKit still delivers touch events when the pointer stream was taken: once no finger is left on the glass, no
// gesture is left either. Checked a moment later, so a normal pointerup (and its tap) always runs first.
const settleTouches = (e) => {
  if (e.touches.length) return
  const t = ptr.downT
  setTimeout(() => { if (ptr.downT === t && (touches.size || (ptr.down && ptr.touch))) endGesture() }, 50)
}
addEventListener('touchend', settleTouches, { passive: true })
addEventListener('touchcancel', settleTouches, { passive: true })
// the native long-press menu (save image, open image…) is not offered for a hold on the material itself; links,
// buttons, readable text and every mouse keep the browser's own menu
addEventListener('contextmenu', (e) => {
  if (!ptr.touch || e.target.closest?.('a, button, .scroll')) return
  e.preventDefault()
})
addEventListener('keydown', (e) => {
  // M4 A11Y: a place reached from the keyboard takes keyboard focus with it (see arrived())
  if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'PageDown', 'PageUp', ' ', 'Enter', 'Escape'].includes(e.key)) A.kbd = true
  if (e.key === 'Escape') { if (A.aboutDetail) leaveDetail(); else if (A.aboutOpen) closeAbout(); else exit(); return }
  // M4 A11Y: Enter and Space belong to a focused control; the arrow and page keys have no meaning on a button or link, so
  // they keep moving through the portfolio from wherever focus is (only a scrolling text keeps them)
  if (e.target.closest?.('.scroll') && ['Enter', ' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(e.key)) return
  if (e.target.closest?.('button, a') && ['Enter', ' '].includes(e.key)) return
  const onWork = settledAt(STOP.work)
  if (onWork && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { A.wT = clamp(Math.round(A.wT) + (e.key === 'ArrowRight' ? 1 : -1), 0, N - 1); A.lastInput = performance.now(); return }
  const step = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? 1 : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0
  if (step) {
    e.preventDefault()
    if (A.aboutOpen) { if (!A.aboutDetail) closeAbout(); return }
    // on the passage a key advances the passage, and only carries on along the spine from its far end
    if (LINEFIELD && LF && settledAt(LFS)) {
      const t = LF.drive.target
      if (!((step > 0 && t > 0.9995) || (step < 0 && t < 0.0005))) { LF.drive.nudge(step * LF.keyStep); A.lastInput = performance.now(); return }
      LF.drive.stop()
    }
    go((A.mode === 'world' ? A.wbase : A.base) + step)
  }
  if (e.key === 'Enter') {
    const st = current()
    if (A.mode === 'index' && st.beneath === 'about') forcedPress(aboutX(), st.layout.gapY)
    else if (A.mode === 'index' && st.beneath === 'state') forcedPress(V.W * 0.5, st.weak())
    else if ((A.mode === 'index' && st.beneath === 'work') || (A.mode === 'world' && st.beneath === 'next')) { const fr = st.layout.frame; forcedPress(fr.x + fr.w / 2, fr.y + fr.h / 2) }
  }
})
// a quick tap on something that can open presses it for you — the material still does the opening
function tap(x, y) {
  const st = current()
  if ((A.mode === 'index' && st.beneath === 'work') || (A.mode === 'world' && st.beneath === 'next')) {
    if (inRect(x, y, st.layout.frame)) forcedPress(x, y, 0.7)
  }
}

// ─── the load law ────────────────────────────────────────────────────────────
// a work only becomes openable once it is whole: in register, with its rows filled
const registeredWork = () => (A.wLocked >= 0 && WORKS[A.wLocked]?.fill > 0.5 ? A.wLocked : -1)
function current() {
  if (A.mode === 'world' || A.mode === 'exit') return worldFor(A.k)[clamp(Math.round(A.wp), 0, lastFrame())]
  const s = clamp(Math.round(A.p), 0, LAST)
  return s === STOP.work ? WORKS[clamp(Math.round(A.wt), 0, N - 1)] : IDX[s]
}
function pressable(st, x, y) {
  if (A.busy || A.aboutOpen || A.squeeze) return false
  if (A.mode === 'index') {
    if (Math.abs(A.p - A.base) > 0.06) return false
    if (st.beneath === 'work') return registeredWork() === st.workIndex && inRect(x, y, st.layout.frame, 30)
    return !!st.beneath
  }
  if (A.mode === 'world') {
    const full = worldFor(A.k)[lastFrame()]
    return Math.abs(A.wp - lastFrame()) < 0.05 && full.fill > 0.5 && inRect(x, y, st.layout.frame, 30)
  }
  return false
}
function newPress(x, y, st, forced) {
  const pr = { x, y, L: 0, st, forced, f: feature({ cx: x, cy: y, falloff: 24, kind: st.beneath === 'state' ? 1 : 0 }) }
  A.press = pr; A.features.add(pr.f)
  return pr
}
function forcedPress(x, y, dur = 0.9) {
  const st = current()
  if (A.press || !pressable(st, x, y)) return
  const pr = newPress(x, y, st, true)
  gsap.to(pr, { L: 1, duration: dur, ease: 'power1.in' })
}
function updatePress(now, dt) {
  let pr = A.press
  const holding = ptr.down && !ptr.ui && ptr.axis === null && now - ptr.downT > 150
  if (holding && !pr) { const st = current(); if (pressable(st, ptr.x, ptr.y)) pr = newPress(ptr.x, ptr.y, st, false) }
  if (!pr || pr.done) return
  const st = pr.st
  if (!pr.forced) {
    if (!holding) return releasePress(pr)
    // worked material is weaker: earlier marks and visited work lower the capacity
    const worked = clamp(phys.memAt(pr.x, st.weak(pr.x, pr.y)) * 1.4, 0, 1)
    const visited = st.workIndex != null && A.visited.has(st.workIndex)
    const cap = (Number.isFinite(st.capacity) ? st.capacity : 2) * (1 - 0.5 * worked) * (visited ? 0.55 : 1)
    /*
     * THE HERO'S PRESS IS AN ANSWER, NOT A DOOR. About was opened by holding the name — a gesture nothing on screen
     * taught, and one a visitor could only find by accident. It has a control of its own now (.hero-about), so the
     * hold is no longer the way in, and must not be: resting a thumb on the field is not a request to leave it.
     * The material still answers the finger exactly as before — it loads, marks and springs back on release — but
     * the load stops half way and never yields, which is what the sheet already does wherever there is nothing
     * beneath it. A forced press is the door and is not capped: the control, the strip, Enter and /about all go
     * through forcedPress, and open the room the same way they always have.
     */
    const maxL = Number.isFinite(st.capacity) && st.beneath && st.beneath !== 'about' ? 1 : 0.5
    pr.L = Math.min(maxL, pr.L + ((1 + ptr.rub * 1.8) / cap) * dt * RM)
    pr.x = damp(pr.x, ptr.x, 2.5, dt)
  }
  const L = pr.L, e = L * L * (3 - 2 * L)
  pr.f.cx = pr.x
  pr.f.cy = lerp(pr.y, st.weak(pr.x, pr.y), clamp(e * 1.15, 0, 1))
  // the rim tightens before it gives: the opening grows slowly, then the last part of the load goes into the rims
  pr.f.h = (V.P ? 0.105 : 0.12) * V.H * Math.pow(L, 1.5)
  pr.f.hw = (V.P ? 60 : 90) + (V.P ? 0.6 : 0.4) * V.W * L
  pr.f.falloff = 24 - 8 * smooth(0.6, 1, L)
  A.shiver = smooth(0.82, 1, L) * 0.35
  if (L >= 1) yieldPress(pr)
}
function cancelPress(pr) {
  A.press = null; pr.done = true; A.shiver = 0
  gsap.to(pr.f, { h: 0, duration: 0.3, ease: 'power2.out', onComplete: () => A.features.delete(pr.f) })
}
function releasePress(pr) {
  A.press = null; pr.done = true; A.shiver = 0
  const f = pr.f
  if (pr.L > 0.2) phys.mark(f.cx, f.cy, f.hw * 0.5, 20 + f.h, 0.3 * pr.L, 0.7)
  phys.kick(f.cy - f.h - 10, f.h * 2.2, f.cx - f.hw, f.cx + f.hw)
  phys.kick(f.cy + f.h + 10, -f.h * 2.2, f.cx - f.hw, f.cx + f.hw)
  gsap.to(f, { h: 0, hw: f.hw * 0.8, duration: 0.4 + pr.L * 0.35, ease: 'power3.out', onComplete: () => A.features.delete(f) })
}
function yieldPress(pr) {
  A.press = null; pr.done = true; A.busy = true
  const st = pr.st, f = pr.f
  phys.mark(f.cx, f.cy, V.W * 0.28, 30 + f.h, 0.4, 0.9)
  // the place where the surface gave way is remembered by the sheet
  if (A.mode === 'index') { A.yieldMarks.push({ x: f.cx, y: st.beneath === 'about' ? IDX[STOP.name].layout.gapY : f.cy, big: st.beneath !== 'state' }); HOST.emit('scarCommitted', { x: f.cx / V.W, y: f.cy / V.H, source: st.beneath === 'about' ? 'about' : 'work' }) }
  haptic([12, 50, 26])
  const tl = gsap.timeline()
  tl.to(A, { shiver: 1, duration: 0.06, ease: 'none' }).to(A, { shiver: 0, duration: 0.28, ease: 'power2.out' })
  if (st.beneath === 'about') openAbout(f, tl)
  else if (st.beneath === 'state') pushThrough(f, tl)
  else if (st.beneath === 'work') releaseInto(f, st.workIndex, tl)
  else if (st.beneath === 'next') releaseInto(f, st.layout.next, tl)
}

// ─── LAB: the entry ──────────────────────────────────────────────────────────
/** the three studies, named for a reader who never sees the canvas */
const STUDY_LIST = () => Object.values(TXT.lab.studies)
/*
 * WHAT OPENS A PROJECT, SAID TO THE DEVICE THAT IS READING IT. A pointer holds the image and the material gives
 * way under it; a finger taps it, and has been able to since the tap was added — the instruction simply went on
 * naming the hold. The material still answers a held finger; nothing about the press changes. Only the sentence.
 */
const OPEN_WORK = () => (TOUCH ? TXT.work.openTouch : TXT.work.open)
// The Lab is its own place now: the bench at /lab, with the three studies on their own routes. What used to be
// here — holding to make a room, rooms relaxing against a budget of free material, the five recorded studies
// playing inside them — is retired. The material memory those rooms left behind (scars, the visit's order, the
// About mark) is not: it belongs to the sheet, not to the Lab, and Contact still reads it.
function openLab() {
  A.learned.lab = true
  A.labArmed = false
  HOST.push(LAB_URL, { c2: 'lab' })
}

/**
 * COMING BACK FROM THE LAB. The bench is the fifth destination and it lives on its own route, so the visitor who
 * gestures out of it is asking for a place on this index — Work above, Contact below. The runtime is mounted again
 * one route later and must already BE there: travelling to it would mean travelling from wherever the index last
 * stood, which on a cold arrival is the name. So the index is set where that travel would have left it, and the
 * arrival itself is announced by the same onArrive() every other arrival goes through (prevBase is the Lab, which
 * is true: it is where the visitor came from, and it is what tells the work field which way to assemble).
 *
 * This is not a second state machine. It writes the same fields go() writes, once, and then the loop takes over.
 */
function arriveAt(target) {
  // every place on the index except the Lab itself: the Lab is a route, not somewhere this index arrives
  const stop = { name: STOP.name, creative: STOP.creative, system: STOP.system, work: STOP.work, rest: STOP.rest, ...(LINEFIELD ? { linefield: STOP.linefield } : {}) }[target]
  if (stop == null) return false
  endGesture()
  gsap.killTweensOf(A)
  if (A.press) cancelPress(A.press)
  if (A.introF) { A.features.delete(A.introF); A.introF = null }
  if (A.bridgeF) { gsap.killTweensOf(A.bridgeF); A.features.delete(A.bridgeF); A.bridgeF = null }
  if (A.about) { gsap.killTweensOf(A.about); A.features.delete(A.about); A.about = null }
  A.aboutOpen = false; A.aboutDetail = false; A.detailPushed = false; A.aboutDetailK = 0
  A.mode = 'index'; A.worldOn = false; A.busy = false; A.pending = null
  A.shiver = 0; A.bridgePK = 1; A.introReg = 0; A.nameAmp = REDUCED ? 0 : 1
  A.p = A.pT = A.base = stop
  A.prevBase = STOP.lab   // the Lab: the frame loop announces the arrival and composes the field accordingly
  A.restOpen = 0
  A.gesture = false; A.lastInput = -1e9
  A.labArmed = false
  A.hush = performance.now() + 420
  document.title = TITLE()
  lastSig = ''
  return true
}

// ─── NAME → beneath the name is the person ────────────────────────────────────
// M3 RESPONSIVE GEOMETRY — on a short phone the introduction needs a taller room than a fixed share of the height gives
const aboutHalf = () => (V.P ? (V.H < 640 ? 0.27 : 0.235) : V.S ? 0.3 : V.H < 820 ? 0.215 : 0.2) * V.H   // a 13-inch laptop: a little more room between the names
const aboutX = () => (V.P ? V.W / 2 : V.W * 0.3)
function aboutFeature(open) {
  return feature({ cx: aboutX(), cy: IDX[STOP.name].layout.gapY, h: aboutHalf() * open, hw: V.P ? 1e5 : V.W * 0.9, falloff: V.P ? 70 : 110, lip: 5, lipW: 7 })
}
function openAbout(f, tl) {
  A.about = f; A.aboutOpen = true; A.learned.open = true
  arrived(() => D.about.querySelector('h2'), TXT.about.heading)
  const g = aboutFeature(1)
  A.aboutMark = { cx: g.cx, cy: g.cy, h: g.h, hw: g.hw, falloff: g.falloff, lip: g.lip, lipW: g.lipW, power: 2, reach: 0, top: 1, bottom: 1 }
  HOST.emit('aboutVisited', { open: true })
  tl.to(f, { cx: g.cx, cy: g.cy, h: g.h, hw: V.P ? 9000 : g.hw, falloff: g.falloff, lip: 5, lipW: 7, duration: 1.35, ease: 'expo.out' }, 0.06)
    .add(() => { f.hw = g.hw; A.busy = false })
}
function closeAbout() {
  if (!A.aboutOpen || A.busy) return
  const f = A.about
  if (A.aboutDetail) { A.aboutDetail = false; A.detailPushed = false; document.title = TITLE(); if (isAboutPath()) HOST.push(HOME_URL, { c2: 'home' }) }
  A.aboutOpen = false; A.busy = true
  gsap.killTweensOf(f)
  // leaving from the long About: its rooms close first, then the name's room
  const wait = A.aboutDetailK > 0.01 ? 0.5 : 0
  if (wait) { gsap.killTweensOf(A, 'aboutDetailK'); gsap.to(A, { aboutDetailK: 0, duration: 0.5, ease: 'power2.in' }) }
  // the name does not close perfectly where it was opened
  gsap.to(f, {
    h: 0, duration: 1.15, delay: wait, ease: 'power3.inOut',
    onComplete: () => {
      phys.scar(V.P ? V.W * 0.5 : V.W * 0.42, f.cy, V.P ? V.W * 0.46 : V.W * 0.38, 16)
      phys.kick(f.cy - 14, -60); phys.kick(f.cy + 14, 60)
      A.features.delete(f); A.about = null; A.busy = false
    },
  })
}
function expandAbout(push) {
  if (A.aboutDetail) return
  if (!A.aboutOpen || A.busy || A.mode !== 'index') { A.pending = 'detail'; return }
  A.aboutDetail = true; A.detailPushed = !!push
  if (push) HOST.push(ABOUT_URL, { c2: 'about' })
  document.title = TITLE_ABOUT()
  gsap.killTweensOf(A.about); gsap.killTweensOf(A, 'aboutDetailK')
  layoutAbout()
  const ad = D.detail.querySelector('.ad')
  ad.scrollTop = 0
  gsap.to(A, { aboutDetailK: 1, duration: 1.5, ease: 'expo.inOut', onComplete: () => { if (A.aboutDetail) (ad.querySelector('h2') || ad).focus({ preventScroll: true }) } })
  const gy = IDX[STOP.name].layout.gapY
  phys.kick(gy - aboutHalf() - 24, -36); phys.kick(gy + aboutHalf() + 24, 36)
}
function collapseAbout(push) {
  if (!A.aboutDetail) return
  // M4 A11Y: focus inside the long About returns to the link that opened it, not to the top of the document
  if (D.detail.contains(document.activeElement)) wantFocus(() => D.about.querySelector('.more'))
  A.aboutDetail = false; A.detailPushed = false
  if (push) HOST.push(HOME_URL, { c2: 'home' })
  document.title = TITLE()
  gsap.killTweensOf(A, 'aboutDetailK')
  gsap.to(A, { aboutDetailK: 0, duration: 1.15, ease: 'expo.inOut' })
}
// The long About is the same room grown. The room the name made becomes the introduction's room; every other part of
// the story is given a room of its own as the material yields, one after another. Rows keep running between them —
// the name's own rows — and the rooms follow the text as it scrolls. Nothing is decoration: it is where text can exist.
const ROOM_PAD = () => (V.P ? { x: 0, y: 24, falloff: 30 } : { x: 72, y: 30, falloff: 42 })
function aboutRoomFeatures() {
  const k = A.aboutDetailK, B = D.aboutBlocks, pad = ROOM_PAD()
  const geo = (b) => {
    const R = b.getBoundingClientRect(), u = V.u
    const r = { left: R.left / u, top: R.top / u, width: R.width / u, height: R.height / u }
    return { cx: V.P ? V.W / 2 : r.left + r.width / 2, cy: r.top + r.height / 2, h: r.height / 2 + pad.y, hw: V.P ? 1e5 : r.width / 2 + pad.x, falloff: pad.falloff, power: 8 }
  }
  const home = aboutFeature(1), g0 = geo(B[0]), f = A.about
  f.cx = lerp(home.cx, g0.cx, k); f.cy = lerp(home.cy, g0.cy, k); f.h = lerp(home.h, g0.h, k)
  f.hw = Math.exp(lerp(Math.log(home.hw), Math.log(g0.hw), k)); f.falloff = lerp(home.falloff, g0.falloff, k)
  f.power = lerp(2, 8, k); f.lip = lerp(5, 0, k)
  const out = []
  for (let i = 1; i < B.length; i++) {
    const g = geo(B[i]), s = smooth(0.2 + i * 0.1, 0.62 + i * 0.08, k)
    if (s > 0.001) out.push(feature({ kind: 0, ...g, h: g.h * s }))
  }
  return out
}
function layoutAbout() {
  const flow = D.detail.querySelector('.ad-flow'), [intro, bg, tr, now, meta] = D.aboutBlocks
  if (V.P) { flow.style.height = ''; D.aboutBlocks.forEach((b) => b.removeAttribute('style')); return }
  const { W, pad } = V
  const L = { x: pad + 12, w: Math.min(640, W * 0.42) }, Rc = { x: Math.round(W * 0.53), w: Math.min(540, W * 0.41) }
  const set = (b, x, w) => Object.assign(b.style, { left: `${x}px`, width: `${w}px`, top: '0px' })
  set(intro, L.x, L.w); set(bg, Rc.x, Rc.w); set(tr, Rc.x, Rc.w); set(now, L.x, L.w * 0.9); set(meta, Rc.x, Rc.w)
  // the scroller begins under the top strip
  const g = 70, top = 70
  const hI = intro.offsetHeight, hB = bg.offsetHeight, hT = tr.offsetHeight, hN = now.offsetHeight, hM = meta.offsetHeight
  intro.style.top = `${top}px`
  bg.style.top = `${top + 34}px`
  tr.style.top = `${top + 34 + hB + g}px`
  now.style.top = `${top + hI + g + 30}px`
  const mTop = Math.max(top + 34 + hB + g + hT + g, top + hI + g + 30 + hN - hM)
  meta.style.top = `${mTop}px`
  flow.style.height = `${Math.max(mTop + hM, top + hI + g + 30 + hN) + 56}px`
}
function leaveDetail() { if (A.detailPushed) HOST.back(); else collapseAbout(true) }
export function routeChanged() {
  endGesture()   // M3 MOBILE BUG FIX
  if (isAboutPath()) { if (A.mode === 'world') { exit(); A.pending = 'detail' } else expandAbout(false); return }
  // the visitor gestured out of the Lab: this entry carries the place they gestured towards
  if (arriveAt(takeArrival())) return
  if (A.aboutDetail) collapseAbout(false)
}
if (!globalThis.__c2Hosted) addEventListener('popstate', routeChanged)

// SURFACE FACE ⇄ SYSTEM FACE
function pushThrough(f, tl) {
  const target = Math.round(A.p) === STOP.creative ? STOP.system : STOP.creative
  tl.to(f, { h: V.H * 1.3, hw: 14000, falloff: 80, duration: 0.9, ease: 'power3.in' }, 0.05)
    .add(() => {
      A.features.delete(f); A.p = A.pT = A.base = A.prevBase = target; A.quality[target === STOP.creative ? 'creative' : 'system'] = 1
      A.busy = false; A.learned.face = true
    })
}

// WORK → release → the work itself
function releaseInto(f, k, tl) {
  const scarAt = { x: f.cx, y: f.cy, from: A.mode }
  if (!A.visited.has(k)) A.visitOrder.push(k)
  A.visited.add(k); surface.visited[k] = 1
  HOST.emit('projectOpened', { index: k, ink: works[k].ink })
  mediaFor(k); worldFor(k); prepareWorld(k)
  document.body.classList.add('releasing')
  A.releaseK = k   // the work is already there underneath; the release only takes the material away
  tl.to(f, { h: V.H * 1.7, hw: 22000, reach: V.W * 2, falloff: 420, lip: 18, lipW: 8, duration: 0.8, ease: 'power4.in' }, 0.05)
    .add(() => { if (scarAt.from === 'index') phys.scar(scarAt.x, scarAt.y, V.P ? V.W * 0.4 : V.W * 0.26, 13); enterWorld(k, f) })
}
function enterWorld(k, f) {
  A.features.delete(f)
  A.mode = 'world'; A.k = k; A.wp = A.wpT = A.wbase = 0; A.exitAccum = 0
  A.nextReg = 1; A.nextArmed = false
  const full = worldFor(k)[lastFrame(k)]; gsap.killTweensOf(full); full.fill = 0; full.lod = ST.LOD_OFF
  Object.assign(A.world, worldGeom(0)); A.worldOn = true
  fillWorldDOM(k)
  arrived(() => D.world.querySelector('.wsum h2'), works[k].name)
  document.body.classList.remove('releasing')
  A.releaseK = null; A.learned.work = true; A.arrivedAt = performance.now()
  A.busy = false
  queueWarm(worldFor(k))
}
function exit() {
  if (A.mode !== 'world' || A.busy) return
  A.busy = true; A.mode = 'exit'
  const last = lastFrame(), fr = clamp(Math.round(A.wp), 0, last), k = A.k
  // M4 A11Y: leaving a project from the keyboard (or from inside it) returns focus to that project in the index
  const back = A.kbd || D.world.contains(document.activeElement)
  A.from = A.to = worldFor(k)[fr]; A.front = 1
  const full = worldGeom(last)
  gsap.timeline()
    .to(A.world, { cy: full.cy, sigma: full.sigma, Lm: full.Lm, s: full.s, duration: A.wp > last - 0.1 ? 0.01 : 0.9, ease: 'power3.inOut' })
    .add(() => { A.worldOn = false; A.from = worldFor(k)[fr]; A.to = WORKS[k]; A.front = 0; A.wT = A.wt = k; A.wLocked = k; WORKS[k].fill = 1; WORKS[k].lod = 0 })
    .to(A, { front: 1, duration: 1.3, ease: 'power2.inOut' })
    .add(() => { A.mode = 'index'; A.p = A.pT = A.base = A.prevBase = STOP.work; A.busy = false; if (A.pending) return   /* leaving for another place: that arrival takes focus */
      if (back || A.focusNext) { A.focusNext = 0; wantFocus(() => D.work.querySelector(`[data-work="${k}"]`)) } else announce(TXT.work.heading) })
}

// MOBILE ONLY → two fingers take hold of two rows; what is between them can only compress, and it resists
function startSqueeze() {
  if (A.mode !== 'index' || A.busy || A.aboutOpen || Math.abs(A.p - A.base) > 0.06) return
  const st = current()
  if (!['about', 'state', 'work'].includes(st.beneath)) return
  if (st.beneath === 'work' && registeredWork() < 0) return
  const [a, b] = [...touches.values()].sort((p, q) => p.y - q.y)
  if (!a || !b || b.y - a.y < 70) return
  if (A.press) cancelPress(A.press)
  ptr.down = false; ptr.axis = 'pinch'
  A.squeeze = { st, sat: 0, step: 1, f: squeeze({ cx: (a.x + b.x) / 2, y1: a.y, y2: b.y, Y1: a.y, Y2: b.y, hw: V.W * 0.85 }) }
  A.features.add(A.squeeze.f)
}
function updateSqueeze(dt) {
  const q = A.squeeze
  if (!q) return
  const [a, b] = [...touches.values()].sort((p, r) => p.y - r.y)
  const span = q.f.Y2 - q.f.Y1
  if (a && b) {
    // the rows under the fingers stay under them; between, the material follows the fingers less the more it is
    // compressed: every further step of compression costs more travel
    const kf = span / Math.max(3, b.y - a.y)
    const km = kf <= 1 ? Math.max(kf, 1 / 1.5) : Math.pow(kf, 0.8)
    q.f.y1 = a.y; q.f.y2 = a.y + span / km; q.f.cx = (a.x + b.x) / 2
  }
  const k = span / Math.max(1, q.f.y2 - q.f.y1)
  // a faint tick each time the rows between the fingers close another whole step
  const step = Math.floor(k)
  if (step > q.step && step < 5) { haptic(4); q.step = step } else if (step < q.step) q.step = step
  A.shiver = clamp((k - 2.6) / 2, 0, 1) * 0.45
  if (k > 4) q.sat += dt; else q.sat = Math.max(0, q.sat - dt * 2)
  if (q.sat > 0.12) {
    // saturated between the fingers: the band gives way exactly where it was squeezed
    const cy = (q.f.y1 + q.f.y2) / 2
    const f = feature({ cx: q.f.cx, cy, h: (q.f.y2 - q.f.y1) / 2, hw: V.W * 0.8, falloff: 30, kind: q.st.beneath === 'state' ? 1 : 0 })
    A.features.add(f)
    const sf = q.f
    gsap.to(sf, { s: 0, duration: 0.3, onComplete: () => A.features.delete(sf) })
    A.squeeze = null; A.learned.pinch = true; A.shiver = 0
    yieldPress({ st: q.st, f, x: q.f.cx, y: cy, L: 1 })
  }
}
function endSqueeze() {
  const q = A.squeeze
  if (!q) return
  A.squeeze = null; A.shiver = 0
  const f = q.f
  gsap.to(f, { y1: f.Y1, y2: f.Y2, duration: 0.8, ease: 'elastic.out(1, 0.45)', onComplete: () => A.features.delete(f) })
  ptr.axis = null
}

// ─── project world geometry ──────────────────────────────────────────────────
function worldGeom(wp, k = A.k) {
  const fr = framesOf(k), G = GEOM(V.P), last = fr.length - 1
  const a = clamp(Math.floor(wp), 0, last - 1), t = ez(clamp(wp - a, 0, 1))
  const g0 = G[fr[a].g], g1 = G[fr[Math.min(a + 1, last)].g]
  return gather({
    cx: V.W / 2, hw: 1e5,
    cy: lerp(g0.cy, g1.cy, t) * V.H, Lm: lerp(g0.Lm, g1.Lm, t) * V.H, s: lerp(g0.s, g1.s, t),
    sigma: Math.exp(lerp(Math.log(g0.sigma * V.H), Math.log(g1.sigma * V.H), t)),   // log-space: bands tighten without snapping
  })
}

// ─── registration ────────────────────────────────────────────────────────────
function registration(now, dt) {
  const spread = V.P ? V.W * 0.08 : V.W * 0.05
  for (const s of [...IDX, ...WORKS]) Object.assign(s.reg, { a0: 0, a1: 0, va0: 0, va1: 0, holdA: 1, phase: 0 })
  const split = (s, amt, px, pv = 0) => {
    s.reg.a0 = -px * amt; s.reg.a1 = px * amt; s.reg.va0 = -pv * amt; s.reg.va1 = pv * amt
    s.reg.holdA = 1 - 0.74 * smooth(0, 0.55, amt); s.reg.phase = amt * 2.6
  }
  split(IDX[STOP.name], A.introReg, spread * 1.4)
  IDX[STOP.name].amp = A.nameAmp
  if (A.mode === 'index' && A.p > STOP.creative && A.p < STOP.system) split(IDX[STOP.creative], smooth(0.02, 0.4, A.p - STOP.creative) * 0.6, spread)
  if (!ptr.down) A.regDragT = damp(A.regDragT, 0, 9, dt)
  A.regDrag = damp(A.regDrag, A.regDragT, ptr.down ? 16 : 11, dt)
  if ((settledAt(STOP.creative) || settledAt(STOP.system)) && Math.abs(A.regDrag) > 0.5) split(IDX[A.base], clamp(Math.abs(A.regDrag) / spread, 0, 1), Math.sign(A.regDrag) * spread * 0.5)

  // the work field: every work is written as fragments on its own key; only one agrees at a time
  const sx = V.P ? V.W * 0.24 : V.W * 0.13, sy = V.P ? 5.2 : 7
  /*
   * A BARE 3 SURVIVED THE RENAMING HERE, and it is the one that mattered.
   *
   * It was not a comparison against a stop, it was a stop inside an ARITHMETIC expression, so it read as a
   * distance rather than a place and every search for `=== 3` walked straight past it. With a place inserted
   * before Work this is false at the work field, so lockWork() never runs: the capture never comes into
   * register (it stays at LOD_OFF with fill 0, which is the unresolved patchwork the visitor sees as a broken
   * image), the work never becomes pressable, and neither holding it nor tapping it opens the project.
   */
  const onWork = A.mode === 'index' && Math.abs(A.p - STOP.work) < 0.6
  WORKS.forEach((s, i) => {
    const d = A.wt - i, ad = Math.abs(d)
    s.reg.a0 = d * sx; s.reg.a1 = -d * sx * 0.62; s.reg.va0 = d * sy; s.reg.va1 = -d * sy
    s.vis = 1 - smooth(0.55, 0.98, ad)
    // hysteresis: locks inside 0.003, lets go past 0.025 — the magnet in tuneWork carries it the last part
    if (onWork && A.wLocked !== i && ad < 0.003) lockWork(i)
    else if (A.wLocked === i && ad > 0.025) unlockWork(i)
  })
  split(IDX[STOP.rest], A.restReg, 8)
  if (WORLD[A.k]) { const full = WORLD[A.k][lastFrame()]; split(full, A.nextReg, V.W * 0.13, 7); full.vis = 1 }
  for (const s of [IDX[STOP.name], IDX[STOP.rest]]) {
    const q = 1 - smooth(0, 3, Math.abs(s.reg.a1 - s.reg.a0))
    const prev = A.quality[s.id] ?? 1
    if (prev < 0.9 && q >= 0.999) lockRipple(s)
    A.quality[s.id] = q
  }
}
// exact register: no burst — the rows go still, one small breath runs out through the material
function lockRipple(st) {
  const L = st.layout
  const y0 = st.id === 'name' ? L.top : L.block.y
  const y1 = st.id === 'name' ? L.bottom : L.block.y + L.block.h
  phys.kick(y0 - 8, -55); phys.kick(y1 + 8, 55)
  haptic(8)
}
function lockWork(i) {
  const s = WORKS[i], fr = s.layout.frame
  if (A.wLocked >= 0 && A.wLocked !== i) unlockWork(A.wLocked)
  A.wLocked = i
  gsap.killTweensOf(s)
  // the instant the two sets agree, the information resolves — then the rows fill with it. Precision is the event.
  gsap.to(s, { lod: 0, duration: 0.24, ease: 'expo.out' })
  gsap.to(s, { fill: 1, duration: 0.5, delay: 0.05, ease: 'power3.out' })
  s.flash = 0.2; gsap.to(s, { flash: 0, duration: 0.8, ease: 'power2.out' })
  phys.kick(fr.y - 6, -40, fr.x, fr.x + fr.w); phys.kick(fr.y + fr.h + 6, 40, fr.x, fr.x + fr.w)
  haptic(8)
  // a work that stays in register gets its real media and its world ready underneath, so the release never waits
  setTimeout(() => { if (A.wLocked === i) { mediaFor(i); prepareWorld(i).then(() => queueWarm(worldFor(i))) } }, 420)
}
function unlockWork(i) {
  const s = WORKS[i]
  A.wLocked = -1
  gsap.killTweensOf(s)
  gsap.to(s, { fill: 0, flash: 0, lod: ST.LOD_OFF, duration: 0.2, ease: 'power2.out' })
}

// ─── stops: what happens on arrival ──────────────────────────────────────────
function onArrive(stop, prev) {
  A.arrivedAt = performance.now()
  // on the way to the About room the room itself is the destination; the name is only passed through
  if (!(stop === STOP.name && A.pending === 'about')) arrived(() => PLACE_HEADING[stop]?.(), PLACE_NAME[stop]?.())
  /*
   * THE PASSAGE IS ENTERED AT THE END IT IS ENTERED FROM. One gesture out of Full-Stack starts it at the
   * backend field; one gesture back out of Work starts it at the frontend field, and it then runs in reverse.
   * Whatever a flick had left running is stopped on the way out, so a momentum from one place never carries
   * into the next.
   */
  if (LINEFIELD && LF && (stop === LFS || prev === LFS)) {
    LF.drive.stop()
    A.lfExit = 0; A.lfEdgeY = null
    if (stop === LFS) { const at = prev > LFS ? 1 : 0; LF.drive.set(at); A.lfp = at }
  }
  if (stop === STOP.work && prev !== STOP.work) {
    // arriving on the work field, the first (or last) work is still in pieces
    if (prev > STOP.work) { A.wT = N - 1; A.wt = N - 1 + 0.9 } else { A.wT = 0; A.wt = -0.9 }
    tonesReady.then(() => queueWarm(WORKS))
  }
  if (stop === STOP.rest) {
    const key = `${A.visitOrder.join(',')}|${A.aboutMark ? 'a' : 'd'}`
    if (IDX[STOP.rest].visitKey !== key) { const old = IDX[STOP.rest]; IDX[STOP.rest] = ST.rest(V, A.visitOrder, A.aboutMark); if (A.from !== old && A.to !== old) { old.dead = true; surface.release(old) } placeRest() }
    gsap.killTweensOf(A, 'restReg,restOpen')
    A.restReg = 1; A.restOpen = 0
    // Contact registers, then opens — the same two movements as when the name gave way to the person. The lead-in
    // was 2.1 s of a screen holding almost nothing before the opening began, which measured as the longest dead
    // stretch anywhere on the site (1.47 s of it with nothing changing at all). The movements keep their shape and
    // their order; the waiting before them does not.
    gsap.to(A, { restReg: 0, duration: 1.15, delay: 0.25, ease: 'expo.inOut' })
    gsap.to(A, { restOpen: 1, duration: 1, delay: 0.85, ease: 'expo.out' })
  }
}

// ─── DOM: semantic text, always stable, placed where the material has made room ─
const ui = $('#ui')
// delegated once, on the element itself: buildDOM() replaces the contents, never the container, so a
// language change refreshes every label without ever attaching a second listener
ui.addEventListener('click', (e) => {
  // The tail of a swipe that began on a control the gesture passes through: the gesture has already been spent on
  // the index, so the click it ends in is not a second intention. Nothing else on the surface is reached this way.
  if (ptr.swiped && e.target.closest('[data-through]')) { e.preventDefault(); return }
  // A language change is a step the visitor took, so Back undoes it and returns them to the place they were
  // reading in the language they were reading it in. (M2 replaced the entry instead, so Back left the site
  // altogether; the destination survives either way, because changing language never moves the index.)
  if (e.target.closest('[data-locale]')) { e.preventDefault(); if (HOST.localeHref) HOST.push(HOST.localeHref, { c2: 'locale' }); return }
  if (e.target.closest('[data-lab]')) { e.preventDefault(); openLab(); return }
  const b = e.target.closest('[data-go], [data-work], [data-open], [data-world], [data-detail], [data-back]')
  if (!b) return
  if (b.dataset.go || b.hasAttribute('data-detail')) e.preventDefault()
  if (b.dataset.go) {
    A.focusNext = performance.now()   // M4 A11Y
    const stop = { name: 0, creative: 1, system: 2, work: 3, lab: 4, rest: 5 }[b.dataset.go]
    // already there: nothing arrives, so focus goes now
    if (stop != null && A.mode === 'index' && !A.aboutOpen && A.base === stop && Math.abs(A.p - stop) < 0.05) { A.focusNext = 0; wantFocus(PLACE_HEADING[stop]) }
    navigate(b.dataset.go)
  }
  if (b.hasAttribute('data-detail')) { if (A.aboutOpen) expandAbout(true); else { navigate('about'); A.pending = 'detail'; HOST.push(ABOUT_URL, { c2: 'about' }); A.detailPushedLater = true } }
  if (b.hasAttribute('data-back')) leaveDetail()
  if (b.dataset.work) {
    // M4 A11Y: activating the project that is already in register opens it — on a phone the open button is not shown
    // and a screen reader cannot reach the image, so the index itself carries the action
    const i = +b.dataset.work
    if (registeredWork() === i && A.mode === 'index' && !A.busy) { A.focusNext = performance.now(); const fr = WORKS[i].layout.frame; forcedPress(fr.x + fr.w / 2, fr.y + fr.h / 2, 0.8) }
    else { A.wT = i; A.lastInput = performance.now() - 200 }
  }
  if (b.hasAttribute('data-open') || b.dataset.world) A.focusNext = performance.now()   // M4 A11Y
  if (b.hasAttribute('data-open')) { const st = current(), fr = st.layout.frame; if (fr) forcedPress(fr.x + fr.w / 2, fr.y + fr.h / 2, 0.8) }
  if (b.dataset.world === 'all') exit()
  if (b.dataset.world === 'next') { const last = lastFrame(); if (A.wbase === last && Math.abs(A.wp - last) < 0.05) { const fr = worldFor(A.k)[last].layout.frame; forcedPress(fr.x + fr.w / 2, fr.y + fr.h / 2, 0.75) } else { go(last); A.pending = 'next' } }
})
const D = {}
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e }
const mail = `<a class="email" href="mailto:${contact.email}">${contact.email}</a>`
const phone = `<a class="phone" href="tel:${contact.tel}">${contact.phone}</a>`
// M4 A11Y: the label is English; the new-tab note is in the page language
const exits = () => contact.links.map((l) => `<a href="${l.href}" target="_blank" rel="noopener noreferrer"><span lang="en">${l.label}</span> ↗<span class="sr"> ${TXT.a11y.newTab}</span></a>`).join('')
function buildDOM() {
  ui.innerHTML = ''
  D.skip = h('a', 'skip', TXT.nav.skip); D.skip.href = '#plain'
  D.top = h('header', 'strip top', `
    <a class="id" href="${HOME_URL}" data-go="name">${identity.name}</a>
    <nav class="nav" aria-label="${TXT.nav.label}"><button data-go="work">${TXT.nav.work}</button><button data-go="about">${TXT.nav.about}</button><button data-go="lab">${TXT.nav.lab}</button><button data-go="rest">${TXT.nav.contact}</button><a class="lang" data-locale href="${HOST.localeHref}" hreflang="${TXT.localeSwitch.hreflang}" lang="${TXT.localeSwitch.hreflang}" aria-label="${TXT.localeSwitch.short} — ${TXT.localeSwitch.to}" title="${TXT.localeSwitch.label}: ${TXT.localeSwitch.to}">${TXT.localeSwitch.short}</a></nav>`)
  // M4 A11Y: the bottom strip repeats the h1's roles and gives pointer instructions — visual only; keyboard instructions are below
  D.bottom = h('div', 'strip bottom', `<span class="roles" lang="en">${identity.primary} · ${identity.secondary}</span><span id="hint"></span>`)
  D.bottom.setAttribute('aria-hidden', 'true')
  D.h1 = h('h1', 'sr', `${identity.name} — ${identity.primary} ${TXT.roles.and} ${identity.secondary}, ${identity.location}`)
  D.h1.tabIndex = -1
  // the opening shows the name; its positioning line and how to move through the portfolio, for assistive technology
  D.lead = h('p', 'sr', about.home.positioning)
  D.keys = h('p', 'sr', TXT.a11y.keys)
  // one polite status line: a place reached without the keyboard is named once
  D.status = h('p', 'sr'); D.status.setAttribute('role', 'status')

  /*
   * THE HERO'S OWN DOOR. About was behind a press-and-hold on the name: a gesture the composition never showed, and
   * the only way in that a visitor had to be told about. It is a control now, set in the fold between the names on
   * the composition's own right axis (see layoutDOM) — the place the room opens from, in the site's own utility
   * type. It does exactly what the strip's ABOUT does, through the same `data-go`: there is one About, and two ways
   * to reach it — the strip, which is chrome and is there at every stop, and this, which belongs to the hero.
   */
  D.heroAct = h('div', 'layer hero-act', `<div class="ha-line"><button class="hero-about" data-go="about" data-through>${TXT.nav.about}</button></div>`)

  D.about = h('section', 'layer about', `<div class="block"><h2 class="sr" tabindex="-1">${TXT.about.heading}</h2>
    <p class="intro">${about.home.intro}</p>
    <p class="statement">${about.home.positioning}</p>
    <p class="avail lbl">${identity.city} · ${identity.status}</p>
    <a class="more" href="${ABOUT_URL}" data-detail>${about.home.more} →</a></div>`)
  // M4 A11Y: named by its own heading; a region label would read "About" twice

  const d = about.detail
  D.detail = h('section', 'layer about-detail', `<div class="ad scroll" tabindex="-1"><div class="ad-flow">
      <div class="ab ab-intro"><h2 class="lbl" tabindex="-1">${TXT.about.heading}</h2><p class="ad-intro">${d.intro}</p></div>
      <div class="ab ab-bg"><p>${d.background}</p></div>
      <div class="ab ab-tr"><p>${d.transition}</p></div>
      <div class="ab ab-now"><p>${d.current}</p><ul class="ad-caps" aria-label="${TXT.a11y.capabilities}">${d.capabilities.map((c) => `<li>${termHtml(c)}</li>`).join('')}</ul></div>
      <div class="ab ab-meta">
        <p class="ad-status">${d.status}</p>
        <address class="ad-contact"><span>${identity.location}</span>${mail}${phone}</address>
        <p class="ad-links">${exits()}</p>
        <button class="ad-back" data-back>← ${TXT.about.back}</button>
      </div>
    </div></div>`)
  D.detail.setAttribute('aria-label', TXT.a11y.aboutDetail)

  const face = (key) => {
    const c = capabilities[key], sys = key === 'system'
    const s = h('section', `layer face ${key}`)
    s.innerHTML = `<h2 class="sr" tabindex="-1" lang="en">${c.role}</h2>
      <div class="pos"><p class="positioning">${sys ? identity.positioning[1] : identity.positioning[0]}</p>${sys ? `<p class="stack" lang="en">${capabilities.stack}</p>` : ''}</div>
      <ul class="list">${c.items.map((it) => `<li><span class="nm">${termHtml(it.name)}</span><span class="nt">${it.note}</span></li>`).join('')}</ul>
      <p class="role" aria-hidden="true">Developer</p>`
    return s
  }
  D.creative = face('surface'); D.system = face('system')

  D.work = h('section', 'layer work', `
    <div class="col">
      <div class="head"><h2 class="lbl" tabindex="-1">${TXT.work.heading}</h2><p class="wline">${workIntro.line}</p><p class="sr">${TXT.a11y.workKeys}</p></div>
      <ol class="index">${works.map((w, i) => `<li><button data-work="${i}"><span class="swatch"></span><span class="wid">${w.name}</span><span class="wk">${w.strength}</span></button></li>`).join('')}</ol>
      <div class="current"><p class="wtitle" aria-hidden="true"></p><p class="wmeta" aria-hidden="true"></p><button class="open" data-open aria-label="${OPEN_WORK()} — ${TXT.a11y.openProject}" aria-describedby="c2-open-hint">${OPEN_WORK()}</button><span id="c2-open-hint" class="sr">${TXT.a11y.openHint}</span></div>
    </div>`)

  /*
   * The passage in the DOM: a heading to land focus on and to name the place, and the eight words themselves for
   * a reader who cannot see them in the material. The field IS the content here, so there is nothing else to say.
   */
  if (LINEFIELD) {
    D.lf = h('section', 'layer lf-place', `<h2 class="lbl sr" tabindex="-1">${TXT.linefield.heading}</h2>
      <p class="lf-lab lf-back">${TXT.linefield.backendLabel}</p><p class="lf-lab lf-front">${TXT.linefield.frontendLabel}</p>
      <p class="sr">${TXT.linefield.backendLabel}: ${TXT.linefield.backend.join(' ')}. ${TXT.linefield.frontendLabel}: ${TXT.linefield.frontend.join(' ')}</p>`)
  }

  D.lab = h('section', 'layer lab', `<div class="cap"><h2 class="lbl" tabindex="-1">${lab.title}</h2><p class="ltext">${lab.line}</p>
    <p class="lopen"><a href="${LAB_URL}" data-lab>${lab.open} — ${lab.count}</a></p></div>
    <p class="lab-now" aria-live="polite"></p>
    <ul class="sr">${STUDY_LIST().map((e) => `<li>${e.name}: ${e.note}</li>`).join('')}</ul>`)

  D.rest = h('section', 'layer rest', `<div class="contact"><h2 class="sr" tabindex="-1">${TXT.contact.heading}</h2>
    <p class="cname">${identity.name}</p>
    <p class="croles" lang="en">${identity.primary} / ${identity.secondary}</p>
    ${mail}${phone}
    <p class="clinks">${exits()}</p>
    <p class="cmeta">${identity.location} · ${identity.status}</p></div>`)

  D.world = h('section', 'layer world', `
    <nav class="wnav strip" aria-label="${TXT.work.projectNav}"><button data-world="all">← ${TXT.work.allWork}</button><a class="wlink" href="${works[0].url}" target="_blank" rel="noopener noreferrer"><span class="sr">${TXT.work.visit} </span><span class="wname"></span> <span class="whost" lang="en"></span> ↗<span class="sr"> ${TXT.a11y.newTab}</span></a><button data-world="next">${TXT.work.next}</button></nav>
    <div class="wsum sr"></div>
    <div class="wblocks"></div>`)

  // everything essential stays reachable without the surface: keyboard and assistive technology get a plain list
  D.a11y = h('nav', 'a11y', `<ul class="a11y-places"><li><button data-go="creative" lang="en">${capabilities.surface.role}</button></li><li><button data-go="system" lang="en">${capabilities.system.role}</button></li></ul>
    <p class="lbl">${TXT.a11y.selectedWork}</p>
    <ul>${works.slice(0, 3).map((w) => `<li><a href="${w.url}" target="_blank" rel="noopener noreferrer">${w.name} — ${w.strength} ↗<span class="sr"> ${TXT.a11y.newTab}</span></a></li>`).join('')}</ul>
    <p class="lbl">${TXT.a11y.labStudies}</p><ul>${STUDY_LIST().map((e) => `<li><a href="${LAB_URL}" data-lab>${e.name} — ${e.note}</a></li>`).join('')}</ul>
    <p>${mail} · ${phone}</p><p class="a11y-links">${exits()}</p>
    <a href="${ABOUT_URL}" data-detail>${about.home.more}</a>`)
  D.a11y.id = 'plain'; D.a11y.tabIndex = -1
  D.a11y.setAttribute('aria-label', TXT.a11y.plainNav)

  D.main = h('main', 'layers')
  D.main.append(D.h1, D.heroAct, D.about, D.detail, D.creative, D.system, D.work, D.lab, D.rest, D.world)
  if (LINEFIELD) D.main.insertBefore(D.lf, D.work)
  lastSaid = ''
  D.top.prepend(D.skip)
  D.h1.after(D.lead, D.keys)
  D.main.append(D.status)
  // the project summary is read before the project's own navigation, so Tab from it reaches that navigation
  D.world.prepend(D.world.querySelector('.wsum'))
  ui.append(D.top, D.main, D.bottom, D.a11y)
  D.aboutBlocks = [...D.detail.querySelectorAll('.ab')]
  D.hint = $('#hint')
  D.lang = D.top.querySelector('[data-locale]')
  D.current = D.work.querySelector('.current')
  D.wtitle = D.current.querySelector('.wtitle'); D.wmeta = D.current.querySelector('.wmeta')
  D.wlink = D.world.querySelector('.wlink'); D.wname = D.world.querySelector('.wname'); D.whost = D.world.querySelector('.whost')
  D.wblocks = D.world.querySelector('.wblocks'); D.wbs = []

}
function navigate(target) {
  const stop = { name: STOP.name, about: STOP.name, creative: STOP.creative, system: STOP.system, work: STOP.work, lab: STOP.lab, rest: STOP.rest, ...(LINEFIELD ? { linefield: STOP.linefield } : {}) }[target]
  if (A.mode === 'world') { exit(); A.pending = target; return }
  if (A.aboutOpen && target !== 'about') closeAbout()
  if (A.mode !== 'index') return
  go(stop)
  if (target === 'about') A.pending = 'about'
}
function runPending() {
  if (!A.pending || A.busy) return
  const atName = A.mode === 'index' && A.base === STOP.name && Math.abs(A.p) < 0.02
  if (A.pending === 'about') { if (atName) { A.pending = null; if (!A.aboutOpen) forcedPress(aboutX(), IDX[STOP.name].layout.gapY) } }
  else if (A.pending === 'detail') {
    if (A.mode !== 'index' || A.press) return
    if (A.aboutOpen) { A.pending = null; expandAbout(false); if (A.detailPushedLater) { A.detailPushed = true; A.detailPushedLater = false } }
    else if (A.base !== STOP.name) go(STOP.name)
    else if (atName) forcedPress(aboutX(), IDX[STOP.name].layout.gapY)
  } else if (A.pending === 'next' && A.mode === 'world' && Math.abs(A.wp - lastFrame()) < 0.02) {
    const full = worldFor(A.k)[lastFrame()]
    // the press begins as the frame comes solid, not after it has finished doing so; and once the visitor has
    // opened a project or two, pressing through takes the shorter of the two authored durations
    if (full.fill > 0.25) { A.pending = null; const fr = full.layout.frame; forcedPress(fr.x + fr.w / 2, fr.y + fr.h / 2, A.visited.size >= 2 ? 0.45 : 0.7) }
  } else if (['name', 'creative', 'system', 'work', 'lab', 'rest'].includes(A.pending) && A.mode === 'index') { const t = A.pending; A.pending = null; navigate(t) }
}
const px = (r) => `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px`
function fillWorldDOM(k) {
  const w = works[k], frs = framesOf(k), full = worldFor(k)[frs.length - 1], L = full.layout, next = works[L.next]
  D.wlink.href = w.url; D.wname.textContent = w.name; D.whost.textContent = w.host
  const close = `<h2 class="wb-name">${w.name}</h2><p class="wb-line">${w.line}</p><p class="wb-role">${w.role}</p>
    <p class="wb-links"><a href="${w.url}" target="_blank" rel="noopener noreferrer">${TXT.work.visit} <span lang="en">${w.host}</span> ↗</a><button data-world="all">${TXT.work.allWork}</button></p>`
  const alts = [...new Set(frs.flatMap((fr) => (fr.media || []).map((mm) => mm.item.alt)))]
  D.wblocks.innerHTML = frs.map((fr, i) => {
    const blocks = fr.full
      ? [{ rect: L.text, cls: 'wb-close', html: close }, { rect: { x: L.frame.x, y: L.frame.y - 30, w: L.frame.w, h: 22 }, cls: 'wb-next', html: N > 1 ? `${TXT.work.next} · ${next.name}` : TXT.work.again }]
      : fr.blocks || []
    return blocks.map((b) => `<div class="wb ${b.cls}" data-f="${i}" style="${px(b.rect)}">${b.html}</div>`).join('')
  }).join('')
  D.wbs = [...D.wblocks.querySelectorAll('.wb')]
  D.wbs.forEach((el) => { el.inert = true })
  // M4 A11Y: the frames stage the same project content over time. Assistive technology gets it once, in order, from
  // the same fields; the staged blocks leave the tree, and their links (duplicated by the project nav) leave the tab order.
  D.wblocks.setAttribute('aria-hidden', 'true')
  D.wblocks.querySelectorAll('a, button').forEach((el) => { el.tabIndex = -1 })
  D.world.querySelector('.wsum').innerHTML = `<h2 tabindex="-1">${w.name}</h2><p>${w.line}</p><p>${w.role}</p>
    <p>${w.strength}</p><ul>${w.facts.map((x) => `<li>${x}</li>`).join('')}</ul>${w.stack ? `<p lang="${w.stackLang}">${w.stack}</p>` : ''}
    ${psiHTML(w)}<p>${TXT.a11y.projectImages} ${alts.join(' ')}</p><p>${TXT.a11y.worldKeys}</p>`
  lastWB = ''
}
// ─── M4 ACCESSIBILITY: where focus goes, and what is said ─────────────────────
// A place reached from the keyboard moves focus to its own heading — the reader lands where the content is, and the
// arrow keys keep working from there (headings are not controls). A place reached any other way (pointer, touch, a
// screen reader's own activation) is named once in a polite status line. Nothing is announced per frame.
// keyed by the place's NAME, then read through SPINE: inserting a place cannot silently retarget the focus of
// every place after it, which is exactly what an array indexed by stop number would have done
const HEADING_OF = {
  ...(LINEFIELD ? { linefield: () => D.lf?.querySelector('h2') } : {}),
  name: () => D.h1,
  creative: () => D.creative.querySelector('h2'),
  system: () => D.system.querySelector('h2'),
  work: () => D.work.querySelector('h2'),
  lab: () => D.lab.querySelector('h2'),
  rest: () => D.rest.querySelector('h2'),
}
const NAME_OF = {
  ...(LINEFIELD ? { linefield: () => TXT.linefield?.heading } : {}),
  name: () => identity.name,
  creative: () => capabilities.surface.role,
  system: () => capabilities.system.role,
  work: () => TXT.work.heading,
  lab: () => lab.title,
  rest: () => TXT.contact.heading,
}
const PLACE_HEADING = SPINE.map((n) => () => HEADING_OF[n]())
const PLACE_NAME = SPINE.map((n) => () => NAME_OF[n]())
let focusWant = null, lastSaid = ''
// focus is taken as soon as the element exists and is no longer inert (layers turn on after their transition)
function wantFocus(get) { focusWant = { get, until: performance.now() + 6000 } }
function focusStep() {
  if (!focusWant) return
  if (performance.now() > focusWant.until) { focusWant = null; return }
  const el = focusWant.get()
  if (!el || !el.isConnected || el.closest('[inert]')) return
  el.focus({ preventScroll: true })
  focusWant = null
}
function announce(text) {
  if (!text || !D.status || text === lastSaid) return
  lastSaid = text
  D.status.textContent = text
}
function arrived(heading, name) {
  const asked = A.focusNext && performance.now() - A.focusNext < 9000
  if (A.kbd || asked) { A.focusNext = 0; wantFocus(heading) }
  else announce(name)
}
// the same control after the DOM is rebuilt in another language
function focusKey(el) {
  if (!el || !ui.contains(el)) return null
  const c = el.closest('[data-locale], [data-go], [data-work], [data-world], [data-detail], [data-back], [data-open]')
  // the hero's About and the strip's are the same action, so they answer to the same key: this one says which
  if (c?.classList.contains('hero-about')) return '.hero-about'
  if (c) for (const a of ['data-locale', 'data-go', 'data-work', 'data-world', 'data-detail', 'data-back', 'data-open']) if (c.hasAttribute(a)) return c.getAttribute(a) ? `[${a}="${c.getAttribute(a)}"]` : `[${a}]`
  if (el === D.h1) return 'main > h1'
  const layer = el.closest('.layer')
  if (layer && el.matches('h2')) return `.${[...layer.classList].filter((x) => x !== 'on').join('.')} h2`
  return null
}
const place = (el, r) => Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: r.h != null ? `${r.h}px` : '' })
function placeRest() { place(D.rest.querySelector('.contact'), IDX[STOP.rest].layout.block) }
function layoutDOM() {
  const [nm, cre, sys] = IDX
  if (LINEFIELD && LF?.back && D.lf) {
    // one box for both labels, set from the same margin the words are: the back reads from the left, the
    // front from the right, exactly as their words do
    const L = LF.back.layout
    const box = { x: V.W * 0.06, y: L.labelY, w: V.W * 0.88, h: L.labelH }
    place(D.lf.querySelector('.lf-back'), box)
    place(D.lf.querySelector('.lf-front'), box)
  }
  const ah = aboutHalf(), gy = nm.layout.gapY
  place(D.about.querySelector('.block'), { x: V.pad, y: gy - ah + 14, w: Math.min(V.W - V.pad * 2, 760), h: ah * 2 - 28 })
  /*
   * The hero's About sits in the fold between the names and ends on the page's right margin — the axis the strip's
   * navigation above it and the status line below it are already set to. The fold is the one band of the hero with
   * no ink in it: EMRAH puts no descender into it and YÜCEL reaches it only with the diaeresis on the Ü, which is
   * at the left of the measure, while the names are set from the left margin and never reach the right one. So the
   * word is clear of the composition at every screen the composition is set for, without being fitted to any of them.
   */
  place(D.heroAct.querySelector('.ha-line'), { x: V.pad, y: Math.round(gy - 22), w: V.W - V.pad * 2, h: 44 })
  layoutAbout()
  for (const [el, st] of [[D.creative, cre], [D.system, sys]]) {
    const L = st.layout
    place(el.querySelector('.pos'), L.posBlock)
    place(el.querySelector('.list'), L.listBlock)
    const role = el.querySelector('.role')
    role.hidden = !L.role
    if (L.role) Object.assign(role.style, { left: `${L.role.x}px`, top: `${L.role.y}px` })
  }
  const wk = WORKS[0].layout
  // the index column's text stays on its solid part, clear of the tapering edge
  place(D.work.querySelector('.col'), { x: 0, y: wk.col.y, w: wk.col.w - (V.P ? 0 : 24), h: wk.col.h - (V.P ? 60 : 0) })
  // The Lab stop keeps its place on the index but no longer shows a composition of its own — the Lab is a route,
  // and arriving at the stop opens it. Its retired layer is stood down once, here, rather than every frame: inert,
  // so it is neither drawn nor reachable, and the way to the Lab for a reader is the plain navigation, as before.
  setOn(D.lab, false)
  placeRest()
}
const onState = new Map()
const setOn = (el, on) => { if (onState.get(el) !== on) { onState.set(el, on); el.classList.toggle('on', on); el.inert = !on } }
// the destination the UI belongs to, read from the fields that already own it: the mode, the stop the engine has
// been sent to, and whether the About room is open. No second state machine — these are the same fields routing,
// history and the surface are driven by.
const DEST_AT = SPINE
function uiDestination() {
  if (A.mode === 'world' || A.mode === 'exit') return 'world'
  if (A.aboutOpen) return A.aboutDetail ? 'about-detail' : 'about'
  if (A.mode !== 'index') return 'name'
  return DEST_AT[clamp(A.base, 0, DEST_AT.length - 1)]
}
let lastHint = '', lastTone = '', lastTT = '', lastTB = '', lastBg = '', lastWork = '', lastWB = ''
function hintFor(stop) {
  const since = performance.now() - A.arrivedAt
  const H = TXT.hints
  const quiet = `${identity.city}${H.quietSeparator}${identity.status}`
  if (A.mode === 'world') return Math.round(A.wp) === 0 && !A.learned.world && since > 3500 ? H.world : ''
  if (A.mode !== 'index' || A.aboutOpen) return ''
  // The hero taught the hold that opened About, and the Lab stop taught the hold that made a room. Neither is true
  // any more: About is a control on the hero, and the Lab is a route that opens on arrival. A place teaches only
  // what it still asks for — the two faces and the work field do; the hero and the Lab stop stay quiet.
  if (stop === STOP.creative || stop === STOP.system) return !A.learned.face && since > 2500 ? (TOUCH ? H.faceTouch : H.face) : quiet
  if (stop === STOP.work) return !A.learned.work && since > 2500 ? (TOUCH ? H.workTouch : H.work) : quiet
  return quiet
}
function stripTones(dom) {
  if (A.mode === 'world' || A.mode === 'exit') return ['media', 'media']
  const t = dom.negative ? 'dark' : 'light'
  const cover = (y) => {
    for (const f of surface.features) {
      if (f.kind !== 1 || f.h < 1 || f.hw < V.W) continue
      if (y > f.cy - f.h && y < f.cy + f.h) return A.beneathSt?.negative ? 'dark' : 'light'
    }
    return t
  }
  return [cover(V.strip / 2), cover(V.H - V.strip / 2)]
}
// the two faces are one opening (see frame()): going in, the picture is whole once the opening spans the sheet (0.7 of
// the way); going back, once it has closed (0.1). A push-through lands exactly on the face, navigation damps onto it:
// either way the face's text and tone arrive with the picture, not with the last hundredths of the position.
const FACE_WHOLE = [0.1, 0.7]
function domUpdate(from, to, front) {
  focusStep()
  const faceT = A.mode === 'index' && from === IDX[STOP.creative] && to === IDX[STOP.system] ? A.p - STOP.creative : null
  const face = faceT == null ? null : A.base === STOP.system && faceT >= FACE_WHOLE[1] ? IDX[STOP.system] : A.base === STOP.creative && faceT <= FACE_WHOLE[0] ? IDX[STOP.creative] : null
  const dom = face || (front < 0.5 ? from : to)
  const idleIdx = A.mode === 'index' && !A.busy
  const loaded = (A.press && A.press.L > 0.1 && A.press.st.beneath !== 'pin') || !!A.squeeze
  const at = (i) => (Math.abs(A.p - i) < 0.03 && Math.abs(A.p - A.base) < 0.2) || face === IDX[i]
  if (REDUCED) {
    // the destination owns its text. In normal motion a layer arrives with the picture, so it is asked for from
    // the picture — how far the composition has travelled, how open the room has grown. Reduced motion has no
    // travel to read and no room to wait for: it names the destination and the layer that belongs to it.
    const d = uiDestination()
    setOn(D.heroAct, d === 'name')
    setOn(D.about, d === 'about')
    setOn(D.detail, d === 'about-detail')
    setOn(D.creative, d === 'creative')
    setOn(D.system, d === 'system')
    setOn(D.work, d === 'work')
    if (LINEFIELD && LF) setOn(D.lf, d === 'linefield')
    setOn(D.rest, d === 'rest')
    setOn(D.world, d === 'world')
  } else {
    // it belongs to the hero, so it is there whenever the hero is: from the first frame of the opening, and gone
    // while the room it opens is opening — the room's own text arrives in its place
    setOn(D.heroAct, idleIdx && at(STOP.name) && !loaded && !A.aboutOpen)
    setOn(D.about, A.aboutOpen && !A.aboutDetail && A.aboutDetailK < 0.02 && !!A.about && A.about.h > aboutHalf() * 0.82 && A.about.h < aboutHalf() * 1.15)
    setOn(D.detail, A.aboutOpen && A.aboutDetail && A.aboutDetailK > 0.72)
    setOn(D.creative, idleIdx && at(STOP.creative) && !loaded)
    setOn(D.system, idleIdx && at(STOP.system) && !loaded)
    setOn(D.work, idleIdx && at(STOP.work) && !loaded)
    // the heading belongs to the ends of the passage, not to the middle of it: nothing is read while it moves
    if (LINEFIELD && LF) {
      setOn(D.lf, idleIdx && at(LFS) && !loaded && (A.lfp < 0.02 || A.lfp > 0.98) && !LF.drive.moving(A.lfp))
      // and only the half that is actually on screen is named
      D.lf.querySelector('.lf-back').classList.toggle('on', A.lfp < 0.5)
      D.lf.querySelector('.lf-front').classList.toggle('on', A.lfp >= 0.5)
    }
    setOn(D.rest, idleIdx && at(STOP.rest) && A.restOpen > 0.72)
    setOn(D.world, A.mode === 'world' || A.mode === 'exit')
  }
  if (D.lead.hidden !== A.aboutOpen) D.lead.hidden = A.aboutOpen
  const inWorld = A.mode === 'world'
  const fi = clamp(Math.round(A.wp), 0, lastFrame())
  const near = inWorld && !A.busy && Math.abs(A.wp - fi) < 0.05
  const full = inWorld && WORLD[A.k] ? WORLD[A.k][lastFrame()] : null
  const wbKey = inWorld ? `${A.k}:${near ? fi : -1}:${full?.fill > 0.5}:${loaded}` : 'x'
  if (wbKey !== lastWB) {
    lastWB = wbKey
    for (const el of D.wbs) {
      const isNext = el.classList.contains('wb-next')
      const on = near && +el.dataset.f === fi && !(isNext && !(full?.fill > 0.5)) && !(loaded && (isNext || el.classList.contains('wb-close')))
      el.classList.toggle('on', on); el.inert = !on
    }
  }
  document.body.classList.toggle('in-world', inWorld || A.mode === 'exit')

  const tone = inWorld ? 'media' : dom.negative ? 'dark' : 'light'
  if (tone !== lastTone) { document.body.dataset.tone = tone; lastTone = tone }
  const [tt, tb] = stripTones(dom)
  if (tt !== lastTT) { D.top.dataset.tone = tt; D.world.querySelector('.wnav').dataset.tone = tt; lastTT = tt }
  if (tb !== lastTB) { D.bottom.dataset.tone = tb; lastTB = tb }
  const parting = A.mode === 'index' && ((from === IDX[STOP.creative] && to === IDX[STOP.system] && A.p > STOP.creative + 0.001) || A.press?.st.beneath === 'state' || A.squeeze?.st.beneath === 'state')
  const bg = inWorld || A.mode === 'exit' ? '#0b0c0e' : (parting && A.beneathSt ? A.beneathSt.bg : dom.bg)
  if (bg !== lastBg) { document.body.style.backgroundColor = bg; lastBg = bg }

  // the work field names a work only once it is whole
  const k = registeredWork()
  const key = `${k}:${[...A.visited].join('')}`
  if (key !== lastWork) {
    lastWork = key
    if (k >= 0) { D.wtitle.textContent = works[k].name; D.wmeta.textContent = works[k].strength; D.current.querySelector('.open').setAttribute('aria-label', `${TXT.work.open} — ${TXT.a11y.openProject}: ${works[k].name}`) }
    D.current.classList.toggle('on', k >= 0)
    D.work.querySelectorAll('[data-work]').forEach((b, i) => { b.classList.toggle('active', i === k); b.classList.toggle('visited', A.visited.has(i)); if (i === k) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current') })
  }
  const hint = hintFor(Math.round(A.p))
  if (hint !== lastHint) { D.hint.textContent = hint; lastHint = hint }
}

// ─── media ───────────────────────────────────────────────────────────────────
const mediaRoot = $('#media')
function mediaFor(k) {
  if (!MEDIA[k]) {
    MEDIA[k] = framesOf(k).map((fr) => (fr.media || []).map((mm) => {
      const me = mediaElement(mm.item, `m-${fr.g}`)
      placeMedia(me, mm.rect, mm.pos || 'left top')
      mediaRoot.appendChild(me.el)
      me.node.decode?.().catch(() => {})   // decoded before it is ever shown
      return me
    }))
  }
  return MEDIA[k]
}
let mediaShown = ''
function mediaUpdate() {
  let key = '', kk = -1, show = []
  if (A.releaseK != null) { kk = A.releaseK; show = mediaFor(kk)[0]; key = `r${kk}` }
  else if ((A.mode === 'world' || A.mode === 'exit') && A.worldOn) {
    kk = A.k
    const list = mediaFor(kk), last = list.length - 1
    // a frame the world has settled on shows only its own media (the damped position never lands exactly on it)
    const a = clamp(Math.floor(A.wp + 0.004), 0, last), b = clamp(Math.ceil(A.wp - 0.004), 0, last)
    if (A.wp < last - 0.03) show = [...list[a], ...(b !== a ? list[b] : [])]
    key = `w${kk}:${a}:${b}:${show.length}`
  }
  if (key === mediaShown) return
  mediaShown = key
  const on = new Set(show)
  for (const list of Object.values(MEDIA)) for (const fr of list) for (const me of fr) me.el.classList.toggle('on', on.has(me))
  mediaRoot.style.background = kk >= 0 ? works[kk].ink : ''
}

// ─── WORK → LAB: the system changes mode ─────────────────────────────────────
// Past the last work, the whole work field is folded into one stored band — the same stored material the site opened
// with — and the works this visit opened lie inside it as threads in their own inks. It holds; and it unfolds again,
// not as the name this time, but as the Lab.
function startBridge() {
  if (A.busy || A.mode !== 'index' || A.aboutOpen) return
  const k = clamp(Math.round(A.wt), 0, N - 1), work = WORKS[k]
  const key = `b${A.visitOrder.slice(-3).join(',')}`
  if (!BRIDGE || BRIDGE.visitKey !== key) { if (BRIDGE) { BRIDGE.dead = true; surface.release(BRIDGE) } BRIDGE = ST.bridgeState(V, A.visitOrder) }
  if (A.press) cancelPress(A.press)
  A.busy = true; A.mode = 'bridge'; A.leftWork = performance.now(); A.bridgePK = 0
  A.from = work; A.to = BRIDGE; A.front = 0
  const f = A.bridgeF = gather({ cx: V.W / 2, cy: V.H / 2, sigma: V.H * 2.6, Lm: V.H * 0.64, s: 0 })
  if (REDUCED) {
    A.bridgeF = null; A.to = IDX[STOP.lab]
    gsap.to(A, { front: 1, bridgePK: 1, duration: 0.4, ease: 'none', onComplete: finishBridge })
    return
  }
  const s0 = V.P ? 13 : 20, L0 = V.H * (V.P ? 0.15 : 0.12)
  const u = { t: 0 }
  const set = () => { f.sigma = Math.exp(lerp(Math.log(V.H * 2.6), Math.log(s0), u.t)); f.Lm = Math.exp(lerp(Math.log(V.H * 0.64), Math.log(L0), u.t)); f.s = smooth(0, 0.3, u.t) }
  // The fold keeps all four of its movements — the field gathers, the sheet registers, it opens into the Lab, and
  // the Lab's own place takes over — but not the waiting between them. Measured, the visitor saw nothing of where
  // they were going for 4.3 s: most of it was the hold after the gather, and a reopening that went on long after
  // the composition could be read. Both are shorter; nothing is removed, and the order is untouched.
  gsap.timeline()
    .to(A, { front: 1, duration: 0.8, ease: 'power2.inOut' }, 0)
    .to(u, { t: 1, duration: 0.95, ease: 'power3.in', onUpdate: set }, 0)
    .add(() => { A.shiver = 0.32; haptic([10, 40, 10]) }, 0.95)
    .to(A, { shiver: 0, duration: 0.45, ease: 'power2.in' }, 1.02)
    .add(() => { A.from = BRIDGE; A.to = IDX[STOP.lab]; A.front = 0 }, 1.25)
    .to(A, { front: 1, duration: 1.15, ease: 'power2.inOut' }, 1.25)
    .to(u, { t: 0, duration: 1.35, ease: 'expo.inOut', onUpdate: set }, 1.25)
    .to(A, { bridgePK: 1, duration: 0.9, ease: 'expo.out' }, 1.95)
    .add(finishBridge, 2.5)
}
function finishBridge() {
  A.bridgeF = null; A.shiver = 0; A.bridgePK = 1
  A.mode = 'index'; A.p = A.pT = A.base = STOP.lab; A.prevBase = STOP.work; A.busy = false
  // the field folded into the Lab, and the Lab is its own place: the bench opens as the fold finishes
  openLab()
}

// ─── loop ────────────────────────────────────────────────────────────────────
function snap(keyT, keyBase, max, now, dt) {
  if (ptr.down || now - A.lastInput < 240) return
  if (A.gesture) {
    const d = A[keyT] - A[keyBase]
    if (Math.abs(d) > 0.12) A[keyBase] = clamp(A[keyBase] + Math.sign(d) * Math.max(1, Math.round(Math.abs(d))), 0, max)
    A.gesture = false
  }
  A[keyT] = damp(A[keyT], A[keyBase], 4.5 * RM, dt)
}
function tuneWork(now, dt) {
  const dragging = ptr.down && ptr.axis === 'x'
  const idleNow = !dragging && now - A.lastInput > 180
  const k = clamp(Math.round(A.wT), 0, N - 1)
  if (idleNow) A.wT = damp(A.wT, k, 7 * RM, dt)
  // close to register, the material pulls itself the rest of the way; a work opened before pulls harder
  const near = idleNow && Math.abs(A.wt - k) < 0.14
  const rate = near ? (A.visited.has(k) ? 16 : 11) : dragging ? 14 : (A.visited.has(k) ? 7 : 4.2)
  A.wt = damp(A.wt, A.wT, rate * RM, dt)
  if (idleNow && Math.abs(A.wt - A.wT) < 0.004) A.wt = A.wT
}
function scrub(list, p) {
  const a = clamp(Math.floor(p), 0, list.length - 2), t = clamp(p - a, 0, 1)
  if (t < 0.0005) return [list[a], list[a], 1]
  if (t > 0.9995) return [list[a + 1], list[a + 1], 1]
  return [list[a], list[a + 1], t]
}
function penAt(st, front) {
  const band = 2.5 / st.total
  const o = clamp(front * (1 + band) - band * 0.5, 0, 1)
  const idx = Math.floor(o * st.total), fr = o * st.total - idx
  return [(idx % 2 ? 1 - fr : fr) * V.W, idx * st.spacing, idx]
}
// everything the shader reads, reduced to a string: equal strings draw equal pixels
let lastSig = '', stillMem = 0, lastMem = 0, lastMemT = 0
const q2 = (v) => Math.round((v || 0) * 100)
function stillSig(from, to, fs, overlay, front) {
  let s = `${from.id}|${to.id}|${from.visitKey || ''}|${to.visitKey || ''}|${q2(front * 100)}|${q2(A.lfp * 1000)}|${overlay}|${surface.fill}|${A.beneathSt?.id}|${surface.beneathStart},${surface.beneathCount}|${surface.devId}|${surface.visited.join('')}|`
  for (const st of [from, to]) { const g = st.reg; s += `${q2(g.a0)},${q2(g.a1)},${q2(g.va0)},${q2(g.va1)},${q2(g.holdA)},${q2(st.fill)},${q2(st.flash)},${q2(st.vis)},${q2(st.lod)}|` }
  for (const f of fs) s += `${f.kind},${q2(f.cx)},${q2(f.cy)},${q2(f.h)},${q2(f.hw)},${q2(f.sigma)},${q2(f.s)},${q2(f.y1)},${q2(f.y2)},${q2(f.falloff)},${q2(f.lip)};`
  // The flat renderer draws none of the physics — no displacement, no development, no memory — so none of it may
  // ask for a redraw either: a settled reduced page would otherwise keep redrawing for a grid it never reads.
  if (surface.flat) { stillMem = 0; return s }
  // memory decays a byte at a time somewhere on the grid almost every frame (0.25%/s): it gets its own hash and may
  // only ask for a redraw every 400ms. Displacement, develop and disturbance are hashed exactly.
  let c = 0, mh = 0
  const d = phys.data
  for (let i = 0; i < d.length; i++) {
    if (i % 4 === 2) mh = (Math.imul(mh, 31) + d[i]) | 0
    else c = (Math.imul(c, 31) + d[i]) | 0
  }
  stillMem = mh
  return s + c
}
const scaled = (st, k) => (k < 0.001 ? [] : (st.features || []).map((f) => (f.kind === 2 ? { ...f, s: f.s * k } : { ...f, h: f.h * k })))
// POST-M5 PERF — RENDER CAPACITY. Without a GPU the browser renders WebGL in software and must read every drawn frame
// back before it can show it: each frame blocks the page for most of a second. Capacity is measured from the surface's
// own consecutive drawn frames only, never from the browser, the device or its name.
//   constrained  when the lower median of the last n intervals between consecutive drawn frames is over `slow` ms
//                (with n = 6: at least four of the last six)
//                (the first `warm` intervals after start, a rebuild, a hidden tab or an absent surface are not counted;
//                a gap of STALL or more is a stall, not a frame)
//   released     after `fastRun` consecutive drawn frames each under `fast` ms
// While constrained only the ambient row wave rests, and material memory redraws every `memGap` ms instead of 400 ms.
// Everything that is a change of state — input, places, faces, work, worlds, Lab, language, resize — still draws.
const CAP = { n: 6, slow: 150, warm: 2, fast: 50, fastRun: 3, memGap: 10000 }
const cap = { iv: [], prev: false, warm: CAP.warm, fastRun: 0 }
function capReset() { cap.iv.length = 0; cap.prev = false; cap.warm = CAP.warm; cap.fastRun = 0 }
function noteFrame(drawn, et) {
  const consecutive = drawn && cap.prev
  cap.prev = drawn
  if (!consecutive || et >= STALL) return
  if (cap.warm > 0) { cap.warm--; return }
  const ms = et * 1000
  if (A.constrained) {
    cap.fastRun = ms < CAP.fast ? cap.fastRun + 1 : 0
    if (cap.fastRun >= CAP.fastRun) { A.constrained = false; cap.iv.length = 0; cap.fastRun = 0 }
    return
  }
  cap.iv.push(ms)
  if (cap.iv.length > CAP.n) cap.iv.shift()
  if (cap.iv.length === CAP.n && [...cap.iv].sort((a, b) => a - b)[(CAP.n >> 1) - 1] > CAP.slow) { A.constrained = true; cap.iv.length = 0; cap.fastRun = 0 }
}
// ─── reduced motion: the destination, never the way there ────────────────────
// Reduced motion keeps the whole engine — routing, history, focus, locale, the places themselves — and gives up
// only the travel between places. Tweens still run (they own state, history and focus, and their onComplete work
// must happen); what changes is that nothing the surface draws is ever a sample of one. Every continuous quantity
// the renderer reads is set here to the value it holds once everything has finished, so the first frame after a
// navigation is already the destination's canonical composition and the signature then holds still.
function canonical() {
  // only what is shown is canonical: the targets stay where the gesture put them, so a drag still carries the
  // visitor between places (snap() promotes it to a stop) — it is the picture that never shows the way there.
  if (A.mode === 'index') A.p = A.base
  if (A.mode === 'world') A.wp = A.wbase
  A.wt = clamp(Math.round(A.wT), 0, N - 1)
  A.aboutDetailK = A.aboutDetail ? 1 : 0
  // the About room: open on the name plate, or mapped onto the detail's blocks. The detail room is derived by
  // aboutRoomFeatures() from aboutDetailK, which is canonical above; the resting room is stated here.
  if (A.about) {
    if (!A.aboutOpen) A.about.h = 0
    else if (!A.aboutDetail) {
      const g = aboutFeature(1)
      A.about.cx = g.cx; A.about.cy = g.cy; A.about.h = g.h; A.about.hw = g.hw
      A.about.falloff = g.falloff; A.about.power = 2; A.about.lip = 5; A.about.lipW = 7
    }
  }
  A.restOpen = A.base === STOP.rest && !A.aboutOpen ? 1 : 0
  /*
   * The passage has two canonical pictures, the backend field and the frontend one, and reduced motion crossfades
   * between them. So what is SHOWN rounds to an end while the drive keeps its continuous target: a gesture still
   * carries the visitor across, and past the far end it still continues along the spine.
   */
  if (LINEFIELD && LF) A.lfp = LF.drive.target < 0.5 ? 0 : 1
  A.introReg = 0; A.nameAmp = 0
}
let last = performance.now()
function frame(now) {
  // POST-M5 PERF: two clocks. `et` is the real time since the last frame (up to a stall) and drives the closed-form
  // convergences: place and frame position, work tuning, registration drag, imprint visibility, pointer velocity decay,
  // and the material physics, which integrates it in steps of at most 50 ms (at 60 fps: one step, as before).
  // `dt` keeps its 50 ms cap for hold load, squeeze and the Lab rooms.
  const et = Math.min(STALL, Math.max(0, (now - last) / 1000))
  const dt = Math.min(0.05, et)
  last = now
  // positions land exactly on their stop: a place that has arrived is still, so it is not drawn again
  if (A.mode === 'index') { snap('pT', 'base', LAST, now, et); A.p = damp(A.p, A.pT, 3.4 * RM, et); if (Math.abs(A.p - A.pT) < 5e-4 && A.pT === A.base) A.p = A.pT }
  if (A.mode === 'world') {
    snap('wpT', 'wbase', lastFrame(), now, et)
    // Travelling a project's frames is reading it, and reads at the pace the visitor sets. Being carried to the
    // end because they asked for the NEXT project is not reading — it is the way out, across material they have
    // chosen to leave. That one crossing goes quicker, and quicker again once this visit has done it before.
    const leaving = A.pending === 'next'
    const rate = leaving ? (A.visited.size >= 2 ? 9 : 5.5) : 3.4
    A.wp = damp(A.wp, A.wpT, rate * RM, et)
    if (Math.abs(A.wp - A.wpT) < 5e-4 && A.wpT === A.wbase) A.wp = A.wpT
  }
  if (A.mode === 'index' && A.base !== A.prevBase) { onArrive(A.base, A.prevBase); A.prevBase = A.base }
  tuneWork(now, et)
  /*
   * The passage advances on the runtime's own clock rather than on a second requestAnimationFrame of its own:
   * one loop owns the time step, the stall cap and the decision to draw. Reduced motion keeps the drive — it
   * is what a gesture acts on — and quantises what is SHOWN in canonical().
   */
  if (LINEFIELD && LF) A.lfp = LF.drive.step(A.lfp, et)
  if (REDUCED) canonical()
  IDX[STOP.work] = WORKS[clamp(Math.round(A.wt), 0, N - 1)]
  if (LINEFIELD && LF) IDX[LFS] = LF.at(A.lfp)

  let from, to, front, overlay = 0
  if (A.mode === 'index') {
    [from, to, front] = scrub(IDX, A.p)
    if (from === IDX[STOP.creative] && to === IDX[STOP.system]) front = 0
    if (from === IDX[STOP.work] && to === IDX[STOP.work]) {
      // two works share the field only while both can be seen; a settled field draws one
      const k0 = clamp(Math.floor(A.wt), 0, N - 1), k1 = clamp(k0 + 1, 0, N - 1), t = A.wt - k0
      if (k1 === k0 || t < 0.02) { from = to = WORKS[k0]; front = 1 }
      else if (t > 0.98) { from = to = WORKS[k1]; front = 1 }
      else { from = WORKS[k0]; to = WORKS[k1]; front = 1; overlay = 1 }
    }
  } else if (A.mode === 'world') [from, to, front] = scrub(worldFor(A.k), A.wp)
  else { from = A.from; to = A.to; front = A.front }

  /*
   * LINEFIELD. Two decisions, and only ever one of them:
   *
   *   normal motion   the corridor's own program draws the field, and it is bound whenever one of the two
   *                   Linefield states is on screen — including while the spine is travelling into or out of
   *                   the place, where the map is the identity and the program draws exactly what the base one
   *                   would. Binding it there rather than at the last moment is what keeps the seam from
   *                   Full-Stack invisible: no program swap happens while anything is moving.
   *   reduced motion  the corridor is not bound at all. The passage is a movement whose whole content is
   *                   movement, and there is no honest still of the middle of it, so what is given is the two
   *                   ends and a crossfade between them — the same thing every other pair of places does.
   */
  let lfOn = false
  if (LINEFIELD && LF && A.mode === 'index') {
    const here = from === LF.back || from === LF.front || to === LF.back || to === LF.front
    if (here && REDUCED) {
      if (A.base === LFS) { const r = LF.reducedPair(A.lfp); from = r.from; to = r.to; front = r.front }
    } else lfOn = here
  }
  /*
   * The program is only ever touched on a Linefield build, and only where there IS a program: in reduced motion
   * `surface` is the flat 2D renderer, which has no variants and no use() — reaching for one there threw on
   * every frame of the published build, which took the DOM layers down with it.
   */
  if (LINEFIELD && LF) {
    surface.use?.(lfOn ? 'corridor' : null)
    surface.onBeforeDraw = lfOn ? () => LF.apply(surface, A.lfp) : null
  }

  registration(now, et)
  updatePress(now, dt)
  updateSqueeze(dt)
  runPending()
  // THE FIFTH DESTINATION. Travel that settles on the Lab stop hands over to the bench, the way the Work → Lab
  // bridge already ends: reached from Work it is the bridge, reached from Contact it is this. Only travel arms it,
  // so a state restored onto the Lab stop — coming back to this entry, or returning from the bench itself — sits
  // there quietly instead of pushing the route again.
  if (A.labArmed && A.mode === 'index' && A.base === STOP.lab && Math.abs(A.p - STOP.lab) < 0.02 && Math.abs(A.pT - STOP.lab) < 0.02 && !A.busy && !A.aboutOpen && !ptr.down && owns()) openLab()
  if (A.mode === 'world' && !A.busy) Object.assign(A.world, worldGeom(A.wp))
  const lf = A.mode === 'world' ? lastFrame() : 0
  if (A.mode === 'world' && A.wp > lf - 0.1 && !A.nextArmed) {
    A.nextArmed = true
    const full = worldFor(A.k)[lf]
    const ready = () => { haptic(8); mediaFor(full.layout.next); queueWarm(worldFor(full.layout.next)) }
    // reduced motion is not asked to watch the next project register itself: it is simply there (§ the approved
    // direct architecture — this is the same state, set rather than travelled)
    /*
     * The next project coming into register is worth watching once. It was watched every time: two full seconds
     * before the frame was even solid enough to be pressed, on every project-to-project move, which is the whole
     * of the repetition the review called tiring. The movement is the same and in the same order; after the
     * visitor has seen it, it takes the time of a transition rather than the time of a reveal. What counts as
     * "seen" is the runtime's own memory of what this visit has learned — nothing new is tracked.
     */
    const firstTime = !A.learned.next
    A.learned.next = true
    if (REDUCED) {
      // reduced motion is not asked to watch the next project register itself: it is simply there. Same state,
      // set rather than travelled — the architecture the rest of reduced motion already uses.
      A.nextReg = 0; full.lod = 0; full.fill = 1; ready()
    } else {
      gsap.to(A, {
        nextReg: 0, duration: firstTime ? 1.35 : 0.5, delay: firstTime ? 0.18 : 0.04, ease: 'expo.inOut',
        onComplete: () => {
          gsap.to(full, { lod: 0, duration: firstTime ? 0.24 : 0.16, ease: 'expo.out' })
          gsap.to(full, { fill: 1, duration: firstTime ? 0.44 : 0.26, delay: 0.03, ease: 'power3.out' })
          ready()
        },
      })
    }
  }
  if (A.mode === 'world' && A.wp < lf - 0.6 && A.nextArmed) { gsap.killTweensOf(A, 'nextReg'); A.nextArmed = false; A.nextReg = 1; const full = worldFor(A.k)[lf]; gsap.killTweensOf(full); full.fill = 0; full.lod = ST.LOD_OFF }

  // composition. order matters: what the visitor does acts on the screen first; the place's own composition then maps that material
  const fs = [...A.features]
  if (A.about && A.aboutDetailK > 0.0005) fs.push(...aboutRoomFeatures())
  const ft = A.p - STOP.creative
  if (A.mode === 'index' && from === IDX[STOP.creative] && to === IDX[STOP.system] && ft > 0 && ft < 1) {
    const e = smooth(0.04, 0.96, ft)
    Object.assign(A.faceF, { cx: V.W * 0.5, cy: IDX[STOP.creative].weak(), h: V.H * 1.12 * Math.pow(e, 1.9), hw: lerp(V.W * 0.32, 16000, smooth(0.08, 0.7, ft)), falloff: lerp(22, 90, e), kind: 1, reach: 0, lip: 0 })
    fs.push(A.faceF)
    if (ft > 0.9) A.learned.face = true
  }
  const staticStart = fs.length
  if (overlay || from === to) fs.push(...scaled(to, 1))
  else { fs.push(...scaled(from, 1 - front)); fs.push(...scaled(to, front)) }
  const staticCount = fs.length - staticStart
  if (A.worldOn) fs.push(A.world)
  if (A.bridgeF) fs.push(A.bridgeF)
  surface.features = fs
  const dom = front < 0.5 ? from : to
  A.beneathSt = dom.id === 'creative' ? IDX[STOP.system] : dom.id === 'system' ? IDX[STOP.creative] : to
  surface.beneath(A.beneathSt)
  const faces = dom.id === 'creative' || dom.id === 'system'
  surface.beneathStart = staticStart; surface.beneathCount = faces ? staticCount : 0
  surface.devId = A.press && A.press.st.workIndex != null ? A.press.st.workIndex : (A.press && A.press.st.layout?.next != null ? A.press.st.layout.next : -1)
  if (IDX[STOP.rest].layout.wedge) IDX[STOP.rest].features[0].h = IDX[STOP.rest].layout.wedge.h * A.restOpen

  // how much of the visit's imprint each place lets show; at rest everything else is straight, so it shows most
  const stop = Math.round(A.p)
  const impT = A.mode !== 'index' ? 0 : stop === STOP.lab ? 1 : stop === STOP.rest ? 1.35 : 0.75
  phys.impVis = damp(phys.impVis, impT, stop === STOP.rest ? 1.1 : 3, et)

  const src = { x: ptr.x, y: ptr.y, vx: ptr.vx, vy: ptr.vy, hover: ptr.hover }
  const pr = A.press
  const devs = pr && pr.st.beneath !== 'pin' ? [{ x: pr.f.cx, y: pr.f.cy, ax: pr.f.hw * 1.25, ay: 36 + pr.f.h * 0.9, amt: clamp(pr.L * 1.35, 0, 1) }] : []
  const physSteps = Math.min(40, Math.max(1, Math.ceil(et / 0.05 - 1e-9))), ph = et / physSteps
  for (let i = 0; i < physSteps; i++) { phys.step(ph / 2, [src], devs); phys.step(ph / 2, [src], devs) }
  ptr.vx *= Math.exp(-et * 9); ptr.vy *= Math.exp(-et * 9)
  surface.phys(phys)

  const [px0, py0, idx] = penAt(to, front)
  const followable = !overlay && A.mode !== 'intro' && to === A.lastTo && Math.abs(idx - A.lastIdx) <= 3 && front > 0.002 && front < 0.998 && !(from === IDX[STOP.creative] && to === IDX[STOP.system])
  A.lastIdx = idx; A.lastTo = to
  surface.pen = [px0, py0, followable ? 1 : 0]
  surface.penCol = to.ink
  surface.pair(from, to, front)
  surface.overlay = overlay
  // POST-M5 PERF: while render capacity is constrained the ambient clock stands still (a shiver keeps it running), so the
  // rows keep the shape they had and a redraw for a real change shows them exactly as they were. Otherwise 0: unchanged.
  if (A.constrained && A.shiver <= 0.001) A.timeHeld += et
  surface.time = now / 1000 - A.timeHeld
  surface.shiver = A.shiver
  surface.strip = V.strip
  // a study shows only through a real opening: where Lab media exists the voids are left transparent
  surface.fill = (A.mode === 'index' || A.mode === 'intro' || A.mode === 'bridge') && A.releaseK == null ? 1 : 0

  domUpdate(from, to, front)
  mediaUpdate()
  // while the work has the whole screen, the surface is not there at all — do not draw it
  const absent = !owns() || (A.mode === 'world' && !A.busy && ABSENT.has(framesOf(A.k)[clamp(Math.round(A.wp), 0, lastFrame())].g) && Math.abs(A.wp - Math.round(A.wp)) < 0.003)
  if (!absent) {
    // a still surface is not drawn again: only waving rows, a shiver or the scan pen need every frame. POST-M5 PERF: the
    // waving rows are ambient — they count as motion only while the device can render them (see noteFrame)
    const ambient = !A.constrained && [from, to, A.beneathSt].some((s) => s && s.amp * (s.ampK ?? 1) > 0.001)
    const moving = ambient || A.shiver > 0.001 || surface.pen[2] > 0
    const sig = moving ? '' : stillSig(from, to, fs, overlay, front)
    let drawn = false
    let draw = moving || sig !== lastSig || (stillMem !== lastMem && now - lastMemT > (A.constrained ? CAP.memGap : 400))
    // POST-M5 PERF: while the static hero stands nothing is drawn; the first real change (input, a place, a press, a
    // resize that changed more than the layout the hero was repainted for) draws WebGL and retires the hero
    if (A.staticHero) {
      if (staticSig === null) staticSig = sig
      if (moving || sig !== staticSig) { A.staticHero = false; staticSig = null; draw = true; retireStaticHero() }
      else draw = false
    }
    if (draw) { surface.render(); drawn = true; lastMem = stillMem; lastMemT = now }
    lastSig = sig; A.cleared = false
    noteFrame(drawn, et)
  } else if (!A.cleared) { surface.clear(); A.cleared = true; lastSig = ''; capReset() }
  A.jsMs = lerp(A.jsMs || 0, performance.now() - now, 0.05)
  requestAnimationFrame(frame)
}

// ─── POST-M5 PERF: static hero for a software renderer ───────────────────────
// Where WebGL is rendered in software every drawn frame blocks the page for most of a second. There the visit begins
// on the settled name plate, drawn once in 2D from the name state's own masks and layout: rows at the state's spacing,
// thin on the paper, full inside the letters, absent in the strips — the rows WebGL draws at rest. WebGL draws the
// first time something really changes, and the plate is removed two frames later, once that frame is on screen.
let staticEl = null, staticSig = null
function startStaticHero() {
  A.staticHero = true; A.constrained = true
  A.mode = 'index'; A.introReg = 0; A.nameAmp = 0; A.arrivedAt = performance.now()
  staticEl = document.createElement('canvas')
  staticEl.setAttribute('aria-hidden', 'true')
  Object.assign(staticEl.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', display: 'block', zIndex: '1', pointerEvents: 'none' })
  canvas.after(staticEl)
  paintStaticHero()
}
function paintStaticHero() {
  if (!staticEl) return
  staticSig = null   // the next frame takes the repainted layout as the resting state: a resize alone does not wake WebGL
  const dpr = V.dpr * V.u
  staticEl.width = Math.round(V.W * dpr); staticEl.height = Math.round(V.H * dpr)
  // the plate is drawn by the same 2D primitive reduced motion draws its whole surface with (flat.js): one row
  // loop, one set of masks, one visual language. The tone gain follows the ambient amplitude, which is 0 at rest.
  paintFlat(staticEl.getContext('2d'), IDX[STOP.name], { W: V.W, H: V.H, dpr, features: [], fill: 1, amp: A.nameAmp * (IDX[STOP.name].ampK ?? 1) })
}
function retireStaticHero() {
  const el = staticEl
  staticEl = null
  if (el) requestAnimationFrame(() => requestAnimationFrame(() => el.remove()))
}

// ─── opening ─────────────────────────────────────────────────────────────────
// Frame one is stored material: every row of the page pressed into one dense band at the seam between the
// names, straining at its edges. It gives, and unfolds — rows streaming apart, the name carried open by them, out
// of register — until the two row sets find each other and lock. Nothing moves for a moment after that.
function breathe(delay) {
  gsap.delayedCall(delay, () => {
    if (A.learned.open || A.mode !== 'index' || A.base !== STOP.name || A.press || A.busy) return
    const f = feature({ cx: V.P ? V.W / 2 : V.W * 0.32, cy: IDX[STOP.name].layout.gapY, h: 0, hw: V.P ? 1e5 : V.W * 0.7, falloff: 26 })
    A.features.add(f)
    gsap.timeline({ onComplete: () => A.features.delete(f) })
      .to(f, { h: V.P ? 5 : 7, duration: 0.9, ease: 'sine.inOut' })
      .to(f, { h: 0, duration: 1.1, ease: 'sine.inOut' })
  })
}
function playIntro() {
  gsap.killTweensOf(A)
  if (A.introF) A.features.delete(A.introF)
  const gapY = IDX[STOP.name].layout.gapY
  /*
   * THE OPENING PLAYS OVER A HERO THAT IS ALREADY THERE. It used to build one: the field began collapsed to a line
   * and opened over 2.2 s, and the name rose from nothing over 4 s more, so the composition was not complete until
   * about 9.5 s. Everything before that was a partly assembled hero — which is what a visitor reads as "still
   * loading", and what the document's own first-paint plate would have had to hide.
   *
   * So the index starts where it belongs: at the name, at full presence, open. What plays is the registration — the
   * sheet drawing itself into register, the same movement it makes at every other arrival — over the finished
   * picture rather than in place of it. The visitor can travel from the first frame; nothing has to finish first.
   */
  Object.assign(A, { mode: 'index', from: IDX[STOP.name], to: IDX[STOP.name], front: 1, introReg: 0.03, nameAmp: 1, p: 0, pT: 0, base: 0, prevBase: 0 })
  const s1 = V.H * 2.6, L1 = V.H * 0.64
  const f = A.introF = gather({ cx: V.W / 2, cy: gapY, sigma: s1 * 0.68, Lm: L1 * 0.7, s: 0.2 })
  A.features.add(f)
  A.shiver = 0.14
  const u = { t: 0 }
  gsap.timeline()
    .to(A, { shiver: 0, duration: 0.3, ease: 'power2.in' }, 0)
    .to(u, {
      t: 1, duration: 0.8, ease: 'expo.out',
      onUpdate: () => { f.sigma = Math.exp(lerp(Math.log(s1 * 0.68), Math.log(s1), u.t)); f.Lm = Math.exp(lerp(Math.log(L1 * 0.7), Math.log(L1), u.t)); f.s = 0.2 * (1 - smooth(0, 1, u.t)) },
    }, 0)
    .add(() => { A.features.delete(f); A.introF = null }, 0.85)
    .to(A, { introReg: 0, duration: 0.75, ease: 'power3.inOut' }, 0.1)
    .add(() => { A.arrivedAt = performance.now() }, 0.9)
  breathe(2.1)
}

// ─── the visit's memory survives a reload, not only a route change ─────────────
const MEM_KEY = 'c2-surface-memory'
const b64 = (arr) => { const u = new Uint8Array(arr.buffer); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s) }
const unb64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Float32Array(u.buffer) }
function saveMemory() {
  try {
    sessionStorage.setItem(MEM_KEY, JSON.stringify({
      W: V.W, H: V.H, aboutMark: A.aboutMark, yieldMarks: A.yieldMarks, visitOrder: A.visitOrder, seeded: A.seeded, learned: A.learned,
      cols: phys.cols, rows: phys.rows, mem: b64(phys.mem), imp: b64(phys.imp),
    }))
  } catch {}
}
addEventListener('pagehide', saveMemory)
function restoreMemory(phase) {
  let m
  try { m = JSON.parse(sessionStorage.getItem(MEM_KEY) || 'null') } catch { m = null }
  if (!m) return
  const same = Math.abs(m.W - V.W) < 2 && Math.abs(m.H - V.H) < 2
  if (phase === 'history') {
    if (!same) return   // geometry from another viewport would lie; keep only what does not depend on it
    Object.assign(A, { aboutMark: m.aboutMark, yieldMarks: m.yieldMarks || [], seeded: m.seeded || 0 })
    Object.assign(A.learned, m.learned || {})
  }
  if (phase === 'order') { A.visitOrder = m.visitOrder || []; A.visitOrder.forEach((k) => { if (k < N) { A.visited.add(k); surface.visited[k] = 1 } }) }
  if (phase === 'sheet' && same && m.cols === phys.cols && m.rows === phys.rows) {
    try { phys.mem.set(unb64(m.mem)); phys.imp.set(unb64(m.imp)) } catch {}
  }
}

// ─── LANGUAGE ────────────────────────────────────────────────────────────────
// Nothing the surface paints as material is language-dependent: the name, the two face words and the
// project media are the same in every locale, and every localised word lives in the DOM. A locale change
// therefore refreshes the DOM and the project world's frame copy — and touches no texture, no image, no
// physics state, no Lab room and no memory.
export function setLocale(next) {
  if (!applyLocale(next)) return false
  endGesture()   // M3 MOBILE BUG FIX
  const refocus = focusKey(document.activeElement)   // M4 A11Y
  FR = {}                       // frame blocks carry copy; their geometry does not change, so WORLD textures stand
  buildDOM()
  lastHint = lastTone = lastTT = lastTB = lastBg = lastWork = lastWB = ''
  mediaShown = ''
  onState.clear()
  layoutDOM()
  if (A.mode === 'world' || A.mode === 'exit') { mediaFor(A.k); fillWorldDOM(A.k) }
  document.title = isAboutPath() ? TITLE_ABOUT() : TITLE()
  lastSig = ''
  if (refocus) wantFocus(() => ui.querySelector(refocus))
  return true
}

window.__lab = { A, V, ptr, phys, surface, works, STOP, SPINE,
  // the passage's own hooks leave with the flag: hold it at an exact progress, and read what it is doing
  ...(LINEFIELD ? {
    lf: () => LF,
    lfSet: (v) => { if (!LF) return; LF.drive.set(v); A.lfp = clamp(v, 0, 1); lastSig = '' },
    lfState: () => ({ p: A.lfp, target: LF.drive.target, seq: LF.sequence(A.lfp), rowKeep: LF.rowKeep, stop: LFS }),
    lfProbe: () => LF.probe(A.lfp),
  } : {}),
  configure, routeChanged, setLocale, locale: () => TXT,  previewOf, go, forcedPress, navigate, exit, expandAbout, collapseAbout, startBridge, openLab, arriveAt, replayIntro: playIntro, IDX: () => IDX, WORKS: () => WORKS, WORLD: () => WORLD, frames: framesOf, touches, sig: () => lastSig, redraw: () => { lastSig = '' } }
let rt = 0, booted = false
// a resize before the surface exists (a phone's URL bar settling during load) is picked up once start() finishes
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(async () => { if (!booted) return; measure(); await ensurePreviews(); rebuild() }, 140) })

async function start() {
  try { await document.fonts.load(`900 100px ${ST.FAMILY}`, 'EMRAHYÜCEL') } catch {}
  try { await document.fonts.load('400 20px "Geist Variable"') } catch {}
  await document.fonts.ready
  measure()
  await Promise.all([surface.ready, ensurePreviews()])
  /*
   * LINEFIELD is loaded here and nowhere else: one dynamic import inside a branch the bundler can prove is dead
   * when the flag is off, so a published build has no chunk to load and no text to strip. It is awaited before
   * the first rebuild() because the spine is built synchronously and this place is one of its entries.
   */
  if (LINEFIELD) {
    const m = await import('./linefield/runtime.js')
    LF = m.createLinefield()
    LF.prepare(surface)
  }
  buildDOM()
  restoreMemory('history'); restoreMemory('order')
  rebuild()
  restoreMemory('sheet')
  booted = true
  if (Math.abs(innerWidth - V.W * V.u) > 1 || Math.abs(innerHeight - V.H * V.u) > 1) { measure(); await ensurePreviews(); rebuild() }
  A.from = A.to = IDX[STOP.name]; A.front = 1
  if (isAboutPath()) { A.pending = 'detail'; document.title = TITLE_ABOUT() } else document.title = TITLE()
  requestAnimationFrame((t) => { last = t; frame(t) })
  // arriving from the Lab on a cold start: the visitor asked for a place, not for the opening — and not for the
  // hero either, so neither the introduction nor the static plate is played over the place they asked for
  if (!isAboutPath() && arriveAt(takeArrival())) return
  // the static plate exists because software WebGL is slow to draw; reduced motion never draws WebGL at all
  if (SOFTWARE_GL && !REDUCED) { startStaticHero(); return }
  if (REDUCED) { A.mode = 'index'; A.introReg = 0; A.nameAmp = 0; return }
  playIntro()
}
export { start as mountC2 }
if (!globalThis.__c2Hosted) start()
