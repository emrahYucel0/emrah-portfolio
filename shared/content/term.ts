import type { Term, TermPart } from './types'

const parts = (t: Term): TermPart[] => (Array.isArray(t) ? t : [t])
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const termText = (t: Term): string => parts(t).map((p) => (typeof p === 'string' ? p : p.text)).join('')

/** the language of a term that is entirely in one other language; mixed terms carry it per part */
export const termLang = (t: Term): string | undefined => (!Array.isArray(t) && typeof t !== 'string' ? t.lang : undefined)

/** HTML for a term: marked parts carry their own lang so uppercasing follows the right rules. */
export const termHtml = (t: Term): string =>
  parts(t).map((p) => (typeof p === 'string' ? escape(p) : `<span lang="${p.lang}">${escape(p.text)}</span>`)).join('')
