# emrah-portfolio

Production application for **Emrah Yücel** — Creative Developer / Full-Stack Developer.

Bilingual (TR + EN), **statically generated**, semantic and responsive. Built to receive the frozen
C2 surface experience later without forcing it to change.

## Rules this repo lives by

1. **Static only.** No SSR at runtime, no server routes, no API, no database, no auth, no CMS.
   `npm run generate` produces real HTML for every route.
2. **Both languages are first class.** `/tr` and `/en` are separate prerendered pages that share one
   component tree; neither is a translation layer over the other.
3. **The DOM carries the meaning.** Name, roles, work, contact and About text exist in the HTML with
   JavaScript disabled. The surface will be an enhancement on top, never the source of content.
4. **Dependencies are argued for, not added.** See below — there are four, and two are TypeScript tooling.
5. **The frozen prototype (`../c2-surface-lab`) is read-only.** It is the design authority for
   registration, release, memory, the contact ending, the İstanbul world, the Work → Lab bridge and the
   material engine. Production migration must preserve their behaviour.

## Commands

```bash
npm run dev        # development server
npm run generate   # static build -> .output/public  (this is the deployable artefact)
npm run preview    # serve .output/public locally
npx nuxt typecheck # vue-tsc over the whole app
```

## Checks

The harnesses the site is held to live in [`tools/diag/`](tools/diag/README.md) — in the repository, because a
check that can be lost is not a check. They drive a **built** artifact through a real browser. `tools/` is source
and never ships: only `.output/public` is uploaded.

```bash
cd tools/diag && sh run6.sh 4500 4600   # the whole flag-off gate -> out/final6.log
```

Restart the **current** server after every rebuild; the CSP in `.htaccess` carries a hash of the HTML. The
**baseline** server looks after itself: `run6.sh` rebuilds the artifact from the annotated tag
`baseline/pre-site-polish` into `baselines/pre-site-polish` whenever it is missing, and serves it. A baseline that
lives only as a folder can be swept away, and a server whose directory is gone keeps answering — with 404.

**One console message is allowed, and only this one:** `ResizeObserver loop completed with undelivered
notifications`. It is a WebKit notice that a ResizeObserver callback missed its loop budget; nothing breaks and
nothing the visitor sees changes. `journey.cjs` counts and prints it separately and does not fail on it. Every other
console message, and every page error, is still a hard failure. The bench's own observer was changed to defer its
measurement to the next frame, so the notice should now be rare — it stays counted so a return is visible.

Defects that are understood and deliberately unfixed are in [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md), each
with what was already tried.

## Shape

```
app/
  assets/css/base.css     design tokens + structural styles (no framework, no utility classes)
  components/             SiteHeader, SiteFooter, LocaleSwitcher
  composables/            useLocale, useLocaleSeo, useVisit (session contract), useReducedMotion
  data/                   profile, projects, lab, media types  — typed facts, no copy
  locales/                messages.ts (the shape), tr.ts, en.ts — copy, no facts
  layouts/default.vue     skip link + header + main + footer
  pages/
    index.vue             x-default entry, resolves a language
    [locale]/index.vue    home
    [locale]/about.vue    about
engine/                   reserved, framework-independent slot for the C2 engine (see engine/README.md)
public/                   robots.txt, sitemap.xml, favicon
```

## Adding a locale

Add the code to `LOCALES` in `app/locales/index.ts`, add its message file, add its `HTML_LANG` /
`OG_LOCALE` entries and its routes to `nitro.prerender.routes`. No component changes.

## Domain

`runtimeConfig.public.siteUrl` defaults to `https://yucelemrah.com` and is used for canonical, hreflang,
Open Graph and the sitemap. Override at build time with `NUXT_PUBLIC_SITE_URL` if the domain differs.
