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
import { createPhysics } from './physics.js'
import * as ST from './states.js'
import { framesFor, GEOM, ABSENT, psiHTML } from './world.js'
import { identity, about, capabilities, workIntro, works, lab, contact, previewOf, ui as TXT, applyLocale } from './content.js'
import { termHtml } from '../../shared/content/term'
import { mediaElement, placeMedia, loadImage, prepareTone, labElement, setMediaScale } from './media.js'

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
const TOUCH = matchMedia('(pointer: coarse)').matches
const RM = REDUCED ? 5 : 1
if (REDUCED) gsap.globalTimeline.timeScale(6)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt))
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t) }
const ez = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const haptic = (p) => { try { navigator.vibrate?.(p) } catch {} }
const $ = (s, r = document) => r.querySelector(s)
const inRect = (x, y, r, m = 0) => x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m
const idle = typeof requestIdleCallback === 'function' ? (f) => requestIdleCallback(f, { timeout: 700 }) : (f) => setTimeout(() => f({ timeRemaining: () => 12 }), 40)

// routes: /about is a state of the same surface, so this visit's history survives going there and coming back
// M1 TRANSPLANT: the host application owns routing (its routes are locale-prefixed) and receives the
// semantic checkpoints. The defaults below reproduce the standalone prototype exactly.
const ROOT = location.pathname.replace(/about\/?$/, '') || '/'
let HOME_URL = ROOT + location.search, ABOUT_URL = `${ROOT}about${location.search}`
let isAboutPath = () => /\/about\/?$/.test(location.pathname)
const HOST = {
  push: (url, state) => history.pushState(state, '', url),
  // M2: a language change replaces the current entry — Back returns to the previous place, not the previous language
  replace: (url, state) => history.replaceState(state, '', url),
  back: () => history.back(),
  emit: () => {},
  // M2: the same page in the other language, supplied by the host (the runtime never builds locale URLs)
  localeHref: '',
}
export function configure(o = {}) {
  if (o.homeUrl) HOME_URL = o.homeUrl
  if (o.aboutUrl) ABOUT_URL = o.aboutUrl
  if (o.isAboutPath) isAboutPath = o.isAboutPath
  if (o.push) HOST.push = o.push
  if (o.replace) HOST.replace = o.replace
  if (o.back) HOST.back = o.back
  if (o.emit) HOST.emit = o.emit
  if (o.localeHref) { HOST.localeHref = o.localeHref; if (D.lang) D.lang.href = o.localeHref }
}
// document titles follow the active language; the host sets them on its own route changes too
const TITLE = () => TXT.meta.home.title, TITLE_ABOUT = () => TXT.meta.about.title

const canvas = $('#surface')
const surface = createSurface(canvas)
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

const LAST = 5
const N = works.length
let IDX = [], WORKS = [], WORLD = {}, FR = {}, BLANK = null, MEDIA = {}, BRIDGE = null, LABM = null
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
  introReg: 1, nameAmp: 1, restReg: 0, restOpen: 0, nextReg: 1, nextArmed: false, regDrag: 0, regDragT: 0, quality: {}, shiver: 0,
  wt: 0, wT: 0, wLocked: -1, visited: new Set(), visitOrder: [], releaseK: null,
  pins: [], yieldMarks: [], seeded: 0, aboutMark: null, scarcity: 0, restK: 0.62,
  learned: { open: false, face: false, work: false, pinch: false, lab: false, world: false }, arrivedAt: 0,
  pending: null, lastIdx: 0, lastTo: null, cleared: false,
  aboutDetailK: 0, labNext: 0, labActive: null, bridgeF: null, bridgePK: 0,
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
  IDX = [ST.name(V), ST.face(V, 'surface'), ST.face(V, 'system'), WORKS[0], ST.labState(V), ST.rest(V, A.visitOrder, A.aboutMark)]
  if (REDUCED) for (const s of IDX) s.ampK = 0
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
  if (A.mode === 'bridge') { A.mode = 'index'; A.p = A.pT = A.base = A.prevBase = 4; A.bridgeF = null; A.bridgePK = 1 }
  if (A.mode === 'intro') { A.mode = 'index'; A.introReg = 0 }
  if (A.mode === 'exit') { A.mode = 'index'; A.p = A.pT = A.base = A.prevBase = 3; A.worldOn = false }
  if (A.base === 5) A.restOpen = 1
  layoutDOM()
  if (A.mode === 'world') { mediaFor(A.k); fillWorldDOM(A.k); Object.assign(A.world, worldGeom(A.wp)) }
  queueWarm([IDX[1], IDX[2], IDX[4], IDX[5]])
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
function scrollBy(d, touch = false) {
  const now = performance.now()
  if (A.busy || A.squeeze || A.mode === 'intro') return
  // in the long About the wheel reads; it never throws the reader out of the room
  if (A.aboutOpen) { if (!A.aboutDetail && A.aboutDetailK < 0.01 && now - A.lastInput > 120) closeAbout(); A.lastInput = now; return }
  if (A.mode === 'index') {
    // the rest of a gesture that just carried the visitor off the work field does not also carry them past the next place
    if (now - (A.leftWork || 0) < 650) { A.lastInput = now; return }
    // wheel tunes the work field; a finger tunes it sideways and swipes vertically between places
    if (settledAt(3) && !touch) {
      A.wT += d * 2.6   // two notches of a wheel carry one work out of register and the next one in
      A.lastInput = now
      if (A.wT < -0.45) { A.wT = 0; A.base = 2; A.pT = 2.35; A.gesture = false; A.leftWork = now }
      else if (A.wT > N - 1 + 0.45) { A.wT = N - 1; A.gesture = false; startBridge() }
      return
    }
    // a finger swiping on past the work field carries the whole field into the Lab
    if (settledAt(3) && touch && d > 0) { A.bridgeAcc = (A.bridgeAcc || 0) + d; if (A.bridgeAcc > 0.12) { A.bridgeAcc = 0; startBridge() } A.lastInput = now; return }
    A.pT = clamp(A.pT + d, 0, LAST)
  } else if (A.mode === 'world') {
    const last = lastFrame()
    if (A.wbase === last && d > 0 && A.wp > last - 0.03) { A.exitAccum += d; if (A.exitAccum > 0.3) { A.exitAccum = 0; exit() } A.lastInput = now; return }
    A.exitAccum = 0
    A.wpT = clamp(A.wpT + d, 0, last)
    A.learned.world = true
  } else return
  A.gesture = true; A.lastInput = now
}
function go(i) {
  if (A.mode === 'index') { if (i === 4 && settledAt(3)) { startBridge(); return } A.base = A.pT = clamp(i, 0, LAST) }
  else if (A.mode === 'world') { A.wbase = A.wpT = clamp(i, 0, lastFrame()) }
  A.gesture = false; A.lastInput = -1e9
}
const canScroll = (el, dy) => (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)
addEventListener('wheel', (e) => {
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
function endGesture() {
  touches.clear()
  if (A.squeeze) endSqueeze()
  ptr.down = false; ptr.axis = null; ptr.ui = false; ptr.rub = 0
  if (ptr.touch) ptr.hover = false
}
addEventListener('pointerdown', (e) => {
  A.kbd = false   // M4 A11Y: a pointer is in use — nothing moves focus on its behalf
  // the first finger of a gesture: nothing else is on the glass, whatever an interrupted gesture left behind
  if (e.pointerType === 'touch' && e.isPrimary && (touches.size || ptr.down)) endGesture()
  if (e.target.closest('a, button, .scroll')) { ptr.ui = true; return }
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, { x: e.clientX / V.u, y: e.clientY / V.u })
    if (touches.size === 2) { startSqueeze(); return }
    if (touches.size > 2) return
  }
  Object.assign(ptr, { down: true, downT: performance.now(), sx: e.clientX / V.u, sy: e.clientY / V.u, x: e.clientX / V.u, y: e.clientY / V.u, moved: 0, axis: null, rub: 0, ui: false, touch: e.pointerType !== 'mouse' })
})
addEventListener('pointermove', (e) => {
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
      if (ptr.axis === 'y') scrollBy(-(oy - dy) / (V.H * 0.5), true)
    }
    if (ptr.axis === 'y') scrollBy(-dy / (V.H * 0.5), true)
    if (ptr.axis === 'x') {
      // the thumb moves the layers directly: one work per half screen of travel
      if (settledAt(3)) { A.wT = clamp(A.wT - dx / (V.W * 0.5), -0.3, N - 1 + 0.3); A.lastInput = now }
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
  ptr.down = false; ptr.axis = null; ptr.ui = false; ptr.rub = 0
  if (ptr.touch) ptr.hover = false
  A.lastInput = now
}
addEventListener('pointerup', up)
addEventListener('pointercancel', up)
// M3 MOBILE BUG FIX — every way the page can lose a gesture ends it
addEventListener('blur', endGesture)
addEventListener('pagehide', endGesture)
document.addEventListener('visibilitychange', () => { if (document.hidden) endGesture() })
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
  const onWork = settledAt(3)
  if (onWork && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { A.wT = clamp(Math.round(A.wT) + (e.key === 'ArrowRight' ? 1 : -1), 0, N - 1); A.lastInput = performance.now(); return }
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); if (A.aboutOpen) { if (!A.aboutDetail) closeAbout(); return } go((A.mode === 'world' ? A.wbase : A.base) + 1) }
  if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); if (A.aboutOpen) { if (!A.aboutDetail) closeAbout(); return } go((A.mode === 'world' ? A.wbase : A.base) - 1) }
  if (e.key === 'Enter') {
    const st = current()
    if (A.mode === 'index' && st.beneath === 'pin') { const p = freeSpot(); forcedPress(p.x, p.y, 1.6) }
    else if (A.mode === 'index' && st.beneath === 'about') forcedPress(aboutX(), st.layout.gapY)
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
  return s === 3 ? WORKS[clamp(Math.round(A.wt), 0, N - 1)] : IDX[s]
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
  const pr = { x, y, L: 0, st, forced, f: feature({ cx: x, cy: y, falloff: st.beneath === 'pin' ? 20 : 24, kind: st.beneath === 'state' ? 1 : 0 }) }
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
  if (st.beneath === 'pin') return updatePin(pr, holding, dt)
  if (!pr.forced) {
    if (!holding) return releasePress(pr)
    // worked material is weaker: earlier marks and visited work lower the capacity
    const worked = clamp(phys.memAt(pr.x, st.weak(pr.x, pr.y)) * 1.4, 0, 1)
    const visited = st.workIndex != null && A.visited.has(st.workIndex)
    const cap = (Number.isFinite(st.capacity) ? st.capacity : 2) * (1 - 0.5 * worked) * (visited ? 0.55 : 1)
    const maxL = Number.isFinite(st.capacity) && st.beneath ? 1 : 0.5
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
  if (A.mode === 'index') { A.yieldMarks.push({ x: f.cx, y: st.beneath === 'about' ? IDX[0].layout.gapY : f.cy, big: st.beneath !== 'state' }); HOST.emit('scarCommitted', { x: f.cx / V.W, y: f.cy / V.H, source: st.beneath === 'about' ? 'about' : st.beneath === 'pin' ? 'lab' : 'work' }) }
  haptic([12, 50, 26])
  const tl = gsap.timeline()
  tl.to(A, { shiver: 1, duration: 0.06, ease: 'none' }).to(A, { shiver: 0, duration: 0.28, ease: 'power2.out' })
  if (st.beneath === 'about') openAbout(f, tl)
  else if (st.beneath === 'state') pushThrough(f, tl)
  else if (st.beneath === 'work') releaseInto(f, st.workIndex, tl)
  else if (st.beneath === 'next') releaseInto(f, st.layout.next, tl)
}

// ─── LAB: one budget of material ─────────────────────────────────────────────
// Holding makes room, and room stays made. But the sheet has only so much free material: every room draws on
// the same budget. When a room grows past what is left, every other room gives material back; the scarcer the
// material, the further each push reaches through the rows; and rooms that would overlap push each other apart
// — across the rows and along them — until the whole field has found a new equilibrium.
const LAB_AR = () => (V.P ? 2.1 : 2.8)
// the scarcer the free material, the further each push reaches — bounded, so the reach stays physical and cheap
// (scarcity is read in steps of 0.05 so the reach settles instead of creeping)
const reachOf = (f) => (f.base || 18) + (V.P ? 24 : 40) * Math.round(clamp(A.scarcity, 0, 1.2) * 20) / 20
const labBudget = () => V.W * (V.H - V.strip * 2) * (V.P ? 0.36 : 0.3)
const roomArea = (f, k = 1) => 2 * f.h * k * f.hw * (0.6 + 0.4 * k) * 1.77
function updatePin(pr, holding, dt) {
  const f = pr.f
  if (!holding && !pr.forced) {
    A.press = null; pr.done = true
    A.features.delete(f)
    if (f.h < 16) { const g = { ...f }; A.features.add(g); gsap.to(g, { h: 0, duration: 0.5, ease: 'power2.out', onComplete: () => A.features.delete(g) }); return }
    commitPin(f)
    return
  }
  pr.L = Math.min(1, pr.L + (dt / 2.4) * RM)
  const e = 1 - Math.pow(1 - pr.L, 2.2)
  f.cx = pr.x; f.cy = pr.y
  f.ar = LAB_AR(); f.base = 18 + e * 14
  f.h = (V.P ? 8 : 10) + e * (V.P ? 70 : 118)
  f.hw = f.h * f.ar
  f.falloff = reachOf(f)
  assignEntry(f)
  if (pr.L >= 1 && !pr.buzzed) { pr.buzzed = true; haptic(10) }
  // a room made from the keyboard is held for its full length, then kept
  if (pr.forced && pr.L >= 1) { A.press = null; pr.done = true; A.features.delete(f); commitPin(f) }
}
function commitPin(f) {
  A.pins.push(f); A.learned.lab = true
  HOST.emit('labRoomCommitted', { x: f.cx / V.W, y: f.cy / V.H, height: f.h })
  assignEntry(f)
  if (f.entry != null) A.labActive = f
  phys.kick(f.cy - f.h - 6, f.h * 1.1, f.cx - f.hw, f.cx + f.hw)
  phys.kick(f.cy + f.h + 6, -f.h * 1.1, f.cx - f.hw, f.cx + f.hw)
  haptic(6)
  while (A.pins.length > 5) {
    const old = A.pins.shift()
    phys.scar(old.cx, old.cy, old.hw * 0.4, 5)   // a room that closes leaves its seam behind
    const g = { ...old }; A.features.add(g)
    gsap.to(g, { h: 0, duration: 1.3, ease: 'power2.inOut', onComplete: () => A.features.delete(g) })
  }
}
const atRest = () => Math.abs(A.p - 5) < 0.5
// history at rest is art-directed, not erased: the five largest rooms stay open; the others are already scars
const REST_ROOMS = () => (V.P ? 3 : 5)
const shownPins = () => (atRest() ? [...A.pins].sort((a, b) => b.h - a.h).slice(0, REST_ROOMS()) : A.pins)
const pinScale = () => Math.max(1 - smooth(0.5, 1, Math.abs(A.p - 4)), (1 - smooth(0.5, 1, Math.abs(A.p - 5))) * A.restK)
function relaxPins(dt, k, P) {
  const kw = 0.6 + 0.4 * k
  const act = A.press && !A.press.done && A.press.st.beneath === 'pin' ? A.press.f : null
  const fixed = []
  if (act) fixed.push({ f: act, k: 1, kw: 1 })
  const wedge = IDX[5].features[0]
  if (Math.abs(A.p - 5) < 0.75 && wedge && wedge.h > 1) fixed.push({ f: wedge, k: 1, kw: 1 })
  if (Math.abs(A.p - 4) < 0.75) {
    const c = IDX[4].layout.cap
    fixed.push({ f: { cx: c.x + c.w / 2, cy: c.y + c.h / 2, h: c.h / 2 + 6, hw: V.P ? 1e5 : c.w * 0.8, falloff: 0 }, k: 1, kw: 1 })
  }
  // CONSERVATION: one budget of free material for every room on the sheet
  if (k > 0.95) {
    const budget = labBudget()
    const held = act ? roomArea(act) : 0
    const others = P.reduce((s, f) => s + roomArea(f), 0)
    const used = held + others
    const sT = clamp(used / budget, 0, 1.4)
    A.scarcity = Math.abs(sT - A.scarcity) < 0.004 ? sT : damp(A.scarcity, sT, 3, dt)
    // over budget (beyond a 1% tolerance), every room not being held gives material back — until the budget balances,
    // and then it stops exactly: no sub-pixel creep, so the equilibrium is truly still
    if (used > budget * 1.01 && others > 1) {
      if (!A.shrinkTo) {
        const s = clamp(1 - (used - budget) / others, 0.5, 1)
        A.shrinkTo = new Map(P.filter((f) => !f.gT).map((f) => [f, Math.max(8, f.h * s)]))
      }
    } else A.shrinkTo = null
    if (A.shrinkTo) {
      const r = 1 - Math.exp(-2.4 * dt)
      let done = true
      for (const [f, target] of A.shrinkTo) {
        f.h = Math.abs(f.h - target) < 0.25 ? target : lerp(f.h, target, r)
        if (f.h !== target) done = false
      }
      if (done) A.shrinkTo = null
    }
  }
  for (const f of P) { f.hw = f.h * (f.ar || LAB_AR()); f.falloff = reachOf(f) }
  if (act) act.falloff = reachOf(act)
  const lo = V.strip + 10, hi = V.H - V.strip - 10
  const rate = 1 - Math.exp(-5 * dt)
  const push = (a, b, kb, kwb, both) => {
    // the height two rooms need between them is the most they both take at any point along the rows they share
    // a room that is only starting to open has no width yet: never divide by it
    const dx = b.cx - a.cx, ha = a.h * k, hb = b.h * kb, wa = Math.max(1, a.hw * kw), wb = Math.max(1, b.hw * kwb)
    let need = 0
    for (let t = 0; t <= 1.001; t += 0.25) {
      const ea = (t * dx) / wa, eb = ((1 - t) * dx) / wb
      need = Math.max(need, ha * Math.exp(-ea * ea) + hb * Math.exp(-eb * eb))
    }
    need += Math.min(1, need / Math.max(1, Math.min(ha, hb))) * ((V.P ? 10 : 14) + 0.3 * (a.falloff + b.falloff))
    const dy = a.cy - b.cy, over = need - Math.abs(dy)
    if (over <= 0.5) return
    a.crowd = Math.max(a.crowd || 0, over)
    if (both) b.crowd = Math.max(b.crowd || 0, over)
    // side by side, rooms slide along the rows; stacked, they move across them
    const side = clamp(Math.abs(dx) / ((wa + wb) * 0.9), 0, 1)
    const d = over * rate
    const sy = (Math.abs(dy) < 0.5 ? (a.cx <= b.cx ? -1 : 1) : Math.sign(dy)) * d * (1 - 0.55 * side)
    const sx = (Math.abs(dx) < 0.5 ? (a.cy <= b.cy ? -1 : 1) : -Math.sign(dx)) * d * 1.6 * side
    if (both) { a.cy += sy / 2; b.cy -= sy / 2; a.cx += sx / 2; b.cx -= sx / 2 } else { a.cy += sy; a.cx += sx }
  }
  const key = `${P.length}|${Math.round(A.p * 200)}|${Math.round(A.scarcity * 50)}|${fixed.map((o) => `${Math.round(o.f.cx)},${Math.round(o.f.cy)},${Math.round(o.f.h)}`).join(';')}|${P.map((f) => `${Math.round(f.h)},${Math.round(f.cx)}`).join(',')}`
  // settled — or, as a guarantee, still searching after four seconds with nothing new to answer: leave it be
  if (key === A.relaxKey && (A.relaxStill > 20 || performance.now() - A.relaxSince > 4000)) return
  if (key !== A.relaxKey) { A.relaxKey = key; A.relaxStill = 0; A.relaxSince = performance.now() }
  const before = P.map((f) => f.cy + f.cx)
  for (const f of P) f.crowd = 0
  for (let i = 0; i < P.length; i++) {
    for (let j = i + 1; j < P.length; j++) push(P[i], P[j], k, kw, true)
    for (const o of fixed) if (o.f !== P[i]) push(P[i], o.f, o.k, o.kw, false)
  }
  let moved = 0
  P.forEach((f, i) => {
    if (!Number.isFinite(f.cy) || !Number.isFinite(f.cx)) { f.cy = (lo + hi) / 2; f.cx = V.W / 2 }
    f.cy = clamp(f.cy, lo + f.h * k, hi - f.h * k)
    f.cx = clamp(f.cx, V.pad, V.W - V.pad)
    moved += Math.abs(f.cy + f.cx - before[i])
    // a room with nowhere left to go is pressed smaller: the sheet keeps its rows, not its rooms
    f.crowdT = f.crowd > 5 ? (f.crowdT || 0) + dt : 0
    if (f.crowdT > 0.5 && !f.gT) f.h = Math.max(8, f.h - 20 * dt)
  })
  A.relaxStill = moved < 0.25 ? (A.relaxStill || 0) + 1 : 0
}

// ─── NAME → beneath the name is the person ────────────────────────────────────
// M3 RESPONSIVE GEOMETRY — on a short phone the introduction needs a taller room than a fixed share of the height gives
const aboutHalf = () => (V.P ? (V.H < 640 ? 0.27 : 0.235) : V.S ? 0.3 : V.H < 820 ? 0.215 : 0.2) * V.H   // a 13-inch laptop: a little more room between the names
const aboutX = () => (V.P ? V.W / 2 : V.W * 0.3)
function aboutFeature(open) {
  return feature({ cx: aboutX(), cy: IDX[0].layout.gapY, h: aboutHalf() * open, hw: V.P ? 1e5 : V.W * 0.9, falloff: V.P ? 70 : 110, lip: 5, lipW: 7 })
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
  const gy = IDX[0].layout.gapY
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
  if (isAboutPath()) { if (A.mode === 'world') { exit(); A.pending = 'detail' } else expandAbout(false) }
  else if (A.aboutDetail) collapseAbout(false)
}
if (!globalThis.__c2Hosted) addEventListener('popstate', routeChanged)

// SURFACE FACE ⇄ SYSTEM FACE
function pushThrough(f, tl) {
  const target = Math.round(A.p) === 1 ? 2 : 1
  tl.to(f, { h: V.H * 1.3, hw: 14000, falloff: 80, duration: 0.9, ease: 'power3.in' }, 0.05)
    .add(() => {
      A.features.delete(f); A.p = A.pT = A.base = A.prevBase = target; A.quality[target === 1 ? 'creative' : 'system'] = 1
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
    .add(() => { A.mode = 'index'; A.p = A.pT = A.base = A.prevBase = 3; A.busy = false; if (A.pending) return   /* leaving for another place: that arrival takes focus */
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
  split(IDX[0], A.introReg, spread * 1.4)
  IDX[0].amp = A.nameAmp
  if (A.mode === 'index' && A.p > 1 && A.p < 2) split(IDX[1], smooth(0.02, 0.4, A.p - 1) * 0.6, spread)
  if (!ptr.down) A.regDragT = damp(A.regDragT, 0, 9, dt)
  A.regDrag = damp(A.regDrag, A.regDragT, ptr.down ? 16 : 11, dt)
  if ((settledAt(1) || settledAt(2)) && Math.abs(A.regDrag) > 0.5) split(IDX[A.base], clamp(Math.abs(A.regDrag) / spread, 0, 1), Math.sign(A.regDrag) * spread * 0.5)

  // the work field: every work is written as fragments on its own key; only one agrees at a time
  const sx = V.P ? V.W * 0.24 : V.W * 0.13, sy = V.P ? 5.2 : 7
  const onWork = A.mode === 'index' && Math.abs(A.p - 3) < 0.6
  WORKS.forEach((s, i) => {
    const d = A.wt - i, ad = Math.abs(d)
    s.reg.a0 = d * sx; s.reg.a1 = -d * sx * 0.62; s.reg.va0 = d * sy; s.reg.va1 = -d * sy
    s.vis = 1 - smooth(0.55, 0.98, ad)
    // hysteresis: locks inside 0.003, lets go past 0.025 — the magnet in tuneWork carries it the last part
    if (onWork && A.wLocked !== i && ad < 0.003) lockWork(i)
    else if (A.wLocked === i && ad > 0.025) unlockWork(i)
  })
  split(IDX[5], A.restReg, 8)
  if (WORLD[A.k]) { const full = WORLD[A.k][lastFrame()]; split(full, A.nextReg, V.W * 0.13, 7); full.vis = 1 }
  for (const s of [IDX[0], IDX[5]]) {
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
  if (!(stop === 0 && A.pending === 'about')) arrived(() => PLACE_HEADING[stop]?.(), PLACE_NAME[stop]?.())
  if (stop === 3 && prev !== 3) {
    // arriving on the work field, the first (or last) work is still in pieces
    if (prev > 3) { A.wT = N - 1; A.wt = N - 1 + 0.9 } else { A.wT = 0; A.wt = -0.9 }
    tonesReady.then(() => queueWarm(WORKS))
  }
  if (stop === 4) ensureLab()
  if (stop === 4 && A.seeded < A.yieldMarks.length) {
    // wherever the surface gave way earlier, the Lab's material already makes a little room
    A.yieldMarks.slice(A.seeded).forEach((y, j) => {
      const f = feature({ cx: y.x, cy: y.y, h: 0, hw: 30, falloff: 18 })
      f.ar = 3.9; f.base = 18; f.gT = true
      A.pins.unshift(f)
      gsap.to(f, { h: y.big ? 15 : 10, duration: 1.6, delay: 1.1 + j * 0.3, ease: 'expo.out', onComplete: () => { f.gT = false } })
    })
    A.seeded = A.yieldMarks.length
  }
  if (stop === 5) {
    const key = `${A.visitOrder.join(',')}|${A.aboutMark ? 'a' : 'd'}`
    if (IDX[5].visitKey !== key) { const old = IDX[5]; IDX[5] = ST.rest(V, A.visitOrder, A.aboutMark); if (A.from !== old && A.to !== old) { old.dead = true; surface.release(old) } placeRest() }
    // density governor: however much was done, the rest keeps a readable hierarchy
    const shown = [...A.pins].sort((a, b) => b.h - a.h).slice(0, REST_ROOMS())
    const area = shown.reduce((s, f) => s + roomArea(f), 0)
    A.restK = area > 1 ? clamp(Math.sqrt((V.W * V.H * (V.P ? 0.05 : 0.1)) / area), 0.28, 0.62) : 0.62
    for (const f of A.pins) if (!shown.includes(f) && !f.scarred) { f.scarred = true; phys.scar(f.cx, f.cy, f.hw * 0.4, 6) }
    gsap.killTweensOf(A, 'restReg,restOpen')
    A.restReg = 1; A.restOpen = 0
    gsap.to(A, { restReg: 0, duration: 1.8, delay: 0.5, ease: 'expo.inOut' })
    // the same opening, with the same motion, as when the name gave way to the person
    gsap.to(A, { restOpen: 1, duration: 1.35, delay: 2.1, ease: 'expo.out' })
  }
}

// ─── DOM: semantic text, always stable, placed where the material has made room ─
const ui = $('#ui')
// delegated once, on the element itself: buildDOM() replaces the contents, never the container, so a
// language change refreshes every label without ever attaching a second listener
ui.addEventListener('click', (e) => {
  if (e.target.closest('[data-locale]')) { e.preventDefault(); if (HOST.localeHref) HOST.replace(HOST.localeHref, { c2: 'locale' }); return }
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
      <div class="current"><p class="wtitle" aria-hidden="true"></p><p class="wmeta" aria-hidden="true"></p><button class="open" data-open aria-label="${TXT.work.open} — ${TXT.a11y.openProject}" aria-describedby="c2-open-hint">${TXT.work.open}</button><span id="c2-open-hint" class="sr">${TXT.a11y.openHint}</span></div>
    </div>`)

  D.lab = h('section', 'layer lab', `<div class="cap"><h2 class="lbl" tabindex="-1">${lab.title}</h2><p class="ltext">${lab.line}</p><p class="sr">${TXT.a11y.labKeys}</p></div>
    <p class="lab-now" aria-live="polite"></p>
    <ul class="sr">${lab.entries.map((e) => `<li>${e.n}: ${e.desc}</li>`).join('')}</ul>`)

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
    <p class="lbl">${TXT.a11y.labStudies}</p><ul>${lab.entries.map((e) => `<li>${e.n} — ${e.desc}</li>`).join('')}</ul>
    <p>${mail} · ${phone}</p><p class="a11y-links">${exits()}</p>
    <a href="${ABOUT_URL}" data-detail>${about.home.more}</a>`)
  D.a11y.id = 'plain'; D.a11y.tabIndex = -1
  D.a11y.setAttribute('aria-label', TXT.a11y.plainNav)

  D.main = h('main', 'layers')
  D.main.append(D.h1, D.about, D.detail, D.creative, D.system, D.work, D.lab, D.rest, D.world)
  lastSaid = ''
  D.top.prepend(D.skip)
  D.h1.after(D.lead, D.keys)
  D.main.append(D.status)
  // the project summary is read before the project's own navigation, so Tab from it reaches that navigation
  D.world.prepend(D.world.querySelector('.wsum'))
  ui.append(D.top, D.main, D.bottom, D.a11y)
  D.aboutBlocks = [...D.detail.querySelectorAll('.ab')]
  D.labNow = D.lab.querySelector('.lab-now')
  D.hint = $('#hint')
  D.lang = D.top.querySelector('[data-locale]')
  D.current = D.work.querySelector('.current')
  D.wtitle = D.current.querySelector('.wtitle'); D.wmeta = D.current.querySelector('.wmeta')
  D.wlink = D.world.querySelector('.wlink'); D.wname = D.world.querySelector('.wname'); D.whost = D.world.querySelector('.whost')
  D.wblocks = D.world.querySelector('.wblocks'); D.wbs = []

}
function navigate(target) {
  const stop = { name: 0, about: 0, creative: 1, system: 2, work: 3, lab: 4, rest: 5 }[target]
  if (A.mode === 'world') { exit(); A.pending = target; return }
  if (A.aboutOpen && target !== 'about') closeAbout()
  if (A.mode !== 'index') return
  go(stop)
  if (target === 'about') A.pending = 'about'
}
function runPending() {
  if (!A.pending || A.busy) return
  const atName = A.mode === 'index' && A.base === 0 && Math.abs(A.p) < 0.02
  if (A.pending === 'about') { if (atName) { A.pending = null; if (!A.aboutOpen) forcedPress(aboutX(), IDX[0].layout.gapY) } }
  else if (A.pending === 'detail') {
    if (A.mode !== 'index' || A.press) return
    if (A.aboutOpen) { A.pending = null; expandAbout(false); if (A.detailPushedLater) { A.detailPushed = true; A.detailPushedLater = false } }
    else if (A.base !== 0) go(0)
    else if (atName) forcedPress(aboutX(), IDX[0].layout.gapY)
  } else if (A.pending === 'next' && A.mode === 'world' && Math.abs(A.wp - lastFrame()) < 0.02) {
    const full = worldFor(A.k)[lastFrame()]
    if (full.fill > 0.5) { A.pending = null; const fr = full.layout.frame; forcedPress(fr.x + fr.w / 2, fr.y + fr.h / 2, 0.75) }
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
const PLACE_HEADING = [() => D.h1, () => D.creative.querySelector('h2'), () => D.system.querySelector('h2'), () => D.work.querySelector('h2'), () => D.lab.querySelector('h2'), () => D.rest.querySelector('h2')]
const PLACE_NAME = [() => identity.name, () => capabilities.surface.role, () => capabilities.system.role, () => TXT.work.heading, () => lab.title, () => TXT.contact.heading]
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
  if (c) for (const a of ['data-locale', 'data-go', 'data-work', 'data-world', 'data-detail', 'data-back', 'data-open']) if (c.hasAttribute(a)) return c.getAttribute(a) ? `[${a}="${c.getAttribute(a)}"]` : `[${a}]`
  if (el === D.h1) return 'main > h1'
  const layer = el.closest('.layer')
  if (layer && el.matches('h2')) return `.${[...layer.classList].filter((x) => x !== 'on').join('.')} h2`
  return null
}
const place = (el, r) => Object.assign(el.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: r.h != null ? `${r.h}px` : '' })
function placeRest() { place(D.rest.querySelector('.contact'), IDX[5].layout.block) }
function layoutDOM() {
  const [nm, cre, sys, , lb] = IDX
  const ah = aboutHalf(), gy = nm.layout.gapY
  place(D.about.querySelector('.block'), { x: V.pad, y: gy - ah + 14, w: Math.min(V.W - V.pad * 2, 760), h: ah * 2 - 28 })
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
  place(D.lab.querySelector('.cap'), lb.layout.cap)
  placeRest()
}
const onState = new Map()
const setOn = (el, on) => { if (onState.get(el) !== on) { onState.set(el, on); el.classList.toggle('on', on); el.inert = !on } }
let lastHint = '', lastTone = '', lastTT = '', lastTB = '', lastBg = '', lastWork = '', lastWB = ''
function hintFor(stop) {
  const since = performance.now() - A.arrivedAt
  const H = TXT.hints
  const quiet = `${identity.city}${H.quietSeparator}${identity.status}`
  if (A.mode === 'world') return Math.round(A.wp) === 0 && !A.learned.world && since > 3500 ? H.world : ''
  if (A.mode !== 'index' || A.aboutOpen) return ''
  if (stop === 0) return !A.learned.open && since > 6500 ? (TOUCH ? H.openTouch : H.open) : quiet
  if (stop === 1 || stop === 2) return !A.learned.face && since > 2500 ? (TOUCH ? H.faceTouch : H.face) : quiet
  if (stop === 3) return !A.learned.work && since > 2500 ? (TOUCH ? H.workTouch : H.work) : quiet
  if (stop === 4) return !A.learned.lab && since > 2500 ? H.lab : quiet
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
function domUpdate(from, to, front) {
  focusStep()
  const dom = front < 0.5 ? from : to
  const idleIdx = A.mode === 'index' && !A.busy
  const loaded = (A.press && A.press.L > 0.1 && A.press.st.beneath !== 'pin') || !!A.squeeze
  const at = (i) => Math.abs(A.p - i) < 0.03 && Math.abs(A.p - A.base) < 0.2
  setOn(D.about, A.aboutOpen && !A.aboutDetail && A.aboutDetailK < 0.02 && !!A.about && A.about.h > aboutHalf() * 0.82 && A.about.h < aboutHalf() * 1.15)
  setOn(D.detail, A.aboutOpen && A.aboutDetail && A.aboutDetailK > 0.72)
  if (D.lead.hidden !== A.aboutOpen) D.lead.hidden = A.aboutOpen
  setOn(D.creative, idleIdx && at(1) && !loaded)
  setOn(D.system, idleIdx && at(2) && !loaded)
  setOn(D.work, idleIdx && at(3) && !loaded)
  setOn(D.lab, A.mode === 'index' && at(4))
  setOn(D.rest, idleIdx && at(5) && A.restOpen > 0.72)
  const inWorld = A.mode === 'world'
  setOn(D.world, inWorld || A.mode === 'exit')
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
  const parting = A.mode === 'index' && ((from === IDX[1] && to === IDX[2] && A.p > 1.001) || A.press?.st.beneath === 'state' || A.squeeze?.st.beneath === 'state')
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

// ─── LAB STUDIES: media needs material ───────────────────────────────────────
// A study exists only inside a room large enough to hold it, and the shared budget decides that: when another room
// takes the material, a study's room is pressed smaller and the study is covered again. Only the latest study plays;
// the others keep a still frame, and their decoders are released.
const VIABLE = () => (V.P ? 58 : 84)
function ensureLab() {
  if (!LABM && lab.entries.length) LABM = lab.entries.map((e) => { const m = labElement(e); mediaRoot.appendChild(m.el); return m })
  return LABM
}
function assignEntry(f) {
  if (f.entry != null || !lab.entries.length || f.h < VIABLE()) return
  const used = new Set(A.pins.map((p) => p.entry).filter((x) => x != null))
  for (let j = 0; j < lab.entries.length; j++) {
    const e = (A.labNext + j) % lab.entries.length
    if (!used.has(e)) { f.entry = e; A.labNext = e + 1; A.labActive = f; return }
  }
}
function freeSpot() {
  let best = { x: V.W / 2, y: V.H / 2 }, bestD = -1
  const c = IDX[4].layout.cap
  for (let i = 1; i < 8; i++) for (let j = 1; j < 6; j++) {
    const x = (V.W * i) / 8, y = V.strip + ((V.H - V.strip * 2) * j) / 6
    if (inRect(x, y, c, 90)) continue
    let d = 1e9
    for (const p of A.pins) d = Math.min(d, Math.hypot((x - p.cx) / 2.4, y - p.cy))
    if (d > bestD) { bestD = d; best = { x, y } }
  }
  return best
}
let labCapKey = ''
function labMediaUpdate() {
  if (!LABM) return false
  const at = A.mode === 'index' ? 1 - smooth(0.2, 0.6, Math.abs(A.p - 4)) : 0
  // rooms remembered from earlier in the visit carry studies again
  if (at > 0) for (const p of A.pins) if (p.entry == null) assignEntry(p)
  const v = VIABLE(), act = A.press && !A.press.done && A.press.st.beneath === 'pin' ? A.press.f : null
  const rooms = act ? [...A.pins, act] : A.pins
  let any = false, cap = ''
  const opOf = (f) => (f ? smooth(v * 0.9, v * 1.12, f.h) * at : 0)
  // the one playing study: the latest room that can hold one, else the latest committed room that still can
  let live = A.labActive && opOf(A.labActive) > 0.6 ? A.labActive : null
  if (!live) for (let i = A.pins.length - 1; i >= 0; i--) if (A.pins[i].entry != null && opOf(A.pins[i]) > 0.6) { live = A.pins[i]; break }
  LABM.forEach((m, e) => {
    const f = at > 0 ? rooms.find((p) => p.entry === e) : null
    const op = opOf(f)
    if (op > 0.001) {
      // the study is as large as its room allows, and never leaves the screen
      let hh = f.h * 1.2, ww = hh * m.entry.aspect
      const maxW = Math.min(f.hw * 1.3, V.W - V.pad * 2)
      if (ww > maxW) { ww = maxW; hh = ww / m.entry.aspect }
      // the study and its caption line are centred in the room together, so the caption never sits on the rows
      const x = clamp(f.cx - ww / 2, V.pad, V.W - V.pad - ww), y = clamp(f.cy - (hh + 20) / 2, V.strip + 8, V.H - V.strip - 28 - hh)
      const key = `${Math.round(x)},${Math.round(y)},${Math.round(ww)}`
      if (m.key !== key) { m.key = key; Object.assign(m.el.style, { left: `${x}px`, top: `${y}px`, width: `${ww}px`, height: `${hh}px` }) }
      any = true
      if (f === live) { const cw = V.P && !V.T ? ww : Math.max(ww, 280), cx = Math.min(x, V.W - V.pad - cw); cap = `${m.entry.n} / ${String(LABM.length).padStart(2, '0')}|${m.entry.desc}|${Math.round(cx)}|${Math.round(y + hh + 6)}|${Math.round(cw)}` }
    }
    const o = Math.round(op * 100) / 100
    if (m.op !== o) { m.op = o; m.el.style.opacity = String(o) }
    const active = !!f && f === live && !REDUCED
    if (active && !m.playing) { m.playing = true; m.play() } else if (!active && m.playing) { m.playing = false; m.release() }
  })
  if (cap !== labCapKey) {
    labCapKey = cap
    const [text, desc, x, y, w] = cap.split('|')
    const said = text ? `${text}|${desc}` : ''
    if (said !== D.labNow.dataset.said) { D.labNow.dataset.said = said; D.labNow.innerHTML = text ? `${text}<span class="d"> — ${desc}</span>` : '' }
    D.labNow.classList.toggle('on', !!text)
    if (text) Object.assign(D.labNow.style, { left: `${x}px`, top: `${y}px`, width: `${w}px` })
  }
  return any
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
    A.bridgeF = null; A.to = IDX[4]
    gsap.to(A, { front: 1, bridgePK: 1, duration: 0.4, ease: 'none', onComplete: finishBridge })
    return
  }
  const s0 = V.P ? 13 : 20, L0 = V.H * (V.P ? 0.15 : 0.12)
  const u = { t: 0 }
  const set = () => { f.sigma = Math.exp(lerp(Math.log(V.H * 2.6), Math.log(s0), u.t)); f.Lm = Math.exp(lerp(Math.log(V.H * 0.64), Math.log(L0), u.t)); f.s = smooth(0, 0.3, u.t) }
  gsap.timeline()
    .to(A, { front: 1, duration: 1.0, ease: 'power2.inOut' }, 0)
    .to(u, { t: 1, duration: 1.2, ease: 'power3.in', onUpdate: set }, 0)
    .add(() => { A.shiver = 0.32; haptic([10, 40, 10]) }, 1.2)
    .to(A, { shiver: 0, duration: 0.55, ease: 'power2.in' }, 1.3)
    .add(() => { A.from = BRIDGE; A.to = IDX[4]; A.front = 0 }, 1.85)
    .to(A, { front: 1, duration: 1.7, ease: 'power2.inOut' }, 1.85)
    .to(u, { t: 0, duration: 2.1, ease: 'expo.inOut', onUpdate: set }, 1.85)
    .to(A, { bridgePK: 1, duration: 1.3, ease: 'expo.out' }, 2.9)
    .add(finishBridge, 3.95)
}
function finishBridge() {
  A.bridgeF = null; A.shiver = 0; A.bridgePK = 1
  A.mode = 'index'; A.p = A.pT = A.base = 4; A.prevBase = 3; A.busy = false
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
  let s = `${from.id}|${to.id}|${from.visitKey || ''}|${to.visitKey || ''}|${q2(front * 100)}|${overlay}|${surface.fill}|${A.beneathSt?.id}|${surface.beneathStart},${surface.beneathCount}|${surface.devId}|${surface.visited.join('')}|`
  for (const st of [from, to]) { const g = st.reg; s += `${q2(g.a0)},${q2(g.a1)},${q2(g.va0)},${q2(g.va1)},${q2(g.holdA)},${q2(st.fill)},${q2(st.flash)},${q2(st.vis)},${q2(st.lod)}|` }
  for (const f of fs) s += `${f.kind},${q2(f.cx)},${q2(f.cy)},${q2(f.h)},${q2(f.hw)},${q2(f.sigma)},${q2(f.s)},${q2(f.y1)},${q2(f.y2)},${q2(f.falloff)},${q2(f.lip)};`
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
let last = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  // positions land exactly on their stop: a place that has arrived is still, so it is not drawn again
  if (A.mode === 'index') { snap('pT', 'base', LAST, now, dt); A.p = damp(A.p, A.pT, 3.4 * RM, dt); if (Math.abs(A.p - A.pT) < 5e-4 && A.pT === A.base) A.p = A.pT }
  if (A.mode === 'world') { snap('wpT', 'wbase', lastFrame(), now, dt); A.wp = damp(A.wp, A.wpT, 3.4 * RM, dt); if (Math.abs(A.wp - A.wpT) < 5e-4 && A.wpT === A.wbase) A.wp = A.wpT }
  if (A.mode === 'index' && A.base !== A.prevBase) { onArrive(A.base, A.prevBase); A.prevBase = A.base }
  tuneWork(now, dt)
  IDX[3] = WORKS[clamp(Math.round(A.wt), 0, N - 1)]

  let from, to, front, overlay = 0
  if (A.mode === 'index') {
    [from, to, front] = scrub(IDX, A.p)
    if (from === IDX[1] && to === IDX[2]) front = 0
    if (from === IDX[3] && to === IDX[3]) {
      // two works share the field only while both can be seen; a settled field draws one
      const k0 = clamp(Math.floor(A.wt), 0, N - 1), k1 = clamp(k0 + 1, 0, N - 1), t = A.wt - k0
      if (k1 === k0 || t < 0.02) { from = to = WORKS[k0]; front = 1 }
      else if (t > 0.98) { from = to = WORKS[k1]; front = 1 }
      else { from = WORKS[k0]; to = WORKS[k1]; front = 1; overlay = 1 }
    }
  } else if (A.mode === 'world') [from, to, front] = scrub(worldFor(A.k), A.wp)
  else { from = A.from; to = A.to; front = A.front }

  registration(now, dt)
  updatePress(now, dt)
  updateSqueeze(dt)
  runPending()
  if (A.mode === 'world' && !A.busy) Object.assign(A.world, worldGeom(A.wp))
  const lf = A.mode === 'world' ? lastFrame() : 0
  if (A.mode === 'world' && A.wp > lf - 0.1 && !A.nextArmed) {
    A.nextArmed = true
    const full = worldFor(A.k)[lf]
    gsap.to(A, {
      nextReg: 0, duration: 1.7, delay: 0.3, ease: 'expo.inOut',
      onComplete: () => {
        gsap.to(full, { lod: 0, duration: 0.24, ease: 'expo.out' })
        gsap.to(full, { fill: 1, duration: 0.5, delay: 0.05, ease: 'power3.out' })
        haptic(8); mediaFor(full.layout.next); queueWarm(worldFor(full.layout.next))
      },
    })
  }
  if (A.mode === 'world' && A.wp < lf - 0.6 && A.nextArmed) { gsap.killTweensOf(A, 'nextReg'); A.nextArmed = false; A.nextReg = 1; const full = worldFor(A.k)[lf]; gsap.killTweensOf(full); full.fill = 0; full.lod = ST.LOD_OFF }

  // composition. order matters: what the visitor does acts on the screen first; the place's own composition then maps that material
  const fs = [...A.features]
  if (A.about && A.aboutDetailK > 0.0005) fs.push(...aboutRoomFeatures())
  const ft = A.p - 1
  if (A.mode === 'index' && from === IDX[1] && to === IDX[2] && ft > 0 && ft < 1) {
    const e = smooth(0.04, 0.96, ft)
    Object.assign(A.faceF, { cx: V.W * 0.5, cy: IDX[1].weak(), h: V.H * 1.12 * Math.pow(e, 1.9), hw: lerp(V.W * 0.32, 16000, smooth(0.08, 0.7, ft)), falloff: lerp(22, 90, e), kind: 1, reach: 0, lip: 0 })
    fs.push(A.faceF)
    if (ft > 0.9) A.learned.face = true
  }
  const staticStart = fs.length
  if (overlay || from === to) fs.push(...scaled(to, 1))
  else { fs.push(...scaled(from, 1 - front)); fs.push(...scaled(to, front)) }
  const staticCount = fs.length - staticStart
  // room made in the Lab stays with the sheet as far as the rest state
  if ((A.mode === 'index' || A.mode === 'bridge') && A.pins.length) {
    const bridging = A.mode === 'bridge'
    const pk = bridging ? A.bridgePK : pinScale(), shown = bridging ? A.pins : shownPins()
    if (!bridging) relaxPins(dt, Math.max(pk, 0.3), shown)
    if (pk > 0.001) for (const f of shown) if (fs.length < surface.MAXF - 1) fs.push({ ...f, h: f.h * pk, hw: f.hw * (0.6 + 0.4 * pk) })
  }
  if (A.worldOn) fs.push(A.world)
  if (A.bridgeF) fs.push(A.bridgeF)
  surface.features = fs
  const dom = front < 0.5 ? from : to
  A.beneathSt = dom.id === 'creative' ? IDX[2] : dom.id === 'system' ? IDX[1] : to
  surface.beneath(A.beneathSt)
  const faces = dom.id === 'creative' || dom.id === 'system'
  surface.beneathStart = staticStart; surface.beneathCount = faces ? staticCount : 0
  surface.devId = A.press && A.press.st.workIndex != null ? A.press.st.workIndex : (A.press && A.press.st.layout?.next != null ? A.press.st.layout.next : -1)
  if (IDX[5].layout.wedge) IDX[5].features[0].h = IDX[5].layout.wedge.h * A.restOpen

  // how much of the visit's imprint each place lets show; at rest everything else is straight, so it shows most
  const stop = Math.round(A.p)
  const impT = A.mode !== 'index' ? 0 : stop === 4 ? 1 : stop === 5 ? 1.35 : 0.75
  phys.impVis = damp(phys.impVis, impT, stop === 5 ? 1.1 : 3, dt)

  const src = { x: ptr.x, y: ptr.y, vx: ptr.vx, vy: ptr.vy, hover: ptr.hover }
  const pr = A.press
  const devs = pr && pr.st.beneath !== 'pin' ? [{ x: pr.f.cx, y: pr.f.cy, ax: pr.f.hw * 1.25, ay: 36 + pr.f.h * 0.9, amt: clamp(pr.L * 1.35, 0, 1) }] : []
  phys.step(dt / 2, [src], devs); phys.step(dt / 2, [src], devs)
  ptr.vx *= Math.exp(-dt * 9); ptr.vy *= Math.exp(-dt * 9)
  surface.phys(phys)

  const [px0, py0, idx] = penAt(to, front)
  const followable = !overlay && A.mode !== 'intro' && to === A.lastTo && Math.abs(idx - A.lastIdx) <= 3 && front > 0.002 && front < 0.998 && !(from === IDX[1] && to === IDX[2])
  A.lastIdx = idx; A.lastTo = to
  surface.pen = [px0, py0, followable ? 1 : 0]
  surface.penCol = to.ink
  surface.pair(from, to, front)
  surface.overlay = overlay
  surface.time = now / 1000
  surface.shiver = A.shiver
  surface.strip = V.strip
  // a study shows only through a real opening: where Lab media exists the voids are left transparent
  const labMedia = labMediaUpdate()
  surface.fill = (A.mode === 'index' || A.mode === 'intro' || A.mode === 'bridge') && A.releaseK == null && !labMedia ? 1 : 0

  domUpdate(from, to, front)
  mediaUpdate()
  // while the work has the whole screen, the surface is not there at all — do not draw it
  const absent = A.mode === 'world' && !A.busy && ABSENT.has(framesOf(A.k)[clamp(Math.round(A.wp), 0, lastFrame())].g) && Math.abs(A.wp - Math.round(A.wp)) < 0.003
  if (!absent) {
    // a still surface is not drawn again: only waving rows, a shiver or the scan pen need every frame
    const moving = [from, to, A.beneathSt].some((s) => s && s.amp * (s.ampK ?? 1) > 0.001) || A.shiver > 0.001 || surface.pen[2] > 0
    const sig = moving ? '' : stillSig(from, to, fs, overlay, front)
    if (moving || sig !== lastSig || (stillMem !== lastMem && now - lastMemT > 400)) { surface.render(); lastMem = stillMem; lastMemT = now }
    lastSig = sig; A.cleared = false
  } else if (!A.cleared) { surface.clear(); A.cleared = true; lastSig = '' }
  A.jsMs = lerp(A.jsMs || 0, performance.now() - now, 0.05)
  requestAnimationFrame(frame)
}

// ─── opening ─────────────────────────────────────────────────────────────────
// Frame one is stored material: every row of the page pressed into one dense band at the seam between the
// names, straining at its edges. It gives, and unfolds — rows streaming apart, the name carried open by them, out
// of register — until the two row sets find each other and lock. Nothing moves for a moment after that.
function breathe(delay) {
  gsap.delayedCall(delay, () => {
    if (A.learned.open || A.mode !== 'index' || A.base !== 0 || A.press || A.busy) return
    const f = feature({ cx: V.P ? V.W / 2 : V.W * 0.32, cy: IDX[0].layout.gapY, h: 0, hw: V.P ? 1e5 : V.W * 0.7, falloff: 26 })
    A.features.add(f)
    gsap.timeline({ onComplete: () => A.features.delete(f) })
      .to(f, { h: V.P ? 5 : 7, duration: 0.9, ease: 'sine.inOut' })
      .to(f, { h: 0, duration: 1.1, ease: 'sine.inOut' })
  })
}
function playIntro() {
  gsap.killTweensOf(A)
  if (A.introF) A.features.delete(A.introF)
  const gapY = IDX[0].layout.gapY
  Object.assign(A, { mode: 'intro', from: IDX[0], to: IDX[0], front: 1, introReg: 1, nameAmp: 0, p: 0, pT: 0, base: 0, prevBase: 0 })
  const s0 = V.P ? 13 : 20, L0 = V.H * (V.P ? 0.15 : 0.12), s1 = V.H * 2.6, L1 = V.H * 0.64
  const f = A.introF = gather({ cx: V.W / 2, cy: gapY, sigma: s0, Lm: L0, s: 1 })
  A.features.add(f)
  A.shiver = 0.22
  const u = { t: 0 }, strain = { v: 0 }
  gsap.timeline()
    .to(strain, { v: 1, duration: 0.85, ease: 'sine.inOut', onUpdate: () => { f.sigma = s0 * (1 - 0.12 * Math.sin(strain.v * Math.PI)) } }, 0)
    .to(A, { shiver: 0, duration: 0.45, ease: 'power2.in' }, 0.55)
    .to(u, {
      t: 1, duration: 2.2, ease: 'expo.inOut',
      onUpdate: () => { f.sigma = Math.exp(lerp(Math.log(s0), Math.log(s1), u.t)); f.Lm = Math.exp(lerp(Math.log(L0), Math.log(L1), u.t)); f.s = 1 - smooth(0.72, 1, u.t) },
    }, 0.85)
    .add(() => { A.features.delete(f); A.introF = null }, 3.1)
    .to(A, { introReg: 0.035, duration: 1.05, ease: 'power3.inOut' }, 2.35)
    .to(A, { introReg: 0, duration: 0.1, ease: 'power2.in' }, 3.4)
    .add(() => { A.mode = 'index'; A.arrivedAt = performance.now() }, 3.55)
    .to(A, { nameAmp: 1, duration: 4, ease: 'sine.inOut' }, 5.45)
  breathe(6.65)
}

// ─── the visit's memory survives a reload, not only a route change ─────────────
const MEM_KEY = 'c2-surface-memory'
const b64 = (arr) => { const u = new Uint8Array(arr.buffer); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s) }
const unb64 = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Float32Array(u.buffer) }
function saveMemory() {
  try {
    sessionStorage.setItem(MEM_KEY, JSON.stringify({
      W: V.W, H: V.H, aboutMark: A.aboutMark, yieldMarks: A.yieldMarks, visitOrder: A.visitOrder, seeded: A.seeded, learned: A.learned,
      pins: A.pins.map((f) => ({ cx: f.cx, cy: f.cy, h: f.h, ar: f.ar, base: f.base })),
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
    A.pins = (m.pins || []).map((p) => Object.assign(feature({ cx: p.cx, cy: p.cy, h: p.h, falloff: 18 }), { ar: p.ar, base: p.base, hw: p.h * (p.ar || 2.8) }))
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
  mediaShown = ''; labCapKey = ''
  onState.clear()
  layoutDOM()
  if (A.mode === 'world' || A.mode === 'exit') { mediaFor(A.k); fillWorldDOM(A.k) }
  document.title = isAboutPath() ? TITLE_ABOUT() : TITLE()
  lastSig = ''
  if (refocus) wantFocus(() => ui.querySelector(refocus))
  return true
}

window.__lab = { A, V, ptr, phys, surface, works, configure, routeChanged, setLocale, locale: () => TXT,  previewOf, go, forcedPress, navigate, exit, expandAbout, collapseAbout, startBridge, freeSpot, replayIntro: playIntro, IDX: () => IDX, WORKS: () => WORKS, WORLD: () => WORLD, frames: framesOf, touches, sig: () => lastSig, redraw: () => { lastSig = '' } }
let rt = 0, booted = false
// a resize before the surface exists (a phone's URL bar settling during load) is picked up once start() finishes
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(async () => { if (!booted) return; measure(); await ensurePreviews(); rebuild() }, 140) })

async function start() {
  try { await document.fonts.load(`900 100px ${ST.FAMILY}`, 'EMRAHYÜCEL') } catch {}
  try { await document.fonts.load('400 20px "Geist Variable"') } catch {}
  await document.fonts.ready
  measure()
  await Promise.all([surface.ready, ensurePreviews()])
  buildDOM()
  restoreMemory('history'); restoreMemory('order')
  rebuild()
  restoreMemory('sheet')
  booted = true
  if (Math.abs(innerWidth - V.W * V.u) > 1 || Math.abs(innerHeight - V.H * V.u) > 1) { measure(); await ensurePreviews(); rebuild() }
  A.from = A.to = IDX[0]; A.front = 1
  if (isAboutPath()) { A.pending = 'detail'; document.title = TITLE_ABOUT() } else document.title = TITLE()
  requestAnimationFrame((t) => { last = t; frame(t) })
  if (REDUCED) { A.mode = 'index'; A.introReg = 0; A.nameAmp = 0; return }
  playIntro()
}
export { start as mountC2 }
if (!globalThis.__c2Hosted) start()
