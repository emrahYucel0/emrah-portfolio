/*
 * THE ONE HINT SYSTEM (ROADMAP R3, user decisions 2026-10-01 and 2026-10-02).
 *
 * The site used to teach in three voices: the runtime's strip, on timings of its own (2.5 s at the faces and the
 * work field, 3.5 s inside a project), with "learned" flags that lasted as long as the page; and the Contact finale,
 * whose beckon asked for a scroll 0.6 s after arrival, every arrival. One rule now, shared by both:
 *
 *   · a hint is a short instruction in small mono, in the middle of the bottom strip;
 *   · it appears only after CUE_IDLE of no input at the place that asks for it, and goes at the first input or when
 *     the visitor leaves;
 *   · each gesture's hint is shown ONCE PER SESSION, wherever it first qualifies — the record is kept here;
 *   · "scroll" is asked only where the screen looks finished: the hero's first stop and the end of the Linefield
 *     passage, once between them; the Contact arrival keeps a once of its own, because there a scroll draws rather
 *     than travels.
 *
 * Plain module, no framework: engine/c2 and engine/lab/finale both import it.
 */
export const CUE_IDLE = 2500

// where storage is refused (a private window, blocked site data), once per page instead
const shown = new Set()
const KEY = (name) => `cue:${name}`

/** has this hint already been shown in this session */
export function cueSeen(name) {
  if (shown.has(name)) return true
  try { return sessionStorage.getItem(KEY(name)) === '1' } catch { return false }
}

/** it is being shown now: it will not be shown again in this session */
export function cueSpend(name) {
  shown.add(name)
  try { sessionStorage.setItem(KEY(name), '1') } catch { /* see above */ }
}
