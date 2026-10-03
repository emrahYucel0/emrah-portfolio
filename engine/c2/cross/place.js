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
import { CS_ORBIT_STEPS, CS_Z0, CS_Z1, bandStops, louverClock } from './slats.js'
import { CS_BAND_K, CS_FREE_K, CS_FREE_RATE } from './input.js'
import { createCross } from './runtime.js'
import { faceState } from './state.js'

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
/** how much travel, in the spine's units (a 100 px wheel notch is 0.11), takes one position */
export const CS_STEP = 0.04
/** the other face is drawn in this many bands, one per frame, while it is still out of sight */
export const CS_BANDS = 3
/** past this point of the louvers' own clock the scene is the dark one: strips, text and the state at rest */
const NIGHT_AT = 0.42

export function createPlace(surface, { reduced = false } = {}) {
  const ZS = bandStops(CS_ORBIT_STEPS)
  // the position each step rests at, in the scene's own progress
  const P = [0, ...ZS.map((z) => CS_Z0 + z * (CS_Z1 - CS_Z0)), 1]
  const LAST = P.length - 1
  const scene = reduced ? null : createCross(surface)
  let front = null, back = null, pass = null, V = null
  let x = 0, p = 0, back2work = false, turnPending = false
  // which face holds the frame the visitor last saw (-1: none yet); the other face's bands still to draw
  let held = -1, bandsLeft = 0, wasMoving = false, drawnAt = -1
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
    get moving() { return !reduced && p !== P[x] },
    /** the louvers are the picture: anywhere between the two flat ends — moving, or held edge-on in the band */
    get louvers() { return !reduced && ((p > 0 && p < 1) || p !== P[x]) },
    /** and a louver frame is due: they moved, or the frame on the canvas is not of where they are */
    get due() { return p !== drawnAt || bandsLeft > 0 },
    /** the physics must stand still while the louvers are the picture, and for the one frame after it, when C2 takes over */
    get holdPhysics() { return !reduced && ((p > 0 && p < 1) || p !== P[x] || wasMoving) },
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
      held = -1; bandsLeft = 0; drawnAt = -1
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
      held = -1; bandsLeft = 0
    },
    passBy(towardsAbove) { x = towardsAbove ? 0 : LAST; p = P[x]; turnPending = false; back2work = false; held = -1 },
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
      wasMoving = !reduced && ((p > 0 && p < 1) || p !== P[x])
      if (turnPending && settled && held === 0) { turnPending = false; x = 1 }
      const t = P[x]
      // the louvers leave an end only from the frame C2 drew there: until it has been copied, they wait a frame
      const atEnd = p === 0 || p === 1
      if (!reduced && atEnd && p !== t && held !== (p === 0 ? 0 : 1)) return null
      if (reduced) p = t
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
      if (!scene) return
      // a movement has just ended on this side: what the louvers were carrying, against what C2 has now drawn
      const landing = audit && wasMoving && p === (side ? 1 : 0)
      const carried = landing ? scene.mesh.read(side) : null
      scene.mesh.capture(side)
      if (landing && carried) landings.push({ side, at: performance.now(), ...compare(carried, scene.mesh.read(side)) })
      held = side
      bandsLeft = CS_BANDS
    },
    /** one louver frame: the other face's next band first (while it is still turned away), then the louvers */
    render() {
      if (!scene) return
      if (bandsLeft > 0 && held >= 0) {
        const k = CS_BANDS - bandsLeft
        scene.band(1 - held, k, CS_BANDS)
        bandsLeft--
      }
      scene.at(p)
      scene.render()
      drawnAt = p
    },
    /** the line and the word, where the scene puts them; hidden whenever the visitor is not on the place */
    domAt(on) { if (scene) { scene.dom.style.visibility = on ? 'visible' : 'hidden'; if (on) scene.domAt(p) } },
    probe: () => ({ x, p, target: P[x], held, bandsLeft, turnPending, back2work, positions: P }),
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
    /** a harness holds the passage at a position, as a gesture would have left it */
    set(i) { x = clamp(Math.round(i), 0, LAST); p = P[x]; turnPending = false; back2work = false },
  }
  return api
}
