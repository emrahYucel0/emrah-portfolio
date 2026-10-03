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
