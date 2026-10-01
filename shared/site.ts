/**
 * The production site — one authority for the origin and for what is public.
 *
 * Canonical URLs, hreflang, Open Graph, structured data, the sitemap, robots.txt and the hosting redirects all
 * derive from `siteUrl()`, which nuxt.config.ts resolves once from NUXT_PUBLIC_SITE_URL (e.g. for a staging build);
 * a production build refuses an origin that is not HTTPS or that points at localhost.
 */
import { studies } from './content/facts'
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

/**
 * Public pages, without the locale prefix. The Lab's bench and its three studies are pages of this site like any
 * other — each prerendered, each with its own title, canonical and hreflang — so they belong here, which is what
 * puts them in the sitemap and in the prerender list rather than leaving them to be found by crawling.
 */
export const PUBLIC_PAGES: readonly string[] = ['', '/about', '/lab', ...studies.map((s) => `/lab/${s}`), '/contact']

/**
 * The document routes: the pages that keep the document's own scroll, where the C2 runtime is NOT mounted and the
 * runtime's strip is worn in DOM (LabChrome) — the Lab (bench and studies) and the Contact finale. One test, read by
 * the layout (what it renders) and by the runtime's head-start plugin (whether it boots), so the two cannot disagree.
 */
export const isDocumentRoute = (path: string): boolean => /^\/(tr|en)\/(lab(\/|$)|contact\/?$)/.test(path)

/** every public, indexable route: the x-default entry and each page in each language */
export const PUBLIC_ROUTES: string[] = ['/', ...LOCALES.flatMap((l) => PUBLIC_PAGES.map((p) => `/${l}${p}`))]

/** the social share images: one still of the C2 name plate, its strips naming the page (tools/brand-assets.cjs; see
 *  docs/DEPLOYMENT.md). The Lab (bench and studies) and Contact have their own; every other page shares the plate. */
const PLATE = { width: 1200, height: 630, type: 'image/jpeg' } as const
export const SOCIAL_IMAGE = { path: '/og/emrah-yucel-portfolio.jpg', ...PLATE } as const
export const SOCIAL_IMAGES = {
  lab: { path: '/og/emrah-yucel-portfolio-lab.jpg', ...PLATE },
  contact: { path: '/og/emrah-yucel-portfolio-contact.jpg', ...PLATE },
} as const
export const socialImage = (page: string) => SOCIAL_IMAGES[page as keyof typeof SOCIAL_IMAGES] ?? SOCIAL_IMAGE

/** the web app manifest (public/site.webmanifest), linked from app.vue */
export const MANIFEST = '/site.webmanifest'

/** icons wired in the document head */
export const ICONS = {
  svg: '/favicon.svg',
  ico: '/favicon.ico',
  png32: '/favicon-32x32.png',
  apple: '/apple-touch-icon.png',
} as const
