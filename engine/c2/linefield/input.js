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

/*
 * ── THE DWELL AT THE CROSSING ───────────────────────────────────────────────────────────────────────────────
 *
 * One moment in the passage is a single rust line across the frame, and it is the hinge of the whole thing. At
 * an even rate it goes by in a third of a wheel notch, which is to say a visitor scrolling normally never sees
 * it. So the progress runs SLOWER there: every input — a notch, a key, a finger, the tail of a flick — moves
 * it less the nearer it is to the crossing.
 *
 * It is a gain on the rate and never a stop. At its slowest a gesture still moves the scene by a third of what
 * it would elsewhere, so nothing can catch, nothing snaps to it, and reversing behaves identically because the
 * gain depends only on the distance from the crossing.
 */
export const LF_DWELL_AT = 0.5
export const LF_DWELL_HALF = 0.075
export const LF_DWELL_GAIN = 0.32

export function dwellGain(p) {
  const d = Math.min(1, Math.abs(p - LF_DWELL_AT) / LF_DWELL_HALF)
  return LF_DWELL_GAIN + (1 - LF_DWELL_GAIN) * d * d
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/**
 * THE INTEGRATOR, without a clock of its own.
 *
 * The site's runtime already has a frame loop that owns the time step, the stall cap and the decision about
 * whether to draw at all; a second requestAnimationFrame beside it would be a second clock for the same scene.
 * So the drive holds the target, the velocity and the drag, and is STEPPED — by the runtime's loop on the site,
 * and by createPacer's own loop in the debug entry, which is the only place that has no loop to borrow.
 *
 * `spanOf()` returns the current touch distance in pixels; it is a function because the viewport can change
 * under a drag.
 */
export function createDrive(spanOf) {
  let target = 0
  let vel = 0
  let drag = null

  return {
    get target() { return target },
    get velocity() { return vel },
    get dragging() { return !!drag },
    /** is there anything left to do — a gap to close, or a flick still running */
    moving(p) { return vel !== 0 || Math.abs(target - p) > 2e-4 },
    /** advance the drawn progress by one frame of dt seconds, and return it */
    step(p, dt) {
      if (vel !== 0) {
        // a flick decelerates as it reaches the line, and picks up again on the far side
        const next = clamp01(target + vel * dt * dwellGain(target))
        // the ends absorb the flick rather than bouncing off it
        if (next === target) vel = 0
        target = next
        vel *= Math.exp(-dt / LF_MOMENTUM_TAU)
        if (Math.abs(vel) < 0.004) vel = 0
      }
      const d = target - p
      if (Math.abs(d) < 2e-4 && vel === 0) return target
      const step = d * (1 - Math.exp(-dt * LF_FOLLOW))
      return clamp01(p + Math.max(-LF_MAX_FRAME, Math.min(LF_MAX_FRAME, step)))
    },
    /** jump there, cancelling anything in flight — for a scrub, Home/End, an arrival, and a harness */
    set(v) { vel = 0; drag = null; target = clamp01(v) },
    /** a wheel notch, a key, or any other discrete push */
    nudge(dv) { vel = 0; target = clamp01(target + dv * dwellGain(target)) },
    wheel(e) { this.nudge(wheelPixels(e) / LF_WHEEL_SPAN) },
    /** the same push, in progress rather than pixels, for a runtime that has already normalised its input */
    push(dv) { this.nudge(dv) },
    dragStart(y) {
      vel = 0
      drag = { y, last: y, s: [[performance.now(), y]] }
    },
    /*
     * THE FINGER MOVES IT BY STEPS, NOT BY ABSOLUTE POSITION. One to one with the finger is what it was, and
     * that is what it still is everywhere the gain is 1 — but a rate that changes with where you are cannot be
     * written as a fixed mapping from finger position to progress. So each move contributes its own distance,
     * through the same gain every other input goes through.
     */
    dragMove(y) {
      if (!drag) return
      const dv = (drag.last - y) / spanOf()
      drag.last = y
      target = clamp01(target + dv * dwellGain(target))
      drag.s.push([performance.now(), y])
      // only the tail matters: a velocity taken over the whole drag is the average speed, not the flick
      if (drag.s.length > 8) drag.s.shift()
    },
    dragEnd() {
      if (!drag) return
      const now = performance.now()
      // the oldest sample still inside the window that a flick actually happens in
      const win = drag.s.filter(([t]) => now - t < 110)
      const first = win.length > 1 ? win[0] : null
      const lastS = drag.s[drag.s.length - 1]
      drag = null
      if (!first) return
      const dt = (lastS[0] - first[0]) / 1000
      if (dt > 0.004) {
        const v = (first[1] - lastS[1]) / spanOf() / dt
        vel = Math.abs(v) < LF_MIN_FLICK ? 0 : Math.max(-LF_MAX_VEL, Math.min(LF_MAX_VEL, v))
      }
    },
    stop() { vel = 0; drag = null },
  }
}

/**
 * The same drive with a clock around it, for the debug entry, which has no frame loop to borrow. `draw(p)` is
 * called on every frame where anything moved, and only then.
 */
export function createPacer(draw, spanOf) {
  const d = createDrive(spanOf)
  let p = 0
  let raf = 0
  let last = 0

  const tick = (now) => {
    raf = 0
    const dt = Math.min(0.05, Math.max(1 / 240, (now - last) / 1000))
    last = now
    const moving = d.moving(p)
    p = d.step(p, dt)
    draw(p)
    if (moving && d.moving(p)) raf = requestAnimationFrame(tick)
  }
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick) } }

  return {
    get progress() { return p },
    get target() { return d.target },
    get velocity() { return d.velocity },
    get dragging() { return d.dragging },
    set(v) { d.set(v); p = d.target; draw(p) },
    nudge(dv) { d.nudge(dv); wake() },
    wheel(e) { d.wheel(e); wake() },
    dragStart(y) { d.dragStart(y) },
    dragMove(y) { d.dragMove(y); wake() },
    dragEnd() { d.dragEnd(); wake() },
    stop() { d.stop(); if (raf) { cancelAnimationFrame(raf); raf = 0 } },
  }
}
