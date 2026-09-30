// Emrah Yücel — production shell.
// Static only: every route is prerendered to real HTML at build time. No server routes, no runtime rendering.
import { ICONS, PUBLIC_ROUTES, siteUrl } from './shared/site'

/**
 * LINEFIELD — the one switch (docs/LINEFIELD.md).
 *
 * Off, `__LINEFIELD__` is replaced with `false` at transform time. Every Linefield module is behind a dynamic
 * import inside a branch that then cannot be taken, so the bundler never emits their chunk: the published build
 * does not contain the corridor's GLSL, its states or its debug entry, and there is nothing to strip out.
 *
 *   NUXT_PUBLIC_LINEFIELD=1 npm run generate    the preview artifact
 *   npm run generate                            the published build
 */
const LINEFIELD = process.env.NUXT_PUBLIC_LINEFIELD === '1' || process.env.NUXT_PUBLIC_LINEFIELD === 'true'

export default defineNuxtConfig({
  compatibilityDate: '2025-09-16',
  devtools: { enabled: false },
  telemetry: false,

  // SSR is on so that `nuxt generate` can render real HTML; there is no server at runtime.
  ssr: true,

  css: ['~/assets/css/base.css'],

  // robots.txt, sitemap.xml, the static 404 and the hosting rules, all from the one site origin below
  modules: ['./modules/production-files'],

  // the C2 runtime lives outside the framework; it is imported by relative path from the adapter so that
  // TypeScript and Vite resolve it identically, and it keeps no framework imports of its own

  runtimeConfig: {
    public: {
      // M5: the one production origin. Canonicals, hreflang, Open Graph, JSON-LD, the sitemap, robots.txt and the
      // redirects derive from it. Set NUXT_PUBLIC_SITE_URL at build time for another origin (HTTPS only).
      siteUrl: siteUrl(process.env.NUXT_PUBLIC_SITE_URL),
    },
  },

  // production builds ship no source maps
  sourcemap: { server: false, client: false },

  // the browser support contract: Safari 15.4 / iOS 15.4 at minimum — the Nuxt runtime's own APIs (Array#at,
  // Object.hasOwn); syntax is still lowered to 15 below (the real validation device is an iPhone 7 Plus on
  // iOS 15.8.8). Vite's default target is Safari/iOS 16.4; with it Nuxt also emits an entry import map, which Safari
  // before 16.4 cannot resolve — the app then fails to boot (docs/POST-M5-IOS15-COMPATIBILITY.md). An older target
  // lowers the syntax and makes Nuxt drop the import map on its own.
  vite: {
    build: { target: ['safari15', 'ios15'] },
    define: { __LINEFIELD__: JSON.stringify(LINEFIELD) },
  },

  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: true,
      failOnError: true,
      routes: PUBLIC_ROUTES,
    },
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [{ name: 'theme-color', content: '#efeee9' }],
      /*
        Without script there is no runtime to wait for, so there is nothing for the first-paint plate to stand in
        for: the semantic shell IS the page, and the plate would only cover it. This is the one rule that decides
        which of the two owns the screen, and it is decided by the document, before anything runs.
      */
      noscript: [{ innerHTML: '<style>#c2-plate{display:none}</style>', tagPosition: 'head' }],
      link: [
        { rel: 'icon', href: ICONS.ico, sizes: '32x32' },
        { rel: 'icon', href: ICONS.svg, type: 'image/svg+xml' },
        { rel: 'icon', href: ICONS.png32, type: 'image/png', sizes: '32x32' },
        { rel: 'apple-touch-icon', href: ICONS.apple },
      ],
    },
  },
})
