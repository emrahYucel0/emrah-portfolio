# Known issues

Things that are wrong, understood, and deliberately not fixed yet. Each one says what was tried, so the next
attempt does not start from zero.

---

## İstanbul Şehir İçi — the heading is printed twice during the opening reveal

**Where** Entering the first project on a phone. For roughly the first third of a second of the release, the
capture's own heading appears twice: once whole, once clipped, offset just above it. Most legible on this project
because its hero type is the largest of the three; the same mechanism is present on all of them.

**What it is not.** Only one media element is shown during the release — checked by counting `#media .on`
through the transition. Both copies are drawn by the **surface**.

**What it is.** A work's preview is drawn into the work field as two interleaved fragment sets, one per row set
(`drawFragments(tone, fa, …)` and `drawFragments(solid, fb, …)` in `states.workState`). Out of register they are
fragments; in register they assemble into one picture. The release opens the material from the press point, which
pushes the rows out of register — so for as long as that takes, the two sets are visible as two offset copies of
the same capture. On a phone the preview is the full-width capture, so that is the whole top of the screen.

**Three fixes tried, all reverted:**

| Tried | Result |
|---|---|
| Fade the work state's `vis` as the material leaves | The value animates (0.79 → 0.19 → 1, confirmed live). The doubling stays: `vis` scales row ink, not the registration of the two sets. |
| Hold the released media back until the opening has grown (0.42 s) | The gate works (`#media .on` is 0 then 1). The doubling stays, which is how we learned both copies are the surface's. |
| Keep the index's `surface.fill` at 1 through the release | **Much worse** — a completely blank cream screen at 488 ms. `fill: 0` during the release is what lets the media show through the material at all. |

**What a real fix probably needs.** Either the work state holds its registration through the release rather than
being pushed out of it, or its two fragment sets are merged for the duration (the state's own `fill`, `J.w` in the
shader, is the lever — raising it was tried at 0.22 s and did not take; it likely needs to be set before the
opening starts rather than tweened into). Both change how the work field behaves for every project, so it wants
its own pass and its own review, not a polish commit.

**Recorded** 2026-09-26, on `fix/site-polish`. Evidence: `tools/diag/projenter.cjs 4500 0 390 844 tr`.

---

## Ege Eşya — the full-screen frame shows only the top of a tall capture

**Not a defect; recorded because it reads like one.** The third frame of the `scale` rhythm carries the published
page as material and cuts slits through it ("the surface never leaves: it is a publishing architecture"). On
portrait it already uses the phone capture — verified from the live element: `currentSrc` is
`ege-esya-mobile-640.webp`, `V.P` true, `object-fit: cover`, `object-position: 0% 0%`. A full-page phone capture
is several screens tall, so covering one screen shows its header and hero, and the slits cut that into bands.

Changing it is an art-direction decision about that frame, not a bug fix.
