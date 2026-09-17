# Post-M5 performance: software renderer, static-first hero (S2 + F)

## Original problem
Without GPU acceleration, WebGL is rendered in software (SwiftShader, llvmpipe, WARP) and the page is composited in software. Every drawn C2 frame must be read back before it can be shown, which blocks the main thread for ~0.3–1.8 s. PageSpeed Insights' lab runs this way.

The earlier hardening (`docs/POST-M5-SOFTWARE-WEBGL-PERFORMANCE.md`) made time real and let the ambient wave sleep. **14 full-size WebGL frames** were still drawn before the hero settled (intro, settle, capacity measurement, sub-visual physics residue):
- Lighthouse TBT stayed at 51–59 s (simulated);
- the Performance score stayed at 28–47.

## Result
**Initial full-size WebGL frames on a software renderer: 14 → 0.** WebGL draws for the first time when the visitor changes something.

## Renderer probe (`engine/c2/main.js`, `SOFTWARE_GL`)
**Signals.** Before the full-size surface is created, two 1×1 canvases ask one question. Either signal is enough:
- `getContext('webgl2', { failIfMajorPerformanceCaveat: true })` returns null;
- the unmasked renderer name (`WEBGL_debug_renderer_info`, where the browser exposes it) contains SwiftShader, llvmpipe, softpipe or Microsoft Basic Render Driver.

**Privacy and scope:**
- Both probe contexts are released at once.
- Nothing is sent or stored.
- No user agent, automation, headless or benchmark signal is read.

**Cost:** 5.1–5.3 ms (15.7 ms at 4× CPU and 2 cores).

**What each environment reports:**

| Environment | Unmasked renderer | Caveat context |
|---|---|---|
| GPU | `ANGLE (Intel, Intel(R) UHD Graphics …, D3D11)` | created |
| ANGLE SwiftShader | `… SwiftShader Device (Subzero) …` | created (the name decides) |
| `--disable-gpu` (WARP) | `… Microsoft Basic Render Driver …` | refused |

**Browser behaviour:**
- Safari reports "Apple GPU".
- Firefox may sanitise or hide the name; there the caveat signal still applies.
- An unrecognised software renderer falls back to the existing measured-capacity detector.

## S2: static-first hero
When the probe confirms a software renderer:
1. **No WebGL intro.** The visit starts on the settled name plate: `mode: index`, straight rows, constrained render mode (no ambient wave).
2. **Hybrid 2D fallback.** A 2D canvas directly above the WebGL canvas and below the DOM, `aria-hidden`, is drawn once from the name state's own layout and masks:
   - rows at the state's spacing;
   - half-width `thick · 0.5` on the paper, widening to `0.36 · spacing` inside the letters, absent in the strips;
   - row ends tapered by bilinear mask samples (3 per texel on a phone, 2 on a wide screen);
   - row centres on the WebGL pixel-centre grid.

   Fidelity against the GPU WebGL frame of the same state (mean greyscale difference, exact / blurred):
   - 412×823: 11.7 / 2.0;
   - 1440×900: 10.4 / 1.7.

   Paint cost:
   - phone: 18.6 ms (76.5 ms at 4× CPU);
   - 1440 wide: 31.5 ms (the diagnostic prototype sampled 3× everywhere and took 95–120 ms);
   - a 900×1440 tablet portrait repaint: 89 ms.
3. **WebGL asleep.** While the hero stands, frames run (DOM, hints, physics) but WebGL does not draw.
   - **Resize or orientation:** the hero is repainted for the new layout and its resting state is re-taken, so WebGL stays asleep (tested: 0 draws across landscape and back).
   - **Background → foreground and a plain tap** change nothing and keep it asleep.
4. **Wake.** The first real change draws WebGL: a different state signature (place, press, feature, physics disturbance) or motion (shiver, pen). This covers Creative ↔ Full-Stack, Work, projects, registration and release, Lab, hold and swipe, keyboard navigation, About.
   - The first WebGL draw follows the input within ~11–12 ms.
   - The 2D hero is removed two frames after that draw, once the WebGL frame is on screen.
   - No flash in the captured sequence (185 → 184 → 199 on a phone; 172 → 172 → 198 on desktop), CLS 0.001–0.004.
   - Language switch, About/Back and focus are DOM changes. They are served immediately whether or not WebGL is awake.

## F: real-time physics catch-up
The material physics integrates the real elapsed frame time in steps of at most 50 ms (at most 40 steps, i.e. up to the 2 s stall bound). At 60 fps this is one step, exactly as before. On slow frames the material settles in wall-clock time instead of 20–25× slower, which removes the sub-visual ±1-level residue redraws seen in software rendering after interaction. It applies to every device.

## Unknown or slow hardware GPU
A real GPU that is merely slow never receives the static hero. It keeps:
- the full intro;
- normal DPR;
- the ambient wave, until the existing measured-capacity detector (6 drawn-frame intervals, lower median over 150 ms) puts only the wave to sleep.

**False-positive tests** (emulated 60 / 30 / 20 / 10 fps on GPU, full journeys): the static hero never activated, and the capacity mode never engaged.

## Accessibility
The 2D hero is `aria-hidden` and pointer-transparent. The semantic DOM, headings, plain navigation, focus order, project summaries and Lab alternatives are unchanged and do not depend on WebGL being awake.

Reduced motion and render capability stay independent:
- A software renderer starts static with or without the preference.
- The preference keeps its own behaviour on GPU devices.

Software-rendered audit (390 EN): axe 0 violations, every Tab stop visible with a focus ring, keyboard journey complete.

## Measurements (local; Chrome headless, not PSI)
Lighthouse 12, mobile, simulated throttling. Software rendering with the Chrome process tree pinned to 2 cores.

| Build | Route | Performance | FCP | LCP | TBT | SI | CLS |
|---|---|---|---|---|---|---|---|
| before (main a97a857) | /tr | 28 | 4.0 s | 7.6 s | 59.1 s | 16.2 s | 0.001 |
| before | /en | 28 | 4.1 s | 7.5 s | 53.8 s | 16.0 s | 0.002 |
| **S2 + F** | /tr | **77 / 80** | 2.6 s | 3.6–3.8 s | **290–340 ms** | 2.9 s | 0 |
| **S2 + F** | /en | **63 / 60** | 4.1 s | 6.6 s | **240–300 ms** | 4.3–4.4 s | 0 |
| before, GPU | /tr | 86 | 2.6 s | 3.6 s | 30 ms | 2.6 s | 0 |
| S2 + F, GPU | /tr | 87 | 2.4 s | 3.6 s | 70 ms | 2.4 s | 0 |

Earlier runs of the current build scored 47 on `/tr` (TBT 51–52 s); the Performance score swings between runs.

**Software rendering, 4× CPU, 2 cores (in-page):**
- 0 WebGL draws in the load window;
- long tasks 561 ms in total, the worst 360 ms (boot, not rendering).

## Remaining limiter: LCP
With TBT at ~0.3 s, the score now follows LCP.
- The canvas is not an LCP candidate, and C2 hides the prerendered shell once it mounts.
- In runs scoring 77–80 the LCP element is the shell's lead paragraph (~3.6 s).
- In runs scoring 60–63 it is the small `#hint` text in the bottom strip (~6.6 s).

That is a separate phase and was not changed here.

## Regression (GPU unless noted)
- **Visual parity** vs the current build (1440 EN/TR, 390 TR/EN, 21 states each):
  - intro, hero, Full-Stack, Work and project frames within 0.00–0.22 mean;
  - Creative and About within the measured noise floor of the ambient wave phase (base vs base: 0.44–0.78);
  - Lab and Contact vary as before.
- **Creative ⇄ Full-Stack reveal:** T3−T1 508–703 ms (baseline 494–700); reduced motion 132–174 ms (baseline 124–179).
- **Interruption:** 34 scenarios, 0 violations.
- **M3 touch (390 EN/TR):** all steps at rest, 0 errors.
- **M4 audit** (1440 TR, 390 EN, 1440 reduced motion, and 390 EN rendered in software): axe 0, every Tab stop visible with a focus ring, keyboard journey complete, 0 errors.
- **Production CSP journey:** 5 routes 200, 404 real, About/Back, Work, projects, Lab video; 0 CSP violations, 0 console errors, 0 failed requests.
- **Safari < 16.4 harness:** 5/5 routes boot, C2 starts, no error view.
- **Software-rendered journeys** (390 TR, 1440 EN): starting static, every checkpoint reaches the same state as the 60 fps GPU journey, and the canvas redraws at every step.

## Real-device validation: PASS
iPhone 7 Plus, iOS 15.8.8, Safari, on the deployed production build. The device has a hardware GPU, so the static hero must **not** activate here — and it did not: the visit began with the normal WebGL intro, and the software-renderer fallback never falsely activated.

- [x] Intro plays normally
- [x] Hero ambient wave continues after the intro
- [x] Creative ↔ Full-Stack
- [x] Work → project → back
- [x] Lab / video
- [x] Hold → swipe
- [x] Rotate
- [x] Background → foreground
- [x] 60 s idle: the wave is still moving
- [x] TR ↔ EN
- [x] About → Back
