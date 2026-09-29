# LINEFIELD — the backend → frontend corridor

The source of truth for this feature. `docs/reference/linefield-v2.html` is the approved visual and behavioural
reference; this document records what was built, what was decided, and what is still open.

## The flag

`__LINEFIELD__`, a build-time define (`nuxt.config.ts`). Off in every published build.

    NUXT_PUBLIC_LINEFIELD=1 npm run generate    the preview artifact
    npm run generate                            the published build

Every Linefield module sits behind a dynamic `import()` inside a branch guarded by the define, so a build with
the flag off never emits their chunk. Verified on the published build: **0** occurrences of `LINEFIELD`,
`linefield`, `uLFinv`, `CORRIDOR_PATCH`, or any of the eight words. What remains is the general `variant()`
mechanism in `surface.js` — a few hundred bytes that belong to the runtime, not to this feature.

## Phase B — the corridor

### Why a homography

The reference bends the field with `pow(t, 1 + 1.7 * d)`. That looks right and is not a perspective: no closed
inverse, no closed gradient. C2 does not draw rows — it asks, per pixel, *which row is here*, and then decides
how to anti-alias it, when to fuse it with its neighbours and when to drop detail. **Every one of those
decisions is made from the gradient of the map.** Estimated by finite differences, they would be out of focus
exactly where the rows converge, which is the one place shimmer is unforgivable.

A homography is a real perspective, its inverse is another homography, and its Jacobian is four lines:

    du/dx = (a - g*u) / w        du/dy = (b - h*u) / w
    dv/dx = (d - g*v) / w        dv/dy = (e - h*v) / w

So the shader maps the screen point **back** to the flat field and hands that exact gradient to the machinery
C2 already has. Nothing in the anti-aliasing or the fusing was rewritten for the corridor.

### How it is wired

`surface.js` gained two hooks in its one fragment shader — `VARIANT_PARS` and `VARIANT_WARP` — and a
`variant(name, patch)` that links a second program from the same source with those hooks filled. The base
program pays nothing: not a uniform, not a branch, not a line of the variant's GLSL.

- `engine/c2/linefield/corridor.js` — the quad, the inverse, the Jacobian, the fade, the collapse, the GLSL.
- `engine/c2/linefield/state.js` — the two fields and the sequence, read off the reference's timeline.
- `engine/c2/linefield/debug.js` — `?linefield=1`, its own canvas and surface, a progress slider. **No
  navigation is touched in Phase B**; the spine, the stops and the gestures are not involved.

### Decisions made while building

- **No wave.** Every other state carries one. At this pitch a letter is carried by twenty-odd rows and
  displacing each of them tears the letterform apart — measured at `amp` 0.18 the words were present and
  unreadable. The corridor supplies the movement instead.
- **Per-state row pitch**, from the cap height rather than the page: 24.2 rows per capital at 1440×900, 17.8 at
  390×844, against the reference's rule of at least nine.
- **The word flow is a per-band content offset**, decided by nearest band and not blended. Blended, a word had
  a different offset at its cap and at its baseline, and sheared.
- **The collapse divides, it does not multiply.** The shader runs the pipeline backwards, so a collapse applied
  before the projection must be *un-done* after un-projecting. Multiplying drew a starburst — the lines of
  constant field height in a corridor are the rays through its vanishing point. It looked deliberate.
- **The font is checked by width, not by `fonts.check`** — ported from the reference, and it reports `loaded`.

### Measured

| | 1440×900 | 390×844 |
|---|---|---|
| frame time over a full sweep, mean | **0.22 ms** | 0.12 ms |
| worst single frame | **0.70 ms** | 0.40 ms |
| rows per capital | 24.2 | 17.8 |

60 fps allows 16.7 ms. No page or console errors in either layout.

### The shimmer measurement is NOT yet honest, and this is why

The moiré metric from the earlier plate work reads **0.00%** on a crop of this field with no type in it — a
cleaner ruled field than the bed that metric was written for, which measured 5.6%. That is the part worth
keeping.

It does **not** transfer to the rest of this scene. On a whole frame it reads 25–32%, and on a corridor crop
17.75% — but a Linefield frame contains four enormous blocks of type, and a corridor's row spacing varies
across the frame *by design*. The metric measures how much high-frequency energy varies across a frame, so it
reads both of those as structure. Reporting those numbers as shimmer would be reporting the words and the
perspective as a fault.

**What is still needed** is a temporal measure — high-frequency energy at matched progress between consecutive
played frames — rather than a spatial one. Until it exists, the claim that the corridor does not shimmer rests
on the frames and on the Jacobian being analytic, and is stated as such.

---

# PHASE B, REVISION 1

## What was wrong, and what it actually was

**The passage filled the screen with rust.** The collapse was left to the rows: magnify the field far enough
and every row lands in one band, and the shader's crowding rule turns that band solid. What it turned solid was
the *whole screen* — every pixel found a row, coverage went to one everywhere, and the signature moment played
as seconds of full-frame orange. Two separate faults: the rust was mixed into the state's ink (so it tinted
every row on screen, not one line), and the line itself was a fused mass, which cannot be made thin.

Now the rows carry the collapse while they can still be told apart and hand over to a line this feature
**draws** — one or two pixels on the ground colour, and the only thing that takes the accent.

**The corridor had no depth because the rows were faded, and then because they would not thin.** Three causes,
found in this order:

1. A contrast fade wherever screen-space row spacing fell below a couple of pixels. It removed the moiré and
   the corridor with it. Gone: the shader's own coverage answer is the right one and the fade was the only
   thing preventing it.
2. **C2 gives every row the same width in screen pixels wherever it is.** Correct for a field that is mapped
   vertically — the rows move, they do not recede. In a corridor the spacing shrinks with distance and the
   width does not, so the proportion of ink climbs toward one and the far half fills in solid.
   `VARIANT_HW` divides the width by the map's own gradient, which keeps the ink-to-ground ratio constant.
3. **The crowd-fusing put the width straight back.** That rule exists so rows pressed closer than the eye can
   part them are seen as what they add up to — right for a gather, wrong for a corridor. `VARIANT_FUSE` turns
   it off for this variant only.

Both are `#define`s with defaults in the base shader, so nothing changes for any other state.

## Measured

| | 1440×900 | 390×844 |
|---|---|---|
| frame time, mean over a full sweep | 0.55 ms | 0.19 ms |
| worst single frame | 2.60 ms | 0.70 ms |
| rows per capital | 24.2 | 17.8 |
| wheel notches end to end | **20** | — |
| one word's journey | **4 notches** | — |
| touch distance end to end | — | **1266 px, 1.50 screen heights** |

### The flag-off gate, against `pre-linefield`

| | |
|---|---|
| reduced motion, every stop | **pixel-identical, 0** |
| normal motion, worst | 15.24 — inside the documented same-build weather band; **0 state differences** |
| retired Lab | **0 frames**, all four journeys |

`variant()` and its uniform helpers are now behind `__LINEFIELD__` as well, so with the flag off `surface.js`
installs none of them.

### The shimmer measure is built and is NOT yet trustworthy

`tools/diag/lfshimmer.cjs` asks the right question — it steps the scene by a sixth of a per cent and compares
how much the converging third of the frame moves against how much the open third moves, which is a temporal
question and not a spatial one. On the real build the worst ratio is **7.19**.

**Its calibration failed.** The deliberately broken builds read 6.76 (`--break fade`) and 7.19
(`--break jacobian`) — the second identical to the real build to three figures, which means that break is not
being applied at all rather than that the measure cannot tell them apart. Until a broken build reads clearly
higher, **no shimmer claim rests on this number** and none is made here.

## Still open after this revision

- **The vanishing point is not sharp.** The field is dark and the rays reach far in, but they resolve into a
  soft wash rather than the reference's crisp wedge. The lever is the corridor's compression ratio — the far
  edge and the near opening — not the shading.
- **Moiré arcs around the opening onto cream are reduced, not gone**, and the faint colour fringes have not
  been isolated to a cause.

---

# PHASE B, REVISION 2 — THE DENSITY WAS THE PROBLEM

The gap to the reference was structural, not a matter of compression. The reference has perhaps eighty rows
with wide gaps; this field is ruled for TYPE — a capital carried by twenty-odd rows, or it cannot be read on a
phone. Sent whole down a corridor, hundreds of rows land inside a few pixels, add up to a wash, cross-hatch
into moiré, and bury the vanishing point. No compression ratio turns that density into a wedge.

## The field thins as the corridor forms

`VARIANT_ROW` — a third `#define` hook in the base shader, defaulting to "draw every row". The corridor's
definition keeps every Nth row and takes the rest out, **by index**, so the rows that stay are the same rows
throughout: nothing slides and nothing pops. It follows the WORDS, not the corridor — dense while there is type
to carry, sparse once it has flowed past, dense again as the frontend words arrive — over about a sixth of the
passage at each end.

## The three variants

Selectable on the dock (a thumb-sized button) and by `?lfv=A|B|C`.

| | keeps | far edge | near opening |
|---|---|---|---|
| A | every 4th row | 0.07 H | 0.30 W / 0.34 H |
| **B** (default) | **every 6th row** | 0.05 H | 0.26 W / 0.30 H |
| C | every 8th row | 0.035 H | 0.22 W / 0.26 H |

The compression is tuned per variant: a sparser field tolerates — and needs — a tighter far edge before the
vanishing point reads.

## Measured

Frame time at 1440×900 over a full sweep: **0.31 ms mean, 0.70 ms worst**. 20 wheel notches end to end, 4 for
one word's journey, 1266 px (1.50 screen heights) of drag on the phone.

## The temporal shimmer measure has now failed three times, and I am not going to claim it works

Three statistics have been tried against four builds — the real one and three deliberately broken
(`dense`: no thinning; `fade`: constant row width and fusing restored; `jacobian`: a six-pixel finite
difference in place of the exact gradient):

| statistic | outcome |
|---|---|
| near-region movement ÷ open-field movement | a solid wash MOVES LESS, so the broken build scored better |
| the same, with a one-pixel finite-difference break | a homography is smooth; the break was nearly a no-op |
| grain of the frame-to-frame difference ÷ its mean | 0.59–1.14 across all four builds; no separation |

**What does discriminate is a spatial measure**: high-frequency energy inside the converging third of the
frame reads **14.45** on the real build and **33.41** with the thinning disabled — 2.3× — and it separates the
density fault cleanly. That is not the temporal measure that was asked for, and the difference matters: it can
say the frame is not cross-hatched, and it cannot say the frame is not boiling between frames.

So the claim that the corridor does not shimmer rests on the frames, on the exact Jacobian, and on that
spatial number. A working temporal measure is still owed.

---

# PHASE B, REVISION 3 — THE DEMO'S MAPPING

## Why the homography had to go

A homography maps straight lines to straight lines. The demo's motion **begins with the rows flexing** — their
ends curving away before they become rays — and that bend is where its breathing quality comes from. A
projective map cannot produce it at any setting, so the previous version could match the demo's end frames and
never its movement.

## The demo's map, inverted

    s  = tt ^ (1 + 1.7 d)          tt = t on the dark side, 1 - t on the cream side
    fx = t W                       fy = vy + (y0 - vy) cc
    px = vx + (Ex - vx) s          py = vy + (Ey - vy) s,   Ey = vy + (y0 - vy) 3.4 cc
    screen = mix(flat, persp, d)

**X depends only on t.** That is the whole reason this is affordable: the inverse is a one-dimensional root
find, not a two-dimensional one, and the row then falls out in closed form —

    A = (Y - vy) / G,   G = 1 + d (3.4 s - 1)        y0 = vy + A / cc

X(t) is monotonic on both sides, so Newton from the flat position converges fast and cannot leave the branch.

**Iteration count and residual**, measured on the CPU with the same arithmetic the shader runs, worst case over
the map's reachable range at 1440 px wide:

| Newton steps | worst residual at d = 1 |
|---|---|
| 2 | 88.8 px |
| 3 | 9.94 px |
| 4 | 0.234 px |
| **5 (shipped)** | **0.0056 px** |
| 8 | 0.00013 px |

At shallower depths five steps gives 10⁻¹³ px. **The inverse only exists inside the corridor's image** — at
full depth X(0) is vx, so no t maps to a column beyond the vanishing point; measured across the whole frame
the "residual" is just the distance to the nearest reachable column (144 px = vx exactly), which says nothing
about the iteration. Outside the range the field's own edge fade covers it.

The Jacobian is analytic from the forward map and feeds the existing anti-aliasing, fusing and level-of-detail
logic unchanged.

**The collapse is the fan closing.** cc scales every row toward the horizon inside this map, so phases 3 and 4
are one movement and there is no separate gather. The drawn line still takes over for the last of it and is
still the only thing that takes the rust.

## The field has an extent

C2 makes a row wherever the material coordinate lands; the demo has sixty-odd rows and no more. Rows from far
above and below the screen were being mapped into the corridor and piling up around the vanishing point — a
grey halo the demo does not have, and the clearest remaining difference in the side-by-side. The field is now
given the demo's own extent, 0.07 H to 0.93 H.

## The type is aligned to the row grid

The previous revision clipped each line to its cap-to-baseline box, inset by a third of a row. It removed the
grazing arcs and it also removed a third of a row from the top of **every** letter — and where a row sat near
the cap line it took the whole top stroke with it. On the phone FRICTION read **FRICTIUN**.

Nothing is cut now. The cap height is rounded to a whole number of rows and the baseline snapped half a row off
the grid, so the cap line and the baseline both fall on row boundaries: every row inside a letter is entirely
inside it, no row can graze an edge, and no stroke is trimmed. Verified at 100% progress on 1440×900, 390×844
and 320×568.

## Measured

| | |
|---|---|
| frame time, 1440×900 | 3.2 ms at the corridor's hardest frame; 0.3 ms typical |
| frame time, 390×844 | 4.4 ms at rest, under 1 ms through the corridor |
| high-frequency energy at the convergence | **5.85** desktop / **7.32** portrait |
| the same with the thinning disabled | **16.62 / 17.14** — 2.8× and 2.3× |

The spatial measure is kept as the regression check for the density fault, as asked. The temporal measure is
dropped; motion quality is judged on the device.

### Flag-off, against `pre-linefield`

| | |
|---|---|
| reduced motion | **pixel-identical, 0 on every stop** |
| normal motion | worst 19.3 — the documented same-build weather figure; **0 state differences** |
| retired Lab | **0 frames** |
| published build | 13 pages + 404; **0** occurrences of any Linefield marker or word |

## The three variants

They differ in **N alone** now. With the demo's mapping the compression is the demo's — its vanishing points,
its 3.4 far-point spread, its 1.7 curve exponent — and those are not ours to tune. A: every 4th row.
B: every 6th. C: every 8th, the tentative default.

---

# PHASE B, FINAL REVISION

## Words keep their weight in the corridor

Two faults, both from treating type as ground.

**The thinning was taking rows out of the letters.** It is for the GROUND — a field ruled for type cannot be
sent whole down a corridor — but a word is not ground. At 28% with N = 8, seven rows in eight were being
removed from a letter while it flowed past, which is why the reference had a thick bright bar and we had a
thin grey ghost. `lfKeep` now returns 1 wherever the sample is inside a letter.

**And the depth division was thinning them too.** Ground thins with distance so the ink-to-ground ratio stays
constant; the reference does the opposite for type — a segment is
`P · 0.62 · ((1-d) + d(0.1 + 1.9 s)) · (0.35 + 0.65 cc)`, so it WIDENS toward the viewer. Both macros now take
`solid`, and `lfHw` applies the reference's widening law to type and the gradient division to ground.

## Ink at rest

At rest `ws = 1` and `cc = 1`, so the segment is `P · 0.62` — the reference's rule exactly, by construction.
Confirmed at 1:1 in `INK-demo-top-ours-bottom-1to1.png`: solid ink bars with thin cream gaps.

**Three attempts at a single comparable number all measured something else** and are recorded so the next
person does not repeat them: block coverage is confounded by our larger type (ours read 1.42–1.52× the
reference's on three of four frames, 0.81× on the fourth); the 90th-percentile column spans all four lines, so
it reads 26% for the reference against its own 62% rule; a single-line band includes the spaces between
letters. The mid-grey in the pair recording was the video downscale, not the render.

## The field is full height at rest

The reference's 0.07–0.93 H extent removed the halo at the vanishing point and left empty bands at rest, so the
ground read as a panel behind the words. The extent now arrives with the depth and leaves with it.

## The grain and the seam on the cream side

**Catastrophic cancellation.** Everything was solved in `t`; on the cream side the vanishing point is at
t → 1, and `1 - t` in float32 throws away most of its significant digits exactly where the map is most
sensitive. The seam was the line where that began to bite.

Everything is solved in **q** now — the reference's `tt`, the distance from the vanishing point, so q → 0 at
the point on both sides and no two nearly equal numbers are ever subtracted. Verified clean at 60/70/80% on
390×844 and 320×568.

## Margins and strips

The block is sized and centred on its TRUE extent — `(n-1)` leadings plus one cap height, not `n` leadings —
inside `strip + air` at both ends, and the grid snap is corrected afterwards in whole rows so the alignment
survives. Measured at 1440×900: left 93, right 885 (backend); right 211, top 89, bottom 93 (frontend), against
a 50px strip. At 390×844, 320×568 and 844×390 the words clear both strips; confirmed from the stills.

**The margin harness is not trustworthy on the phone viewports and its numbers there are not quoted.** Its
detector has been wrong three ways: it measured the debug dock (a constant 18px bottom margin in every
viewport), then the ruled field itself at 844×390, then nothing at all when the bar was raised. What the
stills show is what is reported.

## Measured

| | real | thinning disabled |
|---|---|---|
| HF energy at the convergence, desktop | **6.99** | 16.76 |
| portrait | **7.46** | 17.02 |

Flag-off against `pre-linefield`: reduced motion **pixel-identical**, normal worst 20.45 with **0 state
differences**, retired Lab **0 frames**, published build **0** Linefield markers.
