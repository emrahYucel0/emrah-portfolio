import type { LabExit } from './useLabHandoff'

/**
 * LAB HOME IS A SITE DESTINATION, NOT A DOCUMENT. The bench is the fifth stop on the site's index, so a vertical
 * gesture on it means what it means everywhere else on the site: one gesture, one destination — up to Work, down
 * to Contact. The bench itself does not scroll, and the studies are not touched: they are documents, and this
 * ownership is fitted to the Lab landing alone (see useStudy, which reads real scroll on the study routes).
 *
 * The thresholds are the runtime's own, not new ones. There a stop is promoted past 0.12 of the index, which a
 * wheel reaches at about 109 px of delta and a finger at about 6% of the screen's height — so one notch of a mouse
 * and one short swipe travel exactly one place here too, and the site's grammar does not change at its own edge.
 */
const WHEEL = 96        // px of accumulated delta: one notch, as on the index
const BURST = 240       // ms: deltas further apart than this are separate gestures, not one long one
const SWIPE = 56        // px of vertical travel: the index's own swipe distance on a phone

export function useLabSpine() {
  if (!import.meta.client) return
  const { leave } = useLabHandoff()
  const seam = useContactSeam()

  // one gesture is one destination: once a direction has been read the Lab answers nothing more. The runtime is
  // hushed for the same reason on the other side of the handover, where the tail of this gesture arrives next.
  let spent = false

  /*
   * A swipe that began on a record can end inside that record's own box — the records are small, and 56px of
   * travel does not necessarily leave one. The browser then completes it as a tap, and the bench reads a tap on
   * the REGISTERED record as "open it", so a swipe towards Contact could open WEIGHT instead. The gesture has
   * already been spent on the spine, so the click it produces is not a second intention: it is swallowed, once.
   */
  const swallow = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation() }
  const armSwallow = () => document.addEventListener('click', swallow, { capture: true, once: true })

  const go = (to: LabExit | 'contact') => {
    if (spent) return
    spent = true
    armSwallow()
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

  let acc = 0, accAt = 0
  const onWheel = (e: WheelEvent) => {
    if (spent || e.ctrlKey || zoomed()) return
    // nothing on the bench scrolls, so the gesture is the site's: it is taken, not passed to the document
    e.preventDefault()
    const now = performance.now()
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY
    if (!dy) return
    if (now - accAt > BURST || (acc !== 0 && Math.sign(dy) !== Math.sign(acc))) acc = 0
    accAt = now
    acc += dy
    if (Math.abs(acc) >= WHEEL) go(acc > 0 ? 'contact' : 'work')
  }

  // the finger: downward travel is the sheet coming back up the index (Work), upward travel carries it on (Contact)
  // a second finger makes the whole touch a pinch: no finger of it is read again until every one has lifted
  let id = -1, sx = 0, sy = 0
  const fingers = new Set<number>()
  let pinch = false
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    fingers.add(e.pointerId)
    if (fingers.size > 1) { pinch = true; id = -1; return }
    if (!e.isPrimary || pinch || zoomed()) return
    id = e.pointerId; sx = e.clientX; sy = e.clientY
  }
  const onMove = (e: PointerEvent) => {
    if (spent || pinch || e.pointerId !== id) return
    const dx = e.clientX - sx, dy = e.clientY - sy
    if (Math.abs(dy) < SWIPE || Math.abs(dy) < Math.abs(dx) * 1.3) return
    go(dy < 0 ? 'contact' : 'work')
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
  })
}
