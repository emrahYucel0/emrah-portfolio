// Emrah Yücel — production shell (M0).
// Static only: every route is prerendered to real HTML at build time. No server routes, no runtime rendering.
export default defineNuxtConfig({
  compatibilityDate: '2025-09-16',
  devtools: { enabled: false },
  telemetry: false,

  // SSR is on so that `nuxt generate` can render real HTML; there is no server at runtime.
  ssr: true,

  css: ['~/assets/css/base.css'],

  // the future C2 engine lives outside the framework and is addressed by one alias
  alias: { '#engine': new URL('./engine', import.meta.url).pathname },

  runtimeConfig: {
    public: {
      // ASSUMPTION — confirm the production domain. Override with NUXT_PUBLIC_SITE_URL at build time.
      siteUrl: 'https://yucelemrah.com',
    },
  },

  nitro: {
    preset: 'static',
    prerender: {
      crawlLinks: true,
      failOnError: true,
      routes: ['/', '/tr', '/en', '/tr/about', '/en/about'],
    },
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [{ name: 'theme-color', content: '#efeee9' }],
    },
  },
})
