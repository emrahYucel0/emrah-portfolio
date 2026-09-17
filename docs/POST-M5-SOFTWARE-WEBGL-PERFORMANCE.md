# Post-M5 performance: software WebGL / low render capacity

## Symptom
- **PageSpeed Insights, mobile, `/tr`:** Performance 46, TBT ≈ 37 s, Speed Index 42.7 s, main-thread "Other" 40.8 s. The long tasks recur (740–1140 ms each) and are attributed to the C2 runtime chunk.
- **Local Lighthouse on a GPU machine:** Performance ≈ 86, TBT tens of ms.

## Root cause (confirmed by local reproduction)
1. **No GPU means software WebGL.** In a browser without GPU acceleration, WebGL runs in software (SwiftShader) and the page is composited in software.
   - Every drawn canvas frame must be read back (`GLES2::ReadPixels` in `LayerTreeHost::DoUpdateLayers` → `Commit` → `BeginMainFrame`).
   - The main thread waits for the whole frame to finish (`CommandBufferProxyImpl::WaitForGetOffset`): 10.1 s of the 11.5 s of long-task time in a 12 s trace.
   - This is not JavaScript; Lighthouse files it as "Other".
   - It takes ~0.6–1.2 s per frame. The duration depends on free CPU cores, not on CPU throttling (1× and 4× behave the same).
2. **Time was bound to frames.** GSAP's default lag smoothing advances only 33 ms when a frame takes over 500 ms, and `frame()` capped its step at 50 ms. With ~1 s frames the authored 3.5 s opening never finished inside a 45 s window.
3. **The hero never rests.** After the opening, the name's rows wave slowly (by design), so every frame is drawn, and in software every frame is a ~1 s block.

With a GPU the same canvas is composited on the GPU without readback, which is why GPU Lighthouse does not see the problem. PSI's lab ran without GPU acceleration. That is inferred from the matching signature: it could not be inspected directly because the PSI API quota was exhausted.

## Fix: `engine/c2/main.js` only
### Stage A: authored time is real time
- **GSAP:** `gsap.ticker.lagSmoothing(2000, 33)`.
  - GSAP 3.15.0 semantics: a tick whose elapsed time exceeds the threshold advances only `adjustedLag`.
  - Gaps up to 2 s now advance by the real elapsed time.
  - Longer gaps (a hidden tab, a debugger) are still smoothed.
- **Two clocks in `frame()`:**
  - `et`: real elapsed time, capped at the 2 s stall. It drives the closed-form (exponential) convergences:
    - `snap` / `A.p` / `A.wp`
    - `tuneWork` (`wT`, `wt`)
    - `registration` drag
    - `phys.impVis`
    - pointer velocity decay
  - `dt`: keeps its 50 ms cap for everything that integrates:
    - `phys.step` (material physics)
    - `updatePress` / `updatePin` (hold load)
    - `updateSqueeze`
    - `relaxPins` (Lab rooms, scarcity)
- **At 60 fps both clocks are identical,** so nothing changes on capable devices.

### Stage B: render-capacity adaptation (required; Stage A alone did not stop the blocking)
**Measurement.** Only the surface's own **consecutive drawn frames** are measured. Never the browser, the user agent, `navigator.webdriver`, headless mode or the device name.

**Constants** (`CAP` in `main.js`):

| Rule | Value |
|---|---|
| Window | the last `n = 6` intervals between consecutive drawn frames |
| Enter constrained | lower median of the window over **150 ms** (at least 4 of the last 6 slower than ~6.7 fps) |
| Warm-up | the first 2 intervals after start, a rebuild (resize / orientation), a hidden tab or an absent surface are not counted |
| Stall | a gap of 2 s or more is a stall, not a frame |
| Exit (hysteresis) | 3 consecutive drawn frames each under **50 ms** |
| Memory redraw | normal 400 ms; constrained **10 s** (memory decays ~0.25 %/s, so a 10 s cadence is visually equivalent, and at ~1 s per software frame a 400 ms cadence redraws continuously) |

**While constrained:**
- Only the **ambient row wave** stops counting as motion. Its clock stands still (a shiver keeps it running), so the rows keep the shape they had.
- Every state change still draws through the existing `stillSig` invalidation: input, places, faces, Work, project worlds, Lab, language, About, resize.
- There is no new render path.

**Threshold basis (measured):**
- Emulated 10 fps frames give a median of 97 ms and a p90 of 104 ms.
- Software rendering gives a 162–1173 ms median depending on free cores.
- 150 ms sits between the two.

**Reduced motion is independent.** It keeps `ampK = 0` and GSAP ×6 as before. Under reduced motion the surface draws once and the capacity mode never engages.

## Evidence (local, emulated; not a real device, not PSI)
Harness: 412×823 at DPR 1.75, 45 s after load, production build with CSP. "2 cores" pins the Chrome process tree to two cores, the condition that reproduces PSI's ~1 s frames.

| Build | Condition | Opening | Renders | Median render interval | Long tasks | Long-task total | TBT-like | Blocking ends |
|---|---|---|---|---|---|---|---|---|
| current | software, 2 cores, 4× CPU | not finished in 45 s | 42 | 1173 ms | 42 | 44.3 s | 42.2 s | > 45 s |
| Stage A | software, 2 cores, 4× CPU | 3.7 s | 43 | 1025 ms | 45 | 45.2 s | 43.0 s | > 45 s |
| **final** | software, 2 cores, 4× CPU | 3.8 s | **14** | 1037 ms | **15** | **15.3 s** | **14.6 s** | **16.0 s** (constrained at 10.8 s) |
| current | software, 2 cores, 1× CPU | not finished | 41 | 1124 ms | 42 | 45.6 s | 43.5 s | > 45 s |
| **final** | software, 2 cores, 1× CPU | 3.8 s | 15 | 992 ms | 16 | 14.7 s | 13.9 s | 15.0 s |
| current | software, 3 cores, 4× CPU | not finished | 67 | 665 ms | 67 | 44.5 s | 41.1 s | > 45 s |
| **final** | software, 3 cores, 4× CPU | 3.9 s | 17 | 645 ms | 18 | 11.0 s | 10.1 s | 11.7 s |
| current | software, 12 cores, 4× CPU | 3.6 s | 266 | 162 ms | 265 | 43.9 s | 30.6 s | > 45 s |
| **final** | software, 12 cores, 4× CPU | 3.9 s | 23 | 626 ms | 31 | 12.0 s | 10.5 s | 12.7 s |
| current | GPU, 4× CPU | 4.4 s | 5942 | 7 ms | 7 | 0.75 s | 0.40 s | 1.4 s |
| **final** | GPU, 4× CPU | 4.3 s | 5558 | 7 ms | 7 | 0.83 s | 0.48 s | 1.4 s (never constrained) |

**Lighthouse 12, mobile, simulated throttling, `/tr`:**

| Build | Condition | Performance | FCP | LCP | TBT | SI |
|---|---|---|---|---|---|---|
| current | software, 2 cores | 47 | 2.4 s | 3.6 s | 353 s | 97.9 s |
| Stage A | software, 2 cores | 29 (one run; FCP/LCP unusually slow) | 4.1 s | 7.0 s | 346 s | 17.3 s |
| final | software, 2 cores | 47 / 53 | 2.4–2.6 s | 2.9–3.6 s | 53–54 s | 16.2–16.6 s |
| final `/en` | software, 2 cores | 47 | 2.6 s | 3.6 s | 53 s | 16.1 s |
| current | software, 12 cores | 47 | 2.6 s | 3.6 s | 171 s | 45.5 s |
| final | software, 12 cores | 47 | 2.4 s | 3.6 s | 40 s | 14.7 s |
| current | GPU (3 runs) | 86 / 63 / 87 | 2.4–3.8 s | 3.6–6.5 s | 30–60 ms | 2.4–7.0 s |
| final | GPU (3 runs) | 82 / 86 / 86 | 2.6 s | 3.6 s | 40–70 ms | 2.6–5.8 s |

**Reading:**
- The pathology is removed. In software rendering the blocking now ends ~11–16 s after load instead of continuing indefinitely; Lighthouse's simulated TBT drops ~6.6× and Speed Index ~6×.
- **The Lighthouse Performance score does not materially recover (47–53).** The frames that still render in software (the opening, the settle, and the ~6 frames needed to measure capacity) are ~1 s each. Lighthouse multiplies them 4× in simulation, which keeps TBT and SI far beyond their scoring thresholds.
- Further recovery would need a separate decision:
  - earlier detection (a shorter window);
  - lower per-frame cost (DPR, excluded here);
  - not rendering the opening at full rate in software.

## Non-regression (Chrome with GPU)
- **Capacity mode never engaged** at emulated 60 / 30 / 20 / 10 fps on 390×844 TR and 1440×900 EN. Each run was a full journey with the events below:
  - Creative ⇄ Full-Stack, hold → swipe, Work, project and back, Lab room and video;
  - rotation, hidden tab, a 900 ms stall;
  - Contact, language switch, About and home.
- **At ~5 fps it engaged** after ~2.45 s. Every journey checkpoint reached the same state as at 60 fps (place, work, registration, world, About, tone, language, visible text layer, input at rest), the canvas redrew after every action, and the blurred canvas difference was ≤ 2.3.
- **Visual parity** of settled states, current vs final (1440 and 390, TR and EN): mean diff ≤ 0.59 outside Lab/Contact. Lab and Contact vary as in earlier baselines (video frames, room placement).
- **Regression suites:**
  - Creative ⇄ Full-Stack reveal: back-to-back T3−T1 ≤ 688 ms (current) vs ≤ 693 ms (final);
  - 34 interruption scenarios: 0 violations;
  - M3 touch (EN / TR): all at rest, 0 errors;
  - M4 audit (1440 / 390 × TR / EN + reduced motion): axe 0, every Tab stop visible with a focus ring, keyboard journey complete. One run logged an aborted Lab MP4 request; four reruns on both builds logged none.
- **Production-like CSP journey:** 0 CSP violations, 0 console errors, 0 failed requests.
- **Safari < 16.4 harness:** 5/5 routes boot.

## Real-device validation: PASS
iPhone 7 Plus, iOS 15.8.8, Safari, against the deployed production build (`yucelemrah-production-software-webgl-perf-2026-09-17.zip`, commit `f0d3e38`). The test was run by the site owner.

- [x] Intro timing
- [x] Hero ambient wave continues after the intro
- [x] Creative ↔ Full-Stack
- [x] Work / project
- [x] Lab / video
- [x] Hold → swipe
- [x] Rotation and continuity of normal interaction
- [x] After 60 s idle, the ambient wave is still moving
- [x] App sent to the background, then brought back to the foreground:
  - no stale visual state;
  - no input lock;
  - the hero ambient wave resumed correctly;
  - the constrained-render mode did not falsely activate.

**The constrained-render mode did not falsely activate on the real iPhone.** If it had engaged, the ambient wave would have stopped. It was still moving after 60 seconds idle.
