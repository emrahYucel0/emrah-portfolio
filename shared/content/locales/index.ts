import { en } from './en'
import { tr } from './tr'
import type { Locale, LocaleCopy } from '../types'

export const copies: Record<Locale, LocaleCopy> = { en, tr }

/** BCP 47 tags for html lang, hreflang and og:locale */
export const HTML_LANG: Record<Locale, string> = { tr: 'tr-TR', en: 'en' }
export const OG_LOCALE: Record<Locale, string> = { tr: 'tr_TR', en: 'en_US' }
export const DEFAULT_LOCALE: Locale = 'en'

export { en, tr }
