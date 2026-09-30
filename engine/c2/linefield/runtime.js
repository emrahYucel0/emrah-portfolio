/*
 * ── LINEFIELD, ON THE SPINE ─────────────────────────────────────────────────────────────────────────────────
 *
 * Everything the runtime needs to carry Linefield as one of its places, behind one object. main.js holds a
 * reference to it and nothing else: the corridor's shader, its map, its sequence, its two fields and its input
 * tuning are all in this folder, and a build with the flag off never imports any of it.
 *
 * THE SHAPE OF THE INTEGRATION. Linefield is a stop with an INNER progress, exactly as the work field is: the
 * spine carries the visitor to it, and once there a gesture drives the passage from the backend half to the
 * frontend half rather than to the next place. At either end the next gesture continues along the spine. That
 * is the work field's rule — the only difference is that the work field's inner axis is sideways and a list,
 * and this one is the direction of travel and continuous.
 */
import { LF_ROW_KEEP, corridorImage, corridorUniforms, vanishingPoint } from './corridor.js'

/** the coarse level, as a power of two: every LF_ROW_KEEP-th row */
const LF_LEVEL = Math.log2(LF_ROW_KEEP)
import { breakName, patchFor } from './breaks.js'
import { BACKEND_WORDS, FRONTEND_WORDS, linefieldState, sequence } from './state.js'
import { LF_KEY_STEP, LF_TOUCH_SPAN, LF_WHEEL_SPAN, createDrive, wheelPixels } from './input.js'

const RUST = [0.722, 0.384, 0.184]   // #b8622f, the site's accent, as the surface wants it
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/**
 * How far past either end of the passage a gesture may push before it is taken as "and now the next place".
 * The work field uses 0.45 of one project for the same purpose; this is the same idea in units of the passage.
 */
export const LF_EXIT_MARGIN = 0.16

/**
 * How tall the corridor's far opening is, as a share of the field's half extent. The reference's spread runs
 * from 3.4 at the near end to 0 at the vanishing point; this is the floor that replaces the 0, so the far end
 * is a short aperture a few per cent of the screen high instead of a singularity.
 */
export const LF_MOUTH = 0.055


/*
 * THE PASSAGE'S OWN CSS TRAVELS WITH ITS CODE.
 *
 * engine/c2/style.css is one stylesheet and it ships in every build, so three rules left in it would have been
 * three rules — and the feature's name — in the published site. They are injected from here instead, which
 * means they exist exactly where the module does and nowhere else.
 *
 * THE COLOUR IS --fg, NOT --ink. --ink is the site's black and never changes; --fg is the token that flips with
 * body[data-tone], which is how every strip on this site stays legible over a dark face. Written as --ink the
 * backend half's name was near-black on black — present, announced, and invisible.
 */
const CSS = `
.lf-place .lf-lab { font: 400 10px/1.3 var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--fg); opacity: 0; transition: opacity .45s ease; }
.lf-place .lf-back { text-align: left; }
.lf-place .lf-front { text-align: right; }
.lf-place .lf-lab.on { opacity: .72; }
@media (prefers-reduced-motion: reduce) { .lf-place .lf-lab { transition: none; } }
`
function injectCSS() {
  if (typeof document === 'undefined' || document.getElementById('lf-css')) return
  const el = document.createElement('style')
  el.id = 'lf-css'
  el.textContent = CSS
  document.head.appendChild(el)
}

export function createLinefield() {
  injectCSS()
  let back = null
  let front = null
  let V = null
  let labels = { back: null, front: null }
  let variantReady = null
  const drive = createDrive(() => LF_TOUCH_SPAN(V ? V.H : 800))
  const broke = breakName()

  return {
    drive,
    keyStep: LF_KEY_STEP,
    exitMargin: LF_EXIT_MARGIN,
    rowKeep: LF_ROW_KEEP,
    get back() { return back },
    get front() { return front },

    /**
     * The corridor's program, linked once and off the main thread where the driver allows it. In reduced motion
     * there is no program to link: the flat renderer draws the two ends and the crossfade between them.
     */
    prepare(surface) {
      variantReady ??= surface.variant?.('corridor', patchFor(broke)) ?? null
      return variantReady
    },

    /** built with the rest of the spine, and rebuilt with it on a resize or a locale change */
    /*
     * THE WORDS ARE THE SAME IN EVERY LANGUAGE, and they are not copy.
     *
     * Nothing this surface paints as material is language-dependent — the name, the two face words and the
     * project captures are the same in every locale, and this is that. The eight live in state.js beside the
     * field they are cut out of; what the locale supplies is the two half names, which are read as language,
     * and a spoken alternative for a reader who gets neither the canvas nor the letters.
     */
    build(v, copy) {
      V = v
      back = linefieldState(v, 0, BACKEND_WORDS, copy.backendLabel)
      front = linefieldState(v, 1, FRONTEND_WORDS, copy.frontendLabel)
      return back
    },

    /** which of the two fields carries the passage at this progress */
    at(p) { return sequence(p, V.W).back ? back : front },

    /**
     * WHAT IS ON SCREEN AT A GIVEN PROGRESS — one field, and at the crossing the other one instead.
     *
     * A crossfade was tried here, to soften the moment the halves swap now that the fan is held shut around it.
     * It cannot be done this way: `front` is not an opacity between two pictures on this surface, it is a
     * SWEEP over the row order — the new state arrives row by row, in reading order. With the field collapsed
     * onto the horizon the two halves landed on either side of it and the screen read as cream above the line
     * and black below, split down the middle. The reference cuts at the crossing, and so does this.
     */
    pair(p) {
      const st = sequence(p, V.W).back ? back : front
      return { from: st, to: st, front: 1 }
    },

    /** where each half's name sits on screen, so the rows can keep out of the band behind it */
    setLabels(l) { labels = l },

    sequence(p) { return sequence(p, V.W) },

    /**
     * Everything a harness needs to judge a frame without guessing any of it: where the corridor's image ends,
     * what "ground only" and "full ink" are exactly, and where each word's band is.
     */
    probe(p) {
      const q = sequence(p, V.W)
      const st = q.back ? back : front
      const [vx, vy] = vanishingPoint(V.W, V.H, q.depth, q.side)
      const [lo, hi] = corridorImage(V.W, q.depth, q.side)
      return {
        seq: q, vx, vy, lo, hi, lineY: V.H * 0.5, broke,
        ground: st.paper.map((c) => Math.round(c * 255)),
        ink: st.ink.map((c) => Math.round(c * 255)),
        words: st.layout.words, bands: st.layout.bands, baseline: st.layout.baseline,
        spacing: st.spacing, cap: st.layout.cap, rowsPerCap: st.layout.rowsPerCap, size: st.layout.size,
      }
    },

    /** a wheel event, already owned by the runtime, in units of the passage */
    wheelStep(e) { return wheelPixels(e) / LF_WHEEL_SPAN },

    /**
     * Everything the corridor's program needs for one frame. Called with the program already bound and every
     * base uniform in place, so it is still one draw.
     */
    apply(surface, p) {
      const q = sequence(p, V.W)
      const st = q.back ? back : front
      const U = corridorUniforms(V.W, V.H, q.depth, q.side)
      surface.vec4('uLFmap', U.map[0], q.spread, U.map[2], U.map[3])
      surface.vec4('uLFmap2', U.map2[0], U.map2[1], U.map2[2], U.map2[3])
      surface.vec4('uLFfade', 0.22, 0.85, 0.12, Math.max(8, V.W * 0.012))
      surface.vec4('uLFflow', q.flow[0], q.flow[1], q.flow[2], q.flow[3])
      surface.vec4('uLFband', st.layout.bands[0], st.layout.bands[1], st.layout.bands[2], st.layout.bands[3])
      surface.vec4('uLFmode', 1, LF_MOUTH, 0, 0)
      const lab = (q.back ? labels.back : labels.front) || { x: -1e5, y: -1e5, w: 0, h: 0 }
      surface.vec4('uLFlabel', lab.x - 10, lab.x + lab.w + 10, lab.y - 6, lab.y + lab.h + 6)
      // the `dense` break sends the field down the corridor at the density the words need, unthinned
      surface.vec2('uLFthin', broke === 'dense' ? LF_LEVEL : q.level, broke === 'dense' ? 0 : q.thin)
      // the reference's line: two pixels on the horizon, edge to edge, its opacity the flash and its colour rust
      surface.vec4('uLFline', V.H * 0.5, 1, q.flash, 0)
      surface.vec3('uLFlineCol', RUST)
    },

    /**
     * REDUCED MOTION DOES NOT TRAVEL THE CORRIDOR.
     *
     * The passage is a two and a half thousand frame movement whose whole content is movement; there is no
     * honest still of the middle of it. So reduced motion is given the two ends — the backend field and the
     * frontend field, both readable, both the real states — and a crossfade between them, which is the same
     * thing every other pair of places on this site does. The corridor's program is not bound at all.
     */
    reducedPair(p) { return { from: back, to: front, front: clamp01(p) } },
  }
}
