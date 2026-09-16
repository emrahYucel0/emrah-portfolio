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
