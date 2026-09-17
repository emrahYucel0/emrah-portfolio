# Post-M5 micro patch: Creative ⇄ Full-Stack text reveal timing

**Scope:** when the supporting copy of the two faces arrives. The surface motion, easing, physics, layout, copy, SEO and hosting are unchanged. `docs/M5-REPORT.md` is not reopened: no documented M5 regression result changes.

## Root cause
The two faces share one opening (the `faceF` feature in `frame()`), and each face's text layer turned on through `at(i)`: `|A.p − i| < 0.03`. How the face was reached decided how fast the position got there.

- **Push-through** (hold, Enter, pinch). `pushThrough()` sets `A.p` exactly on the target when it completes. The gate opens on the same frame the picture arrives.
- **Place navigation** (plain nav buttons, arrow keys, wheel, swipe). `go()` / `snap()` damp `A.p` toward the stop (rate 3.4/s; wheel and swipe also wait 240 ms after input and damp `pT`).
  - Going in, the picture is visually whole at `A.p ≥ 1.65`. A blurred screenshot diff vs the settled face is ≤ 0.4% at 1440×900 and 390×844.
  - The text waited for `A.p ≥ 1.97`. Under exponential damping that last stretch costs ≈ 0.7 s: a dead gap.
  - The body tone (`--fg`) switched even later, when `A.p` snapped onto 2, so the text would also have faded in with the wrong colour.

## Change
`engine/c2/main.js`, `domUpdate()` only: one shared definition, `FACE_WHOLE = [0.1, 0.7]`.

- While the index is between the two faces and `A.base` is the destination, the face owns its text layer and body tone once the opening is whole: `A.p − 1 ≥ 0.7` going in, `≤ 0.1` going back.
- A push-through lands on the stop, so it is unaffected.
- Every path now uses the same state gate followed by the same CSS reveal (`.layer.on`: 0.1 s delay, 0.6 s opacity).
- There are no timers and no per-input branches. Rendering (`frame()`), focus logic, `pressable`, `A.busy` and registration are untouched.

## Measurements
Harness: headless Chrome, GPU, per-frame recording.

- **T0:** activation dispatched.
- **T1:** the face picture has visually arrived. This is the earlier of two estimates:
  - canvas blurred diff ≤ 3% of the start→final difference and staying there;
  - `A.p` inside the screenshot-verified whole range.
- **T2:** text layer opacity > 0.02.
- **T3:** opacity ≥ 0.9.

Values in ms, as T2−T1 / T3−T1.

| Path | Direction | Before | After |
|---|---|---|---|
| Enter (push-through, reference) 1440 EN | C → FS | 153 / 495 | 171 / 504 |
| hold, mouse 1440 EN | C → FS | 320 / 677 | 345 / 707 |
| hold, touch 390 TR | C → FS | 341 / 679 | 326 / 664 |
| plain nav button 1440 EN | C → FS | **889 / 1255** | 236 / 588 |
| Arrow key 1440 TR | C → FS | **927 / 1252** | 216 / 558 |
| wheel 1440 EN | C → FS | **998 / 1349** | 264 / 592 |
| swipe, touch 390 TR | C → FS | **1041 / 1400** | 246 / 592 |
| plain nav button 390 EN | C → FS | **878 / 1227** | 194 / 539 |
| plain nav button 1440 EN | FS → C | 652 / 1032 | 318 / 676 |
| wheel 1440 TR | FS → C | 714 / 1090 | 351 / 682 |
| swipe, touch 390 EN | FS → C | 713 / 1062 | 320 / 676 |
| hold, touch 390 EN | FS → C | 321 / 665 | 314 / 665 |
| reduced motion, nav 1440 EN | C → FS | 231 / 231 | 157 / 157 |
| reduced motion, wheel 1440 EN | FS → C | 243 / 243 | 155 / 155 |

After the patch, every normal-motion path lands at T3−T1 = 539–708 ms in both directions, TR and EN, 1440×900 and 390×844. Reduced motion lands at 118–184 ms.

## Regression
- **Rapid interruption** (C → FS → C → FS at 150 / 450 / 900 ms; arrows; wheel; swipes; a push interrupted by navigation; 1440 and 390, TR and EN). 0 violations in 36 scenarios:
  - no face layer stays on for a face that is not the destination;
  - no opacity rise over two frames for a non-destination;
  - the final destination owns opacity 1 and the matching tone;
  - input is at rest.
- **Visual parity** of settled states before vs after (1440 and 390, TR and EN): Creative and Full-Stack mean diff ≤ 0.12. Lab and Contact vary as in the M4/M5 baselines (video frames, room placement).
- **M3 touch regression** (390×844, EN and TR): all steps at rest, 0 errors.
- **M4 audit** (TR 1440, EN 390, EN 1440 reduced motion): axe: no violations in any of the 8 states. Keyboard journey completes. Tab walk: every stop visible, in view, unobscured, with a focus ring. Console errors: 0.
- `npx nuxt typecheck` and `npm run generate`: exit 0. Console errors: 0.
