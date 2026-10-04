# Image quality round (R9, R19, R20, R21)

Branch `feature/image-quality`, worktree `../emrah-portfolio-iq`, cut from 8da676c (live: df5ab32). Ports 4970–4979,
builds `builds/iq-*`, harness output `tools/diag/out/iq/`. `docs/ROADMAP.md` holds the decisions; this file holds
the plan, the measurements and what they mean.

## Order (user decision 2026-10-04)

1. R9 step 1: measurement only, no engine change. **Done, below.**
2. R9 fix prototype: A / B / C switchable, judged by eye on the user's DPR 1 screen and iPhone. **Built and measured, below; waiting for the user's visual comparison.**
3. R19: the conservation rule, after R9's fix.
4. R20: safety cap and adaptive ratio, after R9 (constraints in ROADMAP R20).
5. R21: a comparison sheet at four sizes, then the user's decision.

## R9 step 1: the sub-pixel model, measured (2026-10-04)

### The model

A row is narrower than a backing pixel. `surface.js` `rows()` takes one sample per pixel. Its edge is
`smoothstep(hw + aa, hw - aa, dist)` with `aa = 0.75 / uDpr`, which does not preserve area. Ink and paper are mixed as
sRGB values. So the light a row gives off depends on where its centre falls inside a pixel (its phase). On a dark ground
the swing is large; on cream it is small.

### How it was measured

`tools/diag/iqrows.cjs <port>`, against `builds/iq-base` (8da676c = live code) on 4970. Chrome on this machine's Intel UHD
(ANGLE, D3D11).

- **Backing store.** The canvas's own pixels, read with `readPixels`. An init script creates the context with
  `preserveDrawingBuffer`, which leaves the pixels unchanged. **Screen:** a screenshot of the same columns, which is
  what the compositor shows.
- **Per row.** `L` is the row's light in linear luminance, as a fraction of the ink-paper contrast, summed over one
  pitch. `phase` is its centroid's distance from a pixel centre (0 to 0.5).
- **No free parameter.** Each row's width is read from the state's own content texture
  (`hw = thick·(0.5 + tone·1.15·wgain)`). Each row is predicted at its own phase by a JS copy of the shader's
  coverage. The same estimator runs on both, so its bias cancels.
- **Only bare ground.** Excluded:
  - each opening's reach (where R19's pile-up is);
  - a work's pocket (rows at 40%) and its text lines;
  - type, void and saturation, according to the texture;
  - the outer 24 px, where Linefield fades its rows (`corridor.js`, `uLFfade.w`).
- **Holds when:** phase coverage is at least 0.25, the binned residual is at most 5% RMS, and the measured max/min ratio
  is within 15% of the predicted one. With narrower coverage the result is NOT TESTABLE, never a pass. The header of
  `iqrows.cjs` lists what was fixed before the first run and what changed after it, and why.

### Results (backing store)

"Swing" is the max/min of a row's light over the phases the rows actually occupy. The model's figure for every
possible phase is in brackets.

| config (ratio) | Full-Stack, dark | Ege inside, dark | Linefield dark half | Creative, cream |
|---|---|---|---|---|
| 1920×991@1 (1) | not testable: 1.18 (2.25) | not testable: 1.22 (1.90) | not testable: 1.00 (3.23) | **holds**: 1.21 (1.20) |
| 1440×900@1 (1) | not testable: 1.14 (2.25) | not testable: 1.22 (1.90) | not testable: 1.00 (3.23) | **holds**: 1.22 (1.19) |
| 1920×991@1.5 (1.5) | **holds**: 1.37 (1.42) | **holds**: 1.28 (1.31) | **holds**: 2.33 (2.44) | **holds**: 1.04 (1.04) |
| 1440×900@1.5 (1.5) | **holds**: 1.39 (1.42) | **holds**: 1.28 (1.31) | **holds**: 2.33 (2.44) | **holds**: 1.05 (1.04) |
| 1920×991@2 (1.5) | **holds**: 1.37 (1.42) | **holds**: 1.28 (1.31) | **holds**: 2.33 (2.44) | **holds**: 1.04 (1.04) |
| 1440×900@2 (1.5) | **holds**: 1.40 (1.42) | **holds**: 1.28 (1.31) | **holds**: 2.33 (2.44) | **holds**: 1.05 (1.04) |
| 2560×1440@1 (1.333) | **holds**: 1.50 (1.63) | **holds**: 1.34 (1.47) | **holds**: 2.21 (2.71) | **holds**: 1.10 (1.11) |

Every testable cell is within 0.7% RMS of the prediction; most are within 0.2%. Frame to frame, at rest, each tracked
row's light changes by exactly what its own phases predict (Full-Stack 0.7–2.8% against 0.6–2.8%; Creative 0.6–3.0%
against 0.6–3.0%).

**Linefield's 73.5.** At ratio 1.5 a 7 px pitch is 10.5 backing px, so neighbouring rows alternate between the two
extreme phases. On Linefield's dark half, with its thin rows (hw 0.25), their light differs by 2.33× (model 2.35×) and
their peaks by 90 sRGB levels. On Full-Stack the peaks differ by 73 levels. This is the earlier "spread", explained.

### What it means

- **The mechanism is established for what the pixels do.** A row's brightness is the shader's sub-pixel coverage mixed
  in sRGB, and on dark grounds it depends strongly on the row's phase. Over all phases:
  - Full-Stack 2.25×, Ege 1.90×, Linefield's dark half 3.23×;
  - cream 1.20×.
- **On the user's screen as it is now (DPR 1, 1920×991), the dark grounds' bare rows at rest sit at one phase, or
  two close ones.** The pitches are whole numbers (5, 7) or 6.5, so the rows look even. The ambient wave moves them
  only slightly: on Full-Stack's bare ground at rest, a row's light changes about 1.5% from frame to frame. The big
  swings appear:
  - at ratio 1.5 (any screen at DPR ≥ 1.5, a MacBook);
  - on large screens where `V.u` > 1 (2560×1440@1: up to 2.2×);
  - wherever rows move across pixel phases: travel between places, scrolling, the pointer's ripple, Linefield's
    passage, and the compressed rows around the capsules. That is where Full-Stack's phase variety was in the first
    run, before those rows were excluded.

  **None of the moving cases was measured in this step.**
- **Integer locking is confirmed as the wrong fix.** It would only make the rows even at rest. That is already how
  they look at DPR 1, and the swing comes back the moment anything moves.

### What this step did not settle

- **The screen path at a fractional device size.** At 1920×991@1.5 the viewport is 1486.5 device px high and the
  screenshot no longer equals the backing store (the rows are softened: 29.6% / 14.7% / 12.0% off the 1:1
  prediction). At 1440×900@1.5 (a whole 2160×1350) it is exact. This is either the compositor or the capture
  resampling; it is not decided which.
- **The 1.5 → 2 upscale at DPR 2.** A bilinear model of it is not exact (Full-Stack 6.2%, Linefield 15.4%). On
  screen, Linefield's dark rows still differ by 1.57× after the upscale.
- **Perception.** These are pixel measurements. Whether the remaining shimmer the user sees is this, and where they
  see it (at rest, or in motion), is for the user's eye on the prototype. No physical device was used.
- **Motion.** Rows in transit were not measured.

### Reproduce

```
cd tools/diag
node sv.cjs ../../../builds/iq-base 4970 &
node iqrows.cjs 4970 tr        # about 10 min; one scene: --only=lfdark; one size: --cfg=2560x1440@1
```

The JSON for every cell goes to `tools/diag/out/iq/rows/`; the record above is `iqrows-2026-10-04T18-03-56-803Z.json`.

## R9 step 2: the prototypes, measured (2026-10-04)

The user saw the step-1 picture on their own screen. At DPR 1 the dark grounds are calm at rest and shimmer only
while rows move (transitions, scrolling, the pointer ripple, Linefield's passage). When the display read DPR 2, they
shimmered at rest too. That is what the model says.

### What was built

All of it is in `engine/c2/surface.js`, behind a query key. Without the key the output is the shipped shader's,
**pixel for pixel**: 0 bytes differ from the 8da676c build (Ege inside and Linefield's dark half, 1920×991@1 and
1440×900@2, `tools/diag/r9ident.cjs`).

| key | coverage | mixing |
|---|---|---|
| (none) / `?r9=off` | shipped smoothstep | sRGB |
| `?r9=a` | tent, one backing px in radius: the ink a row lays down is the same at every phase | sRGB |
| `?r9=b` | tent | linear light, every ground |
| `?r9=c` | tent | linear light on a dark ground (paper luminance < 0.5), sRGB on cream |

- **Brightness is held.** Each variant changes how bright a field looks on average, so each scales a bare row's
  width until the ground's average light is what it is now. This is computed in JS per state and per ratio
  (`r9Gain`), the same calculation as the harnesses. Rows wider than a bare row (type) are moved by the same amount
  rather than scaled, so letters keep their weight.
- **The key is kept** in `sessionStorage` for the tab, so navigating inside the site keeps it. `?r9=off` clears it.
- **A red badge** in the top right corner names the variant. No badge means the shipped shader.
- **Not touched:** reduced motion (`flat.js`, Canvas 2D, static) and the first-paint plate.
- **Checks:** `glslcheck`, `compat-ios15` (PASS), typecheck (PASS). Every variant boots with no GL or console
  error in Chrome (1920×991@1) and in WebKit at phone size over the LAN (390×844@3, ratio 1.75;
  `tools/diag/r9webkit.cjs`).

### How it was measured

`tools/diag/iqr9.cjs 4971`, against `builds/iq-r9` (Chrome, Intel UHD, backing store). Each variant runs in a
fresh context.

- **At rest:** the same bare-ground rows as step 1 (`iqrows.cjs`'s extraction and exclusions, imported).
  - `swing` is the max/min of a row's light over the phases its rows occupy.
  - `bright` is a bare row's mean light against off.
- **In motion:** columns are read every drawn frame, and every row is followed from frame to frame (same column,
  within 0.35 of the local pitch). The figure is |ΔL| / L, as p50 / p90, **over rows that moved** (centre by more
  than 0.02 px). A row standing still cannot shimmer; counted in, it only dilutes the number. The first trial
  counted everything and read 0.0% for every variant.
  - transition: Full-Stack → Linefield's stop by `go()` (both dark)
  - scroll: Ege inside, frame 0 → 1
  - ripple: the pointer drawn across Full-Stack at a hand's speed (one step a frame; Playwright's own `steps`
    sends them within milliseconds and the physics sees one jump)
  - passage: Linefield's progress stepped 0 → 1 in 90 even steps

### In motion: a moving row's light, frame to frame (p50 / p90)

| | transition | scroll | ripple | passage |
|---|---|---|---|---|
| **1920×991@1** off | 32.9 / 92.0% | 12.9 / 42.9% | 24.1 / 54.7% | 24.1 / 91.1% |
| A | 9.7 / 41.4% | 3.5 / 11.6% | 7.1 / 18.1% | 13.5 / 52.2% |
| B | **0.8** / 19.2% | **0.4 / 1.9%** | **1.6 / 3.8%** | **1.7** / 52.8% |
| C | **0.8** / 23.8% | **0.4 / 1.9%** | **1.6 / 3.7%** | 6.2 / 59.2% |
| **1440×900@1.5** off | 18.4 / 70.5% | 7.0 / 22.7% | 10.4 / 24.0% | 29.6 / 78.8% |
| A | 7.2 / 37.1% | 1.9 / 5.9% | 2.7 / 8.3% | 13.7 / 59.6% |
| B | **0.6** / 20.7% | **0.3 / 1.0%** | **1.6 / 3.4%**¹ | **1.6** / 59.3% |
| C | **0.7** / 26.8% | **0.3 / 1.1%** | **1.6 / 3.5%** | 6.5 / 71.0% |
| **1440×900@2** off | 19.3 / 71.0% | 6.9 / 22.5% | 9.7 / 24.1% | 29.6 / 78.8% |
| A | 6.1 / 38.5% | 1.8 / 5.8% | 2.7 / 7.5% | 13.7 / 59.6% |
| B | **0.6** / 20.7% | **0.3 / 1.0%** | **1.6 / 3.4%** | **1.6** / 59.3% |
| C | **0.6** / 21.8% | **0.3 / 1.0%** | **1.6 / 3.5%** | 6.5 / 71.0% |

¹ The matrix run caught only 5 frames for this cell (0.2 / 0.5%). Rerun twice on its own: 1.6 / 3.4% and 1.5 / 3.6%
over 23 frames each.

- **The p90 that stays in the transition and the passage is not phase.** There the rows really change: the sweep
  moves each row from one state to the other (pitch 5 → 7, thickness 0.78 → 0.5), and the passage thins its field
  by index, narrows rows in perspective and fuses them. Those changes are the same in every variant. The p50, and the
  scroll and the ripple, which only move rows, are the phase part.
- **C is B on a dark ground.** It differs only where the ground is cream, where it keeps sRGB mixing: the passage's
  cream half (p50 6.2–6.5% against B's 1.6–1.7%) and Creative at rest (below).

### At rest: swing, and brightness against off

| | Full-Stack | Ege inside | Linefield dark | Creative (cream) |
|---|---|---|---|---|
| **@1** off | 1.18 | 1.22 | 1.00 | 1.21 |
| A | 1.12 (−2%) | 1.05 (+4%) | 1.00 (−3%) | 1.11 (+3%) |
| B | 1.10 (−2%) | 1.01 (+4%) | 1.00 (**−8%**) | 1.04 (+2%) |
| C | 1.10 (−2%) | 1.01 (+4%) | 1.00 (**−8%**) | 1.10 (+3%) |
| **@1.5 and @2** off | 1.39 | 1.28 | 2.33 | 1.05 |
| A | 1.16 (−2%) | 1.07 (0%) | 1.28 (**−9%**) | 1.06 (0%) |
| B | 1.09 (−3%) | 1.01 (0%) | 1.00 (**−8%**) | 1.05 (0%) |
| C | 1.09 (−3%) | 1.01 (0%) | 1.00 (**−8%**) | 1.06 (0%) |

(@2 reads the same backing store as @1.5: the ratio is capped at 1.5, and the browser does the upscale.)

- **Linefield's 2.33 at ratio 1.5, the earlier "73.5", goes to 1.00 in B and C.** A only halves it (1.28).
- **Brightness is within 4% everywhere except Linefield's dark half, which is 8% darker in B and C.** The calibration
  matches a row's light averaged over every phase, and Linefield's rows sit at one or two phases. If B or C is
  chosen, it can be tuned there.
- **Full-Stack keeps a 1.09–1.10 swing in B and C.** Step 1 found its rows' widths following their tone (the
  weather), and tone and phase are linked through the wave. The cause of the remainder is not settled.
- **Not measured:** the screen after the 1.5 → 2 upscale (step 1's open point), and any physical device.

### For the user's comparison

- **This computer:** `http://127.0.0.1:4971/tr?r9=off` (or `=a`, `=b`, `=c`). 4970 is the unchanged 8da676c build.
- **iPhone on the same network:** `http://192.168.1.5:4972/tr?r9=b` (served `--lan --wk`). The variant stays for that
  tab; change it with another `?r9=`.
- **Where to look:**
  - Full-Stack with the pointer moving over it;
  - travel from Full-Stack into Linefield and through it;
  - a work: `/tr/work/ege?r9=…`, scrolling its frames.

### Reproduce

```
cd tools/diag
node sv.cjs ../../../builds/iq-r9 4971 &
node iqr9.cjs 4971                       # about 20 min; --cfg=1440x900@1.5 --variants=off,b --motion-only for one cell
node r9ident.cjs                         # no key = the 8da676c build (needs 4970 too); r9webkit.cjs for the phone path
```

The record above is `out/iq/r9/iqr9-2026-10-04T19-22-06-676Z.json`.
