# Post-M5 compatibility: iOS 15 / Safari 15

## Browser support contract
The production build supports **Safari 15.4 and iOS 15.4 at minimum** (raised from 15.0 on 2026-09-29: the Nuxt / vue-router runtime calls `Array.prototype.at` and `Object.hasOwn`, which arrived in 15.4; no polyfills — `docs/KNOWN-ISSUES.md`). The build still lowers syntax to `safari15`. The real validation device is an **iPhone 7 Plus on iOS 15.8.8 (Safari)**.

The contract is stated once, as the Vite build target in `nuxt.config.ts`:

```ts
vite: { build: { target: ['safari15', 'ios15'] } }
```

## Symptom
On the live site the desktop worked. On the iPhone, `/`, `/index.html`, `/tr` and `/tr/index.html` showed the portfolio's own error view: "500 · This page does not exist. · Bu sayfa bulunamadı. · Türkçe / English".

- The server returned **200** for the same URLs. `robots.txt` and `favicon.ico` loaded.
- The view is `app/error.vue`, which prints `error.statusCode`. The static `404.html` hardcodes "404", so it cannot show "500".
- The failure was client-side: Nuxt entered its error state while booting.

## Root cause
- Vite 8's default target (`baseline-widely-available`) is Chrome 111 / Firefox 114 / **Safari 16.4 / iOS 16.4**.
- With that target, Nuxt 4.5.2's stable-entry optimisation (`experimental.entryImportMap`, default `true`) is active:
  - every page gets `<script type="importmap">{"imports":{"#entry":"/_nuxt/<entry>.js"}}</script>`;
  - page and layout chunks import the entry as `import … from "#entry"`.
- **Import maps need Safari/iOS 16.4.** Nuxt records exactly this boundary in `@nuxt/vite-builder` (`supportedEnvironments: { ios: 16.4, safari: 16.4, … }`) and ships no shim or fallback.
- Safari 15 ignores the import map, so `"#entry"` cannot be resolved:
  1. `TypeError: Failed to resolve module specifier "#entry"`.
  2. The initial route's page component fails to load.
  3. Nuxt stores a 500 error and renders `error.vue`.
  4. The C2 runtime never starts.
- The same target also left CSS media **range syntax** in the bundle (`@media (width<=700px)`), which Safari only supports from 16.4. On Safari 15 the phone and short-screen layout rules would have been ignored.

## Fix
One setting: `vite.build.target: ['safari15', 'ios15']`. Both strings were checked against the installed Rolldown/OXC transformer, which rejects malformed targets.

- **Import map:** Nuxt's stable-entry plugin disables itself when every target is older than 16.4, so there is no `#entry` import and no import map. `experimental.entryImportMap` is **not** set; the target alone was enough.
- **JS:** lowered to the Safari 15 syntax level. An esbuild `safari15` audit of every chunk finds nothing it cannot lower.
- **CSS:** media ranges become `min-width` / `max-width`. `:focus-visible` is wrapped in `:is()` so an unsupported selector cannot drop the whole rule.
- **CSP:** the inline import map is gone, so the build's CSP now carries 1 script hash instead of 2. `modules/production-files.ts` generated it; it was not edited by hand. All 5 executable inline scripts match.
- **Not added:** `@vitejs/plugin-legacy` and polyfills. Safari 15 has the ESM and dynamic-import baseline the app needs. Runtime APIs it lacks (`OffscreenCanvas`, `requestIdleCallback`, `navigator.userActivation`) were already feature-detected with fallbacks.

## Evidence (local, emulated)
Chrome headless with an iPhone UA, serving the production build with the production CSP enforced. **Emulation is not Safari.**

- **Safari < 16.4 simulation** (import map ignored, as Safari 15 does), routes `/`, `/tr`, `/en`, `/tr/about`, `/en/about`:
  - **before:** 5/5 show `error.vue` "500", `Failed to resolve module specifier "#entry"`, and C2 does not start;
  - **after:** 5/5 boot, C2 starts, no error view, 0 CSP violations, 0 console errors;
  - the same result holds with `OffscreenCanvas`, `requestIdleCallback` and `userActivation` removed.
- **Current Chrome, full journey under CSP** (1440 EN, 390 TR):
  - covers Hero, Work, the three projects entered and exited, Lab rooms and video, Contact, TR/EN, About/Back (Creative / Full-Stack are covered by the timing suites below);
  - 0 CSP violations, 0 console errors, 0 failed requests;
  - identical to the deployed build.
- **Regression:**
  - M3 touch (390 EN, 390 TR): all steps at rest, 0 errors;
  - Creative ⇄ Full-Stack reveal timing: T3−T1 500–706 ms on every path, as approved, with 0 violations in 36 interruption scenarios;
  - M4 audit (1440 and 390, TR and EN, plus reduced motion): axe 0 violations, every Tab stop visible with a focus ring, keyboard journey complete.
- **Bundle:**
  - JS 405,862 → 407,309 B raw, 136,898 → 137,218 B brotli;
  - CSS 48,392 → 48,424 B raw, 20,521 → 20,522 B brotli;
  - `/tr` initial static load 157,932 → 158,227 B brotli (+0.2%).

## Historical M3 discrepancy
Earlier M3 real-device evidence (iPhone 7 Plus, iOS 15.8.8, Safari: PASS) conflicts with the now-reproduced Safari 15 import-map failure. The build served in that session also contained the import map. **The cause of that historical discrepancy is unknown.** The current production failure and its deterministic reproduction take precedence.

## Still required
**Real-device validation of the fixed build on the iPhone 7 Plus (iOS 15.8.8, Safari).** This covers boot on `/tr` and `/en`, the phone layout, and the M3 hold / swipe paths. Until then, iOS 15 support is established by emulation only.
