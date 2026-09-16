import { en } from './en'
import { tr } from './tr'
import type { Messages } from './messages'

export const LOCALES = ['tr', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export const messages: Record<Locale, Messages> = { tr, en }

/** BCP 47 tags for html lang, hreflang and og:locale */
export const HTML_LANG: Record<Locale, string> = { tr: 'tr-TR', en: 'en' }
export const OG_LOCALE: Record<Locale, string> = { tr: 'tr_TR', en: 'en_US' }

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value)

export type { Messages }
