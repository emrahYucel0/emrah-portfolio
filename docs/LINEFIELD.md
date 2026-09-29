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
