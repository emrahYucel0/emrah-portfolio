# Known issues

Things that are wrong, understood, and deliberately not fixed yet. Each one says what was tried, so the next
attempt does not start from zero.

---

## R9 (row shimmer on dark grounds): the user's desktop display is DPR 1, not 2 — measurements that assumed 2

**Reported by the user, 2026-10-04.** On their desktop (Windows, Chrome, Intel UHD) `devicePixelRatio` reads **1**
right now, at a 1920×991 window. Earlier they had read 2, most likely on another display or at another Windows scaling
setting. The ratio follows the display and its scaling, so the same machine can be either.

**Why it matters for R9.** The shimmer is still unexplained (ROADMAP R9). The strongest relation found so far is the
row spacing measured in backing-store pixels at draw time, and that depends directly on the ratio. Several shimmer
measurements so far assumed DPR 2, among them the Linefield session's MacBook figures and Cross Section's Phase B stills
at 1440×900@2. A visitor at DPR 1 draws different backing-store spacings: at 1 the desktop cap of 1.5 (`main.js`,
`V.dpr`) never applies, so the 7 px rows are exactly 7 device px.

**What follows.**
- R9's measurements are to be read with the DPR they were taken at, and repeated at DPR 1 before any conclusion.
- **The Cross Section checks run at both DPR 1 and 2** (user decision 2026-10-04): `csbenchseam.cjs`, `csseam.cjs`
  and `cross.cjs` include 1440×900@1 and 1920×991@1 beside the @2 sizes, and `csheaded.cjs` records at the display's
  own ratio (1 on this machine as it stands).
- Nothing is changed in the engine for this. It is a measuring rule, not a fix.

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

**F2 result (2026-09-29): 5 / 5 PASS.** The check was repeated 5 times inside one full gate
(`GESTURE_RUNS=5 sh run6.sh 4500 4650`), in its normal place and under the gate's own load, on the F2 build. Every
other section passed as well, except three that still expected the runtime's old Contact stop: the two JOURNEY
runs and the NON-LAB comparison. Those harnesses were updated for the move and then passed when run alone. The
gesture check itself did not fail again, so no timing investigation was opened. The entry stays
here as a record, and the check keeps its place in the gate.

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

---

## Gate: JOURNEY TR NORMAL failed once in the F4 gate — a cold runtime boot, now waited for — RESOLVED (warm-up)

**Resolved (2026-09-29).** The cold boot is now warmed up on the Lab and Contact finale routes (`useC2Engine.warm`,
scheduled from `layouts/default.vue`). The runtime is fetched and PREPARED after the page has settled:

- **Prepared:** fonts, surface, the Work and name textures, DOM, states.
- **Not begun:** nothing plays or shows, and its loop does not run.
- **Paced:** each heavy step waits until the visitor has been still for 0.7 s, then for idle time.
- **Skipped:** with Save-Data.

Measured with `tools/diag/warm.cjs` (Chromium 1440×900). Cold and warm were interleaved in one session, on the same
build: cold = click on WORK 1.5 s after load, warm = click after 9 s. Figures: `docs/contact-finale/warm-up.json`.

| from → Work on screen | CPU 1× cold | CPU 1× warm | CPU 4× cold | CPU 4× warm |
|---|---|---|---|---|
| /tr/contact | 0.34–1.79 s | 0.28–0.32 s | 1.79–2.01 s | 0.97–1.03 s |
| the bench | 0.32–0.39 s | 0.12–0.19 s | 1.74–1.94 s | 0.86–0.94 s |

What it costs the finale: the finale was swept through the warm-up window. Its frame p95 was unchanged (the warm-up
waits while the visitor scrolls), there was no added long task, and the resting finale was pixel-identical before and
after. First load is untouched: nothing starts before the load event plus 2.5 s.

The same round fixed three leaks. All three affected any visitor who reached the Lab or the finale after the index,
and the warm-up would have spread them to everyone:

1. **The runtime took the keyboard off its own routes.** After one visit to the index, PageDown, Space and the
   arrows did nothing on the finale or a study, and moved the hidden index instead. Fixed with an `owns()` guard,
   and `beckon.cjs` checks it.
2. **The runtime's stylesheet was global.** `a, button`, `:focus-visible`, `p`/`ul`, `.lbl`, `.roles`, `html, body`
   and `:root` applied to every page once it was loaded. It is now scoped: `:where(#ui)`, and
   `html[data-c2='on']` for the root rules. That adds no specificity, so the runtime's own look is unchanged.
3. **The runtime's frame loop kept running beside pages that own the screen.** It now parks after a second without
   the screen, and wakes when `data-c2` returns.

The record of the original failure follows.

**Where** `tools/diag/journey.cjs`, the step Lab → Work, in the F4 full gate.

**What happened.** The journey loads each Lab study directly (a full page load), so the runtime is not in memory
when it returns to the bench. Before F2 it came back through the runtime's Contact stop, and the runtime booted
there. Now Contact and the Lab are both routes without the runtime, so the runtime's first boot of that session
lands on Lab → Work. That boot is a cold one: engine, fonts, textures and WebGL.

**Measured** (headless WebKit, 2026-09-29): 3.3 s without load, 8–9 s under load. The step slept a fixed 4.2 s,
so under the gate's load it saw `/tr` with the runtime not yet on screen. The same Lab → Work step with a warm
runtime hands over in about 0.15 s, with or without load.

**Fix, in the harness.** Each step now waits for its expected state (up to 25 s), as `spine.cjs` already does, and
reports any arrival slower than its settle time. Under load it passed 3/3 (Lab → Work arrived after 8.4 s). The EN
reduced run passes too.

**For the product, not changed here.** The cold-boot time is not new: the old flow had the same boot at its Contact
stop. What is new is where a visitor meets it: someone who landed on a study, the bench or the finale directly and
then goes up to Work. The bench already fetches the finale's engine ahead of time. It could warm the runtime's module
the same way, in idle time. That is a separate decision.


---

## A vertical swipe that begins on a project row on the Work stop is ignored

**Where** The Work stop, on touch. A finger that lands on one of the three project rows and swipes vertically does
nothing at all — the field does not travel, and the visitor has to find a part of the screen that is not a row.
Twelve pixels to the side of the same row, the identical swipe travels one stop.

**Wanted behaviour** A tap opens the project; a vertical swipe that starts on the row scrolls like a swipe anywhere
else. The first half already works.

**Measured 2026-09-30**, Chrome's own touch pipeline via CDP at 390×844, on `origin/main` (`b04e1ed`, the finale)
and on the gesture-fix build, **identically** — so this is not caused by the gesture work, and it is not new:

| | tap on the row | vertical swipe from the row | the same swipe 12 px beside it |
|---|---|---|---|
| origin/main | opens the project (`mode: world`) | **ignored** — base 3 → 3, still `/tr` | travels — base 3 → 4, `/tr/lab` |
| gesture fix | opens the project (`mode: world`) | **ignored** — base 3 → 3, still `/tr` | travels — base 3 → 4, `/tr/lab` |

**What it is.** `pointerdown` in `engine/c2/main.js` treats anything inside `a, button, .scroll` as chrome:

```js
const on = e.target.closest('a, button, .scroll')
if (on && !on.hasAttribute('data-through')) { ptr.ui = true; return }
```

The project row is a `button[data-work]` and does not carry `data-through`, so the handler returns before `ptr.down`
is ever set. `pointermove` then exits on `if (!ptr.down) return`, `ptr.axis` never resolves and `scrollBy()` is
never called. Traced live: `ui true, axis null, moved 0` for the whole gesture, on both builds.

**It is worse than "do not start on the row": the catchment is wider than the row.** A touch has an area, and the
browser retargets a touchstart onto a nearby clickable element. Measured on the Work stop at 390×844, rows at
143–186 / 187–229 / 230–273:

| the finger lands at | `elementFromPoint` says | the touch event actually arrives on |
|---|---|---|
| y = 128 | `body` | `body` — the swipe works |
| **y = 136** | `body` | **`button[data-work]`** — snapped ~7 px, the swipe is swallowed |
| y = 144 | `button` | `button[data-work]` |

So a thumb aimed at clear material a few pixels from a row is swallowed too, and the dead zone is the rows plus a
margin all round. This is also what made the fault hard to read: `tools/diag/touch.cjs` chose its start point with
`elementFromPoint`, which models a mathematical point rather than a finger, and the swallowed swipe then looked
like a fault in the gesture rule — which had never been reached (`ptr.ui true`, `ptr.down false`, no call into
`scrollBy`). The harness now requires a candidate to be clear across ±16 px, and says so in its output.

**Why `data-through` is not simply added here.** That attribute is what the hero's About button uses, and its
contract is "track the gesture, keep the pointer marked as UI, and swallow the click a swipe ends in". On the hero
that control is one button in open material. The Work stop is a *list* of three rows that fill the middle of the
screen and whose whole purpose is to be pressed — the press-and-hold that loads a project is the site's central
gesture — so making them gesture-transparent touches how a project is opened, which is the one interaction the
recent Work-field bug was about. It wants its own step and its own review, not a line in a gesture commit.

**How the harness treats it.** `tools/diag/touch.cjs`, section 10, asserts the behaviour **as it is** and prints it
as `note … (known issue)`. If it ever changes, the check reports `GONE ← FIXED` and fails, so this entry cannot rot
quietly. The two halves that already work — the tap, and the swipe beside the row — are ordinary assertions.

Reproduce: `node tools/diag/touch.cjs <port>` (section 10).

---

## The gate's timing-sensitive sections fail under parallel load, and pass alone — measured both ways

**Where** `GESTURE` (`gesture2.cjs`), `LAB A11Y` (`labaxe.cjs`), the `SEAM` arrival test (`seam.cjs`) and the
`stalls` column of `trackpad.cjs`, in the Linefield release gate (2026-10-02) when groups ran in parallel.

**What the gate reported, and what the same checks say run alone on a quiet machine.**

| check | under parallel load | alone |
|---|---|---|
| `GESTURE` | FAIL (5), incl. `coast down from name 0 → 2` | **PASS** — 5 places x 2 directions x 4 shapes, full suite |
| `LAB A11Y` | FAIL (1) | **PASS** |
| `SEAM`, largest frame-to-frame change | **4.53** (fails above 3) | **1.74** and **1.29** |
| `trackpad`, frames over 60 ms | 17 of 101 cases, clusters of 2-3 frames of 60-160 ms | **0 of 140 cases** |

**Why, and the cleanest evidence.** `gesture2.cjs` does one Playwright round trip per wheel event, so the gaps the
page sees are the harness's own and grow with the machine's load — `trackpad.cjs`'s header says so, which is why
`trackpad.cjs` plays its streams from inside the page instead. The `trackpad` row is an A/B on one machine: the
same 140 cases run as **one continuous 1200 s browser session** produced long frames in 17 of them; split into
**seven fresh sessions of 20 cases**, zero. So those long frames are accumulation inside a long Playwright
session, not something the site does — `work down` at 2854 ms, the case that first raised this, has no frame over
50 ms when measured on its own with a long-task observer.

**Read the `stalls` column correctly.** `stalls 2854ms+74` is `<when>ms+<how long>`: at 2854 ms after the throw's
first event, ONE animation frame lasted 74 ms. It is not a 2.8-second stall.

**2026-10-04, the Cross Section C3 gate (flag off, JS and CSS byte-identical to the live `1e663bd`).** `GESTURE` failed 3
coast/tail cases and `LAB A11Y` failed once on the bench's `.hint` at `/en/lab` 1440 (a new element for the same
mid-fade sampling). Re-run alone they failed again, because other sessions' servers and browsers were running. An A/B
against the live package on the same machine at the same time showed the same failures there: `LAB A11Y` FAIL on
live and PASS on the build; `coast` PASS then FAIL (3) on live, including `coast up from the bench 5 → 3`. Details are
in `docs/CROSS-SECTION.md`. Alone is not enough: the machine must be quiet.

**And on a quiet machine (the C4 + C5 final gate, 2026-10-04):** `LAB A11Y` passed and `GESTURE` still failed: 4
coast/long flicks took two stops. An alternating A/B on the same quiet machine failed 7 flick cases on the live
package and 6 on the build, the same cases. So `GESTURE`'s coast and long shapes are not decided by this harness even
when the machine is quiet: its per-event round trips still put the events 20–60 ms apart. `trackpad.cjs`, which plays
its streams from inside the page, is the measure for those shapes.

**What to do.** Run `gesture2`, `labaxe`, `trackpad`, `spine` and `seam` in group B, alone, as the release did.
A failure in one of them while groups run in parallel is re-run alone before it is treated as real (the standing
rule for this release). `seam.cjs`'s arrival test is now measured per frame interval rather than per sample, so
dropped frames no longer inflate it, and it says `NOT MEASURED` rather than FAIL when the screencast delivered no
frame within 60 ms of the handover.

---

## The bench's foot-band hairline is 28 levels darker than the finale's, on a cold mount

**Where** the Lab bench and the Contact finale, at the upward seam (finale at p = 0, one gesture up). A single
1-pixel-high, full-width line at y = 746 at 1440x900 — the rule above the foot band.

**Measured.** The finale draws it `rgb(173,172,169)`; a freshly mounted bench draws it `rgb(145,144,141)`, on the
same cream ground `rgb(239,238,233)`. Same position, same thickness, 28 of 255 levels darker — as alpha over
cream, 0.28 against 0.39. It is the ONLY thing differing between the finale's last frame and the bench's first:
mean |Dlum| across the whole sheet and foot band is 0.033.

**When a visitor can meet it.** Only when the bench mounts cold — a visitor who opens `/tr/contact` directly,
runs the drawing back to its top and travels up. On the ordinary journey (down from the bench, then back up) the
two frames are **pixel-identical**: 0 pixels differ at all. Before R7 (`6954a14`) this seam was a visible flash of
the bench's whole row field — 127 full-width rows on a 7 px pitch, differing by an average of 94 of 255 — so this
hairline is what is left of a fault that R7 fixed, and it has never been deployed in either state.

**Not fixed in this release** because it is sub-perceptual and the fix is a colour token in one of the two
components, which is not worth re-gating the seam for. `seam.cjs` tolerates exactly one pixel row and still fails
every pre-R7 build by two orders of magnitude; the tolerance and these numbers are written into the check.

Reproduce: `node seamup.cjs <port> <label> 2` — it measures its own controls first (screencast vs screencast, and
screenshot vs screencast, on a motionless page) so a capture artefact cannot be mistaken for a seam.

---

## A second gesture made while the first throw's momentum is still alive is absorbed — worst on a 120 Hz Mac trackpad

**Status: measured, reported, and deliberately NOT changed in this release (user decision, 2026-10-02). Next release: ROADMAP R28, P0.**
This is a direct consequence of the one-gesture-one-stop rule (Step 6, `abc69e1`), so changing it is a trade
against stop-skipping, not a bug fix. The pre-agreed rule was: absorbed only where the momentum is still strong
AND the silence is very short (cut 300 ms + silence 80 ms) means the rule is doing its job and the release goes
ahead; anything absorbed at a cut of 600 ms or later, or a silence of 150 ms or more, stops the package.
**18 of the 21 absorbed cases are at such a cadence.** Reported 2026-10-02; the decision was **no change in this
release** — recorded here, and carried to `docs/ROADMAP.md` as **R28, P0 for the next release**, to be fixed and
then confirmed on a real MacBook (R22) and re-gated through `gesture2`, `trackpad` and `mactrack`.

**Where** `engine/c2/main.js`, `opensGesture()`:

```js
perFrame = mag / clamp(gap / GEST_FRAME, 1, GEST_COALESCED)
rise     = mag > GEST_FLOOR && perFrame > A.gEnv * GEST_RISE && A.gEnv < A.gPeak * GEST_FALLEN
opens    = A.gSpent ? rise || gap > (stream ? GEST_REST : 0) : rise || gap > GEST_GAP
```

`GEST_FLOOR` is **0.12 stops**, and one pixel of wheel is 0.0011 stops, so the floor is **about 109 px in a single
event**. That one number decides everything below.

### A Mac trackpad: fingers down kills the momentum, then a new swipe after a short silence

Modelled (`tools/diag/mactrack.cjs`): a hard throw cut off at 300/600/1000 ms, a silence of 80/150/250/400 ms,
then a normal deliberate swipe. Heard / total. **48 judged cases** — two places (Hero down, Creative down) x two
refresh rates x three cut-offs x four silences. The 24 `creative up` rows are excluded: two stops up from
Creative would pass Hero, so they cannot show a second stop either way.

| | cut@300 | cut@600 | cut@1000 | row |
|---|---|---|---|---|
| **60 Hz** — silence 80 ms | 1/2 | 2/2 | 2/2 | 5/6 |
| 150 ms | 1/2 | 1/2 | 2/2 | 4/6 |
| 250 ms | 2/2 | 2/2 | 2/2 | 6/6 |
| 400 ms | 2/2 | 2/2 | 2/2 | 6/6 |
| **120 Hz** — silence 80 ms | **0/2** | **0/2** | **0/2** | **0/6** |
| 150 ms | **0/2** | **0/2** | **0/2** | **0/6** |
| 250 ms | **0/2** | **0/2** | **0/2** | **0/6** |
| 400 ms | 2/2 | 2/2 | 2/2 | 6/6 |

**21 of 48 absorbed. 60 Hz: 3 of 24. 120 Hz: 18 of 24.**

The 120 Hz block is total and deterministic: **every** cadence is absorbed except a 400 ms wait, at every cut-off,
at both places. That is exactly what the floor predicts, and it is the headline — not the scatter at 60 Hz.

The 21 absorbed cases:

| rate | cut | silence | place | realistic cadence? |
|---|---|---|---|---|
| 60 Hz | 300 ms | 80 ms | Creative | no — strong momentum, 80 ms |
| 60 Hz | 300 ms | 150 ms | Hero | **yes** |
| 60 Hz | 600 ms | 150 ms | Creative | **yes** |
| 120 Hz | 300 ms | 80 ms | Hero, Creative | no — strong momentum, 80 ms |
| 120 Hz | 300 ms | 150 ms | Hero, Creative | **yes** |
| 120 Hz | 300 ms | 250 ms | Hero, Creative | **yes** |
| 120 Hz | 600 ms | 80 ms | Hero, Creative | **yes** |
| 120 Hz | 600 ms | 150 ms | Hero, Creative | **yes** |
| 120 Hz | 600 ms | 250 ms | Hero, Creative | **yes** |
| 120 Hz | 1000 ms | 80 ms | Hero, Creative | **yes** |
| 120 Hz | 1000 ms | 150 ms | Hero, Creative | **yes** |
| 120 Hz | 1000 ms | 250 ms | Hero, Creative | **yes** |

**18 of the 21 are at a cut of 600 ms or later, or a silence of 150 ms or more** — the cadence a hand actually
leaves. Only 3 are the "the rule is doing its job" case.

**Why 60 Hz mostly escapes and 120 Hz never does.** A 60 Hz swipe's finger ramp peaks at 44 px, under the 109 px
floor, so it gets in on its OWN momentum — the first momentum event is 190 px = 0.21 stops, which clears it, and
the swipe is heard around its seventh event, roughly 100 ms in. A 120 Hz swipe sends half the delta twice as
often, so its biggest event of all — momentum included — is **95 px = 0.105 stops, below the 0.12 floor**. It can
therefore never open a gesture by rise, and its only way in is the 340-400 ms gap. Hence a clean 0/6, 0/6, 0/6,
6/6 column.

**What a visitor feels:** on a ProMotion MacBook, throw, put the fingers down to stop the scroll, swipe again —
and nothing happens unless about 400 ms have passed since the momentum was cut.

### A correction to an earlier version of this entry

The first full run of this matrix reported 16 of 48 absorbed, with 120 Hz at 2/6 in its short-silence rows. Those
"heard" results were an artefact of the harness, not of the site, and the numbers above replace them. The harness
summed every event that had fallen due into ONE wheel event; five summed events of the swipe's ramp come to
110 px, just over the floor, so under scheduling jitter it manufactured a "super-event" no trackpad ever sends and
the swipe was heard for the wrong reason. The same bug produced two cases that appeared to move THREE stops,
which the site cannot do: `A.pT` is clamped to `A.gFrom +/- 1` (`main.js:587`), so three stops needs three gesture
openings, and a real 120 Hz stream cannot open even a second one by rise. Each event is now dispatched separately;
the two cases were re-run 6/6 with no three-stop outcome and a deterministic result, and the whole matrix was
re-measured. The corrected picture is worse, not better.

### A Windows precision touchpad: pushing into a live fling

The fling is not cancelled by touching the pad, so the push arrives on top of it. At 400 ms into a hard throw the
fling is delivering 89 px per event, and a push is absorbed until its FIRST event alone beats 2.6x the envelope:

| push peak | relative to the fling | result |
|---|---|---|
| 73 px | 0.8x | absorbed |
| 200 px | 2.2x | absorbed |
| 400 px | 4.5x | absorbed |
| 800 px | 9.0x | absorbed |
| 1600 px | 17.9x | heard — two stops |

So about **18x** the fling's per-event delta. A gradual push can never out-rise itself, because each of its own
events feeds the envelope. **After** the throw lands, however, there is no problem at all: 32 of 32 cases heard
immediately at +0.5 s, +1 s, +2 s and +4 s, gentle and firm. The fling's last event is at 1679 ms and the stop is
announced about 250 ms later, so every "after it lands" push arrives in silence with a gap of 750 ms or more.

### The proposed fix, for the next release

Express the floor **per frame** rather than per event. `perFrame` already normalises for event rate:

```js
perFrame = mag / clamp(gap / GEST_FRAME, 1, GEST_COALESCED)
rise     = mag > GEST_FLOOR && perFrame > A.gEnv * GEST_RISE && A.gEnv < A.gPeak * GEST_FALLEN
```

so testing `perFrame` against the floor instead of `mag` would admit a 120 Hz swipe's small, frequent events while
still excluding a decaying momentum tail, whose perFrame keeps falling. One line — but it sits in the middle of
the rule Step 6 exists to protect (one hard flick must not skip stops), so it is confirmed on a real MacBook
first (R22) and then re-gated through `gesture2`, `trackpad` and `mactrack`.

### Two cases moved three stops — resolved: it was the harness

`120Hz cut@1000ms silence 150ms` went 0 to 3, and `120Hz cut@300ms silence 80ms` went 1 to 4. Investigated
2026-10-02: **the harness, not the site**, for the reason given under the correction above. Ten re-runs of exactly
those two cases produced no recurrence, and with per-event dispatch both are now deterministic (6/6).

**Honest limit of this evidence.** These are reconstructions of macOS event streams played through Chrome on
Windows, at the shapes and rates a Mac sends. No real MacBook was measured. Anything decided from this should be
confirmed on a real Mac trackpad first.

Reproduce: `node mactrack.cjs <port>` and `node ptp2.cjs <port> chrome --only=second`; both are in
`trackpadall.sh`.

---

## LAB A11Y: one axe colour-contrast violation on `.state` at `/en/lab` — RESOLVED: axe samples it mid-fade

**Settled 2026-10-03: not a contrast fault, and nothing was changed.** `.state` is the bench's foot line,
"Istanbul · Available for selected projects". It is shown and then taken away:

```
t =    0 ms   opacity 1      visible
t = 1515 ms   opacity 0.23   fading
t = 2018 ms   opacity 0      invisible, and stays there
```

Measured in the window a visitor actually reads it — t = 600 ms, opacity 1, the bench's hint still at 0 —
against the real pixels behind it, the type hidden for the capture:

**worst ratio 8.09:1, 0% of the pixels under AA.** The requirement is 4.5:1.

axe samples during the fade. At about 1.5 s the element is at opacity 0.23, so its composited colour is nearly
the ground itself and the ratio collapses toward 1:1 — a "serious" violation for a state nobody reads, gone 500 ms
later and invisible after that. It reports identically on the build before this one, so it is not from any recent
work. The element stays at `visibility: visible` on purpose: only the paint goes, so a screen reader still gets
the line.

**A measuring mistake worth keeping, because it nearly caused a wrong fix.** The first attempt pinned
`opacity: 1` to hold the element still, and reported 1.01:1 with 9.5% of pixels under AA — "the colour needs
fixing". It did not. Forcing it visible kept it on screen past 2.5 s, which is when the bench's hint appears, so
the measurement was of TWO labels drawn over each other: "SCROLL TO BROWSE · TAP TO OPEN" and "ISTANBUL ·
AVAILABLE FOR SELECTED PROJECTS" on one line, which the crop shows as `SCROLIBUTO BROWSE LABTAP FOR SOPERCTED
PROJECTS`. The failing pixels were the hint's own glyphs, not the ground. In normal running the two never coexist
— `.state` is gone by 2 s and the hint arrives at 2.5 s. Looking at the pixels is what caught it; the number
alone would have sent a correct colour to be changed.

### The original entry, kept for the record

## LAB A11Y: one axe colour-contrast violation on `.state` at `/en/lab`, 390 px, normal motion

**Where** `tools/diag/labaxe.cjs`: `390 normal /en/lab  violations 1 — color-contrast(serious x1: .state)`.

**Not from the short-phone work.** Measured on the fixed build AND on the release build that preceded it
(`builds/rel-on`, port 4934): the failure is **identical** on both, so it is pre-existing and not a regression
from the work-stop fix.

**It is also not stable.** Earlier the same day, run alone on the release build, `labaxe` PASSED — which is
recorded under the gate's load-sensitive sections above. So `.state` either changes while axe samples it or sits
very close to the line. Worth settling with a static reading of `.state`'s own colour against its ground, the way
`worktext.cjs` does, rather than by re-running axe until it agrees.

**Not fixed here** because it is outside the reported fault and the release is otherwise closed; it is the Lab
bench's status line, in English only, at one width.

---

## A very long, very dense flick can take a second stop mid-stream (`long` shape, gesture2)

**Status: measured on both engines, pre-existing, NOT changed (2026-10-03).** Found while proving R28 did not
break anything; it is older than R28 and present on the engine now live. Filed beside the free-spin item below
because the two are the same family: a stream the rule stops recognising as one gesture.

**The comparison**, `long` x `linefield`, both directions, alternating old/new, ten runs a side on a quiet
machine (`node gesture2.cjs <port> --shape=long --place=linefield --reps=1 --only-flicks`):

| engine | runs with an overshoot |
|---|---|
| pre-R28 (`b8918dc`, live) | **3 of 10** |
| R28 | **1 of 10** |

The pre-R28 engine shows it MORE often, and the signatures are the same on both:

```
old  dy -300  gap 21ms  quiet-false  env 0.0984  peak 0.2505  env/peak 0.39  spent
old  dy -300  gap 20ms  quiet-false  env 0.1011  peak 0.2755  env/peak 0.37  spent
new  dy -300  gap 18ms  quiet-false  env 0.1088  peak 0.2755  env/peak 0.39  spent
```

`quiet-false` in every case, so the condition R28 added is not involved; `env/peak` around 0.37, already under
GEST_FALLEN's 0.5, so the pre-R28 third condition was satisfied too; and a 300 px event clears the per-event floor
on its own, so R28's `Math.max(mag, inFrame)` changes nothing for it. It opens by `rise` on the path that has
always existed.

**How much of this is the harness.** The `long` shape intends 90 events **1 ms apart**. The page receives them
**17-67 ms apart** — Playwright's round trip stretches the stream roughly thirtyfold, which is what lets the
envelope decay between events until a mid-stream event looks like a new throw. No real device sends 300 px every
40 ms for ninety events; a mouse wheel's detents are 100-150 px and a trackpad's deltas are smaller still. So the
shape as delivered is not a gesture any hardware makes, and the overshoot may not be reachable in life at all.
That is the reason it is recorded rather than fixed: the honest next step is to find out whether a real device can
produce this stream, not to loosen or tighten a rule against a stream only Playwright can send.

Reproduce: the command above, several times — it appears in roughly a third of runs on the live engine.

---

## A free-spinning wheel's last slow detents can take a second stop — and can oscillate

**Status: measured on both engines, NOT changed. Its own decision (user, 2026-10-03).** Found while proving R28
did not break the free spin; it is older than R28 and present on the engine now live.

**Measured** (`tools/diag/freespin.cjs`, 105 spins per engine: 3 notch sizes x 7 end gaps x 5 place/direction
combinations, dispatched from inside the page so the gaps hold):

| end gap between the last detents | pre-R28 engine | R28 engine |
|---|---|---|
| 150, 200, 250, 300, 350 ms | 15/15 ok at every notch size | 15/15 ok |
| **450 ms** | 6 of 15 took a second stop | 6 of 15 |
| **600 ms** | 5 of 15 | 7 of 15 |

The two engines are **identical through 350 ms**, which is the whole range R28's `quiet` governs, so this is not
R28's doing. Every overshoot sits where `gap > GEST_GAP` (400 ms) and `opens = rise || gap > GEST_GAP` fires
unconditionally — a line R28 never touched.

**What a visitor feels.** The throw lands one stop at about 1.5 s. Then, with no new input, the page moves again:

| end gap | first stop | the extra stop |
|---|---|---|
| 450 ms | ~1.5 s | **~2.5 s** after the first detent |
| 600 ms | ~1.5 s | **~3.0 s** |

A second or more of stillness, then movement, reads as the page acting on its own rather than as the gesture
continuing. At 600 ms it can go further and **oscillate** — one spin landed `0 to 1` at 1491 ms, `1 to 2` at
2103 ms, back `2 to 1` at 2518 ms and `1 to 2` again at 2991 ms. That is worse than an overshoot and is the part
to fix first if this is ever acted on.

**Is the wheel plausibly still turning?** Yes, but barely: 450 ms a detent is 2.2 notches a second and 600 ms is
1.7, which a free-spinning wheel does pass through on its way to stopping — after a spin that has already run
2.7-3.3 s. So the input is real; what is arguable is calling a detent 600 ms after the last one *the same
gesture*, when GEST_GAP deliberately says 400 ms of silence is a new intention.

**Why it is not urgent.** It needs hardware with a true free-spin mode. The reviewer's own mouse is ratcheted
(stated 2026-10-02), and a ratcheted wheel's detents do not space out like this — they stop.

Reproduce: `node freespin.cjs <port> chrome` and read the 450 ms and 600 ms rows.

---

## Release: waiting — goes out together with Linefield

**State (2026-09-29).** The Contact finale integration (`feature/contact-finale`: F0–F4, the design and responsive
rounds, the runtime warm-up) is complete on its branch, and is merged into `main` after the final review. It is **not
released**. User decision: the Contact finale and **Linefield** are released together, once Linefield is done. Until
then there is no `npm run generate` for release and no `DEPLOY.md` preparation for this change. Both come after
Linefield, for the two together.
