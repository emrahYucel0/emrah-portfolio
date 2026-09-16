# M0 — NUXT 4 PRODUCTION FOUNDATION

Report for the human review gate. Measured on 2026-09-16 on this machine. Nothing was committed, pushed
or deployed. The frozen prototype `../c2-surface-lab` was not modified — it was only used, read-only, as
the source of verified copy and as the host of the dev tooling used for verification.

## A · Versions

| | |
|---|---|
| Nuxt | **4.5.2** |
| Vue | 3.5.42 |
| vue-router | 5.3.1 |
| Nitro | 2.13.4 |
| TypeScript | 5.9.3 (devDependency) |
| vue-tsc | 3.3.11 (devDependency) |
| Node | 24.18.1 |

## B · Directory tree

```
emrah-portfolio/
├─ app/
│  ├─ app.vue                     NuxtLayout + NuxtPage only
│  ├─ error.vue                   404, bilingual, links to both locales
│  ├─ assets/css/base.css         design tokens + structural styles
│  ├─ components/
│  │  ├─ SiteHeader.vue           identity, nav, locale switcher
│  │  ├─ SiteFooter.vue           contact block (email, phone, GitHub, LinkedIn)
│  │  └─ LocaleSwitcher.vue       same page, other language
│  ├─ composables/
│  │  ├─ useLocale.ts             locale from the route, copy, path helpers
│  │  ├─ useLocaleSeo.ts          title/description/canonical/hreflang/OG per page
│  │  ├─ useVisit.ts              SESSION STATE CONTRACT (+ sessionStorage)
│  │  └─ useReducedMotion.ts      reduced-motion hook for the future engine
│  ├─ data/
│  │  ├─ profile.ts               verified contact data, cv: null
│  │  ├─ projects.ts              three real projects + role metadata + ink
│  │  ├─ lab.ts                   five study ids
│  │  └─ media.ts                 ResponsiveImage / StudyClip contracts (no assets yet)
│  ├─ locales/
│  │  ├─ messages.ts              the shape both languages satisfy
│  │  ├─ tr.ts                    Turkish copy
│  │  └─ en.ts                    English copy
│  ├─ layouts/default.vue         skip link + header + main + footer
│  └─ pages/
│     ├─ index.vue                x-default entry (language resolution)
│     └─ [locale]/
│        ├─ index.vue             home
│        └─ about.vue             about
├─ engine/README.md               reserved slot + the rules the C2 engine keeps
├─ public/                        robots.txt, sitemap.xml, favicon.ico
├─ docs/M0-REPORT.md              this file
├─ nuxt.config.ts
├─ README.md
├─ tsconfig.json
└─ package.json
```

## C · Dependencies, and why each exists

| Package | Type | What it solves | Why nothing smaller works |
|---|---|---|---|
| `nuxt` 4.5.2 | dep | routing, prerendering to static HTML, head management, auto-imports | the milestone is defined as Nuxt 4 |
| `vue` 3.5.42 | dep | component runtime | Nuxt peer |
| `vue-router` 5.3.1 | dep | file-based routes | Nuxt peer |
| `typescript` 5.9.3 | dev | typed data, locales and the session contract | `.ts` data modules and `vue-tsc` need it |
| `vue-tsc` 3.3.11 | dev | `nuxt typecheck` over SFCs | `tsc` alone cannot read `.vue` |

**Not installed, deliberately:** no i18n module (the route segment plus two typed message objects covers
TR/EN and prerenders both — a module would add runtime machinery for a two-language static site), no
Tailwind (this portfolio is authored composition; tokens + scoped CSS fit it), no GSAP (M0 has no motion),
no Pinia (`useState` is enough for the session contract), no sitemap/SEO module (the route list is known
at build time; `public/sitemap.xml` and `useHead` cover it), no image module (media lands with the
migration and the prototype already proved the pipeline).

Verification tooling (puppeteer-core, axe-free checks, Lighthouse) was run **from outside this repo** —
the prototype's `node_modules` via `NODE_PATH`, and `npx lighthouse` — so the production dependency tree
stays at five packages.

## D · Static-generation configuration

```ts
ssr: true                       // so that generation renders real HTML
nitro: {
  preset: 'static',
  prerender: {
    crawlLinks: true,
    failOnError: true,
    routes: ['/', '/tr', '/en', '/tr/about', '/en/about'],
  },
}
```

`npm run generate` → `.output/public`, a folder of static files. There is no server entry, no API
directory, no middleware, no session. `runtimeConfig.public.siteUrl` is the only build-time input.

## E · Generated routes

```
/index.html            /tr/index.html        /tr/about/index.html
/200.html              /en/index.html        /en/about/index.html
/404.html              + _payload.json per route, /robots.txt, /sitemap.xml, /favicon.ico
```

12 prerendered routes, `failOnError: true`, no dynamic-route leftovers, no trailing-slash duplicates
(`path('/')` returns `/tr`, not `/tr/`). Direct loading works for every route (dev and static: 200; an
unknown locale such as `/xx` returns 404 through `definePageMeta.validate`).

## F · Locale architecture

- `app/locales/messages.ts` defines one `Messages` shape; `tr.ts` and `en.ts` each `satisfies Messages`,
  so a missing or renamed key is a type error, not a runtime blank.
- `app/locales/index.ts` holds `LOCALES`, `HTML_LANG` (`tr-TR` / `en`), `OG_LOCALE` and `isLocale`.
- `useLocale()` reads the route segment and returns `locale`, `copy`, `other`, `path()`,
  `pathWithoutLocale` and `switchPath`. Components never branch on language; they render `copy`.
- Routes live once, under `pages/[locale]/`, and are prerendered per language. Adding a third language is
  a message file plus four constants — no component changes, no duplicated markup.
- Locale-specific typography and line breaks work the same way: a locale carries its own strings, and a
  `data-locale` hook can be added on the html element when CSS needs to differ. Nothing in the CSS
  foundation assumes Latin-only copy.

## G · Semantic DOM architecture

`header` > `nav[aria-label]`, `main#main[tabindex=-1]`, `footer#contact`; one `h1` per page, `h2` for
Selected work / Lab / Capabilities / Contact, `h3` per project, `ul`/`li` for lists, `address` for contact
details, `mailto:` and `tel:` links, external links with `rel="noopener noreferrer"`.

Proven in the generated HTML with JavaScript disabled: name, both roles, all three project names with
their live links, the About texts, the six capabilities, email, phone, GitHub and LinkedIn. A skip link is
the first focusable element, the focus ring is a single `:focus-visible` rule, and
`prefers-reduced-motion` is honoured in CSS and exposed to JS by `useReducedMotion()`, which also writes
`html[data-reduced-motion]` for the future engine.

## H · Session-state contract

`app/composables/useVisit.ts` — the container only, no C2 behaviour.

```ts
interface VisitState {
  language: Locale | null
  openedProjects: ProjectId[]          // this array IS the visit order
  inks: Partial<Record<ProjectId, string>>
  about: { visited: boolean; open: boolean; detail: boolean }
  lab: { rooms: LabRoom[]; activeStudy: StudyId | null; nextStudy: number }
  scars: SurfaceScar[]                 // normalised x/y, so they survive any resize
  startedAt: number
}
```

One visit per tab: restored once on the client, then written to `sessionStorage` on every change
(`flush: 'post'`, failures swallowed for private mode). `setLanguage()` writes the language and nothing
else. **Verified:** with `{ startedAt: 111, openedProjects: ['ege-esya'] }` in storage, switching
`/en/about` to `/tr/about` client-side keeps `startedAt: 111` and `openedProjects: ['ege-esya']` and only
changes `language`. A language switch is not a new visit.

## I · Responsive foundation

No mobile / tablet / desktop buckets. `base.css` defines fluid type (`--step--1` … `--step-3`), fluid
space, a fluid gutter and a viewport-height-aware strip, all with `clamp()`; layout uses `100svh`, so
phone URL bars and 13-inch laptops are first-class. There is exactly one media query in the shell
(`min-width: 48rem`, where the three works become a row and capabilities become two columns) — an
authored change of behaviour, not a scaled-down desktop.

Smoke-tested at 320×568, 375×667, 390×844, 430×932, 768×1024, 820×1180, 1024×1366, 1280×800, 1366×768,
1440×900, 1512×982, 1920×1080 and 2560×1440: **no horizontal overflow at any size**; header height
49–73 px (it wraps to two rows below ~430 px, by design).

## J · Future C2-engine integration boundary

`engine/` (aliased `#engine`) is reserved and empty apart from its README. The rules recorded there: plain
TypeScript, no Vue/Nuxt imports, the engine owns its own rAF loop, Vue reactivity never drives a frame,
commands go in (`navigate`, `openProject`, `setReducedMotion`), callbacks come out, and `useVisit()` is
the serialisable bridge so a route change or a language switch never restarts a visit. No WebGL, shaders,
Lab physics or project worlds were migrated.

## K · Generated HTML proof

```
/tr        lang="tr-TR"  title: Emrah Yücel — Creative Developer & Full-Stack Developer
           canonical https://yucelemrah.com/tr
           hreflang tr-TR -> /tr | en -> /en | x-default -> /
           contains Emrah Yücel, Creative Developer, Full-Stack Developer, İstanbul Şehir İçi, Ege Eşya,
           Evden Eve Nakliyat, info@yucelemrah.com, tel:+905065199691, github.com/emrahYucel0,
           linkedin.com/in/emrah-yucel, Çalışmalar, Hakkımda, İçeriğe geç
/en/about  lang="en"     title: About — Emrah Yücel    canonical .../en/about
           contains the chemistry paragraph, the six capabilities, the availability line, email, phone
/          lang="en"     x-default entry, canonical https://yucelemrah.com/, both languages as real links
```

Landmarks in `/en`: 1 header, 1 main, 1 footer, 1 nav, 1 h1, 3 h2, 3 h3, skip link present, 5 external
links all carrying `rel="noopener noreferrer"`.

## L · Lighthouse baseline (static build, local static server, headless Chrome)

| | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Desktop `/en` | **100** | **100** | **100** | **100** |
| Mobile `/tr` | **98** | **100** | **100** | **100** |

Desktop: FCP 0.4 s, LCP 0.4 s, TBT 0 ms, CLS 0. Mobile (throttled): FCP 1.8 s, LCP 1.8 s, TBT 20 ms,
CLS 0, DOM 100 elements. The only failing audits are hosting-level (`uses-long-cache-ttl`, `bf-cache`,
render-blocking CSS insight) and belong to the deploy target, not the app. Nothing was tuned for score.

## M · Initial payload baseline (the number C2 will be measured against)

Measured with CDP, cache disabled, no compression on the local static server:

| Route | Requests | Transfer | JS | CSS | HTML | DOM nodes |
|---|---|---|---|---|---|---|
| `/` (entry, then resolves) | 31 | 99.1 KB | 87.6 KB | 5.1 KB | 1.6 KB | 143 |
| `/tr` | 24 | 94.1 KB | 82.7 KB | 4.3 KB | 3.7 KB | 145 |
| `/en` | 24 | 94.0 KB | 82.7 KB | 4.3 KB | 3.6 KB | 145 |
| `/tr/about` | 23 | 93.6 KB | 82.7 KB | 4.3 KB | 3.5 KB | 107 |
| `/en/about` | 23 | 93.4 KB | 82.7 KB | 4.3 KB | 3.4 KB | 107 |

On disk `.output/public` is **342 KB** in total. Largest chunk 115 KB raw / **43 KB gzip** (Vue + Nuxt
runtime); all CSS together 7.5 KB raw / 2.9 KB gzip; a page HTML is 10–13 KB raw / about 3 KB gzip. With
gzip on the host a route costs roughly **30–35 KB** on the wire. No fonts, no images, no video yet — that
is exactly what makes this a baseline.

## N · Console / hydration status

Zero console messages and zero page errors on all five routes and during a client-side locale switch. No
hydration mismatch warnings. `npx nuxt typecheck` exits 0.

## O · Known blockers and open questions

1. **The domain is an assumption.** `siteUrl` defaults to `https://yucelemrah.com` (inferred from the
   email address) and is baked into canonical, hreflang, Open Graph and `public/sitemap.xml`. Confirm it,
   or build with `NUXT_PUBLIC_SITE_URL`.
2. **Turkish copy is a first draft.** Structure and tone need Emrah's own wording; the English copy is
   verbatim from the approved prototype text.
3. **TR and EN home pages share one `<title>`** (name + roles, which stay English job titles in both
   languages). Say if the Turkish title should read differently.
4. **No `og:image` yet** — deliberately absent rather than pointing at a placeholder.
5. **CV is `null` everywhere** — no link, no label, no placeholder, until a real PDF exists.
6. **Favicon** is still the Nuxt default file; it is replaced during the visual pass.
7. The entry route redirects after hydration (Accept-Language on this machine resolved to `tr`). If you
   prefer no automatic redirect, it is one `onMounted` block to delete.

## P · Files created / changed

Created or replaced: `nuxt.config.ts`, `README.md`, `app/app.vue`, `app/error.vue`,
`app/assets/css/base.css`, `app/components/{SiteHeader,SiteFooter,LocaleSwitcher}.vue`,
`app/composables/{useLocale,useLocaleSeo,useVisit,useReducedMotion}.ts`,
`app/data/{profile,projects,lab,media}.ts`, `app/locales/{messages,en,tr,index}.ts`,
`app/layouts/default.vue`, `app/pages/index.vue`, `app/pages/[locale]/{index,about}.vue`,
`engine/README.md`, `public/robots.txt`, `public/sitemap.xml`, `docs/M0-REPORT.md`.

Generated and git-ignored: `.output/`, `node_modules/`, `.nuxt/`.

Unchanged: everything in `../c2-surface-lab`.

**STOPPED after M0.** No commit, no push, no deploy. No WebGL, shaders, Lab physics or project worlds
migrated.
