# Tempo and the progress indicator (R15)

Branch `feature/r15-tempo`, worktree `../emrah-portfolio-r15`, cut from local `main` f492799 (live: `fd9b2e6`, the
R30 hotfix). Ports 4980–4989, builds `builds/r15-*`, harness output `tools/diag/out/r15/`. `docs/ROADMAP.md` holds
the decisions; this file holds the plan, the measurements and what they mean.

## Order (user decision 2026-10-08)

1. Step 0: a read-only measurement of the whole walk on the live `e192c24`, and a plan. **Done, below.**
2. R30 first, on its own: the phone stuck at the end of Linefield, found by step 0. **Done, live as `fd9b2e6`.**
3. Phase 1: one gesture moves at most one work (as on the bench); `touch.cjs`'s outdated expectations; 100 px
   detents in the gesture harnesses; `tempo.cjs` into the repo. **Done, below.**
4. Phase 2: both indicators as prototypes, A, B and both, behind `?r15=a|b|ab`; stills and films on desktop and
   phone, reduced motion, `aria-current`. **Done; waiting for the user's choice of indicator.**
5. Phase 3 (not started): the tempo levers — Linefield's wheel step, Work → Cross Section, the damping's tail.
   - **Linefield's wheel step** (recorded 2026-10-09, user): inside the passage one 100 px detent moves it 0.067 of
     its length (`LF_PUSH`, `LF_WHEEL_SPAN`), so a mouse turned slowly needs about fifteen detents to cross it and a
     three-detent roll 0.2 (six rolls, step 0). It is the passage's own axis, not a stop, and the notch change leaves
     it alone; `trackpad.cjs` reports a lone detent there as not having moved (its axis threshold is 0.2).

Checks for phases 1 and 2 (user): gesture, trackpad, free-spin, touch and journey — not the full gate.

## Step 0: the walk, measured (2026-10-08, `e192c24`)

From the name to the end of the Contact finale, one gesture at a time, each sent once the last has rested
(`tools/diag/tempo.cjs`). Chrome on the RTX 4050, 144 Hz, quiet machine (`quiet.cjs`). Automated browser results,
not device verification.

| Section | Mouse (3 detents) | Trackpad | Phone |
|---|---|---|---|
| Name → Creative → Full-Stack → Linefield | 3 | 3 | 3 |
| Linefield (inside + out) | 6 + 1 | 2 + 1 | 3 + 1 |
| Work (browse + out) | 2 + 1 | 1 + 1 (skipped the middle work) | 0 + 1 (browsed sideways) |
| Cross Section + out to the bench | 3 + 1 | 3 + 1 | 3 + 1 |
| Bench (01 → 03 → finale) | 3 | 3 | 3 |
| Finale | 10 | 4 | 9 |
| **Total** | **30** (31 at 1920 × 991) | **19** | **24** |

- The first work at gesture 10 (mouse), 6 (trackpad), 7 (phone): 7–10 s of motion to 90%, 11–14 s with half a
  second of human pause per gesture. AUDIT-01 §5 asks for 8 s.
- The slowest step is Work → Cross Section: 2.8 s to 90%, 4.2 s to rest. Every other step reaches 90% within 1.4 s;
  the opening's steps take 1.3 s to 90% but 3 s to rest (the damping's tail).
- Frames are not the problem: p95 one vsync (7.1 ms at 144 Hz) at every runtime place, DPR 1 to 1.75; JS per frame
  p95 at most 4 ms (Cross Section). The one long task is the finale's arrival, 160–170 ms.

Two input findings:
- **R30** (now fixed and live): the finger's height at Linefield's end outlived the finger.
- **A lone 100 px detent is under a stop's 0.12** (100 × 0.0011 = 0.11) and springs back. The user's own mouse
  moves a stop per detent, so the threshold stays (decision 2026-10-08); the harnesses now play 100 px detents too.

## Phase 1

### One gesture, one work (`engine/c2/main.js`, 169f533)

`resetGesture()` keeps the work in register when a gesture begins (`A.gWork`); the wheel's `wT` and the finger's are
held to that work and one either side (`workBudget`). The ends' exits — `GEST_EDGE` past the first or the last work
— lie inside that budget, so leaving the field takes the gesture it always did, and a gesture that ran the field
still cannot also leave it (`GEST_INNER`, unchanged).

### The harnesses (e1339cc)

- `tempo.cjs` — step 0's walk: gestures and time per place, the first work, frames, JS per frame, long tasks;
  `--query=` for a page key, `--quiet` to wait for a quiet machine.
- `gesture2.cjs` — the 100 px detent. Asserted: two detents 60 ms apart and a roll of three 45 ms apart are one stop.
  Recorded as measured (identical on the live `fd9b2e6` and this branch, 3 of 3): three detents 300 ms apart move
  **nothing**, 700 ms apart one, 1400 ms apart nothing; a lone detent nothing. No cadence may move more stops than
  detents.
- `trackpad.cjs` — `notch100` (soft: at most one stop) and `roll100`; in the work field one throw is at most one
  work; Cross Section's band counts as an axis of its own.
- `touch.cjs` — up from the bench is the passage at DEPTH (`UP`, as in `touchjourney.cjs`), and a flick in Cross
  Section turns the louvers and stays. Its three failures were identical on the live build.
- `freespin.cjs` already played 100 px detents (100, 120, 150).

## Phase 2: the two indicators (`app/components/R15Progress.client.vue`, 8af4c82)

`?r15=a`, `?r15=b`, `?r15=ab`; kept for the session (`sessionStorage`), `?r15=off` forgets it. Without the key the
component does nothing at all: no loop, no element, no attribute.

- **A — the strip names the section.** The section's control in the top strip is underlined (1 px, 6 px under the
  capitals): İŞLER at Work (and, unseen while the strip is hidden, in a project), HAKKIMDA in the About room, LAB
  at Cross Section and on the bench, İLETİŞİM on the finale. Inside a study the Lab's strip offers no LAB (its way
  back is the study's own control), so nothing is marked there. The opening (the name, the faces, Linefield) is no section of the strip and marks
  nothing. Cross Section counts as the Lab's: it is the way in, SURFACE to DEPTH, the louvers closing over the bench.
- **B — the line.** One hairline inside the bottom strip, just under its top edge, between the page margins: a tick
  per place on the spine, drawn in as far as the visitor has come. A place with an axis of its own (Linefield, the
  work field, the louvers, the bench, the finale) spends the first half of its share on that axis and the second on
  the way out, so the line never runs backwards on the way down. It takes the strip's own colour, which the runtime
  chooses by what lies under the strip; it is hidden in a project and when the runtime has failed.
- **In every mode** the section's control carries `aria-current="location"`. The runtime's strip has never had it;
  the Lab's strip has it as `page` on the bench and the finale. Only the strip that owns the screen is marked: on
  the document routes the runtime is warmed in the background and its strip is in the DOM, hidden (found by
  `r15shot.cjs` as two current locations on the finale, fixed before any still was kept).
- **Reduced motion:** nothing in it moves by itself — the line is wherever the visitor is, frame by frame — so where
  the places are cuts it cuts with them. There is no transition to remove.
- **Read-only on the runtime.** It reads `window.__lab` each frame and writes only its own line and the strip's
  attribute; the line is teleported to the body, because the shell it is mounted in is hidden while the runtime owns
  the screen. If a variant is chosen, the line moves into the runtime's `domUpdate` and the Lab's chrome, and this
  loop goes.

Stills, sheets and films: `tools/diag/r15shot.cjs` → `tools/diag/out/r15/indicator/`
- `strips-desktop.png`, `strips-phone.png`: per place, both strips of none / a / b / ab at full resolution.
- `strips-*-reduced.png`: reduced motion, none / ab.
- `desktop/`, `phone/` (+ `-reduced`): every still; `films/walk-{desktop,phone}-{a,b,ab}.webm`: the whole walk.
- 230 assertions PASS: `aria-current` on the right section at every place, the mark only with A, the line only with
  B, nothing of ours with no key, console clean.

## Checks (phases 1 and 2, build `builds/r15-p2` from 8af4c82)

Logs in `tools/diag/out/r15/p2-checks/`.

- **Run under another project's load** (its `scripts/*.mjs` checks ran for hours; these assert states with generous
  waits, not timings):
  - `touch.cjs` 390 × 844 PASS (its three stale cases now pass).
  - `touchjourney.cjs` PASS.
  - `journey.cjs` TR, EN and TR reduced: PASS (WebKit).
  - `tempo.cjs`, gesture counts (times under load are not clean):
    - roll 30;
    - swipe 20, the work field now 3 gestures (w0 → w1 → w2 → out) where it was 2 and skipped w1;
    - touch 24.
    - The first work unchanged: 10 / 6 / 7.
- `r15shot.cjs`: 230 assertions PASS on both viewports, normal and reduced.
- **On a quiet machine** (`quiet.cjs`):
  - `gesture2.cjs` PASS, the 100 px detent section included (cadences exactly as measured: 1 / 1 / 0 / 0 / 1 / 0).
  - `trackpad.cjs` in the work field, 9 shapes × both modes: PASS (36 throws; one work at most per throw).
  - `trackpad.cjs` at every place, coalesced: 73 throws, 0 failures before the runner's time limit cut it. All
    places for 7 shapes, 9 `soft` lone 100 px detents. `roll100`, `coast` and `tail` were queued again.
  - `freespin.cjs`: the first run's places were given as `work,name` without directions (`work:1`), so every
    detent was dispatched as `deltaY: NaN` and Chrome's renderer crashed — on the live build identically. The
    harness's own mistake, not the site's; queued again with `work:1,work:-1,name:1`.

## Finding 2 reopened: the 100 px detent (user, 2026-10-08)

`gesture2`'s record showed that a lone 100 px detent never advances, whatever the pause between detents. 100 px is
what Chrome on Windows reports per detent at 100% scaling, and 96 px (three lines × 32) is Firefox's; the user's own
mouse does advance, so it probably sends more. Two steps, in this order: a wheel log to read a real mouse, then a
proposal — not applied until the user has seen it.

### The wheel log (`app/debug/WheelLog.vue`, f878e36)

`?wheellog=1` (kept for the session, `?wheellog=0` hides it) — only in `npm run dev` and in a build made with
`NUXT_PUBLIC_WHEELLOG=1`; a release build has no chunk for it. Per event: Δt, deltaY, deltaX, deltaMode, the pixels
and stops the site reads (lines × 32; × 0.0011), the burst sum; a lone event that will not land is marked.

### What a slow detent actually does (traced in the page, WebKit, live build's rule)

Three detents 300 ms apart:
- 100 px: `0 → 1 → 0`. The first springs back (0.11 ≤ 0.12); the second falls inside the same gesture and lands;
  the third opens a new gesture while the target is still on its way to the new stop (pT 0.46 → base 1), and
  `landGesture` measures `pT − base = −0.36` — the arrival's lag, read as the gesture's travel, backwards.
- 130 px: `0 → 1 → 0 → 1`. The same thing: the middle notch takes the visitor back a stop. `gesture2`'s cadence table
  ("3 notches of 130 px, 300 ms apart, move 1"; 700 ms "move 2") had locked this in as what origin/main does.

### The proposal (ebdbdfe, behind `NUXT_PUBLIC_NOTCH=1`; off, the runtime chunk is byte-identical)

1. **The landing threshold 0.12 → 0.10** (91 px): a lone 100 px detent (0.11) and Firefox's three lines (0.106)
   each land one stop.
2. **A gesture lands by its own travel** — from where its target stood when it began (`A.gT0`), not from the base.
   A notch made while the last arrival is still under way is then a stop of its own, in the direction it was made.
3. **Linefield's end exit takes the same 0.10** (was 0.16: two 100 px detents).
4. **Unchanged:** `GEST_FLOOR` (0.12, what makes an event a new throw), `GEST_GAP`, `GEST_REST`, the budget of one
   stop per gesture, the work field's two detents per work, Cross Section's step (0.04), the bench's and the
   finale's 96 px.

Measured on the proposal build (WebKit, `p.mouse.wheel`, from the hero), 100 px and 130 px alike:

| Detents | Live rule (100 px) | Live rule (130 px) | Proposal (both) |
|---|---|---|---|
| one | 0 | 1 | 1 |
| two, 60 ms apart | 1 | 1 | 1 |
| a roll, three 45 ms apart | 1 | 1 | 1 |
| three, 300 ms apart | 0 (0 → 1 → 0) | 1 (0 → 1 → 0 → 1) | 3 |
| three, 700 ms apart | 1 | 2 | 3 |
| three, 1400 ms apart | 0 | 3 | 3 |

The risk is the one the threshold was guarding: a flick's tail, once something opens a new gesture inside it, now
needs only 0.10 of travel to land a second stop, and lands it forwards where the lag used to cancel it. The proof is
`gesture2` (hard flicks, coasts, the arrival, and the 100 px section), `trackpad` (every shape at every place, and
the work field in both delivery modes), `freespin` (every place, Linefield and Work included) and the touch checks,
against the proposal build and, for `freespin`, against the current rule as a baseline.

## The notch rule, final form (rc3, user decisions 2026-10-08/09)

What became the default, in `engine/c2/main.js`:

1. **A gesture lands past 0.10 of a stop** (`GEST_LAND`, was 0.12): a 100 px detent and Firefox's 96 px each land.
2. **It lands on the input's own travel** (`A.gTravel`): what `scrollBy` applied to the target in this gesture,
   after the budget's clamp. The target's decay toward the base is never counted. Two earlier forms failed:
   - measured against the base, a notch made during the last arrival's lag landed backwards (0 → 1 → 0 → 1);
   - measured against the target at the gesture's start, the lag's decay counted as travel ("tail up from work",
     4 → 2, 1 in 40).
   A landing is always one stop within the gesture's start ± 1.
3. **Linefield's end is left past the same 0.10** (was 0.16).
4. **A free-spinning wheel holds the door 700 ms** (`GEST_REST_SPIN`). After a stream of full-size detents
   (≥ 90 px, < 120 ms apart) the next gesture opens only after 700 ms of quiet; a trackpad stream keeps 340 ms;
   a slow hand with no stream before it opens a gesture at once. Without it, each late detent of a slowing wheel
   (450–600 ms apart) landed a stop of its own: two to four places per flick.
5. **In the work field one notch is one work.**
   - A single event of 40 px or more moves the field 5 per stop (100 px = 0.55 of a work); smaller events keep
     2.6, so a gentle trackpad feels as it did (`workfeel.cjs`: 144 px of 2–8 px events stays on the work, as on
     live).
   - Once the field has reached the next work the gesture is spent, and a new gesture starts from the work in
     register, so notches 300 / 700 / 1400 ms apart move one work each.
   - One gesture still moves at most one work.

`GEST_FLOOR` (what makes an event a new throw) is unchanged.

### Proof (rc3 against the live f492799, alternating, quiet machine; `tools/diag/out/r15/proof4/`)

| Check | Live | rc3 |
|---|---|---|
| `freespin`, 9 places × 3 detent sizes × 7 end gaps, ×2 | 16 overshoots per round (450/600 ms end gaps) | **0** |
| Work tail repeats, 2 × 40 throws | 0 overshoots (20 middle-work skips) | **0**, 80/80 |
| Work `trackpad`, 9 shapes × 2 modes, ×2 | 14 skips per round | **72/72** |
| `gesture2`, Work cases, 3 reps, ×2 | pass | one "long up from work" (see below) |
| `gesture2`, full, ×2 | 3 overshoots per round + the old rhythm | round 1 **PASS**; round 2 two Cross axis cases (see below) |
| `gesture2` RHYTHM (100 / 130 px; alone, 60 / 45 / 300 / 700 / 1400 ms) | 6–7 fail (the old rule) | **all one stop per notch** |
| `trackpad`, every shape × the other places × 2 modes, ×1 | 14 under-moves | **0 overshoots**; 2 = Linefield's single-notch step |
| `workfeel` | 144 px gentle → stays; a notch 0.29 | identical gentle feel; every notch one work |

The user cut the second `trackpad` pair for time (2026-10-10).

Overshoots seen on rc3, each re-run alone and found on the live build too (not counted):
- "long up from work" 4 → 2 (4 → 1 once): live 2 in 20, rc3 1 in 20.
- "coast up from linefield" −2: live 4 in 20, earlier build 5 in 20.
- "long down from Cross Section", the louvers two positions: live 1 in 5, rc3 1 in 5 (alone); "burst down" 0 in 5 on both.
- `touch.cjs` and `touchjourney.cjs`: PASS on both builds.

These are **live issues**: the late events of a long or jittered stream read as a rise (`GEST_FALLEN`), on both builds.
