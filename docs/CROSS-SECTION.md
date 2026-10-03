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
