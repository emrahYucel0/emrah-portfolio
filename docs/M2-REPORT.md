# M2 — BILINGUAL CONTENT AUTHORITY

TR / EN C2 localisation from a single source of truth. Measured 2026-09-16 on the production build
(`npm run generate` → `.output/public`, served statically), 1440 × 900 unless stated. Nothing committed,
pushed or deployed.

> **Test-environment note.** Midway through, I found a leftover M1 `nuxt dev` process bound to
> `[::1]:3000` alongside the production server on `0.0.0.0:3000`; Chrome resolves `localhost` to `::1`,
> so some intermediate runs hit dev. I killed it, pinned every run to `127.0.0.1`, verified no Vite client
> was served, and **re-measured every timing, pixel, switching and performance number in this report on
> production**. Content audits were unaffected (dev and production serve the same source).

---

## 66 · Content architecture

**Canonical location:** `shared/content/` — no Vue, no Nuxt, no composables, no browser APIs.

| File | Holds |
|---|---|
| `types.ts` | `Locale`, `ProjectId`, `StudyId`, the fact types and the `LocaleCopy` schema both languages must satisfy |
| `facts.ts` | locale-independent truth: profile (name, email, phone, tel, GitHub, LinkedIn, `cv: null`), the three projects (id, brand name, URL, host, ink, rhythm, stack, PageSpeed numbers, media files), the five studies |
| `locales/en.ts`, `locales/tr.ts` | all language: metadata, navigation, roles, identity, About, faces, Work, per-project strength / line / role / facts / captions / alt text, Lab, PSI labels, hints, aria names, language control, entry page, 404 |
| `media.ts` | pure builders from the derivative manifest to image / clip descriptors (one asset, both locales) |
| `term.ts` | `Term` — a string that stays English inside Turkish copy, with text / lang / HTML helpers |
| `index.ts` | `messages(locale)` for Nuxt, `c2Content(locale, …)` for the runtime |

**Facts vs copy.** Every number is stored once: `94 / 100 / 100 / 100`, `95 / 97 / 100 / 100`,
`98 / 100 / 100 / 100`, the PageSpeed values for Ege — all in `facts.ts`. `968` and `15` live inside each
language's fact *sentence* ("968 sitemap URLs" / "968 sitemap URL’si") because the unit is language.
URLs, inks and media files are never repeated per locale; only `alt` text is localised.

**How Nuxt reads it.** `useLocale()` → `messages(locale)`; pages and components import `profile`,
`projects`, `studies`, `HTML_LANG`, `OG_LOCALE`, `termText` / `termLang` from `~~/shared/content`.

**How C2 reads it.** `engine/c2/content.js` is now a 64-line adapter with **no copy in it**. It builds the
legacy export shape (`identity`, `about`, `capabilities`, `workIntro`, `works`, `lab`, `contact`,
`previewOf`) plus `ui` — the whole active `LocaleCopy` — from `c2Content()`. The host passes the locale
explicitly (`globalThis.__c2Locale` before load, `setLocale()` after); the runtime never parses a URL for it.
`applyLocale()` **mutates** the exported objects in place, so the runtime's loaded images, tone caches and
Lab poster/video elements, which hang off those objects, survive a language change.

**How duplication was removed.**
- Deleted `app/data/*` (4 files) and `app/locales/*` (4 files) — the shell's second copy of everything.
- `engine/c2/content.js`: 175 lines of English copy and facts → 64-line adapter.
- 21 hard-coded labels, aria names, hints and titles in `main.js`, 5 captions / PSI labels in `world.js`,
  and the face words in `states.js` now read from the authority.
- The shell's hard-coded name, roles, entry-page text and 404 text moved into the authority.
- Audit: all 198 authority strings (10+ characters) searched across the 35 production source files.
  Remaining matches are code fragments (`, hreflang: `) and comments only — **no human-facing duplicate**.

**Ownership test (§5), run for real.** I changed `nav.contact` to `Contact-PROBE` in `locales/en.ts` and
the phone to `… PROBE` in `facts.ts`, rebuilt, and checked:

| | Prerendered HTML | Live runtime DOM |
|---|---|---|
| EN copy change | `/en` contains `Contact-PROBE` | EN strip button reads `Contact-PROBE`; TR still reads `İletişim` |
| Fact change | `/en` **and** `/tr` contain the probe phone | EN **and** TR contact show the probe phone |

Probe reverted, rebuilt, zero `PROBE` left in source or build.

---

## 67 · Modified files

**New:** `shared/content/{types,facts,media,term,index}.ts`, `shared/content/locales/{en,tr,index}.ts`,
`docs/M2-REPORT.md`, `docs/m2-parity/` (EN M1-vs-M2 sheets, TR stills, responsive About shots — 4.3 MB).

**Deleted:** `app/data/{profile,projects,lab,media}.ts`, `app/locales/{messages,en,tr,index}.ts`.

**Modified Nuxt files:** `useLocale.ts`, `useLocaleSeo.ts` (shared imports, site name from facts),
`useVisit.ts` (shared ids; storage key → `ey.visit.v2` because project ids changed), `useC2Engine.ts`
(passes `locale` and `localeHref`, calls `setLocale()` on every route change), `SiteHeader.vue`,
`SiteFooter.vue`, `LocaleSwitcher.vue`, `pages/[locale]/index.vue`, `pages/[locale]/about.vue`,
`pages/index.vue` (entry: copy from the authority, `og:locale` added), `error.vue` (404 copy from the
authority). No route added or removed.

**Modified C2 files — every change, with its reason:**

| File | Change | Why | Algorithm changed? |
|---|---|---|---|
| `content.js` | rewritten as an adapter over `shared/content`; `applyLocale()` mutates in place | the runtime must not own a second copy of content | **No** — same export shape, same objects |
| `main.js` · labels | 21 literals (nav, aria names, headings, Back, Open, All work, Next, Again, Visit, plain-nav labels, titles, hints) → `TXT.*` | they were English on `/tr` | No |
| `main.js` · `lang="en"` | on role names, stack lines, GitHub / LinkedIn, hostnames | CSS `uppercase` follows element language: without it `/tr` rendered `CREATİVE`, `EVENAKLİYATEVDEN.COM` | No |
| `main.js` · click listener | the one delegated `#ui` listener moved from inside `buildDOM()` to module scope | a DOM refresh must not attach it twice; same element, same handler body | No |
| `main.js` · `setLocale()` | new exported function: `applyLocale` → clear frame copy cache → `buildDOM()` → reset DOM caches → `layoutDOM()` → refill the open world | the live language switch | No — calls only existing DOM functions |
| `main.js` · language control | quiet `TR` / `EN` link in the existing strip nav, routed through `HOST.push` | while the runtime is live the shell (and its switch) steps aside, so there was **no way to change language** on the experience | No |
| `main.js` · h1 | English connector `and` → `TXT.roles.and` | screen-reader heading was half-English on `/tr` | No |
| `world.js` | PSI head / Mobile / Desktop labels and 4 world captions → the work's localised copy; `lang` on PSI head and stack | same as above | No — geometry untouched |
| `states.js` | `['CREATIVE', 'FULL-STACK']` → `[capabilities.surface.word, capabilities.system.word]` (2 lines) | the face words were duplicated copy; the strings are identical, so sizing is identical | No |
| `types.ts`, `main.d.ts` | `locale`, `localeHref`, `setLocale` on the typed boundary | host contract | — |

Byte-identical to M1: `surface.js`, `physics.js`, `media.js`, `tone-core.js`, `tone.worker.js`, `style.css`.

---

## 68 · English parity — M1 vs M2 (production)

Same capture script, same waits. Mean per-pixel difference over the frame; sheets in `docs/m2-parity/en-m1-vs-m2/`.

| State | Mean | Verdict |
|---|---|---|
| Opening | 6.01 | NEAR-IDENTICAL — animation phase |
| Exact lock | 0.08 | IDENTICAL |
| About (wedge) | 0.36 | IDENTICAL |
| About (grown room) | 0.31 | IDENTICAL |
| Creative | 0.34 | IDENTICAL |
| Full-Stack | 0.38 | IDENTICAL |
| Work | 1.39 | NEAR-IDENTICAL — instructed copy change (§18 role line) |
| Registration | 1.90 | NEAR-IDENTICAL — animation phase |
| Release | 6.00 | NEAR-IDENTICAL — animation phase; behaviour curves identical |
| İstanbul | 0.00 | IDENTICAL |
| Ege | 0.00 | IDENTICAL |
| Evden | 0.00 | IDENTICAL |
| Bridge | 5.78 | NEAR-IDENTICAL — animation phase |
| Lab | 18.67 | NEAR-IDENTICAL — video decode phase |
| Contact | 1.18 | NEAR-IDENTICAL |

No state is DIFFERENT. Two infrastructure-required differences appear on every EN state: the quiet `TR`
control in the strip (≈0.1 % of pixels) and, on Work, the §18 role sentence.

**Timing, M1 EN → M2 EN:** lock 4675 → 4601 ms · registration 723 → 786 · release 1772 → 1759 ·
bridge 4003 → 3965. **Startup** (runtime alive, three warm runs): frozen 423–442 ms, M2 EN 441–447,
M2 TR 441–460.

**Behaviour curves, frozen vs M2 EN** (0–1 scalars, sampled every frame): opening introReg RMS 0.0024 ·
About grown 0.017 · registration `wt` 0.0031 · release: `releaseK` and `front` identical · bridge
`bridgePK` 0.0015. One sampler artefact recurs: the first samples of a bridge run can land a frame before
the trigger, flipping the mode order; it appeared on TR in one run and on EN in the next, and both locales
spend 3934 / 3944 ms in bridge mode.

---

## 69 · Turkish quality (1440 × 900; stills in `docs/m2-parity/tr/`)

| Area | Score | Concrete issue if below 9 |
|---|---|---|
| Identity | 9 | — |
| Navigation | 9 | — `İşler · Hakkımda · Lab · İletişim · EN` |
| Homepage About | 9 | — |
| About detail (`/tr/about`) | 9 | — rooms follow the longer Turkish blocks; no clipping at 390 → 2560 |
| Work | 8 | The work caption joins strength and role: "Özgün dijital yön · Özgün görsel yön, yaratıcı frontend…". Both phrases are approved copy (strength from M1, role from §19) but read as a stutter; English has the same echo ("Original digital direction · Original visual direction…"). A copy decision, not a layout one. |
| Project worlds | 9 | — captions, PSI labels and İstanbul's stack line localised |
| Lab | 9 | — |
| Contact | 9 | — |
| Typography | 9 | — no size was reduced; Turkish casing handled by marking English terms |
| Line breaks | 8 | Only the opening positioning is authored per language (`['Dokunduğun yüzeyi kurarım', 've altındaki sistemi.']`, re-authored so its first line keeps a short tail inside the band like English). About prose and captions wrap naturally — clean at every tested size, but not individually authored per viewport; that belongs to M3. |

**Turkish copy audit (§58)** — every visible string, aria-label, title and image alt across name, About,
About detail, both faces, Work, all world frames of all three projects, Lab with a room, and Contact
(155 distinct strings):

- **A · professional terms (intentional):** Creative Developer, Full-Stack Developer, Creative / Motion &
  Interaction / Frontend Engineering / Full-Stack Development, CREATIVE, FULL-STACK, CMS, Admin, SEO,
  freelance, production, frontend, backend, Best Practices, PERF / A11Y / BP.
- **B · brands and names:** İstanbul Şehir İçi, Ege Eşya, Evden Eve Nakliyat, Emrah Yücel, PageSpeed
  Insights, GitHub, LinkedIn, Lab, the three domains; "English" as the name of the target language.
- **C · experiment names:** none — the five study titles are descriptions, so they are translated
  (Tipografik büyütme çalışması, Diyagonal blok çalışması, …).
- **D · bugs found and fixed:** `Images in this project:` (screen-reader prefix) · `PRODUCTİON’DA`
  (loanword + Turkish casing → "Yayında") · İstanbul's stack prose "project-served fonts · custom image
  pipeline" → a Turkish stack line · `Scroll · hareket` → "Kaydırma · hareket" · `CREATİVE`,
  `LİNKEDİN`, `EVENAKLİYATEVDEN.COM`, `PAGESPEED İNSİGHTS` casing → `lang="en"` marks · the `and` in the
  screen-reader heading. Re-audit: **0 D items remain.**
- Decision to confirm: `ADMİN` in uppercase captions follows Turkish loanword casing ("Admin paneli").

**English copy audit (§59):** strings containing Turkish letters are only Emrah Yücel, Türkiye, the project
names and "Türkçe" as the name of the target language. **No Turkish UI text on `/en`.**

---

## 70 · Switching (production, one live session)

Visit first: open İstanbul, open Evden, then switch from each place with the runtime's own `TR` / `EN`
control. Every switch preserved **the same canvas instance (1 canvas), 12 window listeners before and
after, visit order `0,2`, identical inks, identical scar count, About memory**, and Lab room count.

| From | Path | Textures created / deleted | Texture uploads (control without switch) | DOM refreshed | Long tasks | Requests |
|---|---|---|---|---|---|---|
| Work | `/en` → `/tr` | 0 / 0 | 229 (210) | 25 ms | 0 | 1 |
| Home + About wedge | `/tr` → `/en` | 0 / 0 | 119 (121) | 20 ms | 0 | 1 |
| About detail | `/en/about` → `/tr/about` | 0 / 0 | 97 (96) | 17 ms | 0 | 1 |
| Lab (5 rooms) | `/en` → `/tr` | 0 / 0 | 100 (97) | 14 ms | 0 | 1 |
| Lab (5 rooms) | `/tr` → `/en` | 0 / 0 | 179 (178) | 32 ms | 0 | 1 |

- **No engine restart, no opening replay, no media reload.** No WebGL texture is created or destroyed; the
  uploads are the runtime's normal per-frame state updates and match a no-switch control of the same
  window. The single request is Nuxt's route payload JSON. Frames over 25 ms and room drift in the Lab
  appear equally in the control (rooms are still relaxing).
- `/tr/about` after switching shows `lang="tr-TR"`, "Hakkımda — Emrah Yücel", the grown room open.
  Browser Back from there returns to `/en/about`: a language switch is a navigation in history.
- **Reduced motion:** both locales lock on the first frame (`introReg 0`); switching from inside the
  grown About takes 93–113 ms and keeps the room open with the new heading.
- **Refresh** on `/tr/about` and `/en/about` lands in the grown room with the correct `lang` and title.
- **Why a switch is this cheap:** nothing the surface paints as material is language-dependent — the name,
  the two face words and the project media are identical in both languages; every localised word is DOM.

---

## 71 · Performance (production, same machine, Intel iGPU)

| State | M1 EN fps / p95 | M2 EN fps / p95 | M2 TR fps / p95 |
|---|---|---|---|
| Opening | 103.7 / 14.1 | 128.7 / 13.9 | 109.3 / 14.1 |
| Name idle | 111.7 / 14.0 | 116.2 / 14.0 | 109.3 / 14.0 |
| Registration | 112.4 / 20.6 | 106.0 / 20.7 | 112.7 / 20.5 |
| Release | 108.4 / 14.1 | 108.9 / 14.0 | 114.1 / 14.0 |
| Project world | 76.4 / 20.8 | 79.1 / 20.8 | 80.2 / 21.1 |
| Bridge | 79.1 / 20.9 | 81.0 / 20.9 | 80.6 / 20.9 |
| Lab hold | 56.3 / 48.7 | 53.8 / 55.3 | 64.2 / 34.7 |
| Lab playing | 132.2 / 13.6 | 132.9 / 13.6 | 144.3 / 7.2 |
| Contact | 66.7 / 20.9 | 65.6 / 20.9 | 68.4 / 20.9 |

All within run-to-run variance (±20 % on this GPU).

**Startup long tasks** (PerformanceObserver, four runs each): frozen 401–420 ms · M2 EN 328–362 ms ·
M2 TR 327–343 ms. A Chrome trace of M2 shows no single task over 75 ms (module evaluation 74 ms, tone
worker message 58–66 ms, first frame 52 ms), the same shape as M1's trace. M1's report quoted one
77 ms observer reading; repeated runs show that was the low outlier. EN and TR are identical, so
localisation adds nothing here.

| | Requests | Transfer | JS | CSS | Images | Fonts | HTML | DOM |
|---|---|---|---|---|---|---|---|---|
| M1 EN | 28 | 501 KB | — | — | 233.9 | 90.4 | 3.6 | — |
| M2 EN | 29 | 503 KB | 152.6 | 21.5 | 233.9 | 90.4 | 3.9 | 312 |
| M2 TR | 30 | 510 KB | 152.6 | 21.5 | 233.9 | 97.5 | 4.1 | 320 |

TR's +7 KB is one Latin-Extended font subset — the glyphs ş, ğ, ı, İ need it. Images are the same files
in both languages; nothing is duplicated per locale.

**Lighthouse** (desktop, production): EN **96 / 100 / 100 / 100**, TR **97 / 100 / 100 / 100**;
FCP 0.4 s, LCP 0.4–0.5 s, TBT 0 ms, CLS 0 in both. It surfaced one real accessibility defect in my new
language control — visible `TR`, accessible name "Language: Türkçe" (WCAG 2.5.3 Label in Name) — fixed
to "TR — Türkçe", and the audit now passes in both locales.

**Locale-switch cost:** 14–32 ms of DOM work, 0 long tasks, 0 textures created, 0 media requests (§70).

---

## SEO audit (§60, generated HTML)

| Route | `lang` | Title | Canonical | hreflang | og:locale |
|---|---|---|---|---|---|
| `/` | en | Emrah Yücel — Creative Developer & Full-Stack Developer | `/` | tr-TR `/tr` · en `/en` · x-default `/` | en_US (+ tr_TR) |
| `/en` | en | Emrah Yücel — Creative Developer & Full-Stack Developer | `/en` | tr-TR `/tr` · en `/en` · x-default `/` | en_US (+ tr_TR) |
| `/tr` | tr-TR | Emrah Yücel — Creative Developer & Full-Stack Developer | `/tr` | same set | tr_TR (+ en_US) |
| `/en/about` | en | About — Emrah Yücel | `/en/about` | tr-TR `/tr/about` · en `/en/about` · x-default `/` | en_US |
| `/tr/about` | tr-TR | Hakkımda — Emrah Yücel | `/tr/about` | same set | tr_TR |

Descriptions are authored per language (the Turkish one is Turkish prose, not the English copied). No
locale canonicalises to the other. With JavaScript disabled, `/tr` contains Emrah Yücel, Creative
Developer, Full-Stack Developer, İşler, Hakkımda, İletişim, all three project names, the email, `tel:`,
GitHub and LinkedIn; `/tr/about` contains the approved Turkish About copy and all six capabilities.

## Build health (§61)

`nuxt typecheck` exit 0 · `npm run generate` exit 0, 12 routes · direct load and refresh on
`/tr/about` and `/en/about` · Back / Forward · locale switching · 0 hydration mismatches · 0 console
messages in every production run (ten locale × viewport smoke runs at 390 × 844, 820 × 1180, 1440 × 900,
1512 × 982, 2560 × 1440; no horizontal overflow, clipped text, off-screen controls or broken About rooms).

---

## 72 · Final acceptance

| # | Question | Answer |
|---|---|---|
| 1 | One content authority? | **YES** — `shared/content/` |
| 2 | Nuxt HTML and C2 runtime consume the same source? | **YES** — proven by the probe edit |
| 3 | Is `/tr` a real Turkish C2 experience? | **YES** |
| 4 | Is `/en` still visually equivalent to M1? | **YES** — no state DIFFERENT |
| 5 | Does locale switching preserve the live session? | **YES** |
| 6 | Does it avoid a full engine restart? | **YES** — same canvas, 0 textures created |
| 7 | Are facts stored once? | **YES** |
| 8 | Are project / media assets shared between locales? | **YES** |
| 9 | Accidental English UI strings in TR? | **NO** — 0 D items after re-audit |
| 10 | Accidental Turkish UI strings in EN? | **NO** |
| 11 | Did localisation meaningfully hurt performance? | **NO** |
| 12 | Did any locked creative system change? | **NO** — physics, shaders, timing, interaction and geometry untouched |

## 73 · Final decision

**M2 PASS — READY FOR HUMAN REVIEW**

Decisions for you to confirm:
1. The §18 / §19 role sentences now sit next to the M1 strength line in the Work caption and echo it in
   both languages ("Original digital direction · Original visual direction…").
2. The runtime strip gained a quiet `TR` / `EN` link — without it no visible language switch existed
   while the surface is live.
3. A language switch is a history entry: Back returns to the previous language.
4. `ADMİN` follows Turkish loanword casing in uppercase captions.
5. The five study titles are treated as descriptions and translated.

**STOPPED after M2.** No responsive art direction, no TypeScript engine rewrite, no CV, no new Lab
material, no deploy, no commit, no push.
