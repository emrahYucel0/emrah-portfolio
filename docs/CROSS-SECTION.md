# CROSS SECTION: Work → Lab (R14)

The source of truth for this feature. `docs/reference/cross-section-v2.html` is the approved visual and behavioural
reference (the two-stop version: `ORBIT_STEPS` defaults to 2). This document records the approved architecture, the
phase plan, the approval checkpoints and every decision. **Re-read it after any context compaction.**

- **Branch:** `feature/cross-section`, worktree `emrah-portfolio-cross`, opened from `origin/main` 15da1d5.
- **Flag:** `__CROSS__`, a build-time define from `NUXT_PUBLIC_CROSS`. **Off unless** it is set to `1`, `true`,
  `on` or `yes`. With the flag off the site must behave exactly as today, and the published build must contain no
  Cross Section code.

## What it is (decided before Phase A; R14)

- **It replaces the Work → Lab bridge.** `startBridge` / `finishBridge` in `engine/c2/main.js`: a 2.5 s timeline
  whose last tween ends at about 2.6 s, then `openLab()`, a route push. Cross Section is not added on top of the
  bridge.
- **The field.** It is made of thin slats with SURFACE on their fronts and DEPTH on their backs. Scrolling turns
  them over in a wave.
- **The cross-section moment.**
  - The slats hold edge-on; only their copper edges and a vertical copper line remain.
  - The word `EDGE.` circles the line in stops, one gesture per stop: it arrives behind the line, goes halfway
    beside it, then lands in front. The default is two stops, a named constant.
  - The next gesture turns EDGE edge-on into the line, then the slats carry on to DEPTH.
  - Reverse scrolling runs all of it backwards. There is no orbit ring.
- **The words stay English in both languages:** SURFACE / EDGE. / DEPTH.
- **A hard flick never skips the cross-section moment.** One gesture is one stop, as R12, R24 and R28 have it.
- **Colour.**
  - Copper is used only for the edges and the line, with R2's tokens: mark `#b8622f`, on black `#d4875a`.
  - The SURFACE side sits on cream and the DEPTH side on black.
- **Seams.**
  - Work's last frame → Cross Section → the bench's first frame must be pixel-identical in both directions,
    within the measured breathing floor.
  - Arrival in the Lab is 01 Weight (R7). An upward gesture from the bench returns into Cross Section.
- **Header navigation** can skip the passage.
- **Mobile** is designed from the start.
- **Hints** come only through R3's cue system (`engine/cues.js`).

## Decisions, 2026-10-03 (Phase A approved)

1. **Technique B.** The slats are drawn in C2's own shader, as a variant like Linefield's corridor. The copper line
   and EDGE are a small DOM layer. Phase B starts with the Intel performance measurement (`csperf` on the user's
   machine) before any polish. If it fails, switch to C (a canvas-2D slat renderer) and tell the user.
2. **Reduced motion keeps cuts,** like the rest of the site. No crossfade is added to `flat.js`.
   - Found in Phase A: `flat.js` draws one slot (`front < 0.5 ? slots[0] : slots[1]`), so every `front` tween in
     reduced motion is a cut at its midpoint, Linefield included.
   - `docs/LINEFIELD.md` has been corrected.
3. **Tempo.** Work → bench takes **about 5 gestures** in total: a short turn and carry, plus the band's stops. The
   exact spans are set on the device in Phase B and recorded against R15.
4. **Atmosphere.** Phase B shows two versions side by side: with and without the demo's warm glow at the
   cross-section moment. The user chooses.
5. **DEPTH → bench.**
   - **Phase C target:** the blinds open onto the live bench, through a transitional `'cs'` screen-ownership state.
   - **Fallback,** if that proves fragile on the iPhone or in the full gate: switch the route while DEPTH is opaque,
     then fade the canvas out over the bench.
   - **No hard cut in either case.**
6. **EDGE keeps its full stop:** `EDGE.`

## Decisions, 2026-10-03 (Phase B reviewed and approved as it is)

1. **The glow is ON.** The reference's warm atmosphere behind the louvers at the crossing, its warm light sweep and
   the EDGE word's halo all stay. It is the named constant `CS_GLOW` in `runtime.js`; `?csatmo=0` remains only for
   comparison.
2. **The edges' copper stays on R2's tokens as built:** from the mark (#b8622f) up to its night form (#d4875a), not
   the reference's peach crest.
3. **The words stay made of the site's rows,** not the reference's solid letters with rules over them.
4. **The tempo stays as measured:** 5 gestures from Work to the bench. The gesture that leaves Work turns the
   louvers straight to the band, then come the stops (beside, in front), then the release-and-carry, and **DEPTH is
   the rest point before the bench**. SURFACE is not a rest point of its own.

## Phase A: what was found (read-only, at 15da1d5)

- **Today's Work → bench handover is under one frame, but not pixel-identical.**
  1. The bridge ends on `labState`.
  2. `openLab()` pushes the route.
  3. The layout drops `<C2Surface>` and `data-c2` is deleted, which hides the canvas.
  4. The bench paints its own first frame synchronously, inside `onMounted` (R7).
- **There is no reverse bridge.** At 01 the bench's upward gesture runs `leave('work')`, a route push, and then
  `arriveAt('work')`, which jumps to the last work assembled from its pieces.
- **Header jumps do not skip Linefield today.** Travel damps through `IDX[linefield]`, drawn flat at its near end
  with no words. Cross Section must do better than that: no SURFACE flash, no EDGE DOM.
- **The base shader.**
  - It already composites with alpha (`outColor.a`). This is what makes the "blinds open onto the live bench"
    reveal possible: the gaps between turning slats can be transparent.
  - It has `VARIANT_PARS / WARP / HW / FUSE / ROW / COMPOSITE` hooks.
  - It has **no per-pixel choice of slot** (front or back state). A slat is two-sided, so a new hook is needed:
    `VARIANT_SIDE`, defaulting to a no-op.
- **The bench's first frame is deterministic.**
  - The ground is cream `#efeee9`.
  - It has five equal WEIGHT columns of `fillRect` rows in `#121212`, at pitch 7 (5.2 in portrait).
  - It has the rail and the register, and its records, strip and foot are DOM.
  - It breathes from mount (`stepWeight`).
- **Harnesses that wait on the bridge itself:** `spinetime.cjs` and `proof1.cjs` wait for `A.mode === 'bridge'`.
  `labflash` A, `journey`, `touchjourney` and `spine` cross it. With the flag off they must pass unchanged.
- **Measured cost so far is CPU submission, not GPU time.** Linefield's frame times (0.2–4.4 ms) are
  `performance.now()` around `surface.render()` with no `finish` or readback. The site-wide Intel UHD figures in
  M1/M2 (about 54–111 fps by place, ±20% run to run) are the only GPU-bound numbers on record.

## Architecture (approved target)

- **Slats in the shader.**
  - Per pixel, the variant finds which slat is here among up to three candidates, because the demo's per-slat
    scale and depth wobble overlaps neighbours.
  - It un-rotates the pixel into that slat's face, the front or the back by the sign of `cos θ`, and hands the
    material coordinate and its **exact gradient** to C2's row machinery.
  - Foreshortened rows therefore fuse and LOD from the analytic gradient, not from resampling.
  - At rotation 0 the map is the identity, so Work → flat SURFACE is an ordinary C2 transition with no handover.
- **Copper edges** are drawn in `VARIANT_COMPOSITE`.
- **The copper line and EDGE are DOM.** EDGE is a solid glowing word, not material. "Behind the line / in front" is
  its z-order against the line only, as in the demo.
- **On the spine (Phase C),** with the flag on, a place `'cross'` sits between `'work'` and `'lab'`. Its inner
  progress has three parts:
  1. **The turn,** continuous. It ends at a **wall**: a flick's momentum stops there, and the gesture is spent.
  2. **The band:** discrete stops, each taken only by a new gesture as `opensGesture` defines it.
  3. **The carry,** continuous on to DEPTH.
- **The far end.** A gesture past DEPTH starts the reveal:
  - The route switch happens under opaque DEPTH.
  - The runtime holds the `'cs'` ownership state over the mounted bench, and the slats turn on to edge-on.
  - The edges at this second edge-on are ink, not copper. They fade, and the canvas ends fully transparent.
- **The reverse runs the same path closed.**

## Phase plan and checkpoints

| Phase | Content | Checkpoint |
|---|---|---|
| A | Read-only plan | **Approved 2026-10-03** |
| B | The scene in new files behind `?cross=1` (dev only). Performance decision first, then the look against the demo on a side-by-side page at 1440×900, 390×844, 390×660 and 375×560, with recordings and a LAN preview for the iPhone. **No spine integration.** | **STOP for review** |
| C | Integration: spine, input, both seams with the reveal, reverse, header skip, reduced motion, phones (including landscape), harnesses, full flag-off gate | STOP for seam approval, then for integration approval |

### Phase B steps

1. **Scaffolding.**
   - `nuxt.config.ts`: `__CROSS__`.
   - `surface.js`: `VARIANTS_ON = __LINEFIELD__ || __CROSS__`, plus the `VARIANT_SIDE` hook.
   - `useC2Engine.ts`: a dev-only debug mount, claimed once.
   - New files in `engine/c2/cross/`: `slats.js`, `state.js`, `runtime.js`, `debug.js`, `breaks.js`.
2. **Performance first.**
   - Build a minimal but complete slat pass: the wave timeline ported from the demo's `render()`, two-sided faces,
     copper edges and the three-candidate search.
   - `tools/diag/csperf.cjs` measures it: GPU time where `EXT_disjoint_timer_query_webgl2` exists, otherwise
     sustained fps and p95 frame time over a full sweep and at the EDGE frames. The base Work field is the control.
   - **Pass:** p95 ≤ 16.7 ms and under 1% of frames over 33 ms, at 1440×900 and 1920×1080 on this machine's GPU.
     A fail is reported before anything else.
3. **Look.**
   - The EDGE and line DOM layer with its stops.
   - The atmosphere switch, `?csatmo=0|1`.
   - The side-by-side page, `tools/diag/compare/cs-compare.html`, and its driver.
   - The debug dock: slider, play, stops, and a demo-like local input to feel the spans.
   - Recordings go to `tools/diag/out/cross/`.
4. **Checks.**
   - `csperf` and `cslook`.
   - A spatial high-frequency measure, calibrated on a `?csbreak=` build.
   - `npx nuxt typecheck`.
   - A flag-off build: grep for 0 markers, and `nonlabred` against the baseline.
   - The full flag-off `run6.sh` gate, asking first if it is expected to take longer than 30 minutes.
5. **LAN preview:** `nuxt dev --host` with the flag on, on this worktree's own port.

## Phase B: the performance decision (2026-10-03)

### Technique B was built and measured, and it fails

- **What was built.** The louvers were drawn in C2's own fragment shader, as the variant `slats`, in
  `engine/c2/cross/slats.js`.
  - The CPU mirrors the demo's CSS-3D transforms exactly. The browser's own bounding rects of the demo's faces
    match the model to within about 2 px at 50%.
  - Per pixel, the shader casts the eye's ray into the four louvers a lookup names, meets the nearest visible face
    or edge, and hands C2's row machinery the material coordinate with its exact gradient.
  - The look tracks the demo through the whole sweep: `tools/diag/out/cross/sheet-*.png`, made by `csshot.cjs`,
    `csdemo.cjs` and `cssheet.cjs`.
- **How it was measured.** `tools/diag/csperf.cjs` against the dev server, headless Chrome.
  - **The GPU really used:** ANGLE on the **Intel UHD Graphics (D3D11)**. The machine also has an RTX 4050; the
    harness prints the renderer so that a number from the wrong GPU cannot decide anything.
  - **The measure that decides:** `EXT_disjoint_timer_query_webgl2`, the GPU's own time for the draw, median per
    frame.
  - **The control:** the same state drawn through the base program, an ordinary place on this site.

| size (backing) | control | slats, first build | slats, optimised¹ |
|---|---|---|---|
| 1440×900@2 (2160×1350) | 16.0 ms | 43.1 ms | **31.7 ms** |
| 1920×1080@1 (1920×1080) | 11.4 ms | 30.8 ms | **22.9 ms** |
| 1920×1080@1.5 (2880×1620) | 25.5 ms | 68.9 ms | **51.1 ms** |
| 390×844@3 (683×1477) | 5.6 ms | 14.9 ms | 11.1 ms |
| 390×660@3 (683×1155) | 4.4 ms | 11.8 ms | 8.7 ms |

¹ **What the optimisation did.** Both sides were packed into one double-height state, so the row machinery is asked
once per pixel instead of twice, and a pixel that no face covers asks it nothing. The base program's text was
untouched; its names are redirected by the variant.

- **The verdict: FAIL.** The pass criterion was p95 ≤ 16.7 ms and under 1% of frames over 33 ms, at 1440×900 and
  1920×1080. Even optimised, the slat pass costs about **twice** the control.
- **The control already misses 60 fps here at 1440×900@2.** No per-pixel addition to C2's shader can meet the
  criterion on this GPU.
- **Not trusted:** the `raf` and `sync` rows of the same runs. Other sessions were running on the machine and the
  control itself moved by up to 70% between runs. The GPU timer is the one that does not move with that.
- **Decision 1 applies: switch to C, and the user is told.**

### Technique C, as built

Phase A described C as "canvas-2D slat renderer (strips of C2 snapshots)". The idea is kept, but the strips are
drawn with WebGL, in the same context as C2.

- **The faces.** C2 renders the flat SURFACE and DEPTH states, with its own shader, rows and anti-aliasing, into
  two textures (mipmapped).
- **The louvers.** Each louver is a box of quads in perspective, sampling those textures, with a depth buffer for
  occlusion.
- **Why WebGL and not canvas-2D:** canvas-2D cannot draw perspective (only affine), and its downscaling has no
  mipmaps, which is the shimmer risk.
- **The edges are geometry now**, so the scene is drawn with 4× multisampling; C2's own canvas has none.
- **The louvers follow C2's row grid.** C2 puts its rows at `r·s + 0.31 px` (the neutral physics displacement).
  The row spacing is chosen so that every louver starts half a row off that grid, which puts each louver's three
  rows in its middle. The leftover height is one shorter louver at the bottom. Spacing comes out at 6.625 px on
  desktop and 6.72 px on a phone; the reference uses 7.02 and 6.63.

### Phase B: measured, on technique C

**Performance.** `csperf.cjs`, Intel UHD, GPU timer query, median per frame:

| size (backing) | C | control (an ordinary place) | keeping up (rAF) |
|---|---|---|---|
| 1440×900@2 (2160×1350) | **10.5 ms** | 15.9 ms | PASS |
| 1920×1080@1 | **7.9 ms** | 11.4 ms | PASS |
| 1920×1080@1.5 (2880×1620) | 17.2 ms | 25.6 ms | FAIL: 20.8 ms p95, against 27.8 for the control |
| 390×844@3 (683×1477) | **3.6 ms** | 5.6 ms | PASS |
| 390×660@3 | **2.8 ms** | 4.4 ms | PASS |

C costs less than an ordinary place on this site. The one size that misses 60 fps is the one where the site
itself misses it by more. That is the backing store's size (R20), not the louvers.

**At rest the louvers are C2's own picture** (`__cs.restCheck`). This is the property the Work seam in Phase C
stands on.

- **Front side:**
  - 1440×900@2: **0 pixels differ.**
  - 390×844@3: 95 pixels differ, at most 1 level of 255.
  - 1920×1080@1: 3,637 pixels differ, at most 1 level.
- **Back side, inside the scene:** 0 pixels at 1440, 43 on the phone, and one pixel row at 1920@1, each at most
  4 levels.
- **Back side, the strips:** they differ by up to 4 levels. The ground there is the reference's night (#0e0f11),
  while the DEPTH state's paper is #111215. In Phase C the strips belong to the runtime; the colour has to be
  chosen there.

**Tempo and the band** (`cstempo.cjs`, wheel streams dispatched in-page on a fixed clock, the step tempo):

- **The passage takes 4 gestures each way** (turn, beside, in front, release and carry), for one mouse notch, a
  60 Hz swipe and a hard 120 Hz flick alike. With the leave to the bench, Work → bench is **5**, which is the
  R14 target.
- **One flick from rest never skips the band.** From SURFACE it stops at the band's first stop (EDGE behind the
  line): 0 frames out of 416 got past it. From DEPTH it stops at the last stop: 0 out of 444.
- **Inside the band, one gesture of any shape moves exactly one stop.**
- **This is the debug entry's pacer.** Phase C replaces its gesture detection with the site's `opensGesture`.

**Shimmer: NOT MEASURED.** Two measures were tried, and both were calibrated against `?csbreak=nomip` (no mipmaps
and no anisotropic filtering). Neither discriminated, so no claim is made:

- **Mean |Laplacian| over the scene:** broken/real 1.06–1.07. The louvers' outlines and the letters dominate it.
- **Error against a 4× supersampled ground truth on a crop:** broken/real 1.01–1.18. At the progresses where the
  faces are steep, the truth itself differs structurally, because C2's row anti-aliasing depends on the dpr.

As with Linefield, whether it shimmers is judged on the device.

**Look against the reference.** `cs-compare.html` and `cspair.cjs` produce stills at 1440×900, 390×844, 390×660
and 375×560, plus films (`tools/diag/out/cross/film/`). The two runs move together through the whole sweep. The
differences, all deliberate and all for review:

| | reference | ours |
|---|---|---|
| the words | solid letters with fine rules over them | made of the rows, as everywhere on this site |
| the edges' crest | peach (#ffd0a1) | R2's copper, from #b8622f up to #d4875a |
| at rest | louvers 1.06× wide; faces 2.25 px in front of the plane | exactly flat, so that rest is C2's own frame |

**Atmosphere, two versions** (`cs-compare.html?view=glow`, and `?csatmo=0|1` on the entry).

- **Glow on:** the reference's warm radial air behind the louvers and its warm light sweep across them, and the
  EDGE word's warm halo.
- **Glow off:** none of the warm air, a neutral light sweep, and no halo on the word.
- **Either way,** the copper line keeps its own copper glow.

**WebKit (Playwright, not a device)** renders every size without errors. It draws SURFACE, EDGE and DEPTH in a
thin cut rather than 900. That is the same behaviour as the hero name (R10, never confirmed on real Safari), and
the iPhone settles it.

**Phone landscape (844×390)** gives 25 louvers with rows 3.97 px apart, too fine to carry the words well. It
needs its own rule in Phase C, as planned.

**Flag off.** The release build (`npm run generate`, `NUXT_PUBLIC_CROSS` unset) was compared with the live
package `deploy/yucelemrah-1e663bd.zip`, SHA-256 `cd150812ff38b68d…`, as recorded in the deploy log.
`origin/main` differs from `1e663bd` only in docs.

- **Every JavaScript chunk is byte-identical.**
- **No file differs** once Nuxt's per-build ID and its prerender timestamp are normalised (0 of 218).
- **Zero occurrences** of any Cross Section marker. The one hit for `__cs` is Vue's `__cssModules`.
- **What was therefore not run, and why.** `nonlabred` and the full `run6` gate were not run: the flag-off output
  is the live site's code. `engine/c2/surface.js` is back to `origin/main`, and the only touched shared files are
  `nuxt.config.ts` (the define) and `useC2Engine.ts` (the dev-only mount behind `__CROSS__ && import.meta.dev`).
- **`npx nuxt typecheck`:** clean.

**The LAN preview.** `NUXT_PUBLIC_CROSS=1 npx nuxt dev --port 4960 --host 0.0.0.0`, opened at
`http://192.168.1.5:4960/tr?cross=1` (add `&csatmo=0` for the version without the glow).

**Harnesses added (Phase B), all writing under `tools/diag/out/cross/`:**

| harness | what it does |
|---|---|
| `csshot.cjs` | stills; `--engine=webkit` |
| `csdemo.cjs` | the reference's stills |
| `cssheet.cjs` | contact sheets |
| `csperf.cjs` | cost |
| `cspair.cjs` with `compare/cs-compare.html` | side by side, and films |
| `cstempo.cjs` | tempo and the band |
| `csshimmer.cjs` | the shimmer attempt, kept so it is not repeated |

## Phase C: approved 2026-10-03, with the proposed defaults

- **The dark end's ground is `#111215`**, the DEPTH paper, not the reference's `#0e0f11`. DEPTH at rest and DEPTH
  in motion therefore stand on one ground; the 4-level strip mismatch is gone.
- **The phone landscape rule** is as proposed: below 520 px of height, rows no finer than the site's phone pitch
  of 5.2 px (about 18 louvers at 844×390), with words and EDGE sized from the height. It lands in C4.
- **Order:** C1 + C2, then STOP for the Work seam. Ask before the full gate. While Phase C runs, no other session
  touches `engine/c2`.
- **Open:** the user's iPhone result for the thin words was not given (the note still had the template's
  "[heavy / thin]"). That decides whether R10's font loading is fixed in this phase or closed as a Playwright
  artefact.

### C1: the place on the spine (built)

- **The spine.** With the flag on it is
  `name · creative · system · linefield · work · cross · lab · rest`.
  - It is written as its own pair of literals, so each flag-off branch folds to exactly the list it always was.
  - The place is named once: `CXS = CROSS ? STOP.cross : -1`.
  - The place-keyed tables (`PLACE`, `HEADING_OF`, `NAME_OF`) gain a `cross` entry behind the flag.
  - The navigation-target list at `main.js:1591` is not touched: no header control targets the passage.
- **`engine/c2/cross/place.js`** is the place. `main.js` hands it input, the clock and the frame. Its positions:

  | position | what is on screen |
  |---|---|
  | 0 | SURFACE (passed through) |
  | 1 | EDGE behind the line |
  | 2 | EDGE beside it |
  | 3 | EDGE in front |
  | 4 | DEPTH (rest) |

  - **One gesture moves one position.** The site's own rule (`opensGesture`) decides what a gesture is. A gesture
    is spent once it has travelled `CS_STEP` (0.04 of a stop: about 36 px of wheel, or 2% of the height under a
    finger).
  - **Keys** are gestures: one position each.
- **Ways in and out:**
  - The work field's far end, and a finger swipe off it, enter the place instead of starting the bridge.
  - The same gesture plays the turn to position 1, as soon as C2's frame of SURFACE has been kept.
  - From position 1, the gesture back turns the louvers flat and carries on into Work's last work.
  - From DEPTH, the gesture forward travels to the Lab stop and opens the bench. This is an interim: C3 replaces
    it with the reveal.
- **Header jumps.** `go(STOP.lab)` from Work no longer starts the bridge; it travels. A jump crosses the place as
  scenery: a wordless state (`cross-pass`), no louvers, no EDGE.
- **The DOM.** A heading layer `cs-place`, in English with `lang="en"`, plus a localised screen-reader line in
  `TXT.cross` (behind the flag). The copper line and EDGE live in the runtime's `#ui`, `aria-hidden`.

### C2: the Work seam (built)

**It is built, not tuned.**

- **At either end, C2 draws the place itself.** The louvers are drawn as geometry only for progress strictly
  between the ends, whether moving or held in the band.
- **Every C2 frame of the place at rest is copied** off the canvas (`copyTexSubImage2D`, before the browser takes
  the buffer). The louvers' first frame therefore starts from exactly that picture.
- **The other face** is drawn by C2 into its texture in three bands across the first frames of the movement, while
  it is still turned away. No frame pays for a whole extra C2 render.
- **The material's physics is held still** while the louvers are the picture, and for one frame after. When C2 takes
  the far end back, the frame it draws is the one the louvers carried.
- **Pixel mapping.** The louvers use C2's own dpr (CSS px × 1.75, not the rounded backing ratio) and span the
  backing store's whole extent, so a 390-wide phone at 1.75 (682.5 px, stored as 683) is covered to its last column.
- **Leaving an end:** the louvers leave only once that end's own frame has been kept.

**Measured** (`tools/diag/csseam.cjs` against the dev server, controls first; Chrome and WebKit):

| | 1440×900@2 | 390×844@3 | 390×660@3 | 375×560@3 |
|---|---|---|---|---|
| controls: still Work, still DEPTH | 0 px | 0 px | 0 px | 0 px |
| identity, louvers at the end vs C2's frame (SURFACE / DEPTH) | **0 / 0** | 380 / 22 px, ≤1 level | 683 / 683 px, ≤1 level | 656 / 656 px, ≤1 level |
| landing, carried face vs C2's frame (DEPTH / SURFACE) | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** |
| screencast: the first louver frame, the landing on DEPTH | **0 / 0 px** | **0 / 0** | **0 / 0** | **0 / 0** |
| the C2 travel Work → SURFACE, worst step / control travel into Work | 147k / 244k px | 57k / 75k | 46k / 67k | 24k / 42k |
| blank frames, page errors | 0, 0 | 0, 0 | 0, 0 | 0, 0 |

How to read it:
- **Identity** is the louvers drawn at an end against the frame they were copied from.
- **The ≤1-level pixels** on phones are well under the 8 levels that count as "changed". They never reach the
  screen: at rest C2 draws the place, and the louvers draw only once they have moved.
- **WebKit** (Playwright): identity is at most 1 level, every landing is 0, and there are no errors.
- **The travel into SURFACE** is the site's own travel between places. Its steps stay below those of an ordinary
  travel into Work at every size.

**The place's rules** (`tools/diag/cross.cjs`, Chrome and WebKit): all PASS.
- One gesture off Work's last work lands on position 1, for a notch, a 60 Hz swipe and a hard 120 Hz flick; the
  flick's tail never passes position 1.
- Inside the band, one gesture of any shape is one position.
- A flick from in front carries to DEPTH and rests there.
- A flick back from DEPTH is one position, and four back return to Work's last work.
- Keys move one position each.
- On a 390×844 touch phone, a slow swipe and a long fast one each move one position.
- The strip's LAB from Work crosses the place as scenery (0 louver frames, 0 EDGE frames) and opens the bench.

**Films** (`tools/diag/csfilm.cjs`, `tools/diag/out/cross/film/path-*.webm`): Work's last work → the band → DEPTH
and back, at 1440×900, 390×844 and 375×560.

**Flag off.** `npm run generate` with the flag unset was compared with the live `1e663bd` package.
- **Every JavaScript chunk is byte-identical.**
- **No file differs** beyond Nuxt's build ID and prerender timestamp (0 of 218).
- **0 Cross Section markers.** The state fields are declared only where the flag is on, so not even their names
  ship.
- **`npx nuxt typecheck`:** clean.
- **Not run yet: the full flag-off gate.** It is asked for before running, as agreed.

**Still to come in Phase C:**
- **C3:** the DEPTH → bench reveal, and the bench's upward gesture into DEPTH.
- **C4:** reduced motion as cuts with the EDGE still, the landscape rule, and R10 by the iPhone's answer.
- **C5:** the remaining harness updates and the full gate.

### C2 not approved: the scene was not drawn on the user's machine (2026-10-03)

**Reported.** On desktop Chrome on Windows, Intel GPU:
- the logic advanced (five gestures, then the Lab), but nothing turned;
- the band stayed flat SURFACE, and DEPTH at rest was an empty cream field;
- the console filled with `WebGL: INVALID_OPERATION: uniform3f: location is not from the associated program`
  (`surface.js:583`, from `main.js`'s frame).

**Found.**
1. **The GL state leak, reproduced exactly** in headed Chrome on this machine: 260 messages, until Chrome stops
   reporting.
   - The louver pass left its own program bound.
   - On the next frame C2's `phys()` writes `uGrid` without binding first, and the write was refused. This is the
     same class of fault Linefield met in `surface.use()`.
2. **A wait with no end.** The louvers leave an end only once C2's frame of that end has been kept.
   - That copy was conditional on the place being "the end of the visitor's leg".
   - If it was never kept, the louvers stayed parked at the end while the gestures went on counting.
   - The screen then showed the wordless scenery state: an empty cream field.

   This matches every symptom reported. The empty picture itself was **not reproduced** here: on this machine,
   headed and headless, the louvers drew despite the warnings. The wait has been removed regardless (below).
3. **A bug in the debug scene's pacer, older than this.** It reset its clock at the END of a tick while a frame's
   timestamp is its START.
   - A slow tick then gave a negative `dt`, and the band's easing swung about a stop instead of settling.
   - The extra state saving made the swing large enough to keep `cstempo.cjs` waiting until it was killed.
   - The runtime's own clock already clamps at 0; only the debug pacer was affected.

**Fixed.**
- **`engine/c2/cross/glstate.js`: every pass saves and restores the state C2 relies on:**
  - program, vertex array and array buffer;
  - draw and read framebuffers, renderbuffer, viewport and scissor;
  - blend, depth, cull and stencil switches, blend functions and equations;
  - depth function and mask, colour mask, clear values;
  - pixel-store settings;
  - the active unit and the 2D binding of units 0–8.

  This covers the louver pass, the copy of C2's frame, each band, the debug faces, the harness readbacks, and even
  creating the mesh.
- **The louver frame reaches the canvas by an ordinary draw.** The samples are resolved into a texture, and a copy
  pass draws it; there is no blit to the default framebuffer, whose format the browser chooses.
- **Nothing waits for ever.**
  - On the place, it is the visitor's leg by definition: the state, the DOM and the copy no longer depend on how the
    visitor arrived.
  - A face that has not been kept within 2 frames is drawn by C2 directly.
  - A face lost to a resize is redrawn before it is shown.
- **In development** every pass is followed by `gl.getError()`.
  - The first error of each pass is reported by NAME and PASS in the console and in a red banner, and every error is
    kept on `window.__csGLErrors`.
  - Errors already pending when a pass begins are reported as "before" it, so a leak elsewhere is still named.
- **In production** the first louver frame is checked once. On any error the louvers are switched off for the visit,
  and the place shows its positions as cuts, never a frozen picture.
- **The debug pacer** re-arms on frame timestamps and never takes a negative step of time.

**Why the harnesses did not see it, and what changed** (`tools/diag/consolewatch.cjs`):
- **`cross.cjs` and `csseam.cjs` listened only for page errors.** A WebGL error is never a page error: Chrome reports
  it as a console warning, and the page carries on.
- **The harnesses that did listen to the console** (`csshot`, `csperf`, `cspair`) ran the Phase B debug entry. It has
  a context of its own with no C2 runtime in it, so the leak (louver pass, then `phys()`) could not happen there.
- **Chrome stops reporting** after 32 WebGL errors per context, so a harness that listens late hears nothing.
- **Not the cause:** the headless GPU backend. Headless used the same Intel D3D11 adapter and showed the same warnings.
  Nobody was listening for them.
- **Every Cross Section harness now attaches the watcher before navigating, and fails on:**
  - any console error;
  - any console warning or error naming WebGL or a GL error;
  - any page error;
  - any record of the runtime's own GL check.
- **Calibrated.** `--q=csbreak=leakgl` reintroduces the leak, and `cross.cjs` then FAILS on exactly the reported
  warning; the dev check names "before cross:louvers" and "c2:render on the place".

**After the fix:**
- **`cross.cjs`:** PASS in Chrome and WebKit, including the new sections:
  - RESIZE: a resize in the band, and both faces are back;
  - FALLBACK: louvers switched off, and the positions are shown as cuts;
  - console clean.
- **The stall path:** `?csbreak=nocapture` never keeps C2's frame, and the louvers still turn and draw (101 louver
  frames).
- **`csseam.cjs`:** PASS at 1440×900@2, 390×844@3 and 375×560@3 (Chrome), and at 1440×900@2 and 390×660@3 (WebKit).
  - Identity at the ends: 0 px at 1440×900, at most 1 level on phones.
  - Every landing: 0 px.
  - Console clean.
- **`cstempo.cjs`:** PASS. **`csshot.cjs`:** console clean.
- **Cost on the Intel UHD (GPU timer):** the resolve-and-copy pass adds about 1–2 ms, and the louvers stay below an
  ordinary place.

  | size | louvers | ordinary place |
  |---|---|---|
  | 1440×900@2 | 12.2 ms | 16.0 ms |
  | 1920×1080@1 | 8.5 ms | 11.4 ms |
  | 390×844 | 4.1 ms | 5.6 ms |

  The rAF rows were NOT trustworthy in this run: the machine was in use, and the control itself missed its own
  earlier figures.
- **Headed recording at the user's configuration** (`tools/diag/csheaded.cjs`): installed Chrome 154, headed,
  maximised, no emulation, 1920×991 at dpr 1, Intel UHD on D3D11.
  - The path drew every position: 1,168 louver frames, DEPTH black at rest, back to Work.
  - Console clean.
  - The recording is Chrome's screencast of that window (`tools/diag/out/cross/film/headed-1920x991.webm`), not a
    desktop capture.
- **Flag off:** still byte-identical JavaScript to the live `1e663bd` package (0 of 218 files differ beyond the build
  ID and timestamp). Typecheck clean.

**Still owed:** the user's own machine is the test the harnesses missed. C3 waits until the scene draws there.

### C2 approved (2026-10-04)

On the user's desktop, after a hard reload, the scene draws all the way through: the slats, the copper edges, the line,
EDGE and black DEPTH, with a clean console. **The Work seam is approved.**
- The user's `devicePixelRatio` is 1 on that machine at the moment. They had read 2 earlier, probably on another
  display or at another scaling setting. This is recorded under R9 in `KNOWN-ISSUES.md`, and the Cross Section checks
  now run at both DPR 1 and 2.
- **Seen by the user:** going up from the Lab jumped straight to Work and skipped Cross Section. As expected, the
  bench's upward gesture was still today's `leave('work')`; the reverse entry was planned for C3. C3 must make the way
  back the same five gestures as the way forward, and a harness must check that going up from the Lab never skips
  Cross Section with the flag on.
- **Standing rule:** never take a desktop-level screenshot or capture. Use only the browser's own capture of the test
  window.

### C3: the DEPTH ⇄ bench seam (built)

**What the visitor sees.**
- **Forward.** At DEPTH, one more gesture opens the blinds onto the bench. The louvers carry on turning from 180° to
  270°, edge-on again, in the same wave as the crossing, with no lift or swing. The bench shows between them, and at the
  end nothing of the canvas is left. The bench opens on 01.
- **Back.** On the bench at 01, the upward gesture closes the blinds over the bench into DEPTH. The visitor stands at
  DEPTH, and four more gestures go back through EDGE in front, beside and behind, to Work's last work. **Five gestures
  each way.**
- **The edges** at this second edge-on are ink, not copper: copper belongs to the crossing.
- **The strips change hands one layer at a time.** A first version crossfaded them, and the runtime's light strip
  words and the bench's dark ones showed together, doubled, on a grey band. Now the runtime's words go first, while its
  dark paper still covers the bench's strip; then the paper thins and the bench's own strip is simply there.

**How (the `'cs'` ownership state).**
- `data-c2` has a third value. `'on'` is the runtime's screen; no value is the host's; **`'cs'`** is both. The page
  the host has mounted underneath is shown, and the canvas and the runtime's strip lie on top of it, take no pointer,
  and nothing scrolls. The CSS is injected by `cross/runtime.js`, so it ships only with the flag.
- **Forward** (`csToBench`, `main.js`):
  1. The gesture past DEPTH sets `'cs'` and pushes the Lab route at once, under opaque DEPTH.
  2. `setActive(false)` leaves `'cs'` alone.
  3. The bench mounts underneath and paints its first frame there.
  4. The blinds wait for it (`#__nuxt .lab-stage`, at most 3 s), then open.
  5. On their last frame the canvas is empty. The runtime moves quietly to the Lab stop, with nothing announced over
     the bench, and drops `'cs'`.
- **Back** (`__c2Rise` in `useC2Engine`, `__c2Cross.rise` in `main.js`):
  1. `useLabSpine` at 01 asks for the rise. LabChrome's WORK link is a header jump and still skips the passage.
  2. The runtime is loaded and prepared if it is not already, within 1.2 s (`RISE_WAIT`).
  3. It arrives at DEPTH, takes `'cs'` with the blinds open (an empty canvas), and closes them.
  4. Once DEPTH is opaque, the host pushes `/` under it. The canvas is **held**, drawn and cleared by nothing, until
     the host hands the screen back.
  5. C2 then draws DEPTH itself: the frame the closed blinds showed.
- **The fallback is ready** (R14 decision 5). `CS_REVEAL = 'fade'` in `place.js` (`?csreveal=fade` in development)
  still switches the route under opaque DEPTH, then fades the canvas and the runtime's strip over the bench, or in over
  it going back. It is also what a context whose louvers were switched off uses.
- **A runtime that is not ready in time** (a cold landing on the Lab, a slow link): the route changes at once and the
  runtime arrives at DEPTH from the history entry, as a cut. Cross Section is never skipped.
- **Gesture tails.**
  - **Forward:** while `'cs'` holds the screen, the bench absorbs the stream as a spent gesture. A trackpad's tail
    cannot also move a study.
  - **Back:** at the hand-over the runtime is hushed only if input is still arriving (the last event under 140 ms
    ago: `hushTail`'s rule).
  - The first version hushed for a fixed 420 ms. In WebKit it ate a deliberate gesture made right after DEPTH
    appeared, so the way up took six.
- **Reduced motion** keeps its cuts (decision 2). Forward, the bench opens as before; back, the runtime arrives at
  DEPTH. C4 covers the rest.
- **Flag off.** Every addition sits behind `CROSS`/`__CROSS__`, plus three development-only harness hooks
  (`__benchStill`, `__csBreak`, `csrise=route`) behind `import.meta.dev`.

**Measured** (dev server, flag on; every harness fails on any console error or WebGL warning):

`tools/diag/csbenchseam.cjs`, controls first. The bench breathes (WEIGHT's rules move every frame), and its floor
wandered between about 7,700 and 8,900 px from run to run, too coarse to decide anything. So by default the harness
holds it still (`__benchStill`, development only), and every boundary must then be exactly nothing. The strips are
also measured finely, more than 2 levels inside the parts both pages keep still, because a film left over the bench
moves its pixels by less than the 8 levels that count as changed.

| Chrome | 1440×900@2 | 1440×900@1 | 1920×991@1 | 1920×1080@2 | 390×844@3 | 390×660@3 | 375×560@3 | 844×390@3 |
|---|---|---|---|---|---|---|---|---|
| controls: still DEPTH / still bench / its strips | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| identity: the blinds' first frame vs C2's DEPTH | **0** | **0** | ≤1 level | ≤1 level | ≤1 level | ≤1 level | ≤1 level | **0** |
| the blinds' last frame: px not fully transparent | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |
| landing up: closed blinds vs C2's DEPTH | **0** | **0** | ≤1 level | ≤1 level | ≤1 level | ≤1 level | ≤1 level | **0** |
| under DEPTH while the route changes (frames, worst px) | 16, **0** | 10, **0** | 12, **0** | 17, **0** | 13, **0** | 14, **0** | 14, **0** | 13, **0** |
| the release onto the bench (whole / strips) | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** |
| the runtime takes the screen over the bench | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** |
| the hand-over to C2's own DEPTH | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

- **WebKit** (1440×900@2, 1440×900@1, 390×660@3, 375×560@3): identity and the landing are at most 1 level (0 at
  375×560), the blinds' last frame is 0, and the path DEPTH → bench → DEPTH works. The screen-level steps are **not
  measured** in WebKit, which has no CDP screencast.
- **Calibrated.** `--q=csbreak=revealleft` leaves a tenth of the dark strips on the canvas, and the release and the
  take-over FAIL (129,591 px in the strips). Two fixes came out of calibrating:
  - a single screencast pair missed the film, because the two clocks are a frame apart, so each boundary is now a
    window of steps;
  - on phones the "still" bench was not still: its hint arrived and the foot faded its status out. The harness holds
    those too.
- **The fade fallback** (`--q=csreveal=fade`), 1440×900@2 and 390×844@3: every boundary 0, and the landing 0 / ≤1
  level. `cross.cjs` BENCH, UP and WAY pass with it.
- **A first version failed under DEPTH: 4,866 px, the strip's words.** The runtime's type and custom properties are
  declared on `html[data-c2='on']`, so in `'cs'` the words fell back to the host's. `#ui` now carries the same values
  in `'cs'`, scoped to `#ui` alone.

`tools/diag/cross.cjs`, all sections, **Chrome PASS (31 checks) and WebKit PASS (27; touch is Chrome only)**. New:
- **BENCH:** DEPTH → bench for a notch and a flick: the bench is on 01, and the flick's tail does not move it.
- **UP:** going up from the Lab never skips Cross Section, for a notch and a flick: DEPTH, 0 frames on Work. With the
  calibration break `--q=csbreak=skipup` (today's skip put back) it FAILS: base Work, 0 closing frames, 153 and 294
  frames on Work.
- **WAY:** five gestures each way.
- **BHEADER:** LabChrome's WORK still jumps, with 0 seam frames.
- **COLD:** cold, warm and the fallback forced all arrive at DEPTH.
- **TOUCH:** a swipe on from DEPTH reaches the bench on 01; a swipe back down reaches DEPTH, not Work.

**Two harness mistakes, found and fixed:**
- the bench's records come from the server already marked, so a check waited only for the HTML and sent its gesture
  before the bench listened. It now waits for the mounted bench;
- headless WebKit draws at about 20 fps, so a fixed wait counted a seam still in progress. Its sixth gesture was
  absorbed, which is right, and the harness now waits the seam out.

**The Work seam, re-run** (`csseam.cjs`, 1440×900@2 and @1, 1920×991@1, 390×844@3): identity and landings 0 / ≤1 level,
the first louver frame and the landing on DEPTH 0 px, no blank frames. **Not decisive:** the worst single step of the
C2 travel into SURFACE against an ordinary travel into Work. It measured 147k, 414k and 279k px at 1440×900@2 in three
runs; the control varied with it, and the comparison flipped between runs. It is a frame-pacing reading, uncalibrated,
and C3 does not touch that travel. The earlier statement that it stays below the control at every size does not hold
reliably.

**Headed, at the user's configuration** (`csheaded.cjs`): installed Chrome 154, 1920×991 at DPR 1, Intel UHD (D3D11).
- Work's last work → DEPTH in four gestures (1,175 louver frames).
- One more: the blinds open onto the bench, on 01. One up: the blinds close, DEPTH (95 seam frames both ways).
- Four back to Work. Console clean.
- Film `tools/diag/out/cross/film/headed-1920x991.webm`, Chrome's own recording of its window. Stills
  `tools/diag/out/cross/headed/`.

**Stills of the seam** at each r, with the real bench underneath: `tools/diag/csbenchshot.cjs` and
`csbenchsheet.cjs`, written to `tools/diag/out/cross/bench/`.

**Flag off.** `npm run generate` with the flag unset, compared file by file with the live `1e663bd` package:
- **every JavaScript file is byte-identical**, with 0 Cross Section markers;
- the HTML and payloads differ only by the build ID and timestamp;
- `.htaccess` differs only by the CSP hash of Nuxt's inline config script, which carries the build ID (proven by
  hashing it).

`npx nuxt typecheck`: clean.

**The full flag-off gate (`run6.sh`), asked for and approved 2026-10-04.**
- **Setup:** ports 4962 (under test), 4964 (LAN) and 4963 (baseline), `BUILD_DIR=builds/cross-section`,
  `GATE_LOG=out/cross-gate.log`. It ran 03:12–04:23, 71 minutes.
- **Passed:**
  - CSPBOOT, SPINE (twice), BOOT RESPONSIVE (WebKit), PROJ, PANELFIT, WORK TEXT, SHORT PHONE, SHELL;
  - CONTACT ROUTE, COMPAT IOS15.4, SEAM (twice), FINALE A11Y, BECKON;
  - JOURNEY TR NORMAL, JOURNEY EN REDUCED.
- **NON-LAB, normal and reduced:** REVIEW. Every difference against the `pre-site-polish` baseline is the Linefield
  place in the spine (`linefield-back` / `linefield-front`), which the live site has.
- **Failed:**
  - **GESTURE:** 3 of 72 cases, all coast or tail flicks taking two stops or none (`coast down from name 0 → 2`,
    `coast up from linefield 3 → 1`, `tail up from work 4 → 4`).
  - **LAB A11Y:** 1, a colour-contrast sample on the bench's `.hint` at `/en/lab`, 1440.
- **Re-run alone, they failed again.** The machine was not quiet: other sessions' dev and static servers, a Vite dev
  server and about 33 Chrome processes, at 17% CPU.
- **So the same harnesses ran as an A/B against the live `1e663bd` package**, served on 4965 at the same time and on
  the same machine. Its JavaScript and CSS are byte-identical to the build under test.

  | | live `1e663bd` | build under test |
  |---|---|---|
  | LAB A11Y | **FAIL**, the same `.hint` at `/en/lab` 1440 | PASS (it had failed alone once) |
  | GESTURE coast, run 1 / run 2 | PASS / **FAIL (3)**, incl. `coast up from the bench 5 → 3` | **FAIL (3)** / **FAIL (1)** |
  | GESTURE tail, run 1 / run 2 | PASS / PASS | PASS / PASS |

- **Reading:** both failures are the live site's, at the same rate, under this machine's load. Neither comes from
  Cross Section: with the flag off its code is not in the build at all. GESTURE is the known load-sensitive harness
  (one Playwright round trip per wheel event, KNOWN-ISSUES). The `.hint` sample flips the way `.state`'s did, read
  mid-fade. **A clean gate needs a quiet machine.** The other sessions' processes are not this session's to stop.

### C3 approved (2026-10-04)

The user checked on desktop and iPhone, with recordings. Forward and back both pass through Cross Section, and the
blinds open and close cleanly. **The bench seam is approved.**
- **R10 is closed.** On the iPhone, SURFACE, EDGE, DEPTH and the hero name are heavy, as intended. WebKit's thin cut
  in Playwright is an artefact of Playwright's WebKit build, not of Safari. Nothing in the font loading changes.
- **C4 + C5 were asked for,** with two additions to C4:
  1. **The blinds on desktop.** On the phone the slats are read one by one as they turn. On desktop the same moment
     read as a quick dissolve through fine lines, about 0.7 s in the user's recording. Make the desktop reveal feel
     like the phone's, show the two side by side at matched progress, and keep the seam at 0 px.
  2. **Turning the phone mid-passage** (on SURFACE, in the band, on DEPTH, during the blinds) must keep the position
     and redraw cleanly, with no frozen or empty frame.
- **Before the final full gate,** tell the user, so the machine can be made quiet. Then STOP for integration approval.

### C4: the desktop blinds, rotation, the landscape rule, reduced motion (built)

**The desktop blinds** (`slats.js`, `revealLayout`).
- **Measured first.** The slats already matched the phone in CSS pixels: 19.9 px on desktop, 20.2 on the phone. So
  "match the phone in CSS px" changes nothing. What differs is how many there are: **45 across a 991 px field
  (2.2% of it each) against the phone's 29 across 572 (3.5%)**.
- **The timing is the same on both:** one 1.15 s clock. The ~0.7 s the user saw is the window in which the slats turn
  (r 0.04 to about 0.7), the same on the phone, so the duration is unchanged.
- **The rule.** The reveal has its own slats. On a wide screen a reveal slat is as many of the crossing's rows as it
  takes to be at least **3.5% of the field** (`CS_REVEAL_SHARE`, the phone's share). Its ink edge thickens with it
  (7.5 px for 5 rows instead of 4.5), so a slat keeps the phone's proportions.
  - 1920×991: 5 rows, 33 px, 27 slats. 1440×900: 5 rows, 25 slats.
  - Phones keep exactly the 3 rows that were approved.
  - The crossing keeps its own louvers.
- **The edge opacity** is unchanged (45% ink at edge-on). Raising it would change the approved phone too.
- **Side by side:** `tools/diag/out/cross/bench/pair-phone-vs-desktop-open.png` shows the phone (390×660), the
  desktop now and the desktop before, at r 0.1–0.7, made by `csbenchshot.cjs` and `csbenchpair.cjs`. Development
  overrides for trying other slats: `?csrevealrows=N`, `?csrevealthick=px`.

**Rotation mid-passage** (`main.js`, `csResize`; `tools/diag/csrotate.cjs`).
- **Measured before the fix** at 390×844 ⇄ 844×390:
  - on SURFACE, in the band, on DEPTH and while the louvers turned, the position was kept and nothing was empty, but
    the old picture stayed on screen, stretched, for **155–162 ms**. That is the site-wide 140 ms debounce before a
    rebuild;
  - during the blinds (opening, closing, held over the route change) the canvas was **never redrawn at the new
    size**. The resize handler ignored the screen while `'cs'` held it, and a held canvas was never drawn again.
- **The fix.**
  - On the place and in `'cs'`, the resize is taken at once. The event arrives in the frame of the new viewport, and
    that frame draws at the new size. The works' previews for the new shape follow, as at boot.
  - The held canvas draws the closed blinds again whenever its size changes.
  - **The frame loop also checks the viewport itself.** WebKit can deliver the resize event frames after the viewport
    has changed (127–155 ms in the first WebKit run), so on the place or in `'cs'` a frame that finds the viewport
    changed rebuilds before it draws.
  - The rest of the site keeps its debounce. Ordinary places still show the old picture for 150–240 ms; that is
    unchanged.
- **Measured after, in Chrome and WebKit (WebKit run twice).** In every case, the first animation-frame tick that sees
  the new viewport draws at the new size. The position is kept, no frame is empty, and every frame after the redraw
  has the settled tone (worst 1.8 levels).
  - The measure counts ticks: each draw to the canvas is stamped with its tick and buffer size.
  - Sampling by time had read the order of callbacks within a tick, and headless WebKit's ~140 ms between ticks, as
    stale pictures that were never presented.
- **How the measure was made honest:**
  - **controls first:** the same turns at the name and at Work;
  - **the browser's own frames are counted, not read.** Chrome's emulated resize presents frames of the wrong shape,
    and a frame or two of the old layout after the page has already drawn the new one, at ordinary places too;
  - **the held case** is read against the DEPTH that follows the hold, because a fault lasting the whole hold also
    lasts the whole window;
  - **only draws that reach the canvas** count as a redraw.
- **Calibrated both ways:**
  - `--q=csbreak=noresizenow` (the debounce put back) FAILS at 153–167 ms;
  - `--q=csbreak=noheldredraw` (the held canvas left empty after a turn) FAILS: never redrawn, and 151–160 levels
    from the DEPTH it should hold.
- **WebKit has no screencast,** so the held case's tone against DEPTH is not measured there, and says so.

**The landscape rule** (`slats.js`, `layout`). Below 520 px of height, rows are no finer than the site's phone pitch
of 5.2 px.
- 844×390: 19 louvers with rows 5.23 px apart, where it was 25 at 3.97.
- 667×375: 18. 932×430: 22.
- SURFACE and DEPTH were already sized from the field's height (0.46 of it).
- EDGE on a short screen takes the same share of the field height it has on a desktop (0.17): 49 px at 844×390, in
  proportion to the words.
- Nothing changes above 520 px.

**Reduced motion** (`runtime.js`, `createCrossDom`; `place.js`). Each position is still a cut (decision 2).
- The band positions now show **the EDGE moment as a still**: the louvers edge-on as straight copper bars at every
  louver, the dark ground under the warm glow, the copper line, and EDGE behind, beside or in front.
- It is DOM, because reduced motion draws the surface in 2D. The line and the word are the same DOM the moving scene
  uses, now made apart from WebGL.
- Forward, the bench opens as a cut. Up from the bench, the route arrives at DEPTH.
- Stills: `tools/diag/out/cross/places/reduced-*.png`.

### C5: the harnesses (built)

- **`cross.cjs`** adds:
  - REDUCED: the still is shown in the band and not at the ends; a key moves one position as a cut; the bench and
    back go by route, with no `'cs'` frame;
  - LANDSCAPE: the row rule, and EDGE from the height;
  - REVEAL: the reveal's slats per size.

  `--dpr=1` runs the desktop at DPR 1.
- **`csrotate.cjs`** (new): the rotation checks above.
- **`csplaces.cjs`** (new): stills of every position, normal or reduced.
- **The site harnesses that assumed the bridge** now read the spine and take the passage into account when it is
  there. With the flag off, nothing about them changes.
  - `spine.cjs` and `touchjourney.cjs`: the way up from the bench expects the place above it, which is Work or
    Cross Section at DEPTH. With the flag on, Work → bench is five swipes.
  - `journey.cjs`: the strip's LAB is a jump past the passage, and up from 01 is DEPTH.
  - `labflash.cjs`: the label only.
  - `spinetime.cjs`: the Lab control travels instead of starting the bridge, and up from the bench lands on Cross
    Section.
  - `proof1.cjs` tests the retired engraved proof (`.proof-track` is no longer in the app) and is not in the gate.
    It is left as it is.

**Measured (C4 + C5),** on the dev server with the flag on, each harness run alone. Every harness fails on any console
or WebGL warning.
- **`cross.cjs`:** PASS in Chrome at DPR 2 and DPR 1, and in WebKit. This covers every section from C1 to C4.
- **`csbenchseam.cjs`** at 8 sizes in Chrome, with the new reveal slats:
  - every screen boundary is **0 px**: under DEPTH, the release, the take-over and the hand-over;
  - the blinds' last frame is 0 lit;
  - identity and the landing up are **0 px at 1920×991@1** (≤1 level before the taller slats), at 1440×900 @2 and
    @1, and ≤1 level elsewhere, landscape included.

  WebKit (1440×900@2, 390×660@3): PASS.
- **`csseam.cjs`** (the Work seam) at 1440×900@2, 1920×991@1, 390×844@3, and **844×390@3 under the new row rule**:
  every landing 0 px, the first louver frame and the landing on DEPTH 0 px, no blank frame.
- **`csrotate.cjs`:** PASS in Chrome and WebKit.
- **With the flag on, the site harnesses** `spine.cjs` (normal and reduced), `journey.cjs` (TR normal, EN reduced),
  `touchjourney.cjs` and `labflash.cjs` all PASS.
- **`spinetime.cjs`, median of 3:**
  - Work → Lab by the strip's LAB: 1,445 ms. The strip jumps past the passage.
  - Lab → Cross Section by one notch: 1,229 ms, the blinds closing plus the route. The runtime is at DEPTH 26 ms
    after the notch.
- **Films:**
  - `tools/diag/out/cross/film/benchseam-chrome-1920x991@1.webm` and `…-390x660@3.webm`: the reveal on the user's
    desktop and on the phone, both ways;
  - `headed-1920x991.webm`: the whole way in a real headed Chrome on this machine (DPR 1, Intel UHD), 99 seam frames.
    Console clean.
- **Flag off.** `npm run generate`, compared with the live `1e663bd` package:
  - 27 JavaScript files and 12 CSS files are byte-identical;
  - nothing else differs beyond the build ID, the timestamp and the config script's CSP hash;
  - 0 Cross Section markers.

  `npx nuxt typecheck`: clean.

**The final full flag-off gate (`run6.sh`), 2026-10-04.** The user made the machine quiet first. It ran on this
session's ports 4962/4963/4964 with the dev server stopped, 11:28–12:14 (46 minutes).
- **Passed:**
  - CSPBOOT, SPINE (twice), BOOT RESPONSIVE (WebKit), PROJ, PANELFIT, WORK TEXT, SHORT PHONE, SHELL;
  - **LAB A11Y** (it had failed under load at C3);
  - CONTACT ROUTE, COMPAT IOS15.4, SEAM (twice), FINALE A11Y, BECKON;
  - JOURNEY TR NORMAL, JOURNEY EN REDUCED.
- **NON-LAB:** REVIEW, the same Linefield-in-the-spine difference against the old baseline as at C3.
- **GESTURE: FAIL (4).** Coast or long flicks moved two places: `coast down from name 0 → 2`,
  `coast up from linefield 3 → 1`, `long up from work 4 → 2`, `long up from the bench 5 → 3`.
- **The A/B against the live `1e663bd` package** (served on 4965), alternating, two runs per shape:

  | | live `1e663bd` | build under test |
  |---|---|---|
  | coast, run 1 / 2 | **1** / **3** FAIL, incl. `coast up from the bench 5 → 3` | 0 / 0 |
  | long, run 1 / 2 | **1** / **2** FAIL | **3** / **3** FAIL |
  | total | **7** | **6** |

  They are the same cases, two places instead of one, falling sometimes on one side and sometimes on the other.
- **Reading:** the build's JavaScript is byte-identical to live, so this is the live site's own behaviour under this
  harness. `gesture2` makes one Playwright round trip per wheel event; even on a quiet machine the page sees its
  events 20–60 ms apart instead of the stream intended (KNOWN-ISSUES). It is not from Cross Section.

### C4 + C5 approved (2026-10-04): integration

The user checked on desktop and iPhone. The desktop blinds read as blinds, and turning the phone mid-passage redraws
cleanly. Before the release, a responsive pass was asked for, like Linefield's.

### The responsive pass (2026-10-04)

`tools/diag/csresp.cjs` runs quick checks on the real runtime at every size, in four groups. `csrespsheet.cjs` makes an
overview of SURFACE, EDGE beside and DEPTH per size (`tools/diag/out/cross/resp/<group>-overview.png`). At each size:
- SURFACE and DEPTH's ink, as C2 sets it, at least 8 px clear of the strips and the edges;
- the louvers' row pitch no finer than 5.2 px;
- the blinds' slats at about the phone's 3.5% share;
- EDGE at all three stops inside the field;
- both seams' identity and landings, the bench round trip included, at most 1 level;
- the console clean.

| class | size @ DPR | words: closest to a strip or edge | louvers, row pitch | blinds: slats × rows, share | EDGE in frame | seams (worst level) | console |
|---|---|---|---|---|---|---|---|
| phones | 360x800@3 | 20 px | 36, 6.72 px | 27 × 4, 3.78% | yes | 1 | 0 |
| phones | 360x800@2 | 20 px | 36, 6.72 px | 27 × 4, 3.78% | yes | 1 | 0 |
| phones | 375x667@2 | 20 px | 29, 6.72 px | 29 × 3, 3.48% | yes | 1 | 0 |
| phones | 390x844@3 | 22 px | 38, 6.72 px | 29 × 4, 3.56% | yes | 1 | 0 |
| phones | 430x932@3 | 23 px | 42, 6.72 px | 26 × 5, 3.98% | yes | 1 | 0 |
| phones | 390x660@3 | 22 px | 29, 6.72 px | 29 × 3, 3.52% | yes | 1 | 0 |
| phones | 375x560@3 | 20 px | 24, 6.72 px | 24 × 3, 4.27% | yes | 1 | 0 |
| phones | 844x390@3 | 45 px | 19, 5.23 px | 19 × 3, 5.41% | yes | 1 | 0 |
| phones | 932x430@3 | 50 px | 22, 5.23 px | 22 × 3, 4.75% | yes | 1 | 0 |
| tablets | 768x1024@2 | 42 px | 47, 6.62 px | 28 × 5, 3.58% | yes | 1 | 0 |
| tablets | 1024x768@2 | 56 px | 34, 6.62 px | 26 × 4, 3.97% | yes | 1 | 0 |
| tablets | 820x1180@2 | 46 px | 48, 7.64 px | 29 × 5, 3.54% | yes | 1 | 0 |
| tablets | 1180x820@2 | 64 px | 37, 6.62 px | 28 × 4, 3.68% | yes | 1 | 0 |
| tablets | 1024x1366@2 | 56 px | 47, 9.03 px | 29 × 5, 3.57% | yes | 1 | 0 |
| tablets | 1366x1024@2 | 74 px | 47, 6.62 px | 28 × 5, 3.58% | yes | 1 | 0 |
| laptops | 1280x800@2 | 69 px | 36, 6.62 px | 27 × 4, 3.79% | yes | 1 | 0 |
| laptops | 1280x720@1.5 | 68 px | 32, 6.62 px | 24 × 4, 4.27% | yes | 1 | 0 |
| laptops | 1366x768@1 | 73 px | 34, 6.62 px | 26 × 4, 3.97% | yes | 1 | 0 |
| laptops | 1440x900@2 | 78 px | 41, 6.62 px | 25 × 5, 4.14% | yes | 0 | 0 |
| laptops | 1440x900@1 | 78 px | 41, 6.62 px | 25 × 5, 4.14% | yes | 1 | 0 |
| laptops | 1536x864@1.25 | 82 px | 39, 6.62 px | 29 × 4, 3.47% | yes | 1 | 0 |
| laptops | 1728x1117@2 | 94 px | 52, 6.62 px | 26 × 6, 3.91% | yes | 1 | 0 |
| desktop | 1920x1080@1 | 103 px | 50, 6.62 px | 25 × 6, 4.06% | yes | 1 | 0 |
| desktop | 1920x1080@2 | 103 px | 50, 6.62 px | 25 × 6, 4.06% | yes | 1 | 0 |
| desktop | 2560x1440@1 | 103 px | 50, 6.62 px | 25 × 6, 4.06% | yes | 1 | 0 |
| desktop | 2560x1440@2 | 103 px | 50, 6.62 px | 25 × 6, 4.06% | yes | 1 | 0 |
| desktop | 3440x1440@1 | 136 px | 50, 6.62 px | 25 × 6, 4.06% | yes | 1 | 0 |
| desktop | 3840x2160@1 | 129 px | 47, 9.03 px | 28 × 5, 3.61% | yes | 1 | 0 |
| desktop | 3840x2160@2 | 129 px | 47, 9.03 px | 28 × 5, 3.61% | yes | 1 | 0 |

**Two narrow fixes came out of it:**
1. **Tall phones had thin blinds.** At 360×800, 390×844 and 430×932 there were 36–42 slats of 2.4–2.8% each, because
   phones were held at 3 rows. The share rule is now everyone's, with a twentieth of a row's tolerance, so the
   approved 390×660 and 375×667 keep exactly their 3 rows. Tall phones now get 26–29 slats.
2. **At a fractional ratio one boundary row was the strip's.** At 1536×864@1.25 the strips end at device row 62.5
   and 1017.5. The louvers' scissor rounded that row away, and the louvers stopped mid-row, so the whole row
   (1,920 px) was the strip's ground. That was 93 levels off C2's frame at either end, and 110 on the blinds' first
   frame. The scissor now takes whole boundary rows, and the first and last louvers reach them (at both ends of the
   louver, so it holds for the turned-over back too). 1536×864@1.25 is now **0 px** at both ends. Integer ratios
   are unchanged, and the phones at 1.75 measure the same or better.

Regression after both: `cross.cjs`, `csbenchseam.cjs` (1536×864@1.25, 375×667@2, 1920×991@1, 390×844@3),
`csseam.cjs` (1536×864@1.25, 375×667@2) and `csrotate.cjs` all PASS.

**Frame cost at the largest sizes** (`csperf.cjs`, the GPU's own timer, this machine's Intel UHD, median ms). The debug
entry now composes as the site does past 1920×1080, and `?cspxcap=` applies R20's proposed ceiling.

| size (backing store) | the passage | an ordinary place |
|---|---|---|
| 1920×1080@1 (1920×1080, 2.1 Mpx) | 8.7 | 11.4 |
| 2560×1440@2 (3840×2160, 8.3 Mpx) | 33.6 | 45.0 |
| 3840×2160@2 (5760×3240, 18.7 Mpx) | 74.5 | 101.4 |
| 3840×2160@2, R20 cap 8.3 Mpx (3841×2161) | 33.7 | 45.5 |

- **The passage costs about 25% less than an ordinary place at every size,** so it never makes a large screen slower
  than the site already is.
- **At 2560×1440@2 and above, nothing on the site keeps 60 fps on this Intel iGPU.**
- **The R20 cap would roughly halve the cost of everything** at 3840×2160@2, where 2560×1440@2 already sits at the
  cap. That is a site-wide change (R20), proposed and not applied.

### The release candidate (2026-10-04)

**Step 1, `main`.** `main` had not moved: `main` = `origin/main` = 15da1d5, the branch's base, so a fast-forward is
possible. But `main` is checked out in `emrah-portfolio-linefield`, another session's worktree. Moving the ref from
here would leave that worktree's files stale, so the user decided to release from `feature/cross-section`, which is
exactly what `main` will become, and fast-forward `main` once that worktree no longer has it checked out. Nothing has
been pushed.

**Step 2, on by default** (`nuxt.config.ts`, like R25 for Linefield). `__CROSS__` is true unless
`NUXT_PUBLIC_CROSS=0` (`false`, `off`, `no`). `docs/DEPLOYMENT.md` says so and gives the package check. Verified both
ways:
- `NUXT_PUBLIC_CROSS=0 npm run generate` against the live `1e663bd` package (`tools/diag/cscompare.cjs`): 27 JS and
  12 CSS files byte-identical, 219 files, nothing else differing beyond the build ID, the timestamps and the config
  script's CSP hash, and 0 Cross Section markers;
- `npm run generate` (nothing set): the passage is in its own chunk (`grep -ril cs-still` finds it), Linefield too, and
  there are 220 files. `cspboot --dir` PASS, typecheck clean. `cross.cjs` on the build's own `--wk` server PASSES in
  Chrome and WebKit (every section but COLD, whose forced fallback is a development switch).

**Found before the gate, in a dry run of its flick checks on the release build:**
- **Up from the bench, a slowing wheel walked DEPTH back to Work.** Its last detents are 150–330 ms apart. After
  the hand-over (warm) or the route arrival (cold) the stream's history was gone, so each detent opened a gesture.
  The gesture rule now watches the stream while the blinds hold the screen and while the runtime stands at the place
  without the screen yet. An arrival at Cross Section starts as a spent stream, without the hush, which swallowed
  events unseen. Replayed 6 times cold and 6 times warm, it stays at DEPTH every time, and `cross.cjs` (up, way,
  cold, reverse, touch) still passes, so a deliberate gesture after a pause still counts.
- **`gesture2.cjs` did not know Cross Section's axis.** It now knows it (one flick, one position).
- **`run6.sh` can run in groups** (`ONLY=...`).

**Step 3, the full gate on the release build, flag on, in four groups,** on this session's ports 4962/4963. The user
made the machine quiet first.

| group | sections | time | result |
|---|---|---|---|
| 1. The runtime and the Lab | RETIRED LAB ×3, SPINE ×2, SHELL, LAB A11Y, JOURNEY ×2 | 12 min | PASS except LAB A11Y (1): the `.hint` sample, see below |
| 2. GESTURE | gesture2, as five fresh WebKit sessions | 13 min | 70 ok, 3 known fast-flick cases |
| 3. Boot, projects, phones | INITIAL LOAD ×2, BOOT RESPONSIVE, PROJ, PANELFIT, WORK TEXT, SHORT PHONE | 14 min | PASS (INITIAL LOAD: errors 0) |
| 4. Contact and the baseline | CONTACT ROUTE, COMPAT IOS15.4, SEAM ×2, FINALE A11Y, BECKON, NON-LAB ×2 | 9 min | PASS; NON-LAB REVIEW, only the spine's new places |

- **RETIRED LAB:** 0 frames of the retired Lab, including the new way up, "Lab → Cross Section".
- **LAB A11Y (1)** is the axe sample on the bench's `.hint` at `/en/lab` 1440, read mid-fade.
  - Re-run alone on the quiet machine it failed, then passed, **on the live package and on this build alike**.
  - The user decided to record it (KNOWN-ISSUES) and go on.
- **GESTURE, run as one session, hung after 37 minutes:** WebKit idle, 0 CPU, inside the long session (KNOWN-ISSUES:
  accumulation in long Playwright sessions). The case it hung at passes alone, so the group was re-run as five fresh
  sessions: the non-flick sections, then burst, coast, tail and long.
  - Its three failures are the known class, where the harness's per-event round trips stretch a gap past the 340 ms
    quiet and the site rightly reads a new gesture: `coast up from linefield` (opened at 343 ms), `tail down from
    cross` (357 ms; that run's gaps reached 446 ms), and `long down from creative`.
  - `coast down from cross` failed once in the hung session (4 positions) and once in three reps alone (2), the same
    class.
- **NON-LAB:** the differences against the old `pre-site-polish` baseline are the spine's places (`linefield-*`,
  `cross-pass`), with pixΔ 32.2, against 31.1 in the flag-off gate.

**Step 4, the package.**

| | |
|---|---|
| package | `deploy/yucelemrah-df5ab32.zip` (gitignored), with `yucelemrah-df5ab32.zip.sha256` |
| built from | `df5ab32`, the release build (`npm run generate`, nothing set): Cross Section ON, Linefield ON |
| SHA-256 | `9a627488d516721a20bea7f18f82b76a9675e74d991127bce57f236eaf14f70c` |
| files | 220 (live `1e663bd`: 219; the one more is Cross Section's chunk), three `.htaccess` |
| size | 10,257,048 bytes unpacked, 9,332,545 zipped (8.9 MiB) |
| checks | `cspboot --dir` PASS on the build and on the zip's own unpacked contents; unpacked = build |
| LAN preview | `http://192.168.1.5:4964/tr`, the same build (same build ID), served `--lan --wk` on this session's port |

**Not done, as agreed:** no push, no upload, and `main` not yet fast-forwarded. The user checks the release build on the
iPhone first.

## Working rules for this worktree

- **Own ports, build folder and gate log:** `SERVE_PORTS`, `BUILD_DIR=../builds/cross-section`,
  `GATE_LOG=out/cross-gate.log`.
  - Never run `serve.sh` on its default ports.
  - Never stop a server this session did not start.
- **Harness output** goes under `tools/diag/out/`, never into `docs/`.
- **WebKit harnesses** need a `--wk` server port. Chromium harnesses need a normal one.
- **Timing-sensitive checks** (gestures, spine, seams):
  - Run them alone on a quiet machine, and re-run a failure alone before believing it.
  - Dispatch input timing from inside the page.
- **Seam checks:**
  - Take controls first: two frames of the still page.
  - Compare the crossing against that floor, never against zero.
- **Phones:** check 390×660, 375×560 and landscape as well as 390×844.
- **Uncalibrated measurements:** report "not measured" rather than claim anything.
- **Git:** never `git stash`, `git gc` or `git worktree prune`. No push or merge without asking.
