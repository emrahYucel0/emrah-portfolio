import type { ResolvableLink } from '@unhead/vue'
import { HTML_LANG, LOCALES, OG_LOCALE, profile } from '~~/shared/content'
import { SOCIAL_IMAGE } from '~~/shared/site'

type Page = 'home' | 'about'

/**
 * One call per page: html lang, title, description, canonical, hreflang tr / en / x-default, Open Graph, Twitter and
 * the Person structured data. Everything is static, so it all lands in the prerendered HTML, and every URL derives
 * from the one site origin (runtimeConfig.public.siteUrl).
 */
export function useLocaleSeo(page: Page) {
  const { locale, copy, pathWithoutLocale } = useLocale()
  const site = useRuntimeConfig().public.siteUrl

  const meta = computed(() => copy.value.meta[page])
  const canonical = computed(() => `${site}/${locale.value}${pathWithoutLocale.value}`)
  const image = `${site}${SOCIAL_IMAGE.path}`

  const links = computed<ResolvableLink[]>(() => [
    { rel: 'canonical', href: canonical.value },
    ...LOCALES.map((l) => ({
      rel: 'alternate' as const,
      hreflang: HTML_LANG[l],
      href: `${site}/${l}${pathWithoutLocale.value}`,
    })),
    { rel: 'alternate' as const, hreflang: 'x-default', href: `${site}/` },
  ])

  useHead(() => ({
    htmlAttrs: { lang: HTML_LANG[locale.value] },
    link: links.value,
    script: [{ type: 'application/ld+json', key: 'person', innerHTML: JSON.stringify(personJsonLd(site)) }],
  }))

  useSeoMeta({
    title: () => meta.value.title,
    description: () => meta.value.description,
    ogTitle: () => meta.value.title,
    ogDescription: () => meta.value.description,
    ogType: page === 'about' ? 'profile' : 'website',
    ogUrl: () => canonical.value,
    ogSiteName: profile.name,
    ogLocale: () => OG_LOCALE[locale.value],
    ogLocaleAlternate: () => LOCALES.filter((l) => l !== locale.value).map((l) => OG_LOCALE[l]),
    ogImage: image,
    ogImageSecureUrl: image,
    ogImageType: SOCIAL_IMAGE.type,
    ogImageWidth: SOCIAL_IMAGE.width,
    ogImageHeight: SOCIAL_IMAGE.height,
    ogImageAlt: () => copy.value.meta.imageAlt,
    twitterCard: 'summary_large_image',
    twitterTitle: () => meta.value.title,
    twitterDescription: () => meta.value.description,
    twitterImage: image,
    twitterImageAlt: () => copy.value.meta.imageAlt,
  })
}

/** facts only: who, where the portfolio is, what he does, where else he is — no employer, address or ratings */
export function personJsonLd(site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${site}/#person`,
    name: profile.name,
    url: `${site}/`,
    jobTitle: 'Creative Developer / Full-Stack Developer',
    email: `mailto:${profile.email}`,
    sameAs: profile.links.map((l) => l.href),
  }
}
