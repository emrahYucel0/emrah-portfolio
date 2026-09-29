/*
 * ── HOW THE PASSAGE IS DRIVEN ───────────────────────────────────────────────────────────────────────────────
 *
 * Linefield is the one place on this site where a gesture does not choose a stop: it advances a continuous
 * progress, and the whole quality of the thing is in how that progress follows the hand. So the pacing is a
 * module of its own rather than a few lines in the debug entry — Phase C drives the same progress from the
 * site's own wheel, touch and key handling, and it must feel identical there.
 *
 * THREE THINGS, and each answers a complaint:
 *
 *   FOLLOW      what is drawn eases toward what the input commands, at a rate in units of "per second" rather
 *               than "per frame", so the feel does not change with the frame rate. Raised from the old lerp:
 *               the old one had a time constant of about 110 ms, which on a phone reads as the scene being
 *               dragged behind the finger on a string.
 *   MOMENTUM    a flick keeps travelling and decelerates, the way a native scroll does. Without it a phone
 *               feels like it is pushing something heavy: the scene stops dead the moment the finger lifts.
 *   NORMALISE   a wheel event does not say how far to go. It says deltaY in pixels, or in LINES, or in PAGES,
 *               and a trackpad sends a flood of tiny pixel deltas where a mouse sends one of a hundred. All of
 *               it is converted to pixels first and then to progress by ONE distance, so a mouse notch and a
 *               trackpad swipe are the same gesture at different sampling rates, and both glide.
 *
 * Nothing here snaps or quantises. Progress is integrated every frame, so there is no step a flick can jump
 * over — the collapse cannot be skipped, however hard the flick.
 */

/** how fast what is drawn catches up with what was asked for, per second (time constant 1/LF_FOLLOW = 62 ms) */
export const LF_FOLLOW = 16

/** a flick's velocity decays by 1/e in this many seconds — the same order as a native scroll's */
export const LF_MOMENTUM_TAU = 0.32

/** and it is bounded, in progress per second: at 60 fps this is 1.17% of the passage in a frame */
export const LF_MAX_VEL = 0.7

/*
 * AND NO DRAWN FRAME MAY MOVE FURTHER THAN THIS, whatever the input asked for.
 *
 * "A flick must never skip the collapse" is a claim about frames. The follow is proportional, so a target that
 * jumps a long way — a very fast drag, a thrown flick — moves the first frame by a fraction of that jump, and
 * measured on a hard flick through the crossing that first frame was 3.9% of the passage: wider than the
 * collapse itself, which happens between 46.8% and 51.4%. So the step is capped. It binds only on input a hand
 * cannot actually produce; a real drag samples far too often to reach it, and one wheel notch (1.5% on its first frame) stays under it.
 */
export const LF_MAX_FRAME = 0.016

/** pixels of wheel travel for the whole passage */
export const LF_WHEEL_SPAN = 1500

/** and no single wheel event may command more than this many pixels, whatever the device reports */
export const LF_WHEEL_CLAMP = 180

/** pixels of finger travel for the whole passage — a drag, before momentum adds to it */
export const LF_TOUCH_SPAN = (H) => Math.max(560, H * 1.8)

/**
 * A lift slower than this hands over no momentum at all, in progress per second.
 *
 * Native scrolling coasts from any real velocity, and so does this. But a finger placed on the scene and moved
 * deliberately to a position is not a flick, and it must stay exactly where it was put — otherwise the one
 * gesture that says "look at this" is the one that slides away from it.
 */
export const LF_MIN_FLICK = 0.1

/** one key press, as a fraction of the passage */
export const LF_KEY_STEP = 1 / 18

/** a wheel event's travel in pixels, whatever units it chose to report */
export function wheelPixels(e) {
  // DOM_DELTA_LINE and DOM_DELTA_PAGE are what a real mouse on Windows and some Linux setups send; the numbers
  // are the conventional ones, and they only have to be the right order for the clamp below to do its work
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
  const px = e.deltaY * unit
  return Math.max(-LF_WHEEL_CLAMP, Math.min(LF_WHEEL_CLAMP, px))
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/**
 * The integrator. `draw(p)` is called on every frame where anything moved, and only then.
 *
 * `spanOf()` returns the current touch distance in pixels; it is a function because the viewport can change
 * under a drag.
 */
export function createPacer(draw, spanOf) {
  let p = 0
  let target = 0
  let vel = 0
  let raf = 0
  let last = 0
  let drag = null

  const tick = (now) => {
    raf = 0
    const dt = Math.min(0.05, Math.max(1 / 240, (now - last) / 1000))
    last = now

    if (vel !== 0) {
      const next = clamp01(target + vel * dt)
      // the ends absorb the flick rather than bouncing off it
      if (next === target) vel = 0
      target = next
      vel *= Math.exp(-dt / LF_MOMENTUM_TAU)
      if (Math.abs(vel) < 0.004) vel = 0
    }

    const d = target - p
    if (Math.abs(d) < 2e-4 && vel === 0) { p = target; draw(p); return }
    const step = d * (1 - Math.exp(-dt * LF_FOLLOW))
    p = clamp01(p + Math.max(-LF_MAX_FRAME, Math.min(LF_MAX_FRAME, step)))
    draw(p)
    raf = requestAnimationFrame(tick)
  }

  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick) } }

  return {
    get progress() { return p },
    get target() { return target },
    get velocity() { return vel },
    get dragging() { return !!drag },
    /** jump there, cancelling anything in flight — for the scrub, Home/End, and a harness */
    set(v) { vel = 0; drag = null; p = target = clamp01(v); draw(p) },
    /** a wheel notch, a key, or any other discrete push */
    nudge(dv) { vel = 0; target = clamp01(target + dv); wake() },
    wheel(e) { this.nudge(wheelPixels(e) / LF_WHEEL_SPAN) },
    dragStart(y) {
      vel = 0
      drag = { y, at: target, s: [[performance.now(), y]] }
    },
    dragMove(y) {
      if (!drag) return
      target = clamp01(drag.at + (drag.y - y) / spanOf())
      drag.s.push([performance.now(), y])
      // only the tail matters: a velocity taken over the whole drag is the average speed, not the flick
      if (drag.s.length > 8) drag.s.shift()
      wake()
    },
    dragEnd() {
      if (!drag) return
      const now = performance.now()
      // the oldest sample still inside the window that a flick actually happens in
      const win = drag.s.filter(([t]) => now - t < 110)
      const first = win.length > 1 ? win[0] : null
      const lastS = drag.s[drag.s.length - 1]
      drag = null
      if (!first) { wake(); return }
      const dt = (lastS[0] - first[0]) / 1000
      if (dt > 0.004) {
        const v = (first[1] - lastS[1]) / spanOf() / dt
        vel = Math.abs(v) < LF_MIN_FLICK ? 0 : Math.max(-LF_MAX_VEL, Math.min(LF_MAX_VEL, v))
      }
      wake()
    },
    stop() { vel = 0; if (raf) { cancelAnimationFrame(raf); raf = 0 } },
  }
}
