# M5 — Production / SEO / deployment hardening

- **Scope:** static Nuxt 4, `https://yucelemrah.com`, TR + EN, shared cPanel hosting.
- **Status of the work:** nothing committed, pushed or deployed; no hosting, DNS or mail panel was accessed.
- **Live checks (read-only):** DNS lookups, HTTPS certificate, HTTP status of the current domain, external link status.
- **Local verification:**
  - the generated output served by **real Apache 2.4 in Docker**, with the generated `.htaccess` active (security headers and CSP enforced);
  - headless Chrome 152 against that server;
  - Lighthouse 12.8.2.

The C2 experience is unchanged (§ W). M4 status stands: **implementation complete, human screen-reader validation deferred**; no WCAG conformance claim.

---

## A · Executive summary
**Before M5:**
- The domain was hard-coded in hand-written `robots.txt` and `sitemap.xml`.
- The favicon was Nuxt's default; there was no social image and no structured data.
- `404.html` and `200.html` were **empty SPA shells**, with no title, no `lang` and a blank page without JavaScript.
- There were no hosting rules at all: no redirects, cache policy, compression or security headers.
- The domain itself answers `403` today; nothing is deployed.

**Now:**
- **One origin:** `shared/site.ts` feeds canonicals, hreflang, Open Graph, Twitter, JSON-LD, the sitemap, `robots.txt` and the redirects. The build refuses a non-HTTPS or local origin.
- **Complete head on every public route:** `lang`, title, description, canonical, reciprocal hreflang (`tr-TR` / `en` / `x-default`), OG and Twitter with an absolute 1200 × 630 image; factual `Person` JSON-LD on the four locale pages.
- **Build-time production files** (a local Nuxt module, no runtime):
  - `robots.txt` and `sitemap.xml`;
  - a real, script-free, bilingual `404.html`;
  - `.htaccess` with one-hop HTTPS + non-www, clean URLs, real 404s, MIME types, Brotli/gzip, a cache policy, security headers and an **enforced CSP** whose script hashes are computed from the generated HTML;
  - nested `.htaccess` files for immutable build assets and weekly media. `200.html` is removed.
- **Brand utility assets created:** `favicon.svg / .ico / -32x32.png` and `apple-touch-icon.png` (**favicon approved**), plus `og/emrah-yucel-portfolio.jpg` (**OG VISUAL REVISION: READY FOR HUMAN REVIEW**).
- **Verified on Apache** (§ K–N):
  - all four scheme/host combinations → one 301;
  - pages 200, unknown URLs 404;
  - correct MIME, Brotli, cache headers;
  - **0 CSP violations and 0 console errors** across the full C2 journey at 1440 and 390;
  - the minimal-module fallback degrades safely (no 500).
- **Local production Lighthouse** (Apache, real headers): Performance 92–100, Accessibility / Best Practices / SEO 100 on every run.
- **Two real fixes found by testing:**
  - the CSP needed `font-src data:` (Vite inlines the smallest font subsets);
  - `navigator.vibrate` logged a console error before any user interaction, so haptics now wait for user activation.
- **Mail DNS is already published** (MX, one SPF, DKIM, DMARC `p=none`). The mailbox and delivery / authentication tests are **PENDING HOSTING** (§ R–S).

**Decision: M5 REPO PASS — READY FOR HOSTING VALIDATION** (§ Z).

---

## B · Files changed
| File | Change |
|---|---|
| `shared/site.ts` (new) | production origin authority (`siteUrl()`, HTTPS-only validation), `PUBLIC_ROUTES`, `SOCIAL_IMAGE`, `ICONS` |
| `modules/production-files.ts` (new) | build hook (`close`): `robots.txt`, `sitemap.xml`, `404.html`, root / `_nuxt` / `opt` `.htaccess`, CSP hashes; removes `200.html` |
| `nuxt.config.ts` | origin from `siteUrl()`; prerender routes from `PUBLIC_ROUTES`; icon links; `sourcemap: false` (explicit); the module |
| `app/composables/useLocaleSeo.ts` | OG image (+secure URL, type, width, height, alt), Twitter image + alt, `og:type` profile on About, Person JSON-LD |
| `app/pages/index.vue` | x-default entry: OG / Twitter image metadata |
| `app/error.vue` | `robots noindex` (client-rendered errors) |
| `shared/content/types.ts`, `locales/en.ts`, `locales/tr.ts` | `meta.imageAlt` (TR / EN), the share image's text alternative |
| `engine/c2/main.js` | `haptic()` only after user activation (console cleanliness; no behaviour change for a visitor who has touched the page) |
| `public/favicon.svg`, `favicon.ico`, `favicon-32x32.png`, `apple-touch-icon.png`, `og/emrah-yucel-portfolio.jpg` | new brand utility assets (`favicon.ico` replaced Nuxt's default) |
| `public/robots.txt`, `public/sitemap.xml` | **deleted**: hand-written copies with a hard-coded domain, now generated |
| `tools/brand-assets.cjs` (new) | reproducible generator for the icons and OG image (dev-only tooling, not a dependency); `--only=icons` or `--only=og` regenerates one set without touching the other |
| `package.json` / lock | `@types/node` (devDependency): Node types for the build module and config; no runtime dependency added |
| `docs/DEPLOYMENT.md`, `docs/M5-REPORT.md`, `docs/m5-production/` (240 KB) | deployment guide, this report, evidence |

---

## C · Production architecture
| | |
|---|---|
| Rendering | `ssr: true` at build time only → `nuxt generate` → `.output/public` (166 files, 11 MB, of which 10.9 MB is media) |
| Runtime | none: static files; no Nitro server, PM2, Node app, API, DB or CMS |
| Preset | `nitro.preset: 'static'`, `failOnError: true` |
| Routes prerendered | `/`, `/tr`, `/en`, `/tr/about`, `/en/about` (+ payloads). 12 files reported by Nitro. |
| Source maps | none shipped (`.map` files in output: 0) |
| Debug logging | none (`console.log/debug/info` in `app`, `engine`, `shared`: 0) |
| `localhost` in client output | only Nuxt's internal URL parsing base (`new URL(path, 'http://localhost')` in the router chunk), never a request; no localhost or Windows path in HTML / CSS / JSON |
| Third parties | none: no Google Fonts, analytics, trackers, CDN or embeds; fonts self-hosted from `_nuxt/` |

---

## D · Domain / canonical
- **Origin:** `https://yucelemrah.com`, non-www, HTTPS. It lives in `PRODUCTION_ORIGIN` and is overridable only via `NUXT_PUBLIC_SITE_URL`. HTTPS is required and localhost is rejected (`siteUrl()` throws at build).
- **Canonicals** (generated HTML):

| Route | Canonical |
|---|---|
| `/` | `https://yucelemrah.com/` |
| `/tr` | `https://yucelemrah.com/tr` |
| `/en` | `https://yucelemrah.com/en` |
| `/tr/about` | `https://yucelemrah.com/tr/about` |
| `/en/about` | `https://yucelemrah.com/en/about` |

TR and EN are each self-canonical, never canonicalised to each other. The redirect rules make the canonical form (no trailing slash) the one users land on.

---

## E · Hreflang / locale
- **Home pair:** `/tr` ↔ `/en`. **About pair:** `/tr/about` ↔ `/en/about`. Tags `tr-TR`, `en`, and `x-default` → `/`, present on every route and in the sitemap, reciprocal.
- **`/` stays the x-default language entry**, as approved in M0. It is real crawlable HTML with both language links; after hydration it forwards to `/tr` or `/en` (stored choice, else browser language). It is not a server redirect.
- **`<html lang>` in the generated HTML** (not only after hydration): `/` `en`, `/tr` `tr-TR`, `/en` `en`, `/tr/about` `tr-TR`, `/en/about` `en`.

---

## F · Titles / descriptions
The existing title system is kept: identity first, no keyword stuffing, no visible copy changed.

| Route | Title | Description |
|---|---|---|
| `/` | Emrah Yücel — Creative Developer & Full-Stack Developer | Creative Developer and Full-Stack Developer in Istanbul. Choose a language. |
| `/tr` | Emrah Yücel — Creative Developer & Full-Stack Developer | Emrah Yücel, İstanbul merkezli bir Creative Developer ve Full-Stack Developer: etkileşim, frontend mühendisliği, backend sistemler, CMS, performans ve teknik SEO. |
| `/en` | Emrah Yücel — Creative Developer & Full-Stack Developer | Emrah Yücel is a Creative Developer and Full-Stack Developer in Istanbul: interaction, frontend engineering, backend systems, CMS, performance and technical SEO. |
| `/tr/about` | Hakkımda — Emrah Yücel | Kimya ve endüstriyel üretimden creative development ve full-stack sistemlere — Emrah Yücel nasıl çalışır, ne kurar. |
| `/en/about` | About — Emrah Yücel | From chemistry and industrial production to creative development and full-stack systems — how Emrah Yücel works, and what he builds. |
| `404` | Not found · Sayfa bulunamadı — Emrah Yücel | (`noindex`) |

---

## G · OG / social

### SEO report per canonical route (§80)
Every route: status 200 (Apache), OG image `https://yucelemrah.com/og/emrah-yucel-portfolio.jpg`, robots indexable (no robots meta).

| Route | lang | Canonical | hreflang TR | hreflang EN | x-default | OG URL |
|---|---|---|---|---|---|---|
| `/` | en | …/ | …/tr | …/en | …/ | …/ |
| `/tr` | tr-TR | …/tr | …/tr | …/en | …/ | …/tr |
| `/en` | en | …/en | …/tr | …/en | …/ | …/en |
| `/tr/about` | tr-TR | …/tr/about | …/tr/about | …/en/about | …/ | …/tr/about |
| `/en/about` | en | …/en/about | …/tr/about | …/en/about | …/ | …/en/about |

**OG fields on every public route:**
- `og:title`, `og:description`, `og:type` (`website`; `profile` on About), `og:url`, `og:site_name`;
- `og:image`, `og:image:secure_url`, `og:image:type` `image/jpeg`, `og:image:width` 1200, `og:image:height` 630, `og:image:alt` (TR / EN);
- `og:locale` `tr_TR` / `en_US` with `og:locale:alternate`.

**Twitter:** `summary_large_image`, title, description, image, image alt.

### Social image
`public/og/emrah-yucel-portfolio.jpg`: 1200 × 630 JPEG (mozjpeg, q86), 111 KB. Preview: `m5-production/og-preview.jpg`.

It is a **pure identity plate**: a still of the live C2 name plate, captured at rest with reduced motion so the rows are straight. The only text is EMRAH / YÜCEL, set in the site's own ink rows on paper. There is no gradient, device frame, portrait, badge or logo collage.

**Revision (visual patch):** the role line "CREATIVE DEVELOPER · FULL-STACK DEVELOPER" was removed.
- The DOM layer is now hidden entirely, so the paper bands above and below the row field are the site's own two strips, both empty. The plate stays symmetrical, with no lone empty band where the text was.
- The name's scale, framing and row field are unchanged.
- The roles remain in the page title, description, OG / Twitter text and JSON-LD.

Reproducible with `tools/brand-assets.cjs`.

### Icons
**Mark:** the C2 surface reduced to its signature. Ink rows on paper part into one opening, with a single thread of İstanbul project ink (`#8e3a17`) across it. It is drawn on the 16 px grid, so 16 / 32 / 48 are whole-pixel.

| File | Size | Notes |
|---|---|---|
| `favicon.svg` | 1.0 KB | `shape-rendering: crispEdges` |
| `favicon.ico` | 677 B | 16 / 32 / 48 PNG entries |
| `favicon-32x32.png` | 216 B | |
| `apple-touch-icon.png` | 180 × 180 | opaque paper ground, mark ×10 |

Wired in `app.head` (`icon` ico 32, svg, png 32; `apple-touch-icon`) and in the static 404. On Apache all return 200 with the correct MIME types.

Preview (`m5-production/icons-preview.png`): actual 16 / 32 / 48 px, ×8 enlargements, the 180 px icon, and **simulated** light and dark browser tabs (drawn for review, not a browser screenshot).

### Visual review answers
| Question | Answer |
|---|---|
| Favicon recognisable at 16 px? | **YES**: striped square with a light opening and a copper line; distinct at tab size |
| Looks like a generic developer icon? | **NO**: no brackets, laptop or monogram |
| OG image visibly belongs to the C2 portfolio? | **YES**: it is a frame of the site itself |
| All text readable at reduced preview size? | **YES**: the only text is the name, readable at 1200 px, at the 500 px card and at the 240 px thumbnail |

**Favicon / apple-touch-icon: APPROVED** (unchanged, byte-identical). **OG VISUAL REVISION: READY FOR HUMAN REVIEW.**

**Manifest:** none added. There is no PWA need; the icons and `theme-color` `#efeee9` cover browsers and iOS.

---

## H · Structured data
One factual `Person` on `/tr`, `/en`, `/tr/about`, `/en/about`. JSON-LD parses; no errors in the static audit.

```json
{ "@context": "https://schema.org", "@type": "Person", "@id": "https://yucelemrah.com/#person",
  "name": "Emrah Yücel", "url": "https://yucelemrah.com/",
  "jobTitle": "Creative Developer / Full-Stack Developer",
  "email": "mailto:info@yucelemrah.com",
  "sameAs": ["https://github.com/emrahYucel0", "https://www.linkedin.com/in/emrah-yucel/"] }
```

No employer, address, education, awards, ratings or organisation. `/` (the language chooser) has none. Google's Rich Results test was **not run**: it needs the public URL (PENDING HOSTING).

---

## I · Sitemap / robots
- **`robots.txt`:** `User-agent: *`, `Allow: /`, `Sitemap: https://yucelemrah.com/sitemap.xml`. No `Disallow: /`.
- **`sitemap.xml`:** 5 URLs, exactly the public canonical routes (`/`, `/tr`, `/en`, `/tr/about`, `/en/about`), each with `xhtml:link` alternates `tr-TR` / `en` / `x-default`. No docs, tests, 404, payloads or localhost. `lastmod` is omitted rather than invented. Every sitemap URL resolves to a generated page and returns 200 on Apache.
- **noindex audit:** source and output contain `noindex` only in `404.html` and in `app/error.vue`. Both are intentional: error pages must not be indexed. No `nofollow`, no `X-Robots-Tag`.
- **Search Console:** not submitted (not requested).

---

## J · Static-generation output
- `npx nuxt typecheck`: exit 0.
- `npm run generate`: exit 0 ("Prerendered 12 routes", plus the production-files line).

| `.output/public` | |
|---|---|
| Pages | `index.html` 5.5 KB · `tr/index.html` 15.1 KB · `en/index.html` 14.9 KB · `tr/about/index.html` 12.4 KB · `en/about/index.html` 12.1 KB · `404.html` 1.8 KB (script-free) |
| Payloads | `_payload.json`, `tr/_payload.json`, `en/_payload.json`, … |
| `_nuxt/` | 737 KB: JS, CSS, 11 `woff2` + 5 `woff` fallbacks, `builds/` manifest |
| `opt/` | 43 AVIF, 60 WebP, 5 MP4, `manifest.json` (build-time), **no PNG** |
| Crawl / brand | `robots.txt`, `sitemap.xml`, favicons, `og/` |
| Hosting | `.htaccess`, `_nuxt/.htaccess`, `opt/.htaccess` |
| Removed | `200.html` (SPA fallback) |

**Direct entry, refresh, deep link, Back** (Chrome against Apache): all five routes answer 200 on a fresh request and 200 on reload, with the same path, `lang` and canonical. `/tr` → About → "More about me" (`/tr/about`) → browser Back → `/tr` with the long About closed. 0 console errors.

---

## K · 404
Nuxt's generated `404.html` was an empty SPA shell. It is replaced at build by a **static, script-free** page:
- `lang="en"`, with the Turkish sentence marked `lang="tr-TR"`;
- `noindex`;
- the site's paper / ink tokens and system fonts;
- the name, "404", the not-found message in both languages, and links to `/tr` and `/en`.

It is served by `ErrorDocument 404 /404.html`.

On Apache:

| Request | Result |
|---|---|
| `/this-page-does-not-exist-m5-test` | **404**, title "Not found · Sayfa bulunamadı — Emrah Yücel", links `/tr`, `/en` |
| `/tr/nope` | 404 |
| `/_nuxt/`, `/opt` (bare directories) | 404, never a listing |

No catch-all: arbitrary URLs never return 200 plus the homepage.

---

## L · Redirect configuration (generated `.htaccess`, tested on Apache 2.4.68)
Scheme and host were simulated with the `Host` and `X-Forwarded-Proto` headers; the rules treat `X-Forwarded-Proto: https` as HTTPS, as behind a TLS-terminating proxy.

| Request | Result |
|---|---|
| `http://yucelemrah.com/` | **301** → `https://yucelemrah.com/` |
| `http://www.yucelemrah.com/` | **301** → `https://yucelemrah.com/` (one hop) |
| `https://www.yucelemrah.com/` | **301** → `https://yucelemrah.com/` |
| `https://yucelemrah.com/` | **200** |
| `http://www…/tr/about?ref=x` | **301** → `https://yucelemrah.com/tr/about?ref=x` (path + query kept) |
| `https://…/tr`, `/en`, `/tr/about`, `/en/about` | **200**, served in place (no trailing-slash hop) |
| `https://…/tr/`, `/en/about/` | **301** → `https://yucelemrah.com/tr`, `/en/about` |

Apache error log after the test run: 0 errors / alerts.

**Minimal-module fallback** (same files; rewrite, headers, deflate and brotli modules *not* loaded):
- no 500 anywhere;
- pages reachable through Apache's default slash redirect (`/tr` → `/tr/`, 200);
- 404 still served;
- no redirects or headers, as expected.

Known effect: on a host that has neither mod_rewrite nor `Options -Indexes`, `/_nuxt/` would list files. cPanel hosts have mod_rewrite.

**LiteSpeed:** the live server announces QUIC via `alt-svc`, most likely LiteSpeed. LiteSpeed Enterprise reads Apache `.htaccess`, but it was **not tested locally**.

---

## M · Cache / compression
Tested on Apache:

| Resource | `Cache-Control` | Encoding |
|---|---|---|
| HTML (`/tr` …), `_payload.json` | `public, max-age=0, must-revalidate` | br (gzip if only gzip accepted) |
| `_nuxt/*.js`, `.css`, fonts (fingerprinted) | `public, max-age=31536000, immutable` | br for JS / CSS |
| `_nuxt/builds/*.json` (not fingerprinted) | `public, max-age=0, must-revalidate` | |
| `opt/*` AVIF / WebP / MP4 (stable names) | `public, max-age=604800` | none (already compressed) |
| favicons, OG image, `robots.txt`, `sitemap.xml` | `public, max-age=86400` | |

- **Compression:** `AddOutputFilterByType` for text types only, inside `<IfModule mod_filter.c>` + `mod_brotli` / `mod_deflate`; media is never recompressed.
- **Lighthouse note:** it flags `uses-long-cache-ttl` for the 7-day media. That is intentional: those files are not fingerprinted.
- **Real production** caching and compression (LiteSpeed, any CDN): **PENDING HOSTING**.

---

## N · Security headers
Tested on Apache (`/tr`):
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`
- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy` (**enforced**):
  ```
  default-src 'self'; script-src 'self' 'sha256-…' 'sha256-…'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:; font-src 'self' data:; media-src 'self'; connect-src 'self'; worker-src 'self';
  manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';
  upgrade-insecure-requests
  ```

**How the CSP was derived** (observed needs, not a copied policy):
- `script-src` has **no `unsafe-inline` and no `unsafe-eval`**. The two inline executable scripts, the import map and the Nuxt bootstrap, are allowed by SHA-256 hashes computed from each build's HTML. JSON data blocks (`__NUXT_DATA__`, JSON-LD) are not executed and need none.
- `style-src 'unsafe-inline'`: Nuxt inlines component CSS, and the C2 runtime writes positioning `style` attributes.
- `font-src data:` was **found by testing**: Vite inlines the smallest font subsets as `data:` fonts, which the first policy blocked (4 violations), then fixed.
- `worker-src 'self'`: the tone worker is a same-origin module.
- **Verified under enforcement:** 5 routes plus the full C2 journey at 1440 × 900 (EN) and 390 × 844 (TR): Work, all three projects and their frames, Lab with 3 rooms and a playing video, Contact, language switch.
  - 0 CSP violations, 0 console errors, 0 failed requests;
  - the tone worker, AVIF / WebP media, Lab MP4 and fonts all loaded.

**HSTS is not enabled at first launch.** Enable it after SSL and the redirects are proven in production (`docs/DEPLOYMENT.md`).

---

## O · Fonts / media
**Fonts: correction to the brief.** The site does not use Archivo or JetBrains Mono. The C2 identity uses **Big Shoulders Display** (variable), **Geist** (variable) and **Geist Mono** 400, all self-hosted via Fontsource:
- `font-display: swap` (14 faces);
- `woff2` served as `font/woff2`, with `woff` fallbacks present but not requested by modern browsers;
- no preload: the runtime waits for fonts before its first frame (unchanged since M1);
- 0 font 404s, no CORS issue (same origin);
- the smallest subsets are inlined as `data:` (see CSP).

**Media:**
- AVIF / WebP derivatives with responsive `srcset` / `sizes`, `image/avif` and `image/webp` MIME on Apache;
- five Lab MP4 (`video/mp4`) plus WebP posters, one active decoder;
- no PNG, no localhost or Windows paths;
- project media created only when a work is about to be seen (unchanged).

---

## P · Broken-link audit
- **Static crawl of the generated output:** 205 first-party references checked:
  - every `href`, `src`, `srcset`, `poster`;
  - CSS `url()`;
  - canonical, hreflang, OG image and Twitter image;
  - sitemap URLs and the robots sitemap.

  **0 broken, 0 localhost.**
- **Browser on Apache:** 0 failed first-party requests, 0 HTTP ≥ 400 (other than the intentional 404 test).

**External links** (2026-09-16, not a build gate):

| URL | Result |
|---|---|
| https://istanbulsehirici.com/ | 200 |
| https://egeesya.com/ | 200 |
| https://evenakliyatevden.com/ | 200 |
| https://github.com/emrahYucel0 | 200 |
| https://www.linkedin.com/in/emrah-yucel/ | 999 (LinkedIn's standard response to non-browser clients; the URL is correct) |

---

## Q · Contact
In the generated HTML (C2 runtime and static shell):

| Contact | Link |
|---|---|
| Email | `<a href="mailto:info@yucelemrah.com">info@yucelemrah.com</a>` |
| Phone | `<a href="tel:+905065199691">+90 506 519 96 91</a>` |
| GitHub | `https://github.com/emrahYucel0` |
| LinkedIn | `https://www.linkedin.com/in/emrah-yucel/` |

No CV link (`cv: null`). No other email address in the source or build.

---

## R · Mail setup
**HOSTING ACTION REQUIRED.** No cPanel access was used. Steps are in `docs/DEPLOYMENT.md` → *Mail*.

| Item | Status |
|---|---|
| Mailbox `info@yucelemrah.com` | **PENDING**: existence not verifiable without cPanel |
| MX | **PASS (published)**: `yucelemrah.com` MX 0 → `yucelemrah.com` → 213.238.183.223 (the web host; PTR `…static.cenuta.com`); IMAP / SMTP submission ports 143 / 993 / 465 / 587 reachable. Delivery itself is untested. |
| SPF | **PASS (published)**: exactly one record, `v=spf1 include:_spf.cenuta.com -all`; the include resolves and covers `213.238.183.0/24` |
| DKIM | **PASS (published)**: `default._domainkey` TXT with an RSA public key; signing is untested |
| DMARC | **PASS (published)**: `_dmarc` TXT `v=DMARC1; p=none;` (monitoring, no reporting address) |
| Inbound test (Gmail → info@) | **PENDING** |
| Outbound test (info@ → Gmail) | **PENDING** |
| SPF auth result | **PENDING** |
| DKIM auth result | **PENDING** |
| DMARC auth result | **PENDING** |
| mailto | **PASS** (markup verified locally); opening the mail app on desktop and phone is part of the post-deploy smoke |

"PASS (published)" means the DNS record exists and is well-formed. It does **not** claim deliverability; that needs the send / receive tests and message headers.

---

## S · MX / SPF / DKIM / DMARC
| | Current state (DNS, 2026-09-16) | Required state | Verify by |
|---|---|---|---|
| MX | host's own MX | keep, unless mail moves to another provider (then use that provider's records, never invented ones) | `nslookup -type=MX yucelemrah.com`; inbound test |
| SPF | one record, provider include, `-all` | keep one record; if another sender is added (e.g. a newsletter tool), merge into this record, never a second TXT | Gmail *Show original* → `SPF: PASS` |
| DKIM | `default` selector published | cPanel → *Email Deliverability* shows it valid | `DKIM: PASS` with `d=yucelemrah.com` |
| DMARC | `p=none`, no `rua` | stay at `p=none` until SPF and DKIM pass and align on real mail; then `p=quarantine`, later `p=reject`. Add `rua=` only with an existing mailbox. | `DMARC: PASS` in headers |

---

## T · Local production Lighthouse
Lighthouse 12.8.2 against Apache serving `.output/public` with the generated `.htaccess` (Brotli, cache, CSP). **LAB data on this machine**, simulated throttling. It is not field data and not the production host.

| Page / viewport | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | Transfer |
|---|---|---|---|---|---|---|---|---|---|
| `/tr` 390 × 844 (mobile) | 95 | 100 | 100 | 100 | 1.7 s | 2.2 s | 190 ms | 0 | 477 KB |
| `/en` 390 × 844 (mobile) | 92 | 100 | 100 | 100 | 1.6 s | 1.7 s | 210 ms | 0 | 469 KB |
| `/tr/about` 390 × 844 (mobile) | 96 | 100 | 100 | 100 | 1.7 s | 2.2 s | 160 ms | 0 | 476 KB |
| `/tr` 1366 × 768 | 100 | 100 | 100 | 100 | 0.4 s | 0.6 s | 10 ms | 0 | 523 KB |
| `/en` 1366 × 768 | 95 | 100 | 100 | 100 | 0.4 s | 0.5 s | 30 ms | 0 | 515 KB |
| `/tr/about` 1366 × 768 | 96 | 100 | 100 | 100 | 0.4 s | 0.6 s | 0 ms | 0 | 522 KB |
| `/tr` 1440 × 900 | 100 | 100 | 100 | 100 | 0.4 s | 0.5 s | 10 ms | 0 | 523 KB |
| `/en` 1440 × 900 | 96 | 100 | 100 | 100 | 0.4 s | 0.5 s | 20 ms | 0 | 515 KB |
| `/tr/about` 1440 × 900 | 95 | 100 | 100 | 100 | 0.5 s | 0.5 s | 10 ms | 0 | 522 KB |

**Transfer split** (desktop): document 5 KB, CSS 5 KB, JS 88 KB, fonts 93–101 KB, images 235 KB (189 KB mobile), tone worker / payload 88 KB (Lighthouse's "Other").

**Speed Index** varies from 0.5 to 2.3 s between otherwise identical runs, because the opening is an animation (the name plate unfolds over about 3 s). The performance score moves with it.

**Payload vs M4** (same harness, uncompressed local server, 1440 EN initial load): **991.8 KB → 991.3 KB**. The HTML grew by 1.3 KB (metadata and JSON-LD) and the images shrank by 3 KB (the favicon). No dependency added to the client.

**Performance vs M4** (same machine, alternating M4 / M5 runs):
- no systematic difference, e.g. registration 108 / 21 vs 108 / 21, Lab playing 142 / 7 vs 144 / 7 fps / p95;
- the last two pairs ran slower for both builds together while Docker was active (`m5-production/perf-m4-vs-m5.txt`).

**Core Web Vitals:** LCP, CLS and TBT above are **LAB** values. There is **no FIELD (CrUX) data**: the domain is not live. PageSpeed Insights is **PENDING HOSTING**.

---

## U · Deployment package
- **Upload:** the contents of `.output/public/` after `npm run generate`, 166 files, about 11 MB, **including** the three `.htaccess` dotfiles.
- **Do not upload:** `node_modules`, `.git`, `.nuxt`, `.output/server`, source, `docs/`, `tools/`, evidence, `.env*`.
- **Rule:** the `.htaccess` CSP hashes belong to the HTML of the same build; always deploy one build as a whole.

---

## V · cPanel deployment instructions
Full steps in **`docs/DEPLOYMENT.md`**: document root identification, backup, clean upload (zip → extract, dotfiles visible), SSL check, mail steps, post-deploy verification commands, rollback and checklist.

| | |
|---|---|
| **HOSTING DOCUMENT ROOT** | **UNKNOWN**: cPanel → *Domains* → Document Root column |
| Node.js App | **not used**: no Startup File, Application Root or PM2 |
| Current live state | `http` and `https`, apex and `www`: all **403** (nothing deployed or empty root); TLS certificate Let's Encrypt for `yucelemrah.com`, valid to 2026-12-15, `www` hostname verified; A → 213.238.183.223 |

---

## W · Production checks
**No deployment occurred** (none was requested; no hosting access). Production items are **PENDING HOSTING**:
- redirect matrix on the real host;
- status matrix;
- SSL for apex + www under the redirects;
- real compression and cache;
- PageSpeed Insights mobile / desktop;
- Rich Results;
- OG card preview.

The same checks were run locally on Apache (§ K–P).

**Regression checks for this milestone** (local):

| Check | Result |
|---|---|
| C2 visuals, 1440 × 900 EN, M4 build vs M5 build | Work and all 13 project frames 0.00–0.01 mean diff; open / faces 0.07–0.18; About 0.48–0.86 (row-motion noise, M2-vs-M2 was up to 1.6); Lab 2.32 / Contact 0.59 (known room-placement noise). **No visual regression.** |
| Accessibility (M4 audit: axe + keyboard journey), TR 1440 × 900 and EN 390 × 844 | axe **0 violations** in 8 states each; keyboard journey complete (16 steps); errors 0 |
| M3 touch regression, EN + TR 390 × 844 | all steps input-at-rest, errors 0 |
| typecheck / generate | exit 0 / exit 0 |

---

## X · Real-device result
**PENDING HOSTING.** The iPhone 7 Plus / iOS 15.8.8 / Safari production smoke (including Work and Lab hold → swipe) runs after deployment, on the real origin (`docs/DEPLOYMENT.md` → *Post-deploy verification*).

---

## Y · Known limitations
1. **Hosting server type not tested:** `.htaccess` is proven on Apache 2.4. The live host is most likely LiteSpeed (Enterprise reads `.htaccess`), but this is unconfirmed.
2. **Document root unknown;** nothing uploaded.
3. **Mail deliverability unproven:** DNS records exist; mailbox, send / receive and auth results are pending.
4. **HSTS deliberately off** for the first launch.
5. **Media cache is 7 days,** not immutable, because derivative filenames are stable. Lighthouse flags it; renaming media with content hashes would allow a year.
6. **`style-src 'unsafe-inline'`** remains, required by Nuxt's inlined CSS and the runtime's style attributes. `script-src` is strict.
7. **Speed Index / Performance** vary between identical runs because of the animated opening; LCP and CLS are stable.
8. **x-default on About** points to `/` (the language chooser), the site's only language-neutral entry.
9. **OG image revision awaits human review** (favicon approved).
10. **Brief mismatch:** "Archivo / JetBrains Mono" are not the site's fonts (§ O).
11. **M4 human screen-reader validation** remains deferred (unchanged).

### Acceptance (§81)
| # | Question | Answer |
|---|---|---|
| 1 | Production architecture still static prerender? | YES |
| 2 | Runtime SSR absent? | YES |
| 3 | One production site origin used? | YES |
| 4 | Canonicals correct? | YES |
| 5 | Hreflang pairs reciprocal? | YES |
| 6 | TR / EN lang attributes correct? | YES |
| 7 | Titles / descriptions complete? | YES |
| 8 | OG metadata complete? | YES |
| 9 | Sitemap production-safe? | YES |
| 10 | robots.txt production-safe? | YES |
| 11 | Every intended route prerenders? | YES |
| 12 | Direct deep links work locally? | YES |
| 13 | 404 behaviour correct locally? | YES |
| 14 | Broken first-party links / assets? | NO |
| 15 | Contact details correct? | YES |
| 16 | Mailbox configuration complete? | PENDING HOSTING |
| 17 | SPF / DKIM / DMARC verified? | PENDING HOSTING (records published; authentication results need real mail) |
| 18 | Local production performance regressed? | NO |
| 19 | C2 visually regressed? | NO |
| 20 | Accessibility regressed? | NO |
| 21 | M3 touch behaviour regressed? | NO |
| 22 | Deployment package ready? | YES |
| 23 | Actual production hosting tested? | PENDING HOSTING |
| 24 | Real production phone smoke tested? | PENDING HOSTING |

---

## Z · Git status
Nothing committed or pushed.

```
 M app/composables/useLocaleSeo.ts
 M app/error.vue
 M app/pages/index.vue
 M engine/c2/main.js
 M nuxt.config.ts
 M package-lock.json
 M package.json
 M public/favicon.ico
 D public/robots.txt
 D public/sitemap.xml
 M shared/content/locales/en.ts
 M shared/content/locales/tr.ts
 M shared/content/types.ts
?? docs/DEPLOYMENT.md
?? docs/M5-REPORT.md
?? docs/m5-production/
?? modules/
?? public/apple-touch-icon.png
?? public/favicon-32x32.png
?? public/favicon.svg
?? public/og/
?? shared/site.ts
?? tools/
```

**Generated production output:** `.output/public`, 166 files, 11 MB, including:
- 5 prerendered pages and `404.html`;
- payloads;
- `_nuxt/` 737 KB;
- `opt/` media;
- `robots.txt`, `sitemap.xml`;
- favicons, `og/`;
- three `.htaccess` files.

It is a build artefact, git-ignored and not committed.

**M5 REPO PASS — READY FOR HOSTING VALIDATION**
