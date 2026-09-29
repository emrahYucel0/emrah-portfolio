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
