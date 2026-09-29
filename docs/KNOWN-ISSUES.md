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

---

## Removed check: `tools/diag/edge.cjs` (WEIGHT's rotated type at its cell edges)

**Deleted 2026-09-26, deliberately. The WEIGHT study is correct as it stands; the check measured intended behaviour.**

The harness was rebuilt from a written description after the original was lost, and the description contradicted the
code. It said "each cell clips its own box"; `StudyWeight.vue` sets `.study-weight .cell { overflow: visible }`, so
the cells never clipped. The words crossing their cell rules is the study — it is the thing WEIGHT is about — and
both of the harness's measurements counted exactly that:

- *pixels dark on a cell boundary* — ink on a boundary that is not a clip, and it could not tell whose ink it was,
  so a neighbour's word counted as the cell's own.
- *own word past its own cell box* — the intended overflow, measured correctly and uselessly (84 of 144 cells).

Its recorded numbers could not be reproduced either: the study has exactly 6 cells at every viewport, so the
recorded 288 checks implies twice the sample points, and the flagged ratio was 43% against 17%. Tuning the numbers
until they matched would have manufactured a baseline rather than restored one.

Nothing about WEIGHT needs fixing. If a check is ever wanted here, it has to start from a stated intent — which
rows of type may leave which box, and where a reader would call that a defect — and not from a pixel scan.

---

## İstanbul Şehir İçi — the name in the bottom strip can land on a light part of its own capture

**Found 2026-09-26 by `tools/diag/panelfit.cjs`, which was written for a different bug. Not caused by any change on
this branch; the frame is untouched.**

`authored`'s first frame shows the work whole — the capture fills the screen between the strips — and sets the
project's name and strength in the **bottom strip** (`stripTitle`, class `wb-strip`). Inside a project
`stripTones()` returns `['media', 'media']` (`main.js:1204`), so the strip is deliberately transparent: the chrome
steps out of the way and lets the work through. The type stays `--paper`.

So the name's legibility depends on what part of the capture happens to sit under the strip at that viewport:

| viewport | worst contrast behind the name |
|---|---|
| 1920×1080 | 5.49:1 — passes |
| **1440×900** | **1.00:1 — the background is the same luminance as the type; 97% of the pixels behind the line fail AA** |
| 1280×720 | 5.44:1 — passes |

Both languages, identically: the text is the same colour as what is behind it, so nothing is readable at that one
size. It is not a layout overflow — the line is inside its box. It is light type on a light photograph.

**Why it is not fixed here.** Every remedy is an art-direction decision on a frame this brief did not cover:
a scrim behind the strip, a tone for the strip inside a world (which is the thing `stripTones` deliberately turns
off), or moving the name off the capture. Choosing one silently is what produced three rounds of patching on
Evden Eve's opening.

**How the gate treats it.** `panelfit.cjs` checks all three projects and is the evidence; the gate section runs the
two projects that use the shared **identity panel** (`scale` and `system`), because that is the contract it
asserts — a name and a line inside a panel the material clears. The strip is a different mechanism with a
different contract, and it needs its own decision before it can have a check.

Reproduce: `node panelfit.cjs 4500 check 1440x900 tr 0`


---

## Gate: "one momentum gesture on the index moves exactly one stop" failed once under full-gate load

**Where** `tools/diag/gesture2.cjs`, second check, in `run6.sh` on `feature/contact-finale` (F0): the index stayed
on stop 0 (`0 → 0`) after one momentum wheel gesture, in WebKit at 1366×768.

**What is known.** It failed once, inside the full gate; the same check then passed 3/3 alone against this build
AND 3/3 against the baseline build (`baseline/pre-site-polish`). The branch did not touch the index or its gesture
code at that point (only the Contact route and the runtime's head-start plugin's route test). Treated as a timing
escape: the harness waits a fixed 3 s after `A.mode === 'index'` before the gesture, and a loaded machine may not
have the index ready to promote a stop by then.

**Owed.** F2 of the Contact integration changes this area directly (C2's Contact stop hands off to the finale), so
at the end of F2 this check runs **at least 5 times under the full gate**; a single further failure means
investigating the timing, not re-running it away.

---

## The app needs Safari 15.4, not 15.0 (Nuxt runtime: `Array.prototype.at`, `Object.hasOwn`) — RESOLVED: floor is iOS 15.4

**Decision (2026-09-29).** The documented floor is now **iOS 15.4 / Safari 15.4** — Nuxt's own requirement. No
polyfills. `docs/POST-M5-IOS15-COMPATIBILITY.md` states it; `tools/diag/compat-ios15.cjs` holds the finale's sources
and runtime to Safari 15.4 (`Array#at`, `Object.hasOwn` and the other 15.4 APIs are no longer failures). The record
below is how it was found.

**Where** Every route. `docs/POST-M5-IOS15-COMPATIBILITY.md` states Safari 15 / iOS 15 as the floor; the build
lowers syntax to `safari15` but not APIs, and the Nuxt / vue-router runtime in the client bundle calls
`matched.at(-1)` and `Object.hasOwn(...)`, which arrived in Safari **15.4**. With those two removed (an imitation of
15.0–15.3 in `tools/diag/compat-ios15.cjs`, first version) the app renders its 500 page on `/tr/contact` and hydrates
with mismatches on `/tr/lab`.

**Why it has not bitten.** The real validation device is an iPhone 7 Plus on iOS **15.8.8**, which has both.

**Not fixed here** (found during the Contact integration, outside its scope). The Contact finale's own sources are
were held to Safari 15.0 by the static half of the first `compat-ios15.cjs`; its runtime half imitated the
validation device's profile (15.4–15.8). Options were: state the floor as iOS 15.4, or ship the two small polyfills
— the first was chosen (above).
