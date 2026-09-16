/**
 * The production site — one authority for the origin and for what is public.
 *
 * Canonical URLs, hreflang, Open Graph, structured data, the sitemap, robots.txt and the hosting redirects all
 * derive from `siteUrl()`, which nuxt.config.ts resolves once from NUXT_PUBLIC_SITE_URL (e.g. for a staging build);
 * a production build refuses an origin that is not HTTPS or that points at localhost.
 */
import { LOCALES } from './content/types'

export const PRODUCTION_ORIGIN = 'https://yucelemrah.com'

/** the canonical origin: HTTPS, no trailing slash, no path */
export function siteUrl(raw?: string): string {
  const value = (raw || PRODUCTION_ORIGIN).trim().replace(/\/+$/, '')
  let url: URL
  try { url = new URL(value) } catch { throw new Error(`[site] invalid site URL: ${value}`) }
  if (url.pathname !== '/' || url.search || url.hash) throw new Error(`[site] the site URL must be an origin only: ${value}`)
  if (url.protocol !== 'https:') throw new Error(`[site] the site URL must use HTTPS: ${value}`)
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname)) throw new Error(`[site] the site URL must not be local: ${value}`)
  return url.origin
}

/** public pages, without the locale prefix */
export const PUBLIC_PAGES = ['', '/about'] as const

/** every public, indexable route: the x-default entry and each page in each language */
export const PUBLIC_ROUTES: string[] = ['/', ...LOCALES.flatMap((l) => PUBLIC_PAGES.map((p) => `/${l}${p}`))]

/** the one social share image (a still of the C2 name plate; see docs/DEPLOYMENT.md) */
export const SOCIAL_IMAGE = { path: '/og/emrah-yucel-portfolio.jpg', width: 1200, height: 630, type: 'image/jpeg' } as const

/** icons wired in the document head */
export const ICONS = {
  svg: '/favicon.svg',
  ico: '/favicon.ico',
  png32: '/favicon-32x32.png',
  apple: '/apple-touch-icon.png',
} as const
