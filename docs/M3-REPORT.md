# M3 — Responsive art direction · real mobile interaction hardening

Production build (`nuxt generate`) served statically:
- M3 on `127.0.0.1:4311`
- M2 baseline, rebuilt from commit `0c9ddaa`, on `127.0.0.1:4310`

Nothing committed, pushed or deployed. `c2-surface-lab/` untouched.

**Verification scope.** Two kinds of evidence, kept apart throughout:
- **EMULATED** — Chrome 152 headless: CDP touch input, device metrics, safe-area override. Everything is emulated unless marked REAL.
- **REAL DEVICE** — one physical iPhone 7 Plus, iOS 15.8.8, Safari, same Wi-Fi, one 5+ minute session run by you on the M3 build served from this machine (§ 13).

The real-device gate is closed.

---

## 1 · Mobile hold / scroll bug (§63)

**Device, OS, browser:** the report came from your iPhone-class phone. Model, iOS version, browser, viewport and DPR are not recorded yet; see § 13.

### Reproduction before the fix
Reproduced on the M2 build with CDP touch:
1. Open `/tr` and go to Work.
2. A finger lands on the work frame. The element under it is `img.media-node` inside `#media`: the real screenshot, so iOS offers "Save image / Copy / Open image".
3. The native callout takes the touch. The page never receives `pointerup` / `pointercancel` for that pointer.
4. Swipe again: nothing moves.

| After an interrupted touch (M2) | `touches` | Work swipe | Lab hold | Lab swipe |
|---|---|---|---|---|
| no end event at all | 1 → 2 | dead (no movement) | **no room made** | dead |
| only `touchcancel` delivered | 1 → 2 | dead | no room made | dead |

(`data/repro-before*.json`)

### Root cause
Two faults combine. Both live in the runtime, not the Nuxt host.

1. **Wrong hit target.** `#surface` and `#ui` are `pointer-events: none`, but `#media` was not. Under Work and under every Lab room, the element under the finger was a real `<img>` (screenshot or Lab poster). That element:
   - triggers the iOS image callout;
   - holds the touch's implicit capture. A callout, or a media element removed on rebuild, therefore swallows the end of the gesture.
2. **A lost end event was never forgotten.** `pointerdown` adds the finger to the `touches` map; only `pointerup` / `pointercancel` removes it, and when neither arrives the entry stays forever. The next single finger then makes `touches.size === 2`:
   - `pointerdown` calls `startSqueeze()` and **returns before `ptr.down = true`**;
   - where no squeeze is possible (Hero, Lab), nothing happens at all, so swipes and holds are dead;
   - on a registered work, a plain swipe became a two-finger squeeze and *opened the project*.

   Buttons still work because their `pointerdown` returns earlier (`ptr.ui`). That matches the report exactly: "buttons clickable, scroll completely lost".

No pointer capture is set explicitly anywhere (`setPointerCapture`: 0 uses). No body/html overflow toggling exists. The lock state is only `touches` / `ptr` / `A.squeeze`.

Hero, Creative and Full-Stack were unaffected because no `<img>` sits under the finger there. The standalone prototype has byte-identical handlers and CSS, so it is very likely it has the same defect but was never exercised on a real phone. The earlier lock report records "no real phone" too.

### Event sequence before
1. `pointerdown#N@img`, `touches={N}`, `ptr.down=true`
2. The iOS callout takes the gesture: no `pointerup` / `pointercancel#N`
3. Next touch: `pointerdown#M` gives `touches={N,M}`, so `startSqueeze()` runs and returns, and `ptr.down` is never set
4. Every later touch repeats step 3

### Fix
Files: `engine/c2/main.js`, `engine/c2/style.css`, `engine/c2/media.js`, `app/assets/css/base.css`.

- **`endGesture()`** — one idempotent ending: clears `touches`, ends a squeeze, resets `ptr.down/axis/ui/rub`. A non-forced press releases itself on the next frame exactly as if the finger had lifted (a Lab room keeps what it made). It is called from:
  - a primary `pointerdown` when anything is still held (`e.isPrimary` = no other finger is on the glass, so any remembered finger is stale);
  - `touchend` / `touchcancel` with zero touches left, checked 50 ms later so a normal `pointerup` and its tap always run first. WebKit still delivers touch events when the pointer stream was taken;
  - `blur`, `pagehide`, `visibilitychange` → hidden;
  - route change (`routeChanged`) and locale change (`setLocale`).
- **`pointercancel`** no longer counts as a tap.
- **`#media { pointer-events: none; -webkit-touch-callout: none; user-select: none }`** and `-webkit-user-drag: none` on its img/video; Lab posters are `draggable=false`. Scoped to `#media` only. Input is read on `window`, so nothing is lost; the hit target is now `body`.
- **`contextmenu`** is prevented only for a touch gesture on the material. Links, buttons, the About scroller and every mouse keep the browser menu.
- **Swipe out of a loaded hold.** A hold past 0.22 load used to ignore the finger leaving: the room kept growing under a swipe, and the swipe never scrolled (§9).
  - Now a decisive vertical departure (> max(56 px, 8 % H), vertical-dominant) is a swipe.
  - Below 0.22 load the original 16 px threshold is unchanged, so rubbing still loads the material.
- **Host side:** the runtime stylesheet's document lock (`overflow hidden`, `touch-action none`, `user-select none`) now applies only while `html[data-c2=on]`. Before, it stayed after the runtime stepped aside (x-default entry, error page) and made the plain shell unscrollable.

**touch-action policy (§7).** `touch-action: none` is kept on the C2 document. Measured on the same swipe:
- `none`: 12 pointermoves, `pointerup`, base 0 → 1.
- `pan-y`: 1 pointermove, then `pointercancel`; C2 never navigates.

C2's vertical movement is the runtime's own gesture, not native document scroll (the document is one fixed screen). Native scrolling remains where content really scrolls: the long About (`.scroll`, `touch-action: pan-y`).

### Event sequence after
Same steps 1–3, then:
- the finger is on `body`, so no image callout exists to interrupt;
- if an end is lost anyway, the next `pointerdown` is primary → `endGesture()` → `touches={M}`, `ptr.down=true`, and the swipe moves.

| After an interrupted touch (M3) | Work swipe | Lab hold | Lab swipe |
|---|---|---|---|
| no end event at all | 3 → 4 ✓ | room ✓ | 4 → 5 ✓ |
| only `touchcancel` delivered | 3 → 4 ✓ (reset immediately) | room ✓ | 4 → 5 ✓ |

(`data/repro-after*.json`)

### Answers
| | Emulated | Real device (iPhone 7 Plus · iOS 15.8.8 · Safari) |
|---|---|---|
| Native context menu appears? | NO on Work / Lab media (not a hit target; callout suppressed) | **NO — not observed** |
| Scroll / navigation after Work hold | PASS | **PASS** |
| Scroll / navigation after Lab hold | PASS | **PASS** |
| Scroll after interrupted hold | PASS (lost-end and `touchcancel` variants) | not triggerable: the callout that interrupted the gesture never appeared |
| Registration | PASS | not reported separately (Work hold → project entry / return: PASS) |
| Lab room creation | PASS | **PASS** |
| Two-finger gesture | PASS | not reported |
| Desktop regression | NO (§ 5) | — |

---

## 2 · Scroll-recovery invariant (§50)

`touchreg.cjs` runs 24 real CDP touch steps, EN and TR at 390 × 844. After each ended gesture, `touches = 0 ∧ ¬ptr.down ∧ ¬squeeze` must hold, and the next swipe must move.

| Step | EN | TR |
|---|---|---|
| tap on material | ✓ | ✓ |
| swipe Hero → Creative | ✓ moved | ✓ |
| hold Creative → Full-Stack (push-through) | ✓ | ✓ |
| cancelled hold → swipe | ✓ moved (M2: did not move) | ✓ |
| sideways thumb → next work registers | ✓ | ✓ |
| 3 short holds on Work, then swipe | ✓ moved | ✓ |
| full hold opens work | ✓ | ✓ |
| swipe through world → back to Work | ✓ | ✓ |
| two-finger squeeze opens work | ✓ | ✓ |
| swipe Work → Lab (bridge) | ✓ | ✓ |
| Lab hold ×2 (rooms), video plays (`playsinline`, muted) | ✓ | ✓ |
| Lab: loaded hold, then swipe away | ✓ moved, room kept (M2: no move) | ✓ |
| tap language control | ✓ switched; same rooms, visits, `history.length` | ✓ |
| Lab hold after switch | ✓ | ✓ |
| About detail, then browser Back | ✓ | ✓ |
| swipe after Back | ✓ | ✓ |
| portrait → landscape → portrait, swipe | ✓ one canvas, resized | ✓ |
| **input at rest after every step** | **24 / 24** | **24 / 24** |
| console / page errors | 0 | 0 |

The language control's touch target grew from 12.8 × 30 px to **32.8 × 30 px** (padding with negative margin; the text is unchanged).

---

## 3 · Composition classes

Before M3 the runtime had one split, portrait (`W < 0.8·H`) or landscape, while the CSS broke at `max-width: 700px`. The two disagreed on every tablet held upright. M3 names the classes explicitly on `html[data-c2-shape]`, set from measured capabilities, never the user agent.

| Class | Rule | Examples |
|---|---|---|
| `phone` | portrait, W < 700 | 320–430 wide |
| `tablet` | portrait, W ≥ 700 | 768 × 1024, 820 × 1180, 1024 × 1366 |
| `short` | landscape, H < 520 | phone on its side (844 × 390) |
| `wide` | landscape | iPad landscape, laptops, desktops |
| large limit | `u = clamp(min(W/1920, H/1080), 1, 1.6)` | 2560 × 1440 (u = 1.33), 3440 × 1440 (1.33) |

Inside `phone`, short heights (< 760 px, < 640 px) get tighter geometry and type. Laptops under 820 px tall get a slightly taller About room.

---

## 4 · Engine source discipline (§62)

| Change | File | Category |
|---|---|---|
| `endGesture()` and its callers, primary-pointer reset, touch settle, scoped `contextmenu`, `pointercancel` ≠ tap, loaded-hold swipe-out | main.js | MOBILE BUG FIX |
| `#media` pointer-events / callout / drag; poster `draggable=false` | style.css, media.js | MOBILE BUG FIX |
| document lock only while `data-c2=on` | base.css (host) | MOBILE BUG FIX |
| language-control hit area | style.css | A11Y |
| `safeInsets()`: pad and strip include `env(safe-area-inset-*)`; strip text padded | main.js, style.css | SAFE-AREA |
| `V.T` / `V.S` classes, `data-c2-shape`; tablet pad 28–48 | main.js | RESPONSIVE GEOMETRY |
| tablet uses the tablet capture (`previewOf`, İstanbul f0, Ege f0 / f2, Evden f0); tablet frames keep media proportions | content.js, states.js, world.js | RESPONSIVE GEOMETRY |
| phone: taller About room < 640 px; taller Work index < 760 px; smaller İstanbul rooms < 760 px; Ege structure text higher; closing block taller | main.js, states.js, world.js | RESPONSIVE GEOMETRY |
| short landscape: About room 0.3 H; face list beside statement; Work column 0.34 W; Ege scale proof beside pages; closing text full height | main.js, states.js, world.js | RESPONSIVE GEOMETRY |
| narrow landscape: İstanbul tablet and phone rooms scale so facts keep ≥ 300 px (factor ≥ 1 on every laptop / desktop, so unchanged there) | world.js | RESPONSIVE GEOMETRY |
| Evden production: tablet room never taller than the phone room (it left the screen on tablets) | world.js | RESPONSIVE GEOMETRY |
| 13-inch (H < 820): About room 0.215 H instead of 0.2 H | main.js, states.js | RESPONSIVE GEOMETRY |
| large-screen limit: composition in 1920 × 1080 units, `#ui` / `#media` scaled, canvas at physical resolution, pointer and `getBoundingClientRect` in composition units, media `sizes` scaled | main.js, media.js | RESPONSIVE GEOMETRY |
| tablet / short / short-phone type rules; hint shrinks right-aligned; strip gap ≤ 360 px; world strip hides strength ≤ 480 px; PSI one line ≤ 360 px | style.css | RESPONSIVE TYPOGRAPHY |

Anything hidden for space that carries content uses a visually-hidden pattern (still read by assistive technology), not `display:none`. Items that are duplicates use `display:none`: `.work .current` (the active index entry names the work) and the world-strip strength (the facts frame carries it).

No new physics, states, transitions, copy, dependencies or UA sniffing. `surface.js`, `physics.js`, `tone-*` are unchanged.

---

## 5 · Desktop parity (§61, §14)

1440 × 900 EN, M2 vs M3, same capture script:

| States | Mean diff |
|---|---|
| open, About, About detail, Creative, Full-Stack | 0.02–0.22 |
| Work, all 13 project-world frames | 0.00 |

The matrix Lab / Contact captures place rooms with `freeSpot()` while seeded rooms are still relaxing, which is non-deterministic: M3 vs M3 differs by 57.9 on its own. A deterministic run (rooms at fixed points) gives:
- rooms at identical positions (±1 px);
- Lab 3.78, which is the playing video's frame and below the M2 vs M2 noise of 4.26;
- Contact 1.05.

Desktop mouse behaviour is unchanged: no mouse path was modified, `contextmenu` is untouched for the mouse, and `u = 1`.

(`data/parity-1440.json`)

---

## 6 · Responsive matrix (§64)

**Coverage.** 18 viewports × EN / TR × 21 states each: open, About, About detail, Creative, Full-Stack, Work, İstanbul f0–f3, Ege f0–f3, Evden f0–f4, Lab with 2 rooms, Contact.

**Automated DOM audit.** Every visible text node is checked for off-screen position, clipping and text-on-text overlap, plus horizontal page scroll and console errors. Visual review uses contact sheets (`m3-responsive/before-after/`, `m3-responsive/matrix/`).

In the tables, "issues" excludes:
- the bottom-strip hint's intentional ellipsis (320 px EN);
- visually-hidden elements that report a 1 px clip.

### Before → after
| Viewport | Issues before | After | What was wrong |
|---|---|---|---|
| 320 × 568 | 86 | **2** | TR `EN` control off-screen; About text over EMRAH/YÜCEL; Work index under the frame; PSI below the screen; closing block over the project nav; strip name over hint |
| 375 × 667 | 2 | 0 | Work caption on the frame; İstanbul / Ege PSI touching the strip; strip name over hint |
| 390 × 844 / 430 × 932 | 2 / 2 | 0 / 0 | strip name over hint |
| 844 × 390 (phone landscape) | 27 | 0 | About over the name; face list over the word, role and strip; Work column overflow; Ege proof below the screen; Evden title under the nav |
| 768 × 1024 / 820 × 1180 / 1024 × 1366 | 2 each (+ visual) | 0 | **About detail: all five blocks stacked on top of each other**; phone captures cropped into tablet frames; Evden production devices off-screen; TR Lab caption off-screen |
| 1024 × 768 / 1180 × 820 | 0 (visual) | 0 | İstanbul facts squeezed into a ~130 px column |
| 1280 × 800 / 1366 × 768 / 1440 × 900 / 1512 × 982 / 1920 × 1080 | 0 | 0 | — |
| 2560 × 1440 / 3440 × 1440 | 0 (visual) | 0 | 1080p-sized type, rooms and blocks in a vast field of material |

Remaining at 320 × 568: the last PSI row of İstanbul f2 reaches the bottom strip (EN bottom 550 px of 568); it is still on screen.

### Per viewport
Every row reports 0 horizontal page scroll and 0 console / hydration errors in both languages.

| Viewport | EN | TR | Collision | Clipping | Media fit | Nav | About | Work | World | Lab | Contact |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 320 × 568 | PASS* | PASS* | none | hint ellipsis (EN) | phone captures | ✓ (TR fits) | ✓ | ✓ | ✓ (PSI on strip) | ✓ | ✓ |
| 375 × 667 | PASS | PASS | none | none | phone | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 390 × 844 | PASS | PASS | none | none | phone | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 430 × 932 | PASS | PASS | none | none | phone | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 844 × 390 | PASS | PASS | none | notes hidden (AT keeps) | wide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 768 × 1024 | PASS | PASS | none | none | tablet captures | ✓ | ✓ stacked | ✓ | ✓ | ✓ | ✓ |
| 820 × 1180 | PASS | PASS | none | none | tablet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1024 × 1366 | PASS | PASS | none | none | tablet | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1024 × 768 | PASS | PASS | none | none | wide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1180 × 820 | PASS | PASS | none | none | wide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1366 × 1024 | PASS | PASS | none | none | wide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1280 × 800 | PASS | PASS | none | none | wide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1366 × 768 | PASS | PASS | none | none | wide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1440 × 900 | PASS | PASS | none | none | wide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1512 × 982 | PASS | PASS | none | none | wide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1920 × 1080 | PASS | PASS | none | none | wide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2560 × 1440 | PASS | PASS | none | none | wide, `sizes` × 1.33 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 3440 × 1440 | PASS | PASS | none | none | wide | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

\* with the 320 caveats noted above the table.

The TR hero keeps its clause break at every landscape class. On phones and tablets it wraps by measure (see `matrix/*-tr-01-open`, `before-after/*`).

**Viewport units (§19).** The runtime reads `innerWidth/innerHeight` (a dynamic viewport) into one fixed full-screen canvas. The C2 document never scrolls, so browser chrome does not collapse during a session. Any change (rotation, bar toggle) runs the existing debounced (140 ms) rebuild; emulated rotation keeps one canvas, the session, rooms and scroll. The Nuxt shell uses `svh`.

**Safe area (§20).** Emulated with `Emulation.setSafeAreaInsetsOverride`:
- 844 × 390, insets 47 / 47 / 21: pad 47, strip 71; name at x 47, `EN` ends at 797 of 844.
- 390 × 844, insets 47 top / 34 bottom: strip 91; top strip text at y 62–75, below the notch.
- Screens without insets: exactly as before.

**Reduced motion (§54).** Checked at 390, 820, 844×390, 1366 and 2560: all six places reached, 0 errors, no horizontal scroll.

---

## 7 · Performance (§48, §65)

**EMULATED on this machine's desktop GPU.** Frame rate here is bound by canvas pixel count; a phone GPU will differ. Figures are headless `requestAnimationFrame` fps / p95 frame ms, M3 vs the M2 build measured alternately under the same conditions.

| Viewport (device DPR → used) | Canvas | Open | Registration | Release | World | Bridge | Lab hold | Lab playing | Contact |
|---|---|---|---|---|---|---|---|---|---|
| 390 × 844 (3 → 1.75) M3 | 683 × 1477 | 53 / 28 | 79 / 35 | 68 / 35 | 38 / 35 | 36 / 35 | 33 / 83 | 145 / 7 | 43 / 55 |
| same, M2 | | 44 / 35 | 80 / 35 | 73 / 28 | 40 / 49 | 41 / 35 | 38 / 49 | 144 / 7 | 48 / 42 |
| 820 × 1180 (2 → 1.5) M3 | 1230 × 1770 | 29 / 56 | 69 / 55 | 64 / 42 | 25 / 63 | 26 / 63 | 24 / 118 | 93 / 35 | 24 / 76 |
| same, M2 | | 31 / 49 | 69 / 49 | 62 / 42 | 25 / 63 | 26 / 63 | 25 / 104 | 142 / 7 | 35 / 49 |
| 1366 × 768 (1) M3 | 1366 × 768 | 128 / 14 | 116 / 14 | 122 / 14 | 91 / 21 | 93 / 14 | 77 / 35 | 141 / 7 | 67 / 35 |
| same, M2 | | 130 / 14 | 116 / 14 | 110 / 14 | 62 / 28 | 84 / 21 | 66 / 42 | 139 / 7 | 72 / 21 |
| 1440 × 900 (1) M3, 2 runs | 1440 × 900 | 115 / 14 · 112 / 14 | 113 / 21 · 114 / 21 | 115 / 14 · 114 / 14 | 80 / 21 · 79 / 21 | 81 / 21 · 82 / 21 | 64 / 28 · 63 / 28 | 144 / 7 | 70 / 21 · 69 / 28 |
| same, M2, 2 runs | | 111 / 14 · 118 / 14 | 107 / 21 · 113 / 21 | 110 / 14 · 114 / 14 | 75 / 21 · 79 / 21 | 29 / 56 · 80 / 21 | 64 / 28 · 64 / 28 | 144 / 7 | 69 / 28 · 70 / 21 |
| 2560 × 1440 (1) M3 | 2560 × 1440 | 38 / 42 | 78 / 49 | 71 / 42 | 24 / 62 | 27 / 49 | 23 / 97 | 128 / 14 | 23 / 63 |
| same, M2 | | 42 / 35 | 50 / 70 | 54 / 62 | 19 / 77 | 28 / 49 | 27 / 70 | 137 / 13 | 25 / 49 |

- **Long tasks at 1440:** 2 (≈ 355 ms and ≈ 53 ms, both during boot), identical to M2.
- **Payload at 1440:** 982 KB vs 968 KB for M2 (+14 KB, CSS).
- **Pixel count:** at 2560 the canvas is the same size as before (composition units × u × DPR = physical pixels).

**DPR (§47).** The authored caps are unchanged: 1.75 below 700 px wide, 1.5 above. A DPR-3 phone renders 3.06× fewer pixels than native. I did not change the cap without a real-phone comparison of sharpness and frame time; that belongs to the real-device pass.

---

## 8 · Accessibility (§52–53)

- Semantic DOM, landmarks, labels, focus and keyboard paths are unchanged.
- Content hidden for space stays in the accessibility tree.
- Touch target: the language control is now 32.8 px wide.
- Reduced motion: § 6.
- Contrast was not re-audited for the new tablet / short type sizes (sizes only grew or were unchanged on the same grounds). One reduction: short-landscape type is 13–14 px on the same grounds as the phone rules.

---

## 9 · Real devices (§66)

| | Tested |
|---|---|
| REAL | **iPhone 7 Plus, iOS 15.8.8, Safari**: one 5+ minute session by you (§ 13). No tablet, Android device or screen reader. |
| EMULATED | 18 viewports × 2 locales, CDP touch, DPR 1–3, safe-area override, reduced motion, rotation |

---

## 10 · Scorecard (§67)

| | Score | Blocker if < 9 |
|---|---|---|
| Small phone (320) | 8 | last PSI row of İstanbul f2 sits on the bottom strip; EN hint ellipsised; not seen on a real SE |
| Normal phone | 8.5 | validated on one real iPhone only; no Android, no newer iOS |
| Large phone | 8.5 | iPhone 7 Plus is the only large phone seen for real; no notched iPhone (safe area is emulated only) |
| iPad portrait | 8.5 | lower half of Creative / Full-Stack is quiet material; not seen on a real iPad |
| iPad landscape | 9 | — |
| 13-inch laptop | 9 | — |
| Desktop | 9 | — |
| Large desktop | 8.5 | 2560 / 3440 are the 1920 composition scaled (capped 1.6): intentional, not newly authored |
| TR typography | 9 | — |
| EN typography | 9 | — |
| Touch interaction | 9 | — (emulation plus one real iOS Safari session; other browsers / Android not seen for real) |
| Scroll reliability | 9 | — (same limitation) |
| Project media | 9 | — |
| Lab usability | 9 | — (hold, rooms, video, rotation passed on the real iPhone) |
| Contact | 9 | — |
| Performance | 8.5 | per-class figures are desktop-GPU emulation; the real session reports normal warming and no stutter, but no fps / memory / battery was measured on the phone |

---

## 11 · Acceptance (§68)

| # | Question | Answer |
|---|---|---|
| 1 | Real-phone Work hold bug fixed? | **YES** (iPhone 7 Plus · iOS 15.8.8 · Safari) |
| 2 | Real-phone Lab hold bug fixed? | **YES** (same device; also after video playback and rotation) |
| 3 | Does scroll / navigation recover? | **YES** (emulation 24 / 24 × 2 locales plus interrupted-touch variants; real device: no stuck input or dead navigation observed) |
| 4 | Native long-press media UI prevented where C2 holds? | YES (media is not a hit target; callout suppressed on `#media`) |
| 5 | Normal native vertical scroll remains? | YES where content scrolls (About); C2 swipe navigation works; shell pages are scrollable again when C2 is inactive |
| 6 | Registration intact? | YES |
| 7 | Lab physics intact? | YES (no physics change; room positions identical at 1440) |
| 8 | All viewport classes authored? | YES |
| 9 | TR and EN verified? | YES |
| 10 | iPads verified? | YES (emulated only; portrait and landscape) |
| 11 | 13-inch viewports verified? | YES |
| 12 | 2560+ verified? | YES (2560 × 1440, 3440 × 1440) |
| 13 | Real phone tested? | **YES** (iPhone 7 Plus, iOS 15.8.8, Safari) |
| 14 | Locked desktop C2 regressed? | NO |
| 15 | Static generation passes? | YES (`nuxt generate` exit 0; typecheck exit 0) |
| 16 | Hydration / console errors? | NO (0 across the matrix, touch runs and reduced-motion runs) |

---

## 12 · Decision

**M3 PASS — READY TO COMMIT**

Previous blockers, now removed:
1. §11 / §68 #13, no real-phone validation → tested on a real iPhone (§ 13).
2. #1 / #2, Work and Lab hold bug fixed in emulation only → both pass on the real device.
3. §49 long session → a 5+ minute real session, normal warming, no stutter or interaction degradation reported.

Retained:
- the limitations in § 13;
- the 320 × 568 caveat in § 6: the last İstanbul PSI row reaches the bottom strip, and the EN hint ellipsises. Non-blocking and unchanged.

---

## 13 · Real-device evidence

Run by you on the M3 production build served from this PC over the local network. Results are as you reported them; nothing here was measured by instrumentation on the phone.

| Test | Result |
|---|---|
| Device | iPhone 7 Plus |
| OS | iOS 15.8.8 |
| Browser | Safari |
| Connection | same local Wi-Fi |
| 5+ minute session | PASS |
| Thermal | Normal warming |
| Native image callout (save / copy image) | Not observed |
| Work hold | PASS |
| Work hold → immediate swipe / navigation | PASS |
| Project enter / return | PASS |
| Lab hold | PASS |
| Lab room creation | PASS |
| Lab hold → immediate swipe / navigation | PASS |
| Lab after video playback | PASS |
| Locale switch | PASS |
| About / Back | PASS |
| Portrait → landscape → portrait (in the Lab) | PASS: canvas, Lab, hold and navigation usable; no duplicated canvas, broken media or reload |
| Stuck input / dead navigation | Not observed |
| Crash / reload | Not observed |

### What this proves, and what it does not
It proves the original defect is gone on one real iOS device, in one Safari version, over one physical session. That is the device class and browser engine where it was found, and it closes the explicit M3 real-phone gate.

It does **not** prove:
- other iPhones (notched models with safe-area insets were only emulated);
- other iOS or Safari versions;
- Chrome on iOS;
- Android devices or browsers;
- tablets, which were only emulated.

**Not measured on the phone:** fps, frame time, memory, battery, temperature. The thermal line is your observation, not a reading.

**Not supplied as evidence:** a screen recording (§60). Registration and the two-finger squeeze were not called out separately; they are covered by emulation (§ 2) and by Work hold → project entry passing on the device.
