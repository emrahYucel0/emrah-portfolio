import { DEFAULT_LOCALE, LOCALES, isLocale, messages, type Locale } from '~/locales'

/**
 * Locale comes from the route segment, so every page exists as real prerendered HTML in both languages.
 * There is no runtime translation layer and no duplicated components: a page reads `copy` and renders it.
 */
export function useLocale() {
  const route = useRoute()

  const locale = computed<Locale>(() => (isLocale(route.params.locale) ? route.params.locale : DEFAULT_LOCALE))
  const copy = computed(() => messages[locale.value])
  const other = computed<Locale>(() => (locale.value === 'tr' ? 'en' : 'tr'))

  /** path inside a locale: path('/about') -> '/tr/about', path('/') -> '/tr' (one URL per page, no trailing slash) */
  const path = (to = '', target: Locale = locale.value) => {
    const rest = !to || to === '/' ? '' : to.startsWith('/') ? to : `/${to}`
    return `/${target}${rest}`
  }

  /** the same page in the other language — a language switch is not a new visit */
  const pathWithoutLocale = computed(() => route.path.replace(/^\/(tr|en)/, '').replace(/\/$/, ''))
  const switchPath = computed(() => path(pathWithoutLocale.value, other.value))

  return { locale, copy, other, path, pathWithoutLocale, switchPath, locales: LOCALES }
}
