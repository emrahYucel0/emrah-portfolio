// Emrah Yücel — production shell.
// Static only: every route is prerendered to real HTML at build time. No server routes, no runtime rendering.
import { ICONS, PUBLIC_ROUTES, siteUrl } from './shared/site'

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
      link: [
        { rel: 'icon', href: ICONS.ico, sizes: '32x32' },
        { rel: 'icon', href: ICONS.svg, type: 'image/svg+xml' },
        { rel: 'icon', href: ICONS.png32, type: 'image/png', sizes: '32x32' },
        { rel: 'apple-touch-icon', href: ICONS.apple },
      ],
    },
  },
})
