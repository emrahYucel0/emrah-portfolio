# Image quality round (R9, R19, R20, R21)

Branch `feature/image-quality`, worktree `../emrah-portfolio-iq`, cut from 8da676c (live: df5ab32). Ports 4970–4979,
builds `builds/iq-*`, harness output `tools/diag/out/iq/`. `docs/ROADMAP.md` holds the decisions; this file holds
the plan, the measurements and what they mean.

## Order (user decision 2026-10-04)

1. R9 step 1: measurement only, no engine change. **Done, below.**
2. R9 fix prototype: A / B / C switchable, judged by eye on the user's DPR 1 screen and iPhone. **Done: the user
   chose B (2026-10-05).** Then B as the default, Linefield's dark half back at today's brightness, and the
   reduced-motion path: **done (step 3, below); stopped before R19.**
3. R19: the conservation rule, after R9's fix. **R9 approved (2026-10-05).** The Linefield check rewritten, R29 fixed,
   the reduced-motion cost measured; R19 prototype built and measured, **waiting for the user's comparison** (below).
4. Before R20 (user decision after R19's approval): the reduced-motion paint, options 1 and 2. **Done (f4d7462);
   the picture is identical; the 100 ms target is not met (below).**
5. R20: safety cap and adaptive ratio, after R9 (constraints in ROADMAP R20). **Prototype measured, behind
   `?r20=on`; waiting for the user's decision before it becomes the default (below).**
6. R21: a comparison sheet at four sizes, then the user's decision.

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

## R9 step 3: B as the default (2026-10-05)

**User decision (2026-10-05)**, after comparing A, B and C on their DPR 1 desktop and their iPhone: B. The shimmer in
motion is gone, and the cream grounds look right. The brief:
- make B the default;
- bring Linefield's dark half (8% darker in B) back to today's brightness;
- carry the change into the reduced-motion path if it applies;
- run the prototype's checks and the Linefield and Cross Section checks;
- stop before R19.

### What changed

`engine/c2/surface.js`:

- **Coverage and mixing are B's, unconditionally.** The tent coverage and the linear-light mixing are the shader now.
  The `?r9=` key, A, C and the badge are gone.
- **The brightness rule (`rowGain`) has a better target.** Today's brightness is measured at the positions the rows
  actually sit at.
  - Linefield's "8% darker" was not an offset. Measured at five sizes, B against today was −8% at ratios 1 and 1.5
    and +1–2% at 1.25 and 1.333. Before R9 a row's light depended on its position in the pixel, and at ratios 1
    and 1.5 a still field's rows all sit at the bright positions. B had been matched to the average over every
    position.
  - So a still state is now matched at its own rest positions (pitch, ratio, the physics field's resting offset).
    A waving state is still matched on the average, because its rows travel through every position.
- **Letters get their own correction.** The prototype scaled thin rows and moved anything wider by a bare row's
  amount. On a dark ground that made the pale words visibly bolder (Linefield's backend +6–9% in the words' block,
  seen in magnified crops).
  - A solid row changes only at its two soft edges, so `rowGain` also solves an edge shift for a row two pixels
    wider than bare (`uE0`–`uE2`).
  - The shader goes from the bare row's rule to the letter's over a pixel and a half: scaled up to a bare row,
    moved by a bare row's amount just past it, moved by the letter's own amount from 1.5 px on.
  - A first version scaled the in-between rows. That made Creative (rows thickened by its tone) 10% darker; moved,
    it is +2%, as in the prototype.

`engine/c2/flat.js`, the reduced-motion renderer:

- **The change applies.** Before R9, reduced motion was much darker than normal motion on the dark grounds. Measured
  on 8da676c at DPR 1: Full-Stack −46%, Linefield's dark half −57%, Ege −8%. At 1.5: Linefield −11%, Creative −16%.
  - Canvas 2D blends partly covered pixels as sRGB, which is the same mechanism.
  - Its rows also sit 0.31 px from the shader's (they leave out the physics field's resting offset), so at DPR 1
    they straddle two pixels where the shader's sit on one.
- **With a mask** (`createFlat`; the first-paint hero plate is unchanged):
  - the rows' coverage goes into a mask and is mixed into the picture in linear light at the end, over whatever
    each pixel holds (paper, the page's colour in an opening, or nothing);
  - row widths use `rowGain`, with the normal-motion answer for whether the rows wave;
  - the shader's thin-row fade (`clamp(hw * 4)`) applies;
  - widths are quantised to 64ths, because the narrower rows moved by 6% at 16ths.
- **Cost of one paint.** Full-Stack, median: 1920×991@1 63 → 73 ms, 1440×900@2 38 → 71 ms, 390×844@3 11 → 21 ms.
  The first version took 234 ms at 1440×900@2; the mix is now one table per ground colour over 32-bit pixels.

### Measured on the final build (`builds/iq-b`, 4973; 8da676c on 4970)

**Brightness at rest, B against today** (`iqr9.cjs --ports=off@4970,b@4973 --rest-only`), swing in brackets:

| | 1920×991@1 | 1440×900@1.5 | 2560×1440@1 | 1536×864@1.25 | 1280×800@1.75 |
|---|---|---|---|---|---|
| Linefield dark | +0.6% (1.00) | +0.6% (1.00) | 0.0% (1.01) | +0.3% (1.01) | +0.8% (1.00) |
| Ege inside | −0.2% (1.00) | −0.1% (1.00) | 0.0% (1.00) | −0.1% (1.00) | +0.1% (1.00) |
| Full-Stack | −2.1% (1.10) | −2.6% (1.09) | +0.6% (1.06) | +0.8% (1.07) | −2.9% (1.10) |
| Creative | +2.1% (1.04) | −0.2% (1.06) | +0.1% (1.01) | +0.3% (1.02) | +0.5% (1.06) |

The swing before R9 was up to 2.33 (Linefield dark at 1.5).

**In motion** (`iqr9.cjs … --motion-only`): a moving row's light, frame to frame, p50 / p90, today → B. Healthy
captures (39–94 frames), and the site's capacity governor never engaged:

| | transition | scroll | ripple | passage |
|---|---|---|---|---|
| 1920×991@1 | 25.8 / 92.6% → **0.6** / 10.6% | 13.4 / 42.8% → **0.5 / 2.2%** | 22.5 / 53.5% → **1.9 / 3.9%** | 25.6 / 98.9% → **3.1** / 82.8% |
| 1440×900@1.5 | 17.8 / 69.9% → **0.6** / 15.5% | 5.8 / 24.1% → **0.5 / 6.5%** | 9.2 / 23.8% → **2.2 / 3.9%** | 29.2 / 81.3% → **1.5** / 69.2% |
| 1440×900@2 | 17.4 / 69.2% → **0.5** / 10.7% | 6.4 / 23.7% → **0.5 / 6.1%** | 10.0 / 24.6% → **2.2 / 4.0%** | 29.2 / 81.3% → **1.5** / 69.2% |

The motion harness was changed during this step. It used to read 22 single columns per frame; the readbacks stalled
the GPU enough that the site's own capacity governor (`A.constrained`) stopped redrawing, and some captures fell to 5
frames. It now reads two full-height blocks, and reports how many frames ran constrained.

**Reduced motion against normal motion** (`r9flat.cjs`, the same rows read the same way in both modes; before R9 → now):

| | DPR 1 | DPR 1.5 |
|---|---|---|
| Ege | −8% → **+2%** | −5% → **+1%** |
| Linefield dark | −57% → **+6%** | −11% → **+3%** |
| Full-Stack | −46% → −14% | −4% → −4% |
| Creative | −2% → −6% | −16% → −9% |

- Rows are even in reduced motion now (swing 1.00–1.01; before, up to 1.95).
- **What is left on Full-Stack and Creative is not R9's.** Reduced motion sets `ampK = 0`, and the 2D path takes its
  tone-to-weight gain from the same amplitude (`wgain = min(amp, 1)`), so tone stops thickening rows. It is in the
  ROADMAP as R29.

**Linefield's words** (`out/iq/lfwords.cjs`, mean linear light in the words' block, B against today):
- cream: 0.6343 / 0.6336;
- dark, 1440×900: 0.1175 / 0.1170;
- dark, 844×390: 0.1011 / 0.0969 (+4%).

Under magnification B's letter rows have softer edges: the tent's one-pixel radius fills the 1–2 px gaps between them
with a faint grey at small sizes.

### The checks

| check | B (final build) | 8da676c |
|---|---|---|
| `glslcheck`, `compat-ios15`, `npx nuxt typecheck` | PASS | — |
| `cspboot` (4973, 4974 WebKit, `--dir`) | PASS | — |
| `r9webkit.cjs` (WebKit 390×844@3 over the LAN, normal and reduced, index and a work) | PASS | — |
| `linefield.cjs` | 146 ok, **2 failed** | 148 ok |
| `cross.cjs` Chrome @2 / @1 | 1 failed each: "fallback forced (runtime not loaded)" | **the same 1 each** |
| `cross.cjs` WebKit | PASS run alone; under load once a flick, once a swipe | fallback failed once |
| `csseam.cjs` 1440×900@2, 1920×991@1, 390×844@3 | PASS | — |
| `csbenchseam.cjs` on the production build | intermittent "release onto the bench" | **intermittent too** |
| `csbenchseam.cjs` on the dev server (the documented way) | **PASS, every boundary 0 px at all four sizes** | — |
| `csrotate.cjs` Chrome / WebKit | "held → landscape" (2 / 1) | **the same** |

- **Linefield's 2 failures** ("the words are there — 0.0% of the frame is type", tr and en, 1440×900 frontend) are
  the test, not the words. Type is found as pixels within 46 levels of the ink colour, in runs of at least
  0.55 × pitch. With the tent a 4.3 px letter row is fully covered for about 3 px, not 4. The words' ink is
  unchanged (above).
  - "Within 46 levels" means a different coverage under linear mixing on cream (about 0.95) than on the dark half
    (about 0.60), so no single new threshold keeps the old meaning. **The harness was not changed: the user's
    decision.**
  - The prototype also failed "no ink outside the cap line" at 844×390 (one 2 px run beside the label). The final
    build passes it.
- **The Cross Section failures B shares with today:** the fallback, held → landscape, and the WebKit gesture checks
  under load. The WebKit gesture failures pass when run alone; the gate's record already lists the gesture flicks
  as shared with live.
- **The bench seam on a production build:** both builds fail it at times (today 1 of 6 runs at the phone sizes,
  B 2 of 6). There the bench breathes and the floor is its own step, while at the release the blinds' last frame
  is fully transparent (0 px, a separate check), so C2's rows are not in that step. On the dev server, which holds
  the bench still, B is exactly 0.

### Open, for the user

- The Linefield harness's type test (above): change its threshold, or keep it and accept these 2 failures.
- R29: tone-to-weight in reduced motion (Full-Stack −14% at DPR 1, Creative −6 / −9%). One line in `flat.js`; it
  changes how reduced motion looks.
- The LAN address is 192.168.1.102 again (DHCP). The preview is `http://192.168.1.102:4974/tr`.

### Reproduce

```
cd tools/diag
node sv.cjs ../../../builds/iq-base 4970 &      # today
node sv.cjs ../../../builds/iq-b 4973 &         # B
node sv.cjs ../../../builds/iq-b 4974 --lan --wk &
node iqr9.cjs --ports=off@4970,b@4973            # rest + motion
node r9flat.cjs 4973                             # reduced motion against normal
node r9webkit.cjs http://192.168.1.102:4974
```

## After R9's approval (2026-10-05)

**User decisions (2026-10-05):**
- R9 approved.
- The Linefield words check is to measure ink, not colour, and prove itself with a negative control.
- R29 is fixed, with stills.
- The reduced-motion paint is measured on phones, with whether a cut lags.
- Then R19 as planned, with a comparison for one face or both. Stop for the comparison.

### The Linefield words check (`linefield.cjs`, LEGIBLE; 89da22f)

**What it measures now.** The words are measured by their ink, the way the needle was.
- Each letter's glyph is drawn into a mask from the state's own layout: font, size, baseline, cap band and alignment.
- The ink inside the mask is integrated in linear light (0 is the ground, 1 the ink).
- That is compared with the ink a letter is drawn with: its area times the fill of a letter's row, read from what
  the runtime drew (the corridor or the base program, `A.lfWords`, the spread).

**The extents are measured from ink too.**
- Past the cap line and the last baseline: the rows over the words against the open field beside them.
- The strips: their own ink.
- The side margins: where the type is drawn, not the font's advance (which carries side bearings).

The old extent checks had passed vacuously on "no type found".

**The negative control** is `lfbreak=nowords`, a new break in `breaks.js` that draws every row at the ground's own
width. `A.lfWords(0)` can't do it: at 0 a letter's rows keep the width the base shader gave them, so the letters stay.

| | letters' ink against expected |
|---|---|
| with the words | 0.76–1.16 at every size, both languages |
| words removed | 0.06–0.37 (the check fails, as it must) |

**Result:** `linefield.cjs` passes 180/180: the 148 checks (with "the words are there" redefined) plus 32 new ones.
8da676c passes every positive check; it has no `nowords` break, so its negative control can't run.

### R29: reduced motion's tone rows (abfe37a)

- `mk()` records the amplitude a state was made with (`toneAmp`), because `main.js` moves `amp` at run time.
- The reduced renderer takes a row's tone weight, and `rowGain`'s "does it wave" answer, from it. The rows still lie
  straight; the first-paint plate is unchanged.

Reduced against normal motion (`r9flat.cjs`):

| | DPR 1 | DPR 1.5 |
|---|---|---|
| Full-Stack | −13.6% → **+0.8%** | −3.8% → **−0.2%** |
| Creative | −6.3% → **+1.2%** | −9.2% → **+0.8%** |

**Stills** (`r29stills.cjs`, `out/iq/r29/R29-<face>-1440x900@<dpr>.png`): normal motion, reduced before, reduced
after. Two things show in the "before" panels as much as in the "after" ones, so they predate R29:
- the 2D renderer draws curved rows as stepped segments;
- on Creative, a thin vertical seam in the rows near the list block's left edge and around the V.

### The reduced-motion paint, and whether a cut lags (`r9cost.cjs`)

**The conditions.** While this was measured, another project on the machine was encoding video (`one-grain`,
ffmpeg, about 22% of every core). So:
- the two builds ran interleaved, twice each;
- the paint is also given as main-thread CPU time (CDP `ThreadTime`), which load inflates far less than wall time;
- a cut is timed from `go()` to the first frame after the new place is painted;
- "×4" is Chrome's CPU throttling (Lighthouse's mobile setting), an emulation and not a phone.

| | paint (wall / CPU), before R9 → now | cut, before R9 → now |
|---|---|---|
| 390×844@3 | 10 / 10 → 34 / 24 ms | 27 → **40–52 ms** |
| 375×667@2 | 8 / 8 → 16 / 17 ms | 20 → **30 ms** |
| 1920×991@1 | 46 / 48–65 → 82 / 79–83 ms | 56 → **88 ms** (worst 108) |
| 1440×900@2 | 54–63 / 69–73 → 119 / 86–141 ms | 68 → **120–141 ms** (worst 178) |
| 390×844@3, ×4 | 78–95 → 138–175 ms | 141–176 → **191–247 ms** |
| 375×667@2, ×4 | 56 → 121–133 ms | 109–127 → **194–275 ms** |

- **Phones at full speed:** a cut lands in 30–52 ms. That is immediate.
- **Desktop 1920×991@1:** 88 ms, at the 100 ms line.
- **1440×900@2:** 120–141 ms, just over it. This is the one size where a cut can feel a beat late on this machine.
- **On a phone-class CPU (emulated):** both builds are over 100 ms; B adds 60–100 ms.
- **Not measured on a physical device.**

**The long tasks** in the first runs (300–700 ms) were the harness's own loop of seven paints in a row. In a clean
run (`out/iq/longtask.cjs`), the only long task during a cut is that cut's own paint: 50–82 ms before R9, 65–137 ms
now, at 1440×900@2 under the same load.

**`rowGain` was made cheap anyway.** It is in the same commit as the R19 prototype.
- "Now" is analytic: tents sum to a row's width, so a row's light is `2·hw·R·fade·ΔL`.
- "Before" is averaged over merged row positions (a few dozen instead of up to 400).
- `surface.warm()` pays it in idle time.
- Brightness is unchanged (`iqr9 --rest-only`, all within 0.4%).

**If the cut should be faster:** the 2D path could paint as before at once and mix in linear light on the next idle
frame. The cut would then land at the old speed, with the rows settling a frame later. That is a design decision for
the user.

## R19: the halo at the capsules — the prototype (d401e62 and the cheap `rowGain`)

### The rule

An opening pushes the rows aside, and they crowd against its rim. Each row kept its own width, so the ink per area
rose there, and on Full-Stack the rim read as a halo. Where a state conserves, a bare row is narrowed by exactly the
compression the openings caused, as Linefield's `lfHw` does with its own.

**Only the openings count** (`oc`, accumulated in the shader's feature loop from openings alone). A gather or a squeeze
is meant to close rows into a mass, and is untouched. The pointer's press is an opening too, so its rim conserves as
well.

**Kept as it was:**
- letters keep their width;
- the thin-row fade reads the width before conservation;
- so does the sum of rows packed closer than a pixel.

**Changed where the rule applies:**
- the "fuse into a mass" step is off where the openings compress;
- crowded conserved rows add their coverage, instead of the largest one winning.

`flat.js` does the same in reduced motion.

### For the comparison

The rule sits behind a key, with a badge naming the choice:
- `?r19=system`: Full-Stack only;
- `?r19=both`: both faces;
- `?r19=off`: neither.

Without the key, the output is byte-identical to the previous build (`out/iq/r19ident.cjs`).

### Measured (`iqhalo.cjs`)

Ink per area at the rim, against the same column's open field 140–200 px out (1.00 = conserved):

| | rule off | rule on |
|---|---|---|
| Full-Stack, DPR 1, 0–32 px | 2.9–6.0 | **0.88–0.92** |
| Full-Stack, DPR 2, 0–32 px | 2.1–2.6 | **0.84–0.91** |
| Creative, 8–64 px | 2.0–2.9 | **0.97–1.08** |

- **At 64–128 px Full-Stack still reads 1.25–1.29 with the rule.** Off, it reads 1.5. This is the far end of the
  push's reach (four falloffs, 224 px); the measure's field band may itself sit in the next capsule's reach there.
  Not settled.
- **A harness fault, found and fixed.** The first version took the rim at the first row with ink over 0.2. Conserved
  rows at the rim are fainter than that, so it put the rim 27 px out and reported a 30% deficit that a direct profile
  of the pixels does not have (`out/iq/halodbg.cjs`: 0.08–0.12 per pixel at the rim against 0.098 in the field).

### Sheets (`r19sheet.cjs`)

`out/iq/r19/R19-1440x900@1.png` and `@2.png`. Rows: Full-Stack, Creative. Columns: rule off, rule on. Under each
panel, the left end of the lower capsule's top rim at 4×.

- **Full-Stack:** without the rule, a bright white band around both capsules. With it, the crowded rows are a grey
  of the field's own brightness, and the capsules are read by their void.
- **Creative:** without the rule, a darker band at the rim. With it, the rim fades into the field and the capsule's
  edge is softer.
- **At DPR 1 the conserved, very dense area shows a fine mesh** in the 4× crop (rows closer than a pixel). At full
  size it reads as grey. Whether it shimmers in motion (the ripple, a press) is **not measured**.

### Open, for the user

Is the rule wanted on Full-Stack only, or on both faces? The previews:
- this computer: `http://127.0.0.1:4977/tr?r19=both` (or `=system`, `=off`);
- iPhone: `http://192.168.1.102:4978/tr?r19=both`.

## R19 as the default, on both faces (2026-10-05)

**User decision (2026-10-05):** the rule on both faces. Before it became the default:
- the fine mesh at the rims, measured in motion at DPR 1 with R9's measure;
- the press edge shown as a still and a film;
- the 1.25 explained.

Then: the reduced-motion paint measured again on a quiet machine, R19 made the default, the checks.

### The 1.25 was the word

Profiling every capsule and side (`out/iq/halo125.cjs`) shows the rule on everywhere at about 0.10 ink per pixel, the
field's own, except under the lower capsule. There, 48–80 px out, it reads 0.77 and 0.97: the letters of FULL-STACK
start 28 px under that capsule's rim, and letters are exempt from the rule. `iqhalo.cjs` now stops every band, and the
field band, 4 px above the word's top. With that, Full-Stack reads 0.96–1.09 in every band out to 128 px.

### The mesh in motion (`r19mesh.cjs`, DPR 1, 1920×991 and 1440×900; the prototype, rule off against on)

The zone is 0–40 px out from each rim, in every drawn frame.
- **rows:** R9's measure on the rows the zone can still resolve.
- **dens:** the same rows' ink per their own pitch. With the rule, a row's ink is meant to follow its compression,
  so this is the part of the change that is not the rule.
- **mesh:** where rows are closer than 2 px, the ink in fixed 4 px windows, frame to frame, as a share of the zone's
  ink.

All values are p50 / p90.

| | pointer ripple along the rim | Creative → Full-Stack | Full-Stack → Creative |
|---|---|---|---|
| off, 1920×991 | rows 2.1 · mesh 0.2 / 0.3% | rows 1.0 · mesh 0.3% | rows 0.6 · mesh 0.6% |
| **on, 1920×991** | rows 0.8 · mesh **0.3 / 0.6%** | rows 1.6 · mesh **0.4%** | rows 1.3 · mesh **0.8%** |
| off, 1440×900 | rows 5.5 · mesh 0.2 / 0.3% | rows 1.3 · mesh 0.3% | rows 0.6 · mesh 0.7% |
| **on, 1440×900** | rows 1.4 · mesh **0.3 / 0.6%** | rows 1.9 · mesh **0.4%** | rows 1.8 · mesh **1.2%** |

- **The mesh does not bring the shimmer back.** Every p50 is inside R9's open-field level (0.5–2.2%). The pointer
  ripple, which only moves rows, moves the mesh's ink by 0.3% / 0.6%.
- **The transitions' p90 is high with the rule off and on** (12–128%). During a sweep the zone itself forms and
  dissolves, so that is real change, not shimmer.
- **Healthy captures:** 27–39 frames, and the capacity governor never engaged.

### The press (`r19press.cjs`; `out/iq/r19press/PRESS-1440x900.png` and four films)

A press on open rows opens a window onto the other face.
- **Full-Stack, rule off:** the window's edge carries a bright band, with broken "dashes" at 3×.
- **Full-Stack, rule on:** the edge is a soft grey gradient into the field. The window reads just as clearly, since
  the cream face behind it is the contrast.
- **Creative:** the dark band at the edge becomes a lighter one, and the dark face through the window marks the press.

The films (`fullstack-off.webm`, `fullstack-both.webm`, `creative-off.webm`, `creative-both.webm`) were recorded while
another project's video capture loaded the machine, so their playback may stutter. They are Playwright's recording of
the page, not of the desktop.

### The reduced-motion paint, on a quiet machine (`r9cost.cjs`, 1440×900@2; 8da676c against the final build, interleaved twice)

| | paint (wall / CPU) | a cut |
|---|---|---|
| before R9 | 35–40 / 40 ms | 47 ms (worst 49) |
| now | 72–74 / 81–83 ms | **84–88 ms** (worst 96–102) |

At 1920×991@1 a cut is 89–91 ms (worst 103); before R9 it was 55–58.

**The first visit to a place** in a session is slower, because its masks and brightness factor are built on that
first paint (`out/iq/longtask.cjs`): at 1440×900@2 a cut's paint is 80–178 ms, against 25–128 ms before R9. A
**warm cut is under 100 ms at the median, and a cold one can exceed it.**

**Options, without a deferred blend** (not applied; the user's call):
1. **Warm the reduced-motion renderer like the WebGL one.** `flat.warm()` builds a state's masks; it could also
   compute the brightness factor and the row map for the places next to the current one, in idle time. That takes
   the cold cost off the cut.
2. **Stop reading the picture back.** The ground under the rows is known (paper, the page's colour in an opening, or
   empty), so the mix can write it from the mask alone. That saves one full-canvas `getImageData` and its conversion.
3. **Only touch the scanlines that hold rows,** from the row positions the paint already has.

1 and 2 together should bring a cold cut near the warm one and a warm one well under 100 ms (an estimate; not
measured).

### What changed

- `states.js`: both faces carry `conserve: true`.
- `surface.js`: the `?r19=` key and the badge are gone, and `conserves(st)` reads the state's own flag.
- `flat.js` reads the same flag.

**The default is the prototype's "both":**
- In reduced motion (still, so comparable to the byte) the two builds differ by 42 and 125 bytes. That is exactly
  the default build's own run-to-run difference against itself.
- In normal motion, Ege and Linefield are byte-identical to the prototype without its key (`out/iq/r19final-ident.cjs`).

### The checks (final build `builds/iq-final`, 4971 / 4972 `--lan --wk`)

| check | result |
|---|---|
| `glslcheck`, `compat-ios15`, `npx nuxt typecheck`, `cspboot` (4971, 4972 WebKit, `--dir`) | PASS |
| `r9webkit.cjs` (WebKit 390×844@3 over the LAN, normal and reduced) | PASS |
| `linefield.cjs` | **PASS, 180/180** |
| `cross.cjs` Chrome @2 / @1, WebKit | 1 failed each: "fallback forced (runtime not loaded)", which 8da676c fails too. In WebKit, inside the series, a timing crash (`csLayout()` not ready after 2.5 s); run alone, 37 ok and only the fallback. |
| `csseam.cjs` | PASS |
| `csbenchseam.cjs` on the dev server | **PASS, every boundary 0 px at all four sizes** |
| `csrotate.cjs` Chrome / WebKit | "held → landscape" (2 / 1), as on 8da676c |
| `iqr9.cjs` against 8da676c | R9's results kept (below) |
| `iqhalo.cjs` | Full-Stack 0.96–1.09 in every band; Creative the same, except its first 8 px at 1.23–1.35 |
| `r9flat.cjs` | reduced against normal motion: Ege, Full-Stack, Creative within 2%; Linefield dark +3.9% to +6.3%; rows even |

**R9's results on the final build:**
- **At rest:** the still grounds are even (swing 1.00) and brightness is unchanged.
- **In motion, today → final (p50):** transition 16–33% → 0.6–0.7%; scroll 6–14% → 0.5%; passage 25–29% →
  1.5–3.1%.
- **Ripple: 2.3–2.9%** (before R19: 1.9–2.2%). The ripple's strip crosses the list capsule's reach, where a row's
  ink is now meant to follow its compression.

**Creative's first 8 px (1.23–1.35)** is the capsule's own soft edge, where the ground gives way within a pixel or so.
With the rule off it was 3.1–3.6.

## The reduced-motion paint: options 1 and 2 (2026-10-05, f4d7462)

User decision (after R19's approval): implement option 1 (prewarm the neighbouring places' masks and gain at idle)
and option 2 (write the blend from the mask without reading the picture back); the picture must stay identical; target
every cut under 100 ms at 1440×900@2.

### What changed

- **Option 2 (`flat.js` `groundOf` / `pictureOf`).** The ground under the rows is the state's opaque paper everywhere
  except where an opening's void was filled with the page's colour or cleared, and the canvas's last row and column
  when the ratio is fractional (partly covered). Those places are marked as the paint draws them, in 32 px tiles
  with a pixel to spare, and only they are read back. Every other pixel is written from the paper's colour into one
  output buffer per canvas, reused from paint to paint. A paper that is not a plain `#rrggbb` falls back to the
  whole readback.
- **Option 1.** `flat.warm()` also computes `rowGain` at the key `render()` uses. In reduced motion, `onArrive` queues
  the places on either side for idle-time warming (for Linefield, the passage's two ends, which is what reduced
  motion draws there).

### The picture is identical (`out/iq/flatident.cjs`)

SHA-256 of the canvas at every place (name, About, Creative, Full-Stack, Linefield both ends, Work, Cross Section, Lab)
at 1440×900@2, 1920×991@1, 390×844@3 and 1366×768@1.25 (fractional ratio: the edge rule). Two loads per build, each
the first page of a fresh browser: **36 of 36 identical** (`out/iq/flatident-fresh.log`).

Comparing loads inside one browser is not valid: the text in a mask rasterises a few pixels differently on a
browser's later pages (6–18 pixels, at most 7 levels). Today's build differs from itself in exactly the same way.

### Measured (`tools/diag/flatcut.cjs`, guarded by `quiet.cjs`; 8da676c+R19 on 4971 against f4d7462 on 4973)

Each cut is reported as **shown** (go() to the frame after the destination's first paint) and **settled** (the end of
the last paint the cut caused). The spine is walked out and back twice, 1.5 s apart, so the idle warm-up can run.
The two builds are interleaved, two rounds. The machine is shared with another project whose captures and audits
load it for long periods. `quiet.cjs` waits for 30 s of quiet before each run (load under 25%, other work under
0.1 s of CPU per second) and repeats a disturbed run. Even so, the two rounds ran in different conditions (round 1
slow, round 2 fast), so the builds are compared within a round.

**1440×900@2** (ms):

| | first: shown worst | warm: shown median / worst | settled worst (first / warm) |
|---|---|---|---|
| round 1 (slow), today | 157 | 108 / 175 | 341 / 577 |
| round 1 (slow), new | 176 | 99 / 152 | 290 / 557 |
| **round 2 (fast), today** | **97** | **59 / 100** | 273 / 502 |
| **round 2 (fast), new** | **104** | **49 / 102** | 243 / 494 |

**1920×991@1:** round 2-like conditions: today 94 · 58 / 104; new 106 · 53 / 118. Slow round: today 192 · 95 / 182;
new 183 · 98 / 207.

**390×844@3:** today 96 · 49 / 93 and 49 · 30 / 45; new 51 · 27 / 43 and 50 · 27 / 42.

Per place (1440×900@2, round 2), first visits, today → new:
- Linefield: 68 → 56 (the neighbour warm-up)
- Creative: 78 → 79
- Full-Stack: 97 → 104
- Work: 76 → 64 shown
- Cross Section: 72 → 64 shown

Measured paint by paint inside the page (`out/iq/cutgid.cjs`), the readback falls from 14–23 ms to 10–16 ms
(5.8 Mpx in 2 calls → 3.8 Mpx in about 24). Full-Stack and Creative paint the same or slightly faster.

### The target is not met, and why

1. **Full-Stack's own paint is about 95–105 ms at 1440×900@2,** on both builds and in the best conditions. Most of it
   is the row loop in JavaScript (about 45 ms: the material map, four mask lookups per column per row), then the
   rows' `fillRect`s (about 17 ms), the mask's readback (about 9 ms) and the linear mix (about 13 ms). Options 1
   and 2 do not touch these.
2. **Work and Cross Section paint more than once,** and the picture settles only at the last paint. Both builds do
   this; it was not caused by R9 or R19.
   - **Work** paints three times. The first paint shows the work. The block's measured lines then arrive and
     release its masks (a second, full paint). Its arrival flash (`flash`, 0.02 → 0) then ends about 480 ms after
     the cut, which is a third paint.
   - **Cross Section** paints SURFACE, then DEPTH.

Options, not applied:
- **(a)** Paint the neighbours whole in idle time, into an offscreen canvas, and make the cut a copy (a few ms), keyed
  on the state and its features.
- **(b)** Work: measure the next work's block lines before arrival, and in reduced motion set the flash to its end at
  once. That makes one paint.
- **(c)** Cross Section in reduced motion: draw the side it arrives at directly.
- **(d)** Option 3 (only the scanlines that hold rows): about 10–20 ms off Full-Stack, not enough on its own.

(a) alone would bring every shown cut under 100 ms. (b) and (c) are needed for settled.

## R20: the safety cap and the adaptive ratio — the prototype (2026-10-05)

**Not the default.** It is off unless the address asks: `?r20=on` turns on the cap and the adaptive ratio, `?r20=cap`
the cap alone. A badge at the top right gives the ratio being drawn.

### The rules (`main.js`, `RATIO`, `drawRatio`, `ratioFrame`, `ratioStep`)

The drawing ratio R (backing pixels per composition pixel) was `min(DPR, 1.5) × V.u` (1.75 on a phone).

- **Cap.** The backing store never holds more pixels than a 4K screen (`capPx = 3840 × 2160`). The ratio is lowered
  until it fits. Today this changes only screens larger than 2560×1440@2.
- **Adaptive.** The meter reads the time between consecutive drawn frames while the surface draws every frame (a
  transition, the wave, a passage).
  - **Decision:** when the median over 3 s of such frames (`window`) is over 22 ms (`slow`, under about 45 fps), a
    step is due.
  - **Step:** R × 0.8, taken only at rest. At rest means arrived (`A.p === A.base`), nothing busy, no press or
    shiver, no input for 2 s, not on the Cross Section (its faces are captured from the canvas), and the Linefield
    drive still.
  - **Direction:** only down. Nothing in a session raises it again; a resize keeps the step.
  - **Floor:** R = 1, one backing pixel per composition pixel. A step that would stop less than 12% above the floor
    goes to the floor itself.
  - **Not measured:** phones (composition under 700 px wide) and reduced motion (it draws only on change).
  - **After a step:** the meter waits 1 s, then measures again from empty. It stops at the floor.
- **One constant:** `RATIO.on = false` (in the prototype, no key) leaves everything as it was.
- **The step is done as a resize:** `measure()` and then `rebuild()`.
- **The meter ignores the capacity governor.** A first version skipped measuring while `A.constrained` was set. The
  governor sets it when frames take over 150 ms, which is exactly the screens R20 is for: at 2560×1440@2 the meter
  then never stepped. It now measures either way.

### Measured on this machine (`tools/diag/r20.cjs`; Intel UHD, ANGLE D3D11, headless Chrome)

**gpu** is the GPU's own time for one frame (`EXT_disjoint_timer_query_webgl2`, median of 40). **drawn** is the median
interval between frames the surface draws in a transition. `quiet.cjs` guards every section. The GPU is shared with
the desktop's Chrome, so a level measured twice can differ: the lower figure is given, with the repeat in brackets.

| size | ratio (backing) | gpu per frame | drawn |
|---|---|---|---|
| 2560×1440@1 | **today 1.33** (2560×1440, 3.7 Mpx) | 35.4 ms | 63 ms |
| | 1.00 floor (1920×1080, 2.1 Mpx) | 20.2 ms | 43 ms |
| 2560×1440@2 | **today 2.00** (3840×2160, 8.3 Mpx) | 82.9 ms | 139 ms |
| | 1.60 (3072×1728, 5.3 Mpx) | 53.5 ms | 91 (107) ms |
| | 1.28 (2458×1382, 3.4 Mpx) | 32.8 (45.6) ms | 59 (73) ms |
| | 1.00 floor (1920×1080, 2.1 Mpx) | 20.1 (33.8) ms | 38 (54) ms |
| 3840×2160@2 | **today 2.40** (5760×3240, 18.7 Mpx) | 184 ms | 288 ms |
| | 1.60 the cap (3840×2160, 8.3 Mpx) | 82.0 ms | 148 ms |
| | 1.28 (3072×1728, 5.3 Mpx) | 53.3 ms | 97 ms |
| | 1.00 floor (2400×1350, 3.2 Mpx) | 31.1 ms | 60 ms |

About 10 ms of GPU time per Mpx. That is about twice the 5 ms/Mpx measured before R9: the tent coverage and the
linear mix cost shader time.

**Left alone (`?r20=on`, a transition every 3.5 s):** every step came at rest.
- 2560×1440@1: 1.33 → 1.00 at 2.4 s, arrived on Full-Stack.
- 2560×1440@2: 2.00 → 1.60 at 5.7 s, → 1.28 at 12.8 s, → 1.00 at 16.8 s.
- 3840×2160@2: the cap to 1.60, then → 1.28 at 5.8 s, → 1.00 at 12.8 s.

On this GPU every size goes to the floor, because even the floor's frames are over 22 ms.

**The moment of a step** (`out/iq/r20hitch.cjs`, 2560×1440@1 and @2): `ratioStep()` takes 5–8 ms, and the new ratio
is on screen at the next frame (8–12 ms). There is no stall; what changes is the sharpness, in one frame. Not timed
at 3840×2160@2.

### How it looks (`out/iq/r20/`)

- `R20-SHEET.png`: the same region at every level, at 1:1 device pixels. These are page captures, which is what the
  screen shows after the browser scales the canvas up.
- `<size>-R<ratio>.png`: the stills one by one.
- `<size>-step.webm`: the region captured as fast as the page allows, with a step at 1.2 s.

What the sheet shows:
- **R 2.00 / 1.60:** crisp, full contrast.
- **R 1.28:** visibly softer. At 2560×1440@2 a faint thick/thin rhythm runs through the fine field, from the 1.56×
  scale-up.
- **R 1.00:** the rows go grey and soft, and the letters' rows lose their edge. The softening is clear at
  2560×1440@1 too (1.33 → 1.00).

### Open, for the user

1. **The floor.** At R = 1 the image is clearly soft on a DPR 2 screen. A floor of 1.28 (or relative to the screen,
   e.g. never below 0.64 × DPR) would keep it sharper, and on this GPU stop at about 33–46 ms per frame instead of 20–34.
2. **The threshold.** At 22 ms this machine always goes to the floor. On the user's own 1920×991@1 screen nothing
   changes: R is already 1, at the floor.
3. **The cap at 4K** is a pure gain at 3840×2160@2: 184 → 82 ms, and the picture at 1.60 is still crisp.

### Reproduce

`node tools/diag/r20.cjs 4971 4977 [--cfg=…]` (today's build against `builds/iq-r20`), and
`node tools/diag/out/iq/r20sheet.cjs` for the sheet.

## One paint per cut, and the 4K cap as the default (2026-10-05, f83a74e)

User decisions after the reduced-motion paint and R20's prototype:
1. Reduced motion: (b) and (c), one paint for Work and one for Cross Section, with the same final picture as
   today; skip (a); re-measure every cut, including the time until the picture settles.
2. R20: the safety cap alone as the default. The adaptive ratio stays in the code, off, with its floor raised to
   1.28. The R20 frame-time table is to be repeated on the RTX 4050 once the user has switched Chrome to it.

### What changed

- **Work (`main.js`).**
  - In reduced motion, `lockWork` and `unlockWork` set their tweens' end values at once (lod 0, fill 1, flash 0;
    and back). The cut no longer paints the work half-resolved and then again as the tweens moved.
  - `prePocket(k)`: from the place next to Work, the block is filled with the work the field will show and its
    lines are measured. That is the first work coming from below and the last from above, as `onArrive` sets it.
    The block's layer is hidden and its `on` is held only for the measurement, so the position is the shown one.
    The state's masks are then warmed with the pocket in them, and the arrival no longer releases and repaints them.
- **Cross Section (`cross/place.js` `arrive`).** In reduced motion the arrival from Work goes straight to the band
  (`x = 1`, `p = P[1]`), where the turn would end, instead of painting SURFACE and then the band.
- **R20 (`main.js` `RATIO`).**
  - `on: true`: the backing store is at most 3840×2160 pixels.
  - `adaptive: false`, `floor: 1.28`; a step that would change the ratio by under a tenth is not taken.
  - The `?r20=` keys and the badge are gone. `__lab.ratioAdaptive(on)` switches the adaptive ratio on for a
    harness, and `__lab.ratioStep()` forces a step.

**Paints per cut now** (`out/iq/twopaint.cjs`, 1440×900@2): one each for Creative, Full-Stack, Linefield, Work (first
visit and the return from Cross Section) and Cross Section. Before, Work painted 3 times and Cross Section twice.

### The picture is the same (`out/iq/flatident.cjs`, fresh browser per load)

- **35 of 36 places and sizes are byte-identical to the R19 build.**
- **The 36th, Cross Section at 1366×768@1.25, varies from load to load on both builds.** Over 12 loads
  (`out/iq/final2/dump/`), 11 gave today's picture exactly. One differed in 11 pixels out of 1.6 million, at most 3
  levels, in a 2 px column (x 1206–1207). Today's build shows the same kind of variation: its own hash for this place
  was 72865706… in one run and 82031733… in another. It is the mask text rasterising on the page, not the change.
- **Normal motion:** the cap changes nothing up to 2560×1440@2 (`out/iq/r20probe.cjs`: same backing sizes as today
  at 1920×991@1, 1440×900@2, 2560×1440@1 and @2, 390×844@3). At 3840×2160@2 it is 3840×2160 instead of 5760×3240.

### The checks (`builds/iq-final2`, 4973 / 4974 `--lan --wk`; logs in `out/iq/final2/`)

| check | result |
|---|---|
| `npx nuxt typecheck`, `compat-ios15`, `glslcheck` | PASS |
| `cspboot` (4973; 4974 WebKit over the LAN; `--dir`) | PASS |
| `r9webkit.cjs` | PASS |
| `linefield.cjs` | **PASS, 180/180** |
| `cross.cjs` Chrome @2 / @1 | 1 failed each: "fallback forced", as on 8da676c. The reduced-motion section passes (DEPTH → bench → up arrives at DEPTH, as cuts). |
| `cross.cjs` WebKit | PASS |
| `csseam.cjs` | PASS |
| `csrotate.cjs` | "held → landscape" (2), as on 8da676c |

### R20 on the RTX 4050, next to the Intel UHD (`r20.cjs --only=before,ladder,natural`, `out/iq/r20-rtx.log`)

The user switched Chrome to the RTX 4050 before this round, and the harness browser draws on it too ("ANGLE (NVIDIA,
NVIDIA GeForce RTX 4050 Laptop GPU) Direct3D11"). The earlier R20 table was taken on the Intel UHD.

**Conditions.** The other project's Vite server kept about two CPU cores busy throughout, and no quiet window came in
over an hour. These runs went ahead under load (`QUIET=gpu`).
- **gpu**, the GPU's own timer, is not affected by the CPU's other work. It is the comparable figure.
- **drawn** may be. Here it sits at the display's pace (144 Hz, 6.9 ms) almost everywhere.

The cap is the build's default and the adaptive ratio is off; the levels below the cap are forced (`ratioStep()`) to
the new floor of 1.28. "Today" is 8da676c+R19 without the cap.

GPU time per frame, median of 40 (drawn interval in brackets):

| size | ratio (backing) | **RTX 4050** | Intel UHD (earlier) |
|---|---|---|---|
| 2560×1440@1 | today 1.33 (3.7 Mpx) | **0.9–1.1 ms** (6.9) | 35.4 ms (63) |
| | 1.28: not taken (a step under a tenth) | — | — |
| 2560×1440@2 | today 2.00 (8.3 Mpx) | **2.4–3.1 ms** (6.9) | 82.9 ms (139) |
| | 1.60 (5.3 Mpx) | 1.3 ms (7.0) | 53.5 ms (91–107) |
| | 1.28 floor (3.4 Mpx) | 0.8 ms (6.9) | 32.8–45.6 ms (59–73) |
| 3840×2160@2 | today 2.40 (18.7 Mpx) | **4.1 ms** (8.1, p90 10.3) | 184 ms (288) |
| | 1.60, the cap (8.3 Mpx) | 2.6 ms (6.9) | 82.0 ms (148) |
| | 1.28 floor (5.3 Mpx) | 1.7 ms (7.0) | 53.3 ms (97) |

**With the adaptive ratio on** (`__lab.ratioAdaptive(true)`, a transition every 3.5 s), on the RTX: **no step at any
size**. 2560×1440@1 stays at 1.33, 2560×1440@2 at 2.00 and 3840×2160@2 at the cap's 1.60. Every frame is far inside the
22 ms threshold. On the Intel UHD every size stepped down to its floor.

**What it says:**
- The RTX is 30–45 times faster than the UHD here.
- On it, the only size that missed the display's pace was 3840×2160@2 without the cap (8.1 ms, p90 10.3). The cap
  brings that back to the display's pace.
- The adaptive ratio only ever acts on the integrated GPU. On this laptop that is the GPU Chrome uses unless it is
  told otherwise (Windows' default for a browser is often the power-saving one).

### The cuts after (b) and (c): not yet measured on a quiet machine

The cut measurement (`flatcut.cjs 4971,4973 --rounds=2`, now with the GPU in its output) has waited since 2026-10-05
22:00 for a quiet machine. It needs 30 s with the load under 25% and other work under 0.35 s of CPU per second, and
had not had it by 2026-10-06 01:30: the other project's Vite server and the desktop's Chrome kept the load at 50–90%.
The reduced-motion paint runs on the CPU, so a timing taken under that load measures the load. It is still waiting
and writes to `out/iq/final2/flatcut-rtx.log` when it runs.

What is known without it (`out/iq/twopaint.cjs`): every cut now paints once. Work painted three times before (shown at
about 60–100 ms, settled at 240–580 ms) and Cross Section twice (settled at 130–300 ms). So their settled time should
now equal their shown time, about one paint: 60–110 ms on the Intel figures above.

## R20 final, the last extra paint, and R21's comparison (2026-10-06)

User decisions after the RTX table:
1. R20: the adaptive ratio on by default, floor 1.28, with the 4K cap; one constant still turns both off.
2. The reduced-motion cut measurement waits for a quiet machine tonight, and its result is recorded here.
3. R21: the comparison sheet. STOP for the choice.

### R20 as the default (`main.js` `RATIO`)

`{ on: true, adaptive: true, capPx: 3840 × 2160, floor: 1.28, … }`. `RATIO.on = false` still restores the ratio as it
was. `__lab.ratioAdaptive(false)` switches the adaptive part off for one page, for a harness.
- On the RTX 4050 it never steps (measured above).
- On the Intel UHD, at 2560×1440@2 it steps 2.00 → 1.60 → 1.28 and stops there: about 33–46 ms per frame instead of
  83.
- 2560×1440@1 does not step at all: 1.33 → 1.28 is under a tenth.

### The last extra paint: Work, 0.43 s after the cut

Work's later visits still painted a second time, 430 ms after the cut (`out/iq/workpaint.cjs`). This was an
identical redraw. `lockWork`'s 420 ms timer prepares the work's world, and `prepareWorld` cleared the picture's
signature for the world's frames. On the index in reduced motion no world frame is on screen (no press reveal there),
so the signature is now kept in that one case. Normal motion is unchanged.
**Now 8 cuts, 8 paints** (`builds/iq-final3`, 4973 / 4974).

### R21: Linefield's words on large screens (`tools/diag/r21.cjs`; prototype key `?r21=N` in `linefield/state.js`)

**What the key does.** Past N rows per capital, the words are set smaller and the pitch is unchanged (7 px; 5.2 on a
phone). The block takes less of the field and is centred in it as today. Without the key nothing changes.

**Rows per capital** (backend / frontend where they differ):

| size | composed at | today | limit 24 | limit 18 |
|---|---|---|---|---|
| 390×844@3 | 390×844 | 18 / 12 (capital 94 px) | same | same |
| 1440×900@2 | 1440×900 | 23 (161 px) | 23, unchanged | **18** (126 px) |
| 2560×1440@1 | 1920×1080 at 1.33× | 28 (261 px) | **24** (224 px) | **18** (168 px) |
| 3840×2160@1 | 2400×1350 at 1.6× | 37 (414 px) | **24** (269 px) | **18** (202 px) |

Capitals are given in CSS px. 1920×1080 itself is 28 rows (196 px), the same as 2560×1440.

**Sheets (`tools/diag/out/iq/r21/`, page captures, normal motion, the passage held at 0, 0.22, 0.72 and 1):**
- `<size>-overview.png`: the whole screen at the four points.
- `<size>-1to1.png`: the first word of each side at rest, 1:1 device pixels.
- `<size>-same.png` and **`R21-SAME.png`**: the same word at one letter size (capital = 120 px) for every size and
  variant. This is the "same physical letter size" view: how many rows make a letter, with the letter's size taken out.

**What the sheets show:**
- **The phone is untouched by either limit.** Its 18 / 12 rows are set by the minimum of 12 and the phone's pitch.
- **Limit 24 changes only 1920 wide and up.** At 4K the words go from 37 to 24 rows, and the block from about 80% of
  the field's height to about 55%.
- **Limit 18 also reaches the 1440×900 laptop** (23 → 18). On every size from there up, it makes the letters about
  as coarse as the phone's backend words.
- **At one letter size:**
  - 37 rows at 4K read as a fine, grey screen in which the rows themselves almost disappear.
  - 24 rows read like 1440×900 today.
  - 18 rows read like the phone.
- **One composition detail with a limit.** The block centres in the field, but the label above it (BACKEND —
  NASIL DÜŞÜNÜRÜM) stays at the top strip, so a gap opens between them at 4K (the 1:1 sheet shows it: the label is
  above today's word and out of frame with a limit). If a limit is chosen, the block could be set under the label
  instead (an option, not built).
- **Mid-corridor:** the flying words scale with the block, so a limit makes them smaller as well. Their row
  structure follows the same rule.

Waiting for the user's choice: today, 24 or 18, and whether the block should sit under its label.

**The picture on the final build (`builds/iq-final3`; `out/iq/final3/flatident.log`, fresh browser per load):** 33 of
36 identical in the two loads per build. The three that differed were all Cross Section, at 1440×900@2, 1920×991@1
and 1366×768@1.25. More loads (`out/iq/final3/dump/`, 1440×900@2): 7 of 8 loads of the new build gave today's picture
byte for byte, and the eighth differed in 3 pixels by 1 level, in a 2 px column (x 1171–1172). Today's build varies in
the same place (18 pixels at x 1044–1177 between two of its own loads, 2026-10-05). It is the Cross Section's mask
text rasterising, not a change in the picture. Today's own hash for this place also changed from one day to the next
(be9cd15… → 1106250…).

**The checks on `builds/iq-final3`:**
- PASS: `linefield.cjs` 180/180, `npx nuxt typecheck`, `compat-ios15`, `cspboot --dir`.
- The Cross Section, seam and rotation checks were run on iq-final2 (above). Since then only `prepareWorld`'s
  signature (reduced motion, index), the ratio's `adaptive` flag and the R21 key (off without it) have changed.

**The cut measurement** (`flatcut.cjs 4971,4973 --rounds=2`, today against iq-final3) is waiting for a quiet machine.
It writes to `out/iq/final3/flatcut.log`; the result goes here when it has run.

## R21 as the default: 24 rows per capital, the block under its label (2026-10-06)

User decision: limit 24. Move the word block under its half label so the two stay together at every size. Keep
everything unchanged where the limit does not apply (laptops and phones pixel-identical to today).

### What changed (`linefield/state.js`)

- `MAX_ROWS_PER_CAP = 24`. The `?r21=` key is gone.
- **Where a capital would take more than 24 rows (`limited`):**
  - the words are set at 24 rows, at the same pitch;
  - the first baseline is hung from the label: the top of the cap line sits at the label's bottom, rounded down the
    row grid, never up into the label.
- **Where it would not:** the code path is the old one, line for line.

### Where it applies (`out/iq/r21probe2.cjs`: today against the new default)

| size | rows per capital | the words' top under the label | clear of the strips (top / bottom, comp. px) |
|---|---|---|---|
| 390×844@3, 844×390@3, 1366×768, 1440×900@2 | unchanged (18/12, 12, 19, 23) | unchanged | unchanged |
| 1920×991@1 (the user's screen) | 26 → **24** | 3 px | 59 / 77 |
| 1920×1080@1, 2560×1440@1 | 28 → **24** | 1–8 px (today 8) | 59–66 / 159–166 |
| 3840×2160@1 | 37 → **24** | 6 px (today −8) | 73 / 422 |

**Laptops and phones are pixel-identical** (`out/iq/lfident.cjs`, WebGL readback, normal motion, the passage at 0,
0.22, 0.5, 0.72 and 1).
- **390×844@3, 844×390@3, 1366×768@1 and 1440×900@2:** identical. The only differences were 267 bytes once on the
  phone at 0.72, which did not repeat, and 1 byte at 1366×768 at 0.72. Today's build shows that same byte against
  itself.
- **1920×991@1:** differs at rest and in the corridor, as intended. It is identical at 0.5, the collapse line.

**Sheets (`out/iq/r21-final/`, today against the new default, at 1920×1080, 2560×1440 and 3840×2160):** the block
hangs under its label at both rest states. The words in the corridor carry the same 24-row structure. At 4K the lower
half of the field is left as ruled ground.

### The checks (`builds/iq-final4`, 4977 / 4978 `--lan --wk`; logs in `out/iq/final4/`)

| check | result |
|---|---|
| `linefield.cjs` | **PASS, 180/180** |
| `lfwords-locale.cjs`, `lfseam.cjs` | PASS (28/28; seam) |
| `lfwords.cjs` (dev server, debug entry) | PASS: every word complete at every moment of its flight |
| `lfmargin.cjs` (dev server; with 1920×1080, 2560×1440 and 3840×2160 added) | the words clear the 50 px strips at every size: top 93–152, bottom 81–1268. Portrait phones: "no words found" in this harness; their picture is byte-identical to today's (above). |
| `lfresponsive.cjs` phones, tablets, laptops | all clean |
| `lfresponsive.cjs` wide | 24 rows at every wide size; one check off, `rust50` at 1920×1080 ("mouth at full depth"), **identical on today's build** (same apertures to the decimal) |
| `cross.cjs` Chrome @2 / @1 | 1 each, "fallback forced", as on 8da676c |
| `cross.cjs` WebKit | 1 in the series ("warm: one gesture up arrives at DEPTH"); **PASS run alone** |
| `csseam.cjs`; `csrotate.cjs` | PASS; "held → landscape" (2) as on 8da676c |
| `r9webkit.cjs`, `iqhalo.cjs` | PASS; Full-Stack 0.96–1.09, Creative's first 8 px 1.23–1.35, as at R19 |
| `npx nuxt typecheck`, `compat-ios15`, `glslcheck`, `cspboot` (4977, 4978 WebKit, `--dir`) | PASS |

**The round is complete except the reduced-motion cut timing.** `flatcut.cjs 4971,4977 --rounds=2` is waiting for a
quiet machine and writes to `out/iq/final4/flatcut.log`.

## The reduced-motion cuts, measured for the release (2026-10-07, `out/iq/release/flatcut.log`)

**Setup:**
- `flatcut.cjs 4975,4977 --rounds=2`: the live package `yucelemrah-df5ab32.zip`, unpacked as is (SHA-256
  9a627488d516721a…), on 4975, against `builds/iq-final4`, the release content, on 4977.
- RTX 4050, headless Chrome.

**Conditions:**
- The other project was stopped.
- The desktop's Chrome stayed open at the user's request (`QUIET_CHROME=ignore`; the processor's load still had to
  fall under 25% before each run).
- Both builds ran side by side, so the comparison holds. The absolute numbers are about 1.8× those of the quiet run
  on 2026-10-05: Full-Stack's paint was 68 ms on the live package, against 35–40 then.

ms: shown / settled. Median and worst over the warm cuts; worst over the first visits. Two rounds:

| size | | first visit, worst (shown / settled) | warm, median shown | warm, worst (shown / settled) |
|---|---|---|---|---|
| 1440×900@2 | live df5ab32 | 82–89 / 209–212 | 35–39 | 65 / 483–485 |
| | **release** | 135–182 / **152–198** | 100–114 | 167–170 / **183–186** |
| 1920×991@1 | live df5ab32 | 96–97 / 260–269 | 44–47 | 77–81 / 492–525 |
| | **release** | 106–161 / **122–177** | 70–84 | 108–179 / **125–195** |
| 390×844@3 | live df5ab32 | 35–46 / 134–153 | 16 | 25–27 / 458–460 |
| | **release** | 66–101 / **82–118** | 26–34 | 46–73 / **62–90** |

**What it says:**
1. **One paint per cut.** On the release a cut settles one frame after it is shown, everywhere. On the live package
   Work settles 0.4–0.5 s after the cut (three paints) and Cross Section after two paints.
2. **The final picture now arrives sooner than on the live site, at every size:**
   - 1440×900@2: worst 198 against 485 ms.
   - 1920×991@1: worst 195 against 525 ms.
   - Phone: worst 118 against 460 ms.
3. **The first picture arrives later than on the live site.** That is R9's cost: the rows are mixed in linear light
   over the whole canvas. Full-Stack paints in about 175 ms against 68 ms in these conditions; on a quiet machine
   (2026-10-05) it was about 100 against 40.
4. **The target "every cut under 100 ms at 1440×900@2" is met on the phone** (worst 46–73 ms, settled 62–90). It is
   not met at 1440×900@2 or 1920×991@1, where Full-Stack's own paint is the limit. The option that would meet it,
   painting the neighbours whole in idle time, was set aside by the user (option (a)).
