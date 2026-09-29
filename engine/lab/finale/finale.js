// THE CONTACT FINALE — the site's one Contact, drawn by a plotter (prototype: the sibling repo
// lab-contact, whose README carries the storyboard and every decision). Framework-free, like
// engine/lab/line-study.js: the page (app/pages/[locale]/contact.vue) owns the DOM and the
// content, and hands this module its canvases, its prerendered accessible cells and its words.
//
//   tear → cartridge → the sheet parts at the cells' borders → the pen writes the labels and
//   the five values (Hershey futural) → the email SOAKS into the site's display face → live:
//   attention redistributes the cells (Weight), soaking is attention's reward, and every action
//   is recorded on the drawing as a revision (cloud + △n), paid from one fixed length of ink.
//
// Everything is a function of the document's scroll POSITION (useStudy's model); on the narrow
// touch sheet the track runs on into an attention stretch where the scroll carries attention.

import { createFrame } from './frame.js'
import { createSurface } from './surface.js'
import { createPlotter, LIVE_P, FLOOR_CAP, mapReducedP, partingAt } from './plotter.js'
import { createPartition } from './partition.js'
import { createParting } from './parting.js'
import { createOverlay } from './overlay.js'
import { createSoak } from './soak.js'
import { createHud } from './hud.js'
import { note } from './debug.js'

// ~4.2 viewports of travel (user decision: 4–4.5); the narrow touch sheet adds an ATTENTION
// stretch after the plot (one field after another, by scroll: ≈ 1.2 screens, user decision)
const STAGES = 3.2
const ATT_STAGES = 1.2
const STATES = 4 // resting · parted+labels · email written · settled (reduced snaps here)
const ORDER = ['email', 'phone', 'github', 'linkedin', 'location']

// a touch device: on its narrow sheet the SCROLL carries attention and a tap only ever acts.
// Asked FRESH on every resize (a browser's device emulation toggles it without a reload) and from
// every signal a touch screen gives — not only `(hover: none)`
const mq = (q) => { try { return matchMedia(q).matches } catch { return false } }
const touchCapable = () => mq('(pointer: coarse)') || mq('(any-pointer: coarse)') || navigator.maxTouchPoints > 0 || 'ontouchstart' in window
const touchSheet = (S) => S.portrait && touchCapable()

/** the touch sheet's attention by scroll: q 0…1 walks the five fields; each holds a plateau and
 *  hands over along a smooth ramp (deterministic both ways). Reduced motion: one at a time. */
function scrollLevels(q, reduced) {
  const u = q * ORDER.length
  const out = {}
  ORDER.forEach((id, i) => {
    if (reduced) { out[id] = q > 0 && Math.min(ORDER.length - 1, Math.floor(u)) === i ? 1 : 0; return }
    const c = i + 0.5
    let a = 1 - Math.max(0, Math.abs(u - c) - 0.3) / 0.7
    if (i === 0) a *= Math.min(1, u / 0.5) // the first rises out of the plot
    if (i === ORDER.length - 1 && u >= c) a = 1 // the last holds to the end
    a = Math.max(0, Math.min(1, a))
    out[id] = a * a * (3 - 2 * a)
  })
  return out
}

/**
 * @param {object} o
 * @param {HTMLElement} o.track      the scroll track (its height is the finale's travel)
 * @param {HTMLCanvasElement} o.paper, o.ink
 * @param {HTMLElement} o.contact    the prerendered accessible layer ([data-cell] cells, [data-copy])
 * @param {HTMLElement} o.status     role=status
 * @param {HTMLElement} [o.footHint] the foot band's middle: the one instruction the sheet may show
 * @param {Array} o.items            the five cells (see app/pages/[locale]/contact.vue)
 * @param {object} o.strings         { contact, finale }
 * @param {string} o.lang            'tr' | 'en'
 * @param {() => void} [o.onTopUp]   at p = 0, a gesture UP (the way back to the Lab — F2)
 */
export function createFinale(o) {
  const { items, strings, lang } = o
  const params = new URLSearchParams(location.search)
  const SOAK = params.get('soak') !== '0' // the crescendo IS the default; ?soak=0 only compares

  const frame = createFrame({ stages: (S) => STAGES + (touchSheet(S) ? ATT_STAGES : 0), states: STATES, track: o.track, canvases: { paper: o.paper, ink: o.ink } })
  const surface = createSurface(frame.S)
  const partition = createPartition(items)
  // user decision: the GitHub/LinkedIn cells carry no plotted label — the short name IS the word
  const plotter = createPlotter(frame.S, () => items, { soak: SOAK, hideLabels: ['github', 'linkedin'] })
  let soak = null
  if (SOAK) {
    try { soak = createSoak(frame.S, () => items) } catch (err) { note('fallback', `soak unavailable (${err.message}) → pen lettering only`) }
  }
  const overlay = createOverlay(o.contact, o.status)
  const parting = createParting()
  const hud = createHud()
  const off = new AbortController()
  let dead = false
  let liveNow = false // the drawing has settled far enough for the cells to be placed over it (p ≥ LIVE_P)

  function onAttention(kind, id, ts) {
    // keyboard focus must wake the frame loop itself — a resting sheet has no rAF running
    // F3: the cells are in the accessibility tree and the tab order at every p. Keyboard focus reaching one before
    // the drawing has placed it settles the finale first (p = 1), so the focus ring lands on its own fact
    if (kind === 'focus') { kbdFocus = true; if (!liveNow) arrive(); partition.setFocus(id); frame.request() }
    else if (kind === 'blur') { kbdFocus = false; partition.setFocus(null); frame.request() }
    else if (kind === 'spend') {
      // the climax: the action (browser default / clipboard) fires with this very event and
      // waits for NOTHING — even the pen's compile is deferred to the next task
      const t0 = performance.now()
      setTimeout(() => {
        if (dead) return
        if (plotter.revise(id) === 'new') {
          const it = items.find((x) => x.id === id)
          o.status.textContent = `${strings.finale.revision} ${plotter.revCount}: ${it?.label ?? id}`
        }
        frame.request()
      }, 0)
      if (ts) (window.__spendLat ??= []).push({ queue: Math.round((t0 - ts) * 100) / 100, work: Math.round((performance.now() - t0) * 1000) / 1000 })
    } else if (kind === 'copied') {
      plotter.copied()
      frame.request()
    }
    // hover is carried by the pointer itself (pointermove → attention)
  }
  overlay.adopt(items, strings, onAttention)

  const frameRect = () => { const v = plotter.view; return { x: v.fr.x, y: v.fr.y, w: v.fr.w, h: v.fr.h } }
  function rebuild() {
    plotter.build(partition, lang)
    soak?.reset()
    // prime the soak stages for the rest layout at once: the crescendo only ever blits
    requestAnimationFrame(() => {
      if (dead) return
      plotter.layout(partition.tick(frameRect(), 1 / 60, frame.S.reduced, false, frame.S.portrait))
      soak?.prime(plotter, lang)
    })
    surface.makePaper()
    frame.request()
  }
  frame.resized(rebuild)
  rebuild()

  // ── the foot band. Its two ends are the site's own, prerendered by the page and never rewritten here: the
  //    roles on the left, the city and the status on the right — the home strip's words, from the same source.
  //    Its middle carries an instruction, when the sheet asks for one, and lets it go ──
  function hint(text) {
    const el = o.footHint
    if (!el) return
    if (text) el.textContent = text // hiding keeps the words, so they fade rather than vanish
    el.classList.toggle('on', !!text)
    el.parentElement?.classList.toggle('is-hinting', !!text)
  }

  // ── 1. THE WAY IN. At p = 0 nothing on the bare sheet says that it moves. Until the first scroll the row that is
  //    about to tear breathes — lifts off its place a little, sags, settles (p untouched) — and the foot asks for
  //    a scroll. The first scroll hands over to the plot; both go, for good. Reduced motion: the words only.
  //    The breath starts from rest, so the arrival's first frame is still the bench's bare field. ──
  const BREATH = 2.8 // seconds per breath
  let beckon = 'armed', beckonAt = 0 // 'armed' → 'on' → 'off'
  function beckonStep(now) {
    if (beckon === 'off') return 0
    if (frame.rawProgress() > 0.0005) { beckon = 'off'; hint(''); return 0 }
    if (beckon === 'armed') {
      beckon = 'on'; beckonAt = now + 600
      setTimeout(() => { if (!dead && beckon === 'on') hint(strings.finale.hintScroll) }, 600)
    }
    if (frame.S.reduced) return 0
    const t = Math.max(0, (now - beckonAt) / 1000)
    return Math.min(1, t / 0.8) * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / BREATH))
  }

  // ── 2. WEIGHT, SHOWN ONCE. The drawing done and the visitor still — a desktop cursor that has not moved for 2 s —
  //    attention glides to GitHub, which grows, holds for a second, and comes back to the email; the foot says to
  //    move the cursor. On the phone's touch sheet attention is the scroll's, so the same walk is played there
  //    (email → phone → GitHub, back to the email) and the foot says to keep scrolling. Any input cancels it at
  //    once; once per session; reduced motion only shows the words. ──
  const GUIDE_KEY = 'finale-guide'
  let guided = false
  try { guided = sessionStorage.getItem(GUIDE_KEY) === '1' } catch { /* no storage: once per page instead */ }
  let idleTimer = 0, guideTimers = [], guiding = false, kbdFocus = false, lastQ = 0, wasLive = false
  let walk = null // the phone's walk: { t0, end } (performance.now ms)
  const armIdle = () => { clearTimeout(idleTimer); if (!guided && !dead) idleTimer = setTimeout(tryGuide, 2000) }
  function tryGuide() {
    if (dead || guided) return
    const touch = touchSheet(frame.S)
    if (!liveNow || kbdFocus || (touch && lastQ > 0.05)) { armIdle(); return }
    guided = true
    try { sessionStorage.setItem(GUIDE_KEY, '1') } catch { /* see above */ }
    guiding = true
    hint(touch ? strings.finale.hintKeepScrolling : strings.finale.hintCursor)
    const at = (ms, fn) => guideTimers.push(setTimeout(() => { if (!dead) fn() }, ms))
    if (frame.S.reduced) { at(3500, endGuide); return }
    if (touch) { walk = { t0: performance.now(), end: 0 }; frame.request(); at(4200, endGuide); return }
    partition.setFocus('github'); frame.request()
    at(2000, () => { partition.setFocus('email'); frame.request() })
    at(3200, () => { partition.setFocus(null); frame.request() })
    at(3600, endGuide)
  }
  function endGuide() {
    guideTimers.forEach(clearTimeout); guideTimers = []
    if (!guiding) return
    guiding = false
    hint('')
    if (walk && !walk.end) walk.end = performance.now()
    if (!kbdFocus) partition.setFocus(null)
    frame.request()
  }
  /** the phone's walk: the attention position it plays, and how much of it is shown (fades out at the end) */
  function walkAt(now) {
    if (!walk) return null
    const t = (now - walk.t0) / 1000
    const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x) }
    const q = t < 1.2 ? 0.5 * sm(t / 1.2) : t < 2.2 ? 0.5 : 0.5 - 0.4 * sm(t - 2.2)
    const w = walk.end ? 1 - Math.min(1, (now - walk.end) / 600) : 1
    if (w <= 0) { walk = null; return null }
    return { q, w }
  }
  // what counts as the visitor doing something: it cancels the guide and restarts the stillness
  let px = -1, py = -1
  const input = () => { if (guiding) endGuide(); armIdle() }
  const sigIn = { signal: off.signal, passive: true }
  addEventListener('pointermove', (e) => {
    // a cursor that has not moved is still, whatever the page does under it
    if (e.clientX === px && e.clientY === py) return
    px = e.clientX; py = e.clientY; input()
  }, sigIn)
  for (const t of ['wheel', 'keydown', 'touchstart', 'scroll', 'pointerdown']) addEventListener(t, input, sigIn)

  // graceful degradation ladder: EMA of the frame's own cost, with hysteresis
  let ema = 8, level = 0, calm = 0
  function pickLevel(ms) {
    ema += (ms - ema) * 0.08
    if (ema > 14 && level < 2) { level++; ema = 10; calm = 0 }
    else if (ema < 7 && level > 0 && ++calm > 90) { level--; calm = 0 }
  }

  let lastTouch = null
  function frameBody(stepP, dt) {
    const t0 = performance.now()
    // the plot's p; on the touch sheet the track runs on into the attention stretch (q)
    let rawP = stepP, q = 0
    const touch = touchSheet(frame.S)
    if (touch !== lastTouch) { lastTouch = touch; note('info', `touch sheet (scroll carries attention): ${touch ? 'yes' : 'no'} · portrait ${frame.S.portrait}`) }
    if (touch) {
      const u = frame.rawProgress() * (STAGES + ATT_STAGES)
      rawP = Math.min(1, u / STAGES)
      q = Math.max(0, Math.min(1, (u - STAGES) / ATT_STAGES))
      lastQ = q
      const wk = walkAt(t0)
      if (wk) q += (wk.q - q) * wk.w
    }
    const breath = beckonStep(t0)
    // reduced motion's four stations, applied ONCE for every layer (plot, soak, pen, chrome)
    const p = frame.S.reduced ? mapReducedP(rawP) : rawP
    const live = p >= LIVE_P
    liveNow = live
    if (live && !wasLive) armIdle()
    wasLive = live
    partition.setScrollAttention(touch && live ? scrollLevels(q, frame.S.reduced) : null)
    const pt = partition.tick(frameRect(), dt, frame.S.reduced, live, frame.S.portrait)
    plotter.layout(pt)
    parting.set(pt.divs, plotter.view.sp, partingAt(p), frame.S.portrait)
    // the others' soak follows ATTENTION (its reward); the email's follows the scroll
    const atts = {}
    for (const it of items) atts[it.id] = partition.attOf(it.id)?.att ?? 0
    const soakMoving = plotter.soakTick(live ? atts : null, dt)
    surface.clear()
    // the breath thins the row it lifts off, by as much as it lifts
    const tear = plotter.tear
    surface.drawRestingRows(undefined, breath > 0 && p <= 0 && tear ? { ...tear, birth: 0.5 * breath } : tear, parting)
    let soakRes = { busy: false, drawn: {} }
    if (soak) {
      try { soakRes = soak.draw(p, pt, plotter, lang, parting) } catch (err) {
        note('fallback', `soak switched off after an error (${err.message}) → pen lettering only`)
        soak = null
      }
    }
    const plotMoving = plotter.draw(p, dt, level, soakRes.drawn)
    if (p <= 0) plotter.breathe(breath)
    overlay.setVisible(p >= LIVE_P)
    if (p >= 0.9) {
      const boxes = {}, fallback = {}
      for (const it of items) {
        boxes[it.id] = plotter.valueBox(it.id)
        fallback[it.id] = plotter.capOf(it.id) < FLOOR_CAP
      }
      overlay.sync(pt.rects, boxes, fallback)
    }
    const ms = performance.now() - t0
    pickLevel(ms)
    hud.sample(ms)
    return plotMoving || pt.moving || soakRes.busy || soakMoving || (beckon === 'on' && !frame.S.reduced) || !!walk
  }
  // the frame is guarded: an exception is reported (?debug=1) instead of freezing the sheet
  frame.run((stepP, dt) => {
    try { return frameBody(stepP, dt) } catch (err) {
      note('error', `frame: ${err.message}`)
      return false
    }
  })

  // the pointer: attention for Weight (the pen is a machine — no plucking here)
  const sig = { signal: off.signal, passive: true }
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return // a finger never gives attention (the scroll does)
    partition.setPointer({ x: e.clientX, y: e.clientY })
    frame.request()
  }, sig)
  addEventListener('pointerleave', () => { partition.setPointer(null); frame.request() }, sig)
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) { partition.setPointer(null); frame.request() } }, sig)

  // ── the way back (F2): at the top of the drawing a gesture UP belongs to the site, not to the document — it is
  // the Lab's, as a gesture down on the bench is this page's. One gesture, one destination: only a gesture that
  // BEGAN at the top counts, so the tail of a scroll that has just run the drawing back to p = 0 does not also
  // carry the visitor out of it. The measures are the bench's own (useLabSpine: 96 px of wheel, 240 ms bursts,
  // 56 px of finger).
  if (o.onTopUp) {
    const WHEEL = 96, BURST = 240, SWIPE = 56
    const atTop = () => frame.rawProgress() <= 0.001
    let acc = 0, accAt = 0, fromTop = false, spent = false
    const up = () => { if (spent || dead) return; spent = true; o.onTopUp() }
    addEventListener('wheel', (e) => {
      if (spent) return
      const now = performance.now()
      const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY
      if (!dy) return
      if (now - accAt > BURST || (acc !== 0 && Math.sign(dy) !== Math.sign(acc))) { acc = 0; fromTop = atTop() }
      accAt = now
      if (dy > 0 || !fromTop) { acc = 0; return }
      acc += dy
      if (acc <= -WHEEL) up()
    }, sig)
    // touch events, not pointer events: pulling down at the top starts the browser's own overscroll, which cancels
    // the pointer but keeps delivering touchmove
    let sx = 0, sy = 0, tracking = false
    addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { tracking = false; return }
      tracking = atTop(); sx = e.touches[0].clientX; sy = e.touches[0].clientY
    }, sig)
    addEventListener('touchmove', (e) => {
      if (!tracking || spent) return
      const t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy
      if (dy >= SWIPE && Math.abs(dy) >= Math.abs(dx) * 1.3) { tracking = false; up() }
    }, sig)
    addEventListener('touchend', () => { tracking = false }, sig)
  }

  // the harnesses' handles (like the runtime's window.__lab)
  window.__finale = { plotter, partition, frame, touchSheet: () => touchSheet(frame.S), STAGES, ATT_STAGES }
  window.__finaleStarted = true // the ?debug=1 panel reads it, whenever it arrives
  if (window.__dbg) { window.__dbg.started = true; window.__dbg.render() }

  /** the settled state: the plot at p = 1 (on the touch sheet, before its attention stretch) */
  function arrive() {
    const f = touchSheet(frame.S) ? STAGES / (STAGES + ATT_STAGES) : 1
    scrollTo({ top: o.track.offsetTop + f * (o.track.offsetHeight - innerHeight), behavior: 'instant' })
  }

  return {
    arrive,
    /** where the reader is on the track (0…1) — a language change keeps it */
    progress: () => frame.rawProgress(),
    /** put the reader back at a track position (0…1) */
    goTo(f) { scrollTo({ top: o.track.offsetTop + Math.max(0, Math.min(1, f)) * (o.track.offsetHeight - innerHeight), behavior: 'instant' }) },
    destroy() {
      dead = true
      clearTimeout(idleTimer); guideTimers.forEach(clearTimeout)
      off.abort()
      frame.destroy()
      overlay.destroy()
      soak?.destroy()
      hud.destroy?.()
      if (window.__finale?.plotter === plotter) delete window.__finale
    },
  }
}
