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

  const go = (to: LabExit) => {
    if (spent) return
    spent = true
    armSwallow()
    void leave(to)
  }

  let acc = 0, accAt = 0
  const onWheel = (e: WheelEvent) => {
    if (spent) return
    // nothing on the bench scrolls, so the gesture is the site's: it is taken, not passed to the document
    e.preventDefault()
    const now = performance.now()
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY
    if (!dy) return
    if (now - accAt > BURST || (acc !== 0 && Math.sign(dy) !== Math.sign(acc))) acc = 0
    accAt = now
    acc += dy
    if (Math.abs(acc) >= WHEEL) go(acc > 0 ? 'rest' : 'work')
  }

  // the finger: downward travel is the sheet coming back up the index (Work), upward travel carries it on (Contact)
  let id = -1, sx = 0, sy = 0
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return
    id = e.pointerId; sx = e.clientX; sy = e.clientY
  }
  const onMove = (e: PointerEvent) => {
    if (spent || e.pointerId !== id) return
    const dx = e.clientX - sx, dy = e.clientY - sy
    if (Math.abs(dy) < SWIPE || Math.abs(dy) < Math.abs(dx) * 1.3) return
    go(dy < 0 ? 'rest' : 'work')
  }
  const end = () => { id = -1 }

  onMounted(() => {
    addEventListener('wheel', onWheel, { passive: false })
    addEventListener('pointerdown', onDown, { passive: true })
    addEventListener('pointermove', onMove, { passive: true })
    addEventListener('pointerup', end, { passive: true })
    addEventListener('pointercancel', end, { passive: true })
  })
  onBeforeUnmount(() => {
    removeEventListener('wheel', onWheel)
    removeEventListener('pointerdown', onDown)
    removeEventListener('pointermove', onMove)
    removeEventListener('pointerup', end)
    removeEventListener('pointercancel', end)
    document.removeEventListener('click', swallow, { capture: true })
  })
}
