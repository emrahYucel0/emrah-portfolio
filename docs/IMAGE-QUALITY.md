# Image quality round (R9, R19, R20, R21)

Branch `feature/image-quality`, worktree `../emrah-portfolio-iq`, cut from 8da676c (live: df5ab32). Ports 4970–4979,
builds `builds/iq-*`, harness output `tools/diag/out/iq/`. `docs/ROADMAP.md` holds the decisions; this file holds
the plan, the measurements and what they mean.

## Order (user decision 2026-10-04)

1. R9 step 1: measurement only, no engine change. **Done, below.**
2. R9 fix prototype: A / B / C switchable, judged by eye on the user's DPR 1 screen and iPhone.
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
