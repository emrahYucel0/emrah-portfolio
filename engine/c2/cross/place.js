/*
 * ── CROSS SECTION AS A PLACE ON THE SPINE (Phase C) ─────────────────────────────────────────────────────────
 *
 * The runtime's side of the passage. main.js knows that there is a place called 'cross' between Work and the Lab and
 * hands this object its input, its clock and its frame; everything the passage does is decided here.
 *
 * THE FIVE GESTURES (R14, user decision 2026-10-03). The passage has positions, not a continuous axis:
 *
 *   0  SURFACE, flat — only ever passed through: the gesture that leaves Work travels here and turns on at once
 *   1  the band, EDGE behind the copper line
 *   2  EDGE beside it                          (CS_ORBIT_STEPS = 2: one position per stop)
 *   3  EDGE in front
 *   4  DEPTH, flat — the rest point before the bench
 *
 * One gesture moves one position, whatever shape it arrives in; the site's own rule decides what a gesture is
 * (opensGesture in main.js), so a hard flick that enters the band is stopped at its first position and its tail is
 * spent. From 3, the release turns EDGE edge-on and carries the louvers to DEPTH; from 4, the next gesture leaves for
 * the bench. Backwards it is the same five: from 1, the gesture turns the louvers back to SURFACE and carries on into
 * Work's last work.
 *
 * THE SEAMS ARE BUILT, NOT TUNED. At either end C2 draws the place itself, as an ordinary state. The louvers are
 * drawn only while they move, and the face the visitor is looking at when they start is COPIED off the canvas from
 * the frame C2 has just drawn — so the first louver frame is that frame, physics and all. The other face is drawn by
 * C2 in bands across the first frames of the movement, while it is still turned away. And the material's physics is
 * held still for as long as the louvers move, so when C2 takes the far end back, the frame it draws is the one the
 * louvers were carrying.
 *
 * Imported only where __CROSS__ is true.
 */
import { CS_ORBIT_STEPS, CS_REVEAL_S, CS_Z0, CS_Z1, bandStops, louverClock } from './slats.js'
import { CS_BAND_K, CS_FREE_K, CS_FREE_RATE } from './input.js'
import { createCross } from './runtime.js'
import { faceState } from './state.js'
import { GL_DEV, checkGL, drainGL } from './glstate.js'

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
/** how much travel, in the spine's units (a 100 px wheel notch is 0.11), takes one position */
export const CS_STEP = 0.04
/** the other face is drawn in this many bands, one per frame, while it is still out of sight */
export const CS_BANDS = 3
/** past this point of the louvers' own clock the scene is the dark one: strips, text and the state at rest */
const NIGHT_AT = 0.42
/** how many frames the louvers wait at an end for C2's own frame of it before C2 is asked to draw that face directly */
const CS_WAIT = 2
/*
 * THE SEAM TO THE BENCH (C3, R14 decision 5). 'blinds' is the target: past DEPTH the louvers open onto the bench, which
 * is already mounted underneath, and close over it on the way back. 'fade' is the fallback, ready if the blinds prove
 * fragile on a phone or in the gate: the route still changes under opaque DEPTH, and the canvas then fades over the
 * bench (or in over it, going back). Never a hard cut either way. A context whose louvers were switched off uses it.
 */
export const CS_REVEAL = 'blinds'

export function createPlace(surface, { reduced = false } = {}) {
  const ZS = bandStops(CS_ORBIT_STEPS)
  // the position each step rests at, in the scene's own progress
  const P = [0, ...ZS.map((z) => CS_Z0 + z * (CS_Z1 - CS_Z0)), 1]
  const LAST = P.length - 1
  // development only: a calibration break named in the address (?csbreak=leakgl, see mesh.js) — never in a build
  const breakName = GL_DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('csbreak') : null
  const scene = reduced ? null : createCross(surface, { breakName })
  const gl = scene ? surface.gl : null
  let front = null, back = null, pass = null, V = null
  let x = 0, p = 0, back2work = false, turnPending = false
  /*
   * WHAT EACH FACE HOLDS. `valid[i]`: face i holds a frame of its state that may be shown — the one C2 drew at that end
   * (kept by capture), or one C2 drew for it directly. `held`: which face holds the frame the visitor last saw at rest.
   * The other face is drawn in bands while the louvers turn away from it.
   *
   * NOTHING WAITS FOR EVER. The louvers prefer to leave an end from the frame C2 drew there; if that frame has not been
   * kept within CS_WAIT frames — whatever the reason — C2 is asked to draw the face directly and they leave anyway.
   * (Before this, a frame that was never kept left the louvers parked at the end while the gestures kept counting:
   * five gestures and the Lab, and nothing turned. That is what a user reported on 2026-10-03.)
   */
  let held = -1, valid = [false, false], bandsLeft = 0, wasMoving = false, drawnAt = -1, waited = 0
  /*
   * AND A CONTEXT THAT CANNOT DRAW THE LOUVERS DOES NOT TRY TWICE. In production the first louver frame is checked once
   * (gl.getError, one stall in a session); on any error the louvers are switched off and the place shows its positions
   * as cuts, the way reduced motion does — never a frozen picture. In development every pass is checked.
   */
  let broken = false, probed = false
  /*
   * THE REVEAL'S OWN CLOCK. `rv` 0 is DEPTH, closed; 1 is open — nothing of the canvas left over the bench. `rvWait`
   * holds it at its start until main.js has seen the bench mounted underneath (forward) — opening onto a page that is
   * not there yet would show whatever is. `rvHold` keeps the material still from the moment the blinds start closing
   * until C2 has drawn DEPTH itself, so that frame is the one the closed louvers showed.
   */
  let rv = 0, rvT = 0, rvOn = false, rvWait = false, rvHold = false, rvMode = CS_REVEAL, rvClosed = null, rvFrozen = null, rvFadeDrawn = false
  const revealName = GL_DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('csreveal') : null
  /*
   * THE AUDIT (harnesses only, off unless asked for). The seams are built rather than tuned, and this is how that is
   * checked rather than assumed: on every landing, the face the louvers carried is compared with the frame C2 then
   * draws there; and on request, the louvers drawn at an end are compared with the frame they were copied from.
   */
  let audit = false
  const landings = []
  const compare = (a, b) => {
    let diff = 0, worst = 0
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]))
      if (d > 0) diff++
      if (d > worst) worst = d
    }
    return { px: a.length / 4, diff, worst }
  }

  const api = {
    STEP: CS_STEP,
    LAST,
    positions: P,
    dom: scene ? scene.dom : null,
    get x() { return x },
    get p() { return p },
    get target() { return P[x] },
    get front() { return front },
    get back() { return back },
    /** the louvers are travelling towards a position */
    get moving() { return !reduced && !broken && p !== P[x] },
    /** the louvers are the picture: anywhere between the two flat ends — moving, or held edge-on in the band */
    get louvers() { return !reduced && !broken && ((p > 0 && p < 1) || p !== P[x]) },
    /** and a louver frame is due: they moved, or the frame on the canvas is not of where they are */
    get due() { return p !== drawnAt || bandsLeft > 0 },
    /** the physics must stand still while the louvers are the picture, and for the one frame after it, when C2 takes over */
    get holdPhysics() { return rvOn || rvHold || (!reduced && !broken && ((p > 0 && p < 1) || p !== P[x] || wasMoving)) },
    get broken() { return broken },
    build(v) {
      V = v
      for (const st of [front, back, pass]) if (st) surface.release(st)
      if (scene) {
        scene.build(V, { faces: false })
        front = scene.front; back = scene.back
      } else {
        // reduced motion: the two ends as ordinary states, with nothing to turn
        const L = { W: V.W, h: V.H - V.strip * 2, strip: V.strip, spacing: V.P ? 5.2 : 7 }
        front = faceState(V, L, 0); back = faceState(V, L, 1)
      }
      // the place as scenery: what a header jump crosses on its way past is the ground, without a word on it
      pass = faceState(V, scene ? scene.layout : { W: V.W, h: V.H - V.strip * 2, strip: V.strip, spacing: front.spacing }, 0, { word: false })
      held = -1; valid = [false, false]; bandsLeft = 0; drawnAt = -1; waited = 0
      return front
    },
    /** the state the spine shows for this place: its own while it is an end of the visitor's leg, the ground otherwise */
    state(leg) { return leg ? (louverClock(p) > NIGHT_AT ? back : front) : pass },
    /*
     * ARRIVING. From Work the visitor arrives at SURFACE and the same gesture turns the louvers on to the band, as soon
     * as C2 has drawn SURFACE settled and that frame has been copied. From the far side they arrive at DEPTH, at rest.
     * Passing through, the place is met at the end it is approached from, so nothing is left half-turned behind.
     */
    arrive(fromBelow) {
      back2work = false
      if (fromBelow) { x = 0; p = 0; turnPending = true } else { x = LAST; p = 1; turnPending = false }
      held = -1; valid = [false, false]; bandsLeft = 0; waited = 0
    },
    passBy(towardsAbove) { x = towardsAbove ? 0 : LAST; p = P[x]; turnPending = false; back2work = false; held = -1; valid = [false, false]; bandsLeft = 0 },
    /** leaving by a jump: whatever was in the air lands at its nearest end */
    leave() { x = p < 0.5 ? 0 : LAST; p = P[x]; turnPending = false; back2work = false },
    /**
     * One gesture's worth, in its direction. Returns 'lab' when it carries on to the bench, 'work' once the turn back
     * has been asked for (the spine is moved when the louvers are flat again — see advance()), otherwise null.
     */
    step(dir) {
      turnPending = false
      if (dir > 0) {
        back2work = false
        if (x >= LAST) return 'lab'
        x = Math.max(1, x + 1)
        return null
      }
      if (x <= 1) { x = 0; back2work = true; return null }
      x -= 1
      return null
    },
    /** the clock: returns 'work' on the frame the louvers lie flat again after a turn back */
    advance(et, settled) {
      wasMoving = !reduced && !broken && ((p > 0 && p < 1) || p !== P[x])
      if (turnPending && settled) { turnPending = false; x = 1 }
      const t = P[x]
      // the louvers leave an end from the frame C2 drew there; if it has not been kept within CS_WAIT frames, C2 draws
      // that face directly and they leave anyway (see `valid` above)
      const atEnd = p === 0 || p === 1
      if (!reduced && !broken && atEnd && p !== t) {
        const side = p === 0 ? 0 : 1
        if (!valid[side]) {
          if (++waited <= CS_WAIT) return null
          faceNow(side, 'cross:face-fallback')
        }
      }
      waited = 0
      if (reduced || broken) p = t
      else if (p !== t) {
        const inBand = p > CS_Z0 - 0.005 && p < CS_Z1 + 0.005 && t >= CS_Z0 && t <= CS_Z1
        const step = inBand ? (t - p) * Math.min(1, et * CS_BAND_K) : clamp((t - p) * Math.min(1, et * CS_FREE_K), -CS_FREE_RATE * et, CS_FREE_RATE * et)
        p = clamp(p + step)
        if (Math.abs(p - t) < 1e-4) p = t
      }
      if (back2work && p === 0) { back2work = false; return 'work' }
      return null
    },
    /** reduced motion shows only where the visitor is going */
    snap() { p = P[x] },
    /*
     * THE FRAME C2 HAS JUST DRAWN, kept. Called right after every C2 render of this place at either end, while the
     * drawing buffer still holds it: the louvers then start from exactly that picture.
     */
    capture(side) {
      // (the calibration break `nocapture` never keeps C2's frame: the louvers must still turn — see `valid`)
      if (!scene || broken || breakName === 'nocapture') return
      if (GL_DEV) checkGL(gl, 'before cross:capture (C2 or the page)')
      // a movement has just ended on this side: what the louvers were carrying, against what C2 has now drawn
      const landing = audit && wasMoving && p === (side ? 1 : 0)
      const carried = landing ? scene.mesh.read(side) : null
      scene.mesh.capture(side)
      if (landing && carried) landings.push({ side, at: performance.now(), ...compare(carried, scene.mesh.read(side)) })
      // up from the bench: the closed blinds' last frame against the first frame C2 draws of DEPTH
      if (rvClosed && side === 1) { landings.push({ side, kind: 'bench', at: performance.now(), ...compare(rvClosed, scene.mesh.read(1)) }); rvClosed = null }
      held = side
      valid[side] = true
      valid[1 - side] = false
      bandsLeft = CS_BANDS
      if (GL_DEV) checkGL(gl, 'cross:capture')
    },
    /** one louver frame: the other face's next band first (while it is still turned away), then the louvers */
    render() {
      if (!scene || broken) return
      if (GL_DEV) checkGL(gl, 'before cross:louvers (C2 or the page)')
      else if (!probed) drainGL(gl)
      if (bandsLeft > 0 && held >= 0) {
        const k = CS_BANDS - bandsLeft
        scene.band(1 - held, k, CS_BANDS)
        bandsLeft--
        if (!bandsLeft) valid[1 - held] = true
        if (GL_DEV) checkGL(gl, 'cross:band')
      }
      // a face that holds nothing it may show (a resize mid-turn, say) is drawn now, whole, rather than shown empty
      for (const i of [0, 1]) if (!valid[i] && !(bandsLeft > 0 && i === 1 - held)) faceNow(i, 'cross:face-refill')
      scene.at(p)
      scene.render()
      drawnAt = p
      if (GL_DEV) { if (checkGL(gl, 'cross:louvers').length) breakOff('a WebGL error in the louver pass') }
      else if (!probed) {
        probed = true
        const errs = drainGL(gl)
        if (errs.length) { if (typeof window !== 'undefined') (window.__csGLErrors ??= []).push({ pass: 'cross:louvers (probe)', errs }); breakOff(`WebGL ${errs.join(', ')}`) }
      }
    },
    /** in development: check whatever C2 has just drawn of this place (main.js calls it after C2's render) */
    check(pass) { if (GL_DEV && gl) checkGL(gl, pass) },
    /** the line and the word, where the scene puts them; hidden whenever the visitor is not on the place */
    domAt(on) { if (scene) { scene.dom.style.visibility = on ? 'visible' : 'hidden'; if (on) scene.domAt(p) } },
    probe: () => ({ x, p, target: P[x], held, valid: valid.slice(), bandsLeft, turnPending, back2work, broken, positions: P, reveal: { on: rvOn, r: rv, target: rvT, wait: rvWait, hold: rvHold, mode: rvMode } }),
    audit(on) { audit = !!on; landings.length = 0 },
    landings: () => landings.slice(),
    /**
     * At an end, at rest: the louvers drawn at that end against the frame C2 drew there (which is what the face holds).
     * The caller redraws afterwards — the louvers' frame is left on the canvas.
     */
    identity() {
      if (!scene || held < 0 || !(p === 0 || p === 1) || held !== (p === 0 ? 0 : 1)) return null
      const face = scene.mesh.read(held)
      scene.at(p); scene.render(); drawnAt = -1
      return { side: held, ...compare(face, scene.mesh.readCanvas()) }
    },
    // ── the seam to the bench (C3) ──────────────────────────────────────────────────────────────────────────
    get revealing() { return rvOn },
    get reveal() { return { on: rvOn, r: rv, target: rvT, wait: rvWait, hold: rvHold, mode: rvMode } },
    /**
     * Begin the reveal: dir +1 opens DEPTH onto the bench (held until revealGo(): the bench must be underneath first),
     * dir -1 closes the blinds over it, from nothing at all to DEPTH. The place stands at DEPTH either way.
     */
    revealBegin(dir) {
      rvMode = reduced || broken || !scene || revealName === 'fade' || CS_REVEAL === 'fade' ? 'fade' : 'blinds'
      rvOn = true; rvWait = dir > 0; rvHold = true; rvClosed = null; rvFadeDrawn = false
      if (dir > 0) { rv = 0; rvT = 1 } else { rv = 1; rvT = 0 }
      x = LAST; p = 1; turnPending = false; back2work = false
    },
    revealGo() { rvWait = false },
    /** harness only: hold the reveal at r (a still of the seam with the real page underneath), or let it run on (null) */
    revealFreeze(r) { rvFrozen = r == null ? null : clamp(r) },
    /** the clock; true on the frame the reveal reaches its end (that frame is still drawn by revealRender) */
    revealAdvance(et) {
      if (!rvOn || rvWait) return false
      if (rvFrozen != null) { rv = rvFrozen; return false }
      const k = Math.min(et, 1 / 20) / CS_REVEAL_S
      rv = rvT > rv ? Math.min(rvT, rv + k) : Math.max(rvT, rv - k)
      return rv === rvT
    },
    /**
     * One frame of the reveal. Returns how opaque the runtime's own DOM (the strip's words) and the canvas element are
     * to be: the blinds thin the strips with the louvers and keep the canvas; the fade takes both together.
     */
    revealRender() {
      const smooth = (t) => t * t * (3 - 2 * t)
      if (rvMode === 'fade') {
        // going up, the canvas fades in over the bench, so it must hold DEPTH first: the closed blinds, drawn once
        // (forward it still holds the frame C2 drew at DEPTH, and is only faded)
        if (rvT === 0 && scene && !broken && !rvFadeDrawn) {
          if (!valid[1]) faceNow(1, 'cross:face (fade)')
          scene.revealAt(0); scene.render(); drawnAt = -1
          rvFadeDrawn = true
          // (the audit reads it now: the canvas holds it only until the browser has taken this frame)
          if (audit) rvClosed = scene.mesh.readCanvas()
          if (GL_DEV && checkGL(gl, 'cross:reveal (fade)').length) breakOff('a WebGL error in the fade')
        }
        const a = 1 - smooth(rv)
        return { ui: a, canvas: a }
      }
      if (GL_DEV) checkGL(gl, 'before cross:reveal (C2 or the page)')
      // the face the blinds carry is DEPTH: kept from C2's frame at rest going forward, drawn by C2 now going back
      if (!valid[1]) faceNow(1, 'cross:face (reveal)')
      const Q = scene.revealAt(rv)
      // (the calibration break `revealleft` leaves a tenth of the dark strips on the canvas when it is handed back)
      if (breakName === 'revealleft') Q.strip = Math.max(Q.strip, 0.12)
      scene.render()
      drawnAt = -1
      // the audit: the closed blinds' last frame, against the frame C2 then draws at DEPTH (capture() compares)
      if (audit && rv === 0 && rvT === 0) rvClosed = scene.mesh.readCanvas()
      if (GL_DEV && checkGL(gl, 'cross:reveal').length) breakOff('a WebGL error in the reveal')
      return { ui: Q.words, canvas: 1 }
    },
    /** the reveal has finished: forward, the place is left for the Lab; back, it rests at DEPTH (the hold ends later) */
    revealEnd() { rvOn = false; rvWait = false; if (rvT === 1) { rvHold = false; x = LAST; p = 1 } },
    /** C2 has the screen again after the blinds closed: the material may move */
    revealRelease() { rvHold = false },
    /**
     * Harness only, at DEPTH at rest: the blinds' first frame against the frame C2 drew there (which face 1 holds), and
     * their last frame — every pixel of it should let the bench through.
     */
    revealIdentity() {
      if (!scene || held !== 1 || p !== 1) return null
      const face = scene.mesh.read(1)
      scene.revealAt(0); scene.render()
      const first = compare(face, scene.mesh.readCanvas())
      scene.revealAt(1); scene.render()
      const last = scene.mesh.readCanvas()
      let lit = 0
      for (let i = 3; i < last.length; i += 4) if (last[i] !== 0) lit++
      drawnAt = -1
      return { first, last: { px: last.length / 4, lit } }
    },
    /** a harness holds the passage at a position, as a gesture would have left it */
    set(i) { x = clamp(Math.round(i), 0, LAST); p = P[x]; turnPending = false; back2work = false },
    /** a harness may switch the louvers off, as the probe would, to check the fallback */
    breakOff: (why) => breakOff(why || 'asked for by a harness'),
  }
  // C2 draws a face directly: the whole face, now (the fallbacks above; never on the normal path)
  function faceNow(side, pass) {
    scene.band(side, 0, 1)
    valid[side] = true
    if (held < 0) held = side
    if (bandsLeft > 0 && side === 1 - held) bandsLeft = 0
    if (GL_DEV) checkGL(gl, pass)
  }
  function breakOff(why) {
    if (broken) return
    broken = true
    p = P[x]
    console.warn(`[cross-section] the louvers are switched off for this visit (${why}); the passage shows its positions as cuts`)
  }
  return api
}
