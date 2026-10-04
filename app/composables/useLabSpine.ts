import type { LabExit } from './useLabHandoff'

/**
 * LAB HOME IS A SITE DESTINATION, NOT A DOCUMENT. The bench is the fifth stop on the site's index, so a vertical
 * gesture on it means what it means everywhere else on the site — and since R7 (user decision 2026-10-02) it means
 * what it means in Work, the one other place with things in it: SCROLLING BROWSES, A CLICK OPENS. A gesture moves the
 * bench one study, 01 → 02 → 03; past the last it carries on down to Contact (the seam, at p = 0), and up past the
 * first to Work. One gesture is one study: a trackpad's tail, or a coasting wheel, never moves two. The studies
 * themselves are not touched: they are documents, and this ownership is fitted to the Lab landing alone (see useStudy).
 *
 * The thresholds are the runtime's own, not new ones. There a stop is promoted past 0.12 of the index, which a
 * wheel reaches at about 109 px of delta and a finger at about 6% of the screen's height — so one notch of a mouse
 * and one short swipe travel exactly one place here too, and the site's grammar does not change at its own edge.
 */
const WHEEL = 96        // px of accumulated delta: one notch, as on the index
const BURST = 240       // ms: deltas further apart than this are separate gestures, not one long one
const SWIPE = 56        // px of vertical travel: the index's own swipe distance on a phone
/*
 * WHERE ONE GESTURE ENDS — the runtime's rule (engine/c2/main.js, opensGesture), in its plain form. Once a gesture
 * has moved the bench, everything after it is the same gesture until the input has gone quiet: a stream (events
 * closer than STREAM) for REST_STREAM, a single notch for BURST. Every event re-arms the quiet, so a trackpad's tail,
 * which never pauses, and a free-spinning wheel, whose detents slow down but stay under it, cannot move a second
 * study. A deliberate notch after a real pause is a new gesture; so is a turn the other way.
 */
const STREAM = 120
const REST_STREAM = 340
/** replaced at transform time by the bundler; see the note in nuxt.config.ts */
declare const __CROSS__: boolean

export function useLabSpine() {
  if (!import.meta.client) return
  const { leave } = useLabHandoff()
  const seam = useContactSeam()

  // leaving for another place: once the bench has handed over it answers nothing more. The runtime and the finale
  // are hushed for the same reason on the other side, where the tail of this gesture arrives next.
  let leaving = false

  /*
   * A swipe that began on a record can end inside that record's own box — the records are small, and 56px of
   * travel does not necessarily leave one. The browser then completes it as a tap, and the bench reads a tap on
   * the REGISTERED record as "open it", so a swipe towards Contact could open WEIGHT instead. The gesture has
   * already been spent on the spine, so the click it produces is not a second intention: it is swallowed, once.
   */
  const swallow = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation() }
  let swallowTimer = 0
  // armed for the click a finger's swipe produces as it lifts, and only for that: a real click later is not taken
  const armSwallow = () => {
    document.addEventListener('click', swallow, { capture: true, once: true })
    clearTimeout(swallowTimer)
    swallowTimer = window.setTimeout(() => document.removeEventListener('click', swallow, { capture: true }), 600)
  }

  /** one study along, or — at either end — on to the next place */
  const move = (d: 1 | -1, finger: boolean) => {
    if (finger) armSwallow()
    if (benchSeam.step?.(d)) return
    go(d > 0 ? 'contact' : 'work')
  }

  const go = (to: LabExit | 'contact') => {
    if (leaving) return
    leaving = true
    // with Cross Section (R14, C3) the way up is the passage, entered at DEPTH: the blinds close over the bench
    // (development only: the calibration break `skipup`, set by a harness, puts back the skip to Work so it can fail)
    if (__CROSS__ && to === 'work' && !(import.meta.dev && (globalThis as { __csBreak?: string }).__csBreak === 'skipup')) {
      const rise = (globalThis as { __c2Rise?: () => Promise<void> }).__c2Rise
      if (rise) { void rise(); return }
    }
    // down is the Contact finale: the bench clears itself to the bare field the finale opens on, then hands over
    if (to === 'contact') {
      const exit = benchSeam.exit ? benchSeam.exit() : Promise.resolve()
      // the finale's first frame must be ready when its route is; a slow link does not hold the visitor for long
      const ready = Promise.race([loadFinale().catch(() => {}), new Promise((r) => setTimeout(r, 1500))])
      void Promise.all([exit, ready]).then(() => seam.toContact('start'))
      return
    }
    void leave(to)
  }

  /*
   * ZOOM IS THE BROWSER'S (AUDIT-01, WCAG 1.4.4). Two fingers, Ctrl + wheel (which is also what a trackpad's pinch
   * sends) and moving around a zoomed page are never a destination: they are passed to the browser untouched. The
   * page is "zoomed" while the visual viewport is scaled; lab.css then hands panning back to the browser too.
   */
  const zoomed = () => (window.visualViewport?.scale ?? 1) > 1.01
  const onZoom = () => document.documentElement.classList.toggle('lab-zoomed', zoomed())

  // the gesture being read: its sum, when its last event came, the narrowest gap it showed, whether it has moved
  let acc = 0, at = -1e9, minGap = Infinity, spentDir = 0
  const onWheel = (e: WheelEvent) => {
    if (__CROSS__ && document.documentElement.dataset.c2 === 'cs') {
      // Cross Section's blinds are over the bench (R14, C3): what arrives is the gesture that moved them, spent here
      // too, so its tail cannot also move a study once they have opened
      e.preventDefault()
      const t = performance.now()
      minGap = Math.min(minGap, t - at); at = t; acc = 0
      spentDir = spentDir || Math.sign(e.deltaY) || 1
      return
    }
    if (leaving || e.ctrlKey || zoomed()) return
    // nothing on the bench scrolls, so the gesture is the site's: it is taken, not passed to the document
    e.preventDefault()
    const now = performance.now()
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY
    if (!dy) return
    const gap = now - at
    at = now
    const quiet = minGap < STREAM ? REST_STREAM : BURST
    const turned = Math.sign(dy) !== Math.sign(spentDir || acc || dy)
    if (gap > quiet || turned) { acc = 0; minGap = Infinity; spentDir = 0 } else minGap = Math.min(minGap, gap)
    // spent: the rest of this gesture is absorbed, and every event of it keeps the quiet from starting
    if (spentDir) return
    acc += dy
    if (Math.abs(acc) >= WHEEL) { spentDir = Math.sign(acc); move(acc > 0 ? 1 : -1, false) }
  }

  // the finger: downward travel is the sheet coming back up (the study before, then Work), upward travel carries it on
  // (the next study, then Contact). One touch is one gesture: it moves the bench once, however far it travels.
  // a second finger makes the whole touch a pinch: no finger of it is read again until every one has lifted
  let id = -1, sx = 0, sy = 0, moved = false
  const fingers = new Set<number>()
  let pinch = false
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    fingers.add(e.pointerId)
    if (fingers.size > 1) { pinch = true; id = -1; return }
    if (!e.isPrimary || pinch || zoomed()) return
    id = e.pointerId; sx = e.clientX; sy = e.clientY; moved = false
  }
  const onMove = (e: PointerEvent) => {
    if (leaving || pinch || moved || e.pointerId !== id) return
    if (__CROSS__ && document.documentElement.dataset.c2 === 'cs') return
    const dx = e.clientX - sx, dy = e.clientY - sy
    if (Math.abs(dy) < SWIPE || Math.abs(dy) < Math.abs(dx) * 1.3) return
    moved = true
    move(dy < 0 ? 1 : -1, true)
  }
  const end = (e: PointerEvent) => {
    fingers.delete(e.pointerId)
    if (e.pointerId === id) id = -1
    if (!fingers.size) pinch = false
  }

  onMounted(() => {
    // the finale's engine is fetched while the bench is on screen, so the way down never waits for it
    const warm = () => { void loadFinale().catch(() => {}) }
    if (typeof requestIdleCallback === 'function') requestIdleCallback(warm, { timeout: 2500 }); else setTimeout(warm, 1200)
    addEventListener('wheel', onWheel, { passive: false })
    addEventListener('pointerdown', onDown, { passive: true })
    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerup', end, { passive: true })
    addEventListener('pointercancel', end, { passive: true })
    window.visualViewport?.addEventListener('resize', onZoom)
    onZoom()
  })
  onBeforeUnmount(() => {
    removeEventListener('wheel', onWheel)
    removeEventListener('pointerdown', onDown)
    removeEventListener('pointermove', onMove)
    removeEventListener('pointerup', end)
    removeEventListener('pointercancel', end)
    window.visualViewport?.removeEventListener('resize', onZoom)
    document.documentElement.classList.remove('lab-zoomed')
    document.removeEventListener('click', swallow, { capture: true })
    clearTimeout(swallowTimer)
  })
}
