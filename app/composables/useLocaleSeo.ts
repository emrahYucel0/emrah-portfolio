import type { ResolvableLink } from '@unhead/vue'
import { HTML_LANG, LOCALES, OG_LOCALE } from '~/locales'

type Page = 'home' | 'about'

/**
 * One call per page: html lang, title, description, canonical, hreflang tr / en / x-default,
 * Open Graph and Twitter. Everything is static, so it all lands in the prerendered HTML.
 */
export function useLocaleSeo(page: Page) {
  const { locale, copy, pathWithoutLocale } = useLocale()
  const site = useRuntimeConfig().public.siteUrl

  const meta = computed(() => copy.value.meta[page])
  const canonical = computed(() => `${site}/${locale.value}${pathWithoutLocale.value}`)

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
  }))

  useSeoMeta({
    title: () => meta.value.title,
    description: () => meta.value.description,
    ogTitle: () => meta.value.title,
    ogDescription: () => meta.value.description,
    ogType: 'website',
    ogUrl: () => canonical.value,
    ogSiteName: 'Emrah Yücel',
    ogLocale: () => OG_LOCALE[locale.value],
    ogLocaleAlternate: () => LOCALES.filter((l) => l !== locale.value).map((l) => OG_LOCALE[l]),
    twitterCard: 'summary_large_image',
    twitterTitle: () => meta.value.title,
    twitterDescription: () => meta.value.description,
  })
}
