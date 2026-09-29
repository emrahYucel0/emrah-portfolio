/**
 * THE SEAM BETWEEN THE LAB AND THE CONTACT FINALE (F2). The bench is the fifth destination and the finale is the
 * sixth, both document routes without the runtime, so crossing between them is a navigation — and it has to read
 * as one sheet. What makes it one sheet:
 *
 *  · The finale's first frame (p = 0) is the bench's bare row field, value for value (lab-contact A-METRICS: same
 *    fillRect rows, same ground, same foot band). So the bench, leaving downwards, clears itself to that bare field
 *    first (LabBench's veil) and only then hands over; arriving from the finale, it registers itself back out of
 *    it. The finale's engine is fetched while the bench is on screen, so its first frame is ready when the route is.
 *  · One gesture is one destination. The handover happens on the threshold, while a trackpad is still coasting, so
 *    what arrives on the other side first is a tail with no hand behind it: it is spent, not obeyed (hushTail —
 *    the runtime's own A.hush rule: 420 ms, re-armed by 140 ms for as long as the tail keeps coming).
 *
 * How the visitor arrived rides on the history entry, not in the URL (as the runtime's C2_ARRIVE does), and is spent
 * on arrival: Back and Forward later find the page as it was left, not the arrival replayed.
 */
import { CONTACT_FINALE } from '~~/shared/site'

/** on the finale's entry: 'start' — carried here by a gesture, the drawing plays from p = 0;
 *  'end' — asked for by name (the menu, #contact), the finale opens settled at p = 1;
 *  'at:<0…1>' — the same finale in the other language, where the reader was on the track */
export const FINALE_ARRIVE = 'finaleArrive'
export type FinaleArrival = 'start' | 'end' | `at:${number}`
/** on the bench's entry: the visitor gestured up out of the finale */
export const LAB_ARRIVE = 'labArrive'

export const takeHistoryFlag = (key: string): string | null => {
  if (!import.meta.client) return null
  const s = (history.state ?? null) as Record<string, unknown> | null
  const v = s?.[key]
  if (typeof v !== 'string') return null
  try { history.replaceState({ ...s, [key]: null }, '') } catch { /* a history the page may not rewrite */ }
  return v
}

/** the finale's engine: one module, fetched once — by the bench ahead of time, by the Contact page when it mounts */
let finaleMod: Promise<typeof import('../../engine/lab/finale/finale.js')> | null = null
export const loadFinale = () => (finaleMod ??= import('../../engine/lab/finale/finale.js'))

/** where the finale was left, per history entry (vue-router's state.position) — Back and Forward find it there */
export const finaleScroll = new Map<number, number>()

/** the finale's side: the Contact page registers where the reader is on the track (a language change keeps it) */
export const finaleSeam: { progress: null | (() => number) } = { progress: null }

/** the bench's side of the seam: LabBench registers how it clears itself to the bare field */
export const benchSeam: { exit: null | (() => Promise<void>) } = { exit: null }

/**
 * The tail of the gesture that carried the visitor across. Captured on the window before anything on the new page
 * hears it, so neither the document (the finale scrolls) nor the bench's spine (which would read it as a second
 * gesture) is moved by it.
 */
export function hushTail(ms = 420) {
  if (!import.meta.client) return
  let until = performance.now() + ms
  const onWheel = (e: WheelEvent) => {
    const now = performance.now()
    if (now >= until) { removeEventListener('wheel', onWheel, { capture: true }); return }
    until = now + 140
    e.preventDefault()
    e.stopPropagation()
  }
  addEventListener('wheel', onWheel, { capture: true, passive: false })
  // a tail that never comes still ends the hush
  setTimeout(() => { if (performance.now() >= until) removeEventListener('wheel', onWheel, { capture: true }) }, ms + 20)
}

export function useContactSeam() {
  const router = useRouter()
  const { path } = useLocale()
  const toContact = (how: FinaleArrival) => router.push({ path: path('/contact'), state: { [FINALE_ARRIVE]: how } })
  /** the same finale in the other language, at the same place on the track */
  const toLocale = (to: string) => router.push({ path: to, state: { [FINALE_ARRIVE]: `at:${(finaleSeam.progress?.() ?? 0).toFixed(4)}` } })
  const toLab = () => router.push({ path: path('/lab'), state: { [LAB_ARRIVE]: 'contact' } })
  return { enabled: CONTACT_FINALE, toContact, toLab, toLocale }
}
