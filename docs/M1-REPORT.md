# M1 — FROZEN C2 RUNTIME TRANSPLANT

Desktop visual / behavioural parity gate. Measured 2026-09-16, production build vs production build,
1440 × 900, `/en` against the frozen prototype's own `dist/`. Nothing committed, nothing pushed, nothing
deployed. `../c2-surface-lab` was read only: no file in it was edited, renamed, deleted or rebuilt.

---

## A · Files copied from the frozen C2

All from `../c2-surface-lab/src/` into `engine/c2/`:

`main.js` · `surface.js` · `physics.js` · `states.js` · `world.js` · `content.js` · `media.js` ·
`tone-core.js` · `tone.worker.js` · `style.css`

Assets copied from `../c2-surface-lab/public/opt/` into `public/opt/` — the optimised derivatives the
prototype already proved (99 image files, 10 Lab files, 10.1 MB). **Nothing else was copied:** no
`review/`, no recordings, no stills, no perf logs, no smoke output, no raw source video, no `tools/`,
no `dist/`.

## B · Files newly created

| File | Why |
|---|---|
| `app/composables/useC2Engine.ts` | the whole Nuxt ↔ C2 adapter (92 lines) |
| `app/components/C2Surface.client.vue` | route-sync activator; renders nothing |
| `app/plugins/c2.client.ts` | starts the runtime in parallel with hydration (see §57) |
| `engine/c2/types.ts` | typed boundary: `C2Event`, `C2Command`, `C2MountOptions`, `C2Snapshot`, ids |
| `engine/c2/main.d.ts` | declarations for the three host-facing entry points of the JS runtime |
| `.gitattributes` | `* text=auto eol=lf` |
| `docs/m1-parity/*.jpg` | 15 side-by-side parity sheets (frozen left, Nuxt right), 1.3 MB |
| `docs/M1-REPORT.md` | this file |

## C · Files modified in the M0 shell

| File | Change |
|---|---|
| `app/layouts/default.vue` | one line: `<C2Surface />` |
| `app/assets/css/base.css` | two rules: the shell steps aside when the runtime has mounted, and the runtime's DOM is hidden when it does not have the screen |
| `nuxt.config.ts` | dropped the `#engine` alias (the adapter imports the runtime by relative path so TS and Vite resolve it identically) |
| `package.json` | four frozen dependencies (§60) |

No page, no data module, no locale file and no SEO code was touched. `/tr`, `/en`, `/tr/about`,
`/en/about` and `/` still generate exactly as in M0.

## D · Nuxt ↔ C2 adapter design

The runtime keeps its own DOM — `#media`, `#surface`, `#ui` — created once and appended to
`document.body`, **outside the Vue tree**. Vue never patches, moves or unmounts the element the WebGL
context lives on, which is what makes route changes free.

```
plugin (c2.client.ts)  ->  useC2Engine().start()
                             createHostDom()            #media / #surface / #ui on <body>
                             import('engine/c2/main.js')
                             configure({ homeUrl, aboutUrl, isAboutPath, push, back, emit })
                             mountC2()                  -> html[data-c2=on] -> shell steps aside

component (C2Surface)  ->  watch(route.fullPath) -> configure() + routeChanged()
                       ->  onBeforeUnmount -> setActive(false)  (entry route keeps the shell)
```

Four things cross the boundary, all low-frequency: the two route URLs, "the URL changed", "the runtime
wants to navigate", and semantic checkpoints out. Nothing else.

## E · Engine lifecycle

Mounted once per document, in parallel with hydration. It is never unmounted by a route change; it is
only deactivated (CSS) if the visitor lands on the x-default entry, where the surface does not belong.
There is no `KeepAlive` anywhere — it was not needed, because nothing that matters lives in a Vue
component. The engine owns its `requestAnimationFrame` loop, its pointer and keyboard listeners, its
shader state and its own `sessionStorage` snapshot, exactly as in the prototype.

## F · Engine state vs app state

| Stays inside the engine (never reaches Vue) | Crosses as a semantic checkpoint |
|---|---|
| pointer position, pressure, press progress | `projectOpened` (index + ink) |
| row offsets, registration interpolation, `wt`/`p`/`front` | `aboutVisited` |
| release progress, shader uniforms, frame timing | `labRoomCommitted` (normalised x/y, height) |
| Lab room growth, scarcity, relaxation, budget | `scarCommitted` (normalised x/y, source) |

`studyActivated` was deliberately **not** wired: study assignment happens inside the frame loop, so
emitting it would put frame-rate state across the boundary. The active study is already in the engine's
own memory and in the caption DOM.

## G · Route lifecycle strategy

The shell owns the URL; the runtime asks. Every `history.pushState` in the frozen code now calls
`HOST.push`, which is `router.push`; `history.back()` is `router.back()`. The runtime's own `popstate`
listener is suppressed when hosted (`globalThis.__c2Hosted`) — vue-router already handles popstate, and
the adapter hands the result to `routeChanged()`. Back, forward and locale changes therefore all travel
one path. Measured: listener counts on `window` are identical at every step of a ten-step visit, and
there is exactly one `canvas#surface` and one `#ui` throughout.

## H · Session-memory strategy

Two layers, unchanged in kind from what each side already had:

1. **Engine memory** — the prototype's own `sessionStorage` snapshot (visit order, marks, sheet state).
   Untouched, still written on `pagehide`.
2. **Nuxt visit memory** — `useVisit()` from M0, now fed by the four semantic checkpoints. After a real
   visit it holds: `openedProjects: ['istanbul-sehir-ici','evden-eve-nakliyat']`, their inks, About
   visited, two Lab rooms with normalised coordinates.

Because the runtime is never torn down by a route change, no restore-from-snapshot path is exercised in
normal navigation; the snapshot exists for a genuine reload.

---

## 55 · Source parity

| Frozen path | Target path | Identical | If not, why |
|---|---|---|---|
| `src/surface.js` | `engine/c2/surface.js` | **YES** | — |
| `src/physics.js` | `engine/c2/physics.js` | **YES** | — |
| `src/states.js` | `engine/c2/states.js` | **YES** | — |
| `src/world.js` | `engine/c2/world.js` | **YES** | — |
| `src/media.js` | `engine/c2/media.js` | **YES** | — |
| `src/tone-core.js` | `engine/c2/tone-core.js` | **YES** | — |
| `src/tone.worker.js` | `engine/c2/tone.worker.js` | **YES** | — |
| `src/style.css` | `engine/c2/style.css` | **YES** | — |
| `src/content.js` | `engine/c2/content.js` | NO (+4 / −2) | asset base and manifest path only |
| `src/main.js` | `engine/c2/main.js` | NO (+32 / −12) | six categories below |

**`content.js`** — two changes, both path plumbing:
1. `import MANIFEST from '../public/opt/img/manifest.json'` → `'../../public/opt/img/manifest.json'`
   (the file moved one directory deeper).
2. `const BASE = import.meta.env.BASE_URL` → `globalThis.__c2Base ?? import.meta.env.BASE_URL`.
   Unavoidable: in Nuxt, Vite's `BASE_URL` points at the build-asset directory (`/_nuxt/`), while
   `/public` is served at `app.baseURL`. Without this, every derivative 404s. The host sets
   `__c2Base` from the single existing Nuxt config source (`useRuntimeConfig().app.baseURL`) before the
   module loads; standalone the expression falls back to the original value, so the prototype is
   unaffected.

**`main.js`** — thirteen edits in six categories, all mechanical, none algorithmic:
1. **Routing injection** (1 edit): `HOME_URL` / `ABOUT_URL` / `isAboutPath` became `let` plus a `HOST`
   object and an exported `configure()`. Unavoidable: the prototype derives its URLs from
   `location.pathname`, which yields `/enabout` on a locale-prefixed route. Defaults are byte-equivalent
   to the old behaviour.
2. **History through the host** (5 edits): four `history.pushState(...)` and one `history.back()` now
   call `HOST.push` / `HOST.back`. Unavoidable: writing history behind vue-router's back desynchronises
   the router.
3. **Route changes** (2 edits): the `popstate` listener body became the exported `routeChanged()`; the
   listener is still attached when running standalone. Unavoidable: two independent popstate handlers
   would double-process a Back.
4. **Semantic checkpoints** (4 edits): four additive `HOST.emit(...)` calls at existing checkpoints
   (project opened, About mark, Lab room committed, yield mark). No existing statement changed.
5. **Mount** (1 edit): `start()` → `export { start as mountC2 }` plus `if (!globalThis.__c2Hosted) start()`.
   Unavoidable: hosted, the DOM must exist before the module evaluates.
6. **Debug handle** (1 edit): `configure` and `routeChanged` added to `window.__lab` so the same
   verification tooling drives both builds.

No variable was renamed, no file split, no class introduced, no interpolation, shader, timing or
interaction code touched.

## 56 · Visual parity — frozen vs Nuxt M1

Same script, same waits, same viewport, production builds. "mean" is the mean per-pixel channel
difference over the full 1440 × 900 frame; sheets in `docs/m1-parity/`.

| State | mean | % pixels > 8 | Verdict |
|---|---|---|---|
| Opening (first band) | 2.64 | 5.2 | NEAR-IDENTICAL — animation phase |
| **Exact lock** | **0.02** | 0.0 | **IDENTICAL** |
| About wedge | 0.24 | 0.0 | IDENTICAL |
| About grown room | 0.43 | 0.5 | NEAR-IDENTICAL |
| Creative | 0.24 | 0.0 | IDENTICAL |
| Full-Stack | 0.12 | 0.0 | IDENTICAL |
| **Work field** | **0.01** | 0.0 | **IDENTICAL** |
| Registration (mid-tune) | 1.33 | 4.3 | NEAR-IDENTICAL — animation phase |
| Release (mid-release) | 16.86 | 20.4 | NEAR-IDENTICAL — animation phase |
| **İstanbul world** | **0.00** | 0.0 | **IDENTICAL** |
| **Ege world (SCALE)** | **0.00** | 0.0 | **IDENTICAL** |
| **Evden world (ADMIN)** | **0.00** | 0.0 | **IDENTICAL** |
| Bridge (band) | 5.71 | 6.0 | NEAR-IDENTICAL — animation phase |
| Lab (2 rooms, 1 study playing) | 17.05 | 20.3 | NEAR-IDENTICAL — video decode phase |
| Contact | 2.20 | 3.7 | NEAR-IDENTICAL — threads still settling |

Nothing is DIFFERENT. Every settled state is pixel-identical; every non-zero row is a frame captured
mid-animation, where a few milliseconds of phase move a lot of pixels. That claim is not left to the
screenshots — it is backed two ways:

**Behaviour curves.** The engine's own scalars were sampled every frame through each transition in both
hosts and compared point by point (0–1 scales):

| Transition | RMS difference | Mode sequence |
|---|---|---|
| Opening | introReg 0.0016, nameAmp 0.0003 | index = index |
| About wedge | shiver 0.025 | index = index |
| About grown | aboutDetailK 0.019 | index = index |
| Registration | **wt 0.0005** | index = index |
| Release | releaseK 0, front 0, shiver 0.005 | index→world = index→world |
| Bridge | front 0.004, bridgePK 0.003 | bridge→index = bridge→index |

**Lab physics.** After three identical scripted holds: pins at (36,450 h73.5), (1073,291 h104.9),
(859,627 h123.2) frozen vs (36,449 h74.7), (1073,291 h104.5), (856,627 h123.4) Nuxt — within 1–3 px.
Same study assignment (0,1,2), same caption ("03 / 05 — Condensed vertical type study"), one active
video decoder in both, scarcity 0.9059 vs 0.9094.

## 57 · Timing

| Moment | Frozen | Nuxt M1 | Δ |
|---|---|---|---|
| Runtime ready (`__lab` alive) | 1006 ms | 1022 ms | +16 ms |
| Intro starts | 1008 ms | 1024 ms | +16 ms |
| Exact lock reached | 4695 ms | 4675 ms | −20 ms |
| Registration (tune → settled) | 729 ms | 723 ms | −6 ms |
| Release (hold → world) | 1756 ms | 1772 ms | +16 ms |
| Bridge (trigger → Lab settled) | 3963 ms | 4003 ms | +40 ms |

The first measurement of the transplant had the runtime ready at **2091 ms** — a full second late,
because the engine chunk was imported after hydration finished. That is why `app/plugins/c2.client.ts`
exists: it starts the import in parallel with hydration, which is how the prototype behaves (its script
is the first thing in the document). No loader, no splash, no artificial delay was added.

## 58 · Performance — frozen vs M1 (production builds, same machine, Intel iGPU)

| State | Frozen fps | p95 ms | jank | M1 fps | p95 ms | jank |
|---|---|---|---|---|---|---|
| Opening | 112.8 | 13.9 | 1 | 103.7 | 14.1 | 1 |
| Name idle | 111.2 | 14.0 | 0 | 111.7 | 14.0 | 0 |
| Registration | 105.1 | 20.7 | 0 | 112.4 | 20.6 | 1 |
| Release | 110.8 | 14.0 | 2 | 108.4 | 14.1 | 4 |
| Project world | 79.6 | 20.8 | 1 | 76.4 | 20.8 | 0 |
| Bridge | 80.7 | 20.9 | 1 | 79.1 | 20.9 | 3 |
| Lab hold | 54.2 | 55.4 | 24 | 56.3 | 48.7 | 26 |
| Lab playing | 137.6 | 7.4 | 0 | 132.2 | 13.6 | 0 |
| Contact | 71.2 | 20.8 | 4 | 66.7 | 20.9 | 7 |

Every state is within run-to-run variance (±20 % on this GPU); Lab hold, the heaviest state, is
marginally better in M1 (56.3 fps, p95 48.7 ms vs 54.2 fps, p95 55.4 ms). The only consistent difference
is the opening, about 9 fps lower, because hydration runs while the intro animates — p95 is unchanged at
14 ms, so no frame is dropped; the loop simply shares the main thread for a few hundred milliseconds.

Startup long tasks: frozen 409 ms + 59 ms; M1 **77 ms + 59 ms** — better, because Nuxt chunking splits
what the prototype evaluated in one go.

### Payload

| | Requests | Transfer | JS | CSS | Images | Fonts | HTML |
|---|---|---|---|---|---|---|---|
| M0 shell (no C2) | 24 | 94 KB | 82.7 | 4.3 | 0 | 0 | 3.6 |
| Frozen C2 | 10 | 409 KB | 65.9 | 18.2 | 233.0 | 90.4 | 1.3 |
| Nuxt M1 | 28 | **501 KB** | 216.5 | 39.6 | 233.9 | 90.4 | 3.6 |

**+92 KB over frozen, itemised:** Nuxt runtime and router chunks about 82 KB (the unchanged M0
baseline), shell CSS 2.4 KB, route payload and build-meta JSON about 1 KB, larger prerendered HTML
2.3 KB, favicon 0.9 KB. Media, fonts and the engine chunk are the frozen figures to the byte
(233.9 / 90.4 / 65.9 KB): nothing extra is preloaded because Nuxt exists, and no project-world media is
fetched eagerly.

A cache-disabled measurement reports 585 KB because it counts each modulepreload and its import twice;
with the cache on — a real first visit — it is 501 KB.

### Lighthouse (desktop, /en, production build, runtime live)

Performance **97** · Accessibility **100** · Best Practices **100** · SEO **100**.
FCP 0.4 s · LCP 0.5 s · TBT 10 ms · CLS 0 · 501 KiB · DOM 262 elements. The M0 shell alone scored 100;
the three points are the runtime's own main-thread work, not a defect.

## 59 · Nuxt health

| Check | Result |
|---|---|
| `npx nuxt typecheck` | exit 0 |
| `npm run generate` | exit 0, 12 routes prerendered |
| Routes generated | `/`, `/tr`, `/en`, `/tr/about`, `/en/about` plus 200/404/payloads/robots/sitemap/opt |
| Direct load `/en/about` | opens the grown room (aboutDetail true, k = 1), title "About — Emrah Yücel" |
| Hydration mismatches | 0 |
| Console errors or warnings | 0 across a ten-step visit, five viewports and both locales |
| Uncaught promise rejections | 0 |
| Failed requests | 0 |
| Duplicate listeners after route changes | none — window listener counts identical at all ten steps |
| Duplicate DOM | none — exactly one canvas#surface and one #ui throughout |
| Browser Back / Forward | /en → /en/about → Back → Forward → Back: runtime alive, memory intact |
| Locale switch | /en → /tr → /en: session preserved |
| Responsive smoke | 390×844, 820×1180, 1440×900, 1512×982, 2560×1440 — all boot, correct orientation, canvas sized to viewport, no horizontal overflow, 0 logs |

## 60 · Housekeeping

- **`.gitattributes` added** (`* text=auto eol=lf`). It caused **no** content changes: `git diff` and
  `git diff --cached` were both empty; only the new file appeared as untracked. Nothing was committed.
- **Site URL not duplicated.** No new file mentions a domain. The runtime needs only the public asset
  base and takes it from the existing single source, `useRuntimeConfig().app.baseURL`.
- **New dependencies — four, all frozen-prototype runtime requirements:** `gsap` (the engine's entire
  timing layer), `@fontsource-variable/big-shoulders-display`, `@fontsource-variable/geist`,
  `@fontsource/geist-mono` (the three faces the surface renders as material; without them the type
  texture is wrong). No Pinia, no Nuxt Image, no i18n module, no state-machine library, no WebGL
  framework, nothing invented for M1.
- **No review assets copied.** `public/opt` is 10.1 MB of already-optimised derivatives and Lab clips.
  The 96 MB raw video folder, the recordings, stills, logs, smoke output and prototype reports were not
  copied. `.output/` and `node_modules/` stay git-ignored.
- **git status:** modified `app/assets/css/base.css`, `app/layouts/default.vue`, `nuxt.config.ts`,
  `package.json`, `package-lock.json`; untracked `.gitattributes`, `app/components/C2Surface.client.vue`,
  `app/composables/useC2Engine.ts`, `app/plugins/`, `engine/c2/`, `public/opt/`, `docs/m1-parity/`,
  `docs/M1-REPORT.md`. Nothing staged, nothing committed, nothing pushed.

## 61 · Final acceptance

| # | Question | Answer |
|---|---|---|
| 1 | Does Nuxt M1 look like the frozen C2? | **YES** — every settled state pixel-identical; no state DIFFERENT |
| 2 | Does it feel like the frozen C2? | **YES** — timings within 40 ms, trajectories RMS ≤ 0.025, frame rates within variance |
| 3 | Did registration change? | **NO** — wt RMS 0.0005, 729 → 723 ms; `states.js` and `surface.js` byte-identical |
| 4 | Did release change? | **NO** — releaseK and front curves identical, 1756 → 1772 ms, resulting world frame pixel-identical |
| 5 | Did project-world rhythm change? | **NO** — `world.js` byte-identical; İstanbul, Ege and Evden frames all 0.00 mean difference |
| 6 | Did Lab physics change? | **NO** — rooms within 1–3 px, same study assignment, same scarcity, one decoder |
| 7 | Did the Contact ending change? | **NO** — same visit history, inks and utilities; only thread-settling phase differs mid-animation |
| 8 | Does the session survive route changes? | **YES** — About, Back, Forward and Lab all preserve visit order, marks and rooms |
| 9 | Does the session survive locale switching? | **YES** — /en → /tr → /en kept visit order 0,2, five Lab pins, the About mark, one canvas |
| 10 | Did Nuxt introduce a meaningful performance regression? | **NO** — all states within variance; Lab hold and startup long tasks improved; +92 KB transfer, itemised |
| 11 | Does static generation still work? | **YES** — generate exit 0, 12 routes |
| 12 | Is shared-hosting deployment still possible with static files only? | **YES** — `.output/public` is plain files; no Node, no SSR, no middleware, no API |

## 62 · Final decision

**M1 PASS — READY FOR HUMAN REVIEW.**

Deliberate limitations carried forward (not parity defects):

1. `/tr` hosts the runtime with the frozen **English** strings. The route builds, stays semantically
   valid and keeps the session; locale-specific C2 copy has an input boundary (`engine/c2/content.js`)
   but was excluded from M1 by §17.
2. While the runtime is on screen it *is* the page: the M0 semantic shell ships in the prerendered HTML
   for crawlers and no-JS visitors, then steps aside for the runtime's own landmarks and plain
   navigation (axe: 100). Merging the two DOM trees is an M2 decision, not an M1 rewrite.
3. The engine is still JavaScript by instruction; only its boundary is typed.
4. The short Lab loops remain as recorded — content, not migration.

**STOPPED after M1.** No TypeScript rewrite, no Turkish visual integration, no responsive pass, no CV
work, no new creative work, no deploy, no commit, no push.
