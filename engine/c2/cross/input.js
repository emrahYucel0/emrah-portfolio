/*
 * ── CROSS SECTION: THE PACING (Phase B) ─────────────────────────────────────────────────────────────────────
 *
 * The debug entry's own input, modelled on the reference's: continuous outside the band, one stop per gesture
 * inside it. It exists so the spans can be FELT on a device and set there (R14 decision 3: Work → bench in about
 * five gestures). Phase C replaces the gesture detection with the site's own rule (`opensGesture`, R12/R24/R28);
 * the tempo constants below are what carries over.
 *
 * Two tempos:
 *
 *   step (default)  each free part is ONE gesture: a gesture that starts in the turn plays the whole turn to the
 *                   band's wall, and the gesture that releases EDGE plays the whole carry to DEPTH. With the
 *                   default two stops the passage is turn · beside · in front · release-and-carry: four gestures,
 *                   five with the one that leaves for the bench.
 *   scroll          the reference's continuous free parts, at CS_FREE_PX of wheel per free part.
 *
 * Imported only where __CROSS__ is true.
 */
import { CS_Z0, CS_Z1, bandStops } from './slats.js'

/** wheel px for one whole free part (the turn, or the carry) in the scroll tempo; the reference's is 850 */
export const CS_FREE_PX = 600
/** how fast the free parts may move, in passage per second, and how they ease (1/s) */
export const CS_FREE_RATE = 0.9
export const CS_FREE_K = 6
/** how a stop eases in the band (1/s): the reference's ~0.6 s */
export const CS_BAND_K = 4.2
/** a gesture is over after this long without input (ms) — the debug entry's stand-in for the site's rule */
export const CS_QUIET = 180
/** a stop needs at least this much travel in one direction, and no faster than one per this many ms */
export const CS_STEP_TH = 40
export const CS_STEP_GAP = 650

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const freeP = (r) => (r <= 0.5 ? (r / 0.5) * CS_Z0 : CS_Z1 + ((r - 0.5) / 0.5) * (1 - CS_Z1))
const freeR = (p) => (p <= CS_Z0 ? (p / CS_Z0) * 0.5 : p >= CS_Z1 ? 0.5 + ((p - CS_Z1) / (1 - CS_Z1)) * 0.5 : 0.5)
const pOf = (z) => CS_Z0 + z * (CS_Z1 - CS_Z0)

export function createPacer(onFrame, { steps = 2, tempo = 'step' } = {}) {
  const ZS = bandStops(steps)
  let raw = 0, disp = 0, stepIdx = -1, acc = 0, lastStep = -1e9, lastIn = -1e9, spent = false, mode = tempo
  let raf = 0, last = performance.now(), drag = null
  const enter = (i) => { stepIdx = i; acc = 0; lastStep = performance.now() }

  function impulse(dy, fresh = false) {
    const now = performance.now()
    // a finger is one gesture from touch to lift, however long it pauses; a wheel's gesture ends in a quiet
    const newGesture = fresh || (drag ? drag.fresh : now - lastIn > CS_QUIET)
    if (drag) drag.fresh = false
    lastIn = now
    if (newGesture) spent = false
    if (stepIdx >= 0) {
      if (Math.sign(dy) !== Math.sign(acc)) acc = 0
      acc += dy
      if (Math.abs(acc) >= CS_STEP_TH && now - lastStep > CS_STEP_GAP && (mode !== 'step' || !spent)) {
        const s = Math.sign(acc); acc = 0; lastStep = now; stepIdx += s; spent = true
        // leaving forward: the word becomes the line and the louvers carry on (to DEPTH, in the step tempo)
        if (stepIdx >= ZS.length) { stepIdx = -1; raw = mode === 'step' ? 1 : 0.52 }
        // leaving backward: the word fades behind and the louvers turn back (to SURFACE, in the step tempo)
        else if (stepIdx < 0) { stepIdx = -1; raw = mode === 'step' ? 0 : 0.48 }
      }
      kick(); return
    }
    if (mode === 'step') {
      if (spent || Math.abs(dy) < 1) { kick(); return }
      spent = true
      const s = Math.sign(dy)
      // one gesture plays a whole free part: to the band's wall, or to an end
      if (raw < 0.5) { if (s > 0) { raw = 0.5; enter(0) } else raw = 0 }
      else if (s < 0) { raw = 0.5; enter(ZS.length - 1) } else raw = 1
      kick(); return
    }
    const before = raw
    raw = clamp(raw + dy / (CS_FREE_PX * 2))
    if (before < 0.5 && raw >= 0.5) { raw = 0.5; enter(0) }
    else if (before > 0.5 && raw <= 0.5) { raw = 0.5; enter(ZS.length - 1) }
    kick()
  }

  function tick(now) {
    raf = 0
    /*
     * NEVER A NEGATIVE STEP OF TIME. A frame's timestamp is when the frame BEGAN; the clock was being reset to
     * performance.now() at the END of the previous tick, which is later whenever a tick runs long — and a negative dt
     * turns the band's easing round, so the louvers swung about a stop instead of settling on it (found 2026-10-03,
     * when a slower frame made the swing large enough to keep a harness waiting for ever).
     */
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now
    const target = stepIdx >= 0 ? pOf(ZS[stepIdx]) : freeP(raw)
    const inBand = disp > CS_Z0 - 0.005 && disp < CS_Z1 + 0.005
    const step = inBand && stepIdx >= 0
      ? (target - disp) * Math.min(1, dt * CS_BAND_K)
      : clamp((target - disp) * Math.min(1, dt * CS_FREE_K), -CS_FREE_RATE * dt, CS_FREE_RATE * dt)
    const before = disp
    disp = clamp(disp + step)
    if (Math.abs(disp - target) < 1e-5) disp = target
    if (disp !== before) onFrame(disp)
    // the chain carries on on frame timestamps alone; only a pacer starting from rest takes the wall clock
    if (disp !== target && !raf) raf = requestAnimationFrame(tick)
  }
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick) } }

  return {
    impulse,
    get progress() { return disp },
    get stop() { return stepIdx },
    get tempo() { return mode },
    set tempo(m) { mode = m === 'scroll' ? 'scroll' : 'step' },
    /** go straight to a frame (the dock's slider, a harness) */
    set(p) {
      disp = clamp(p)
      if (disp > CS_Z0 && disp < CS_Z1) {
        const z = (disp - CS_Z0) / (CS_Z1 - CS_Z0)
        let best = 0; ZS.forEach((v, i) => { if (Math.abs(v - z) < Math.abs(ZS[best] - z)) best = i })
        enter(best); raw = 0.5
      } else { stepIdx = -1; raw = freeR(disp) }
      onFrame(disp)
    },
    /** go to a band stop and hold it */
    toStop(i) { raw = 0.5; enter(Math.max(0, Math.min(ZS.length - 1, i))); kick() },
    wheel(e) { impulse(Math.max(-140, Math.min(140, e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY))) },
    dragStart(y) { drag = { y, fresh: true } },
    dragMove(y, H) { if (!drag) return; const dy = drag.y - y; drag.y = y; impulse((dy * 1700) / Math.max(320, H * 1.25)) },
    dragEnd() { drag = null; lastIn = -1e9 },
  }
}
