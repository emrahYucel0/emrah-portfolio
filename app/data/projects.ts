import type { ResponsiveImage } from './media'

export const PROJECT_IDS = ['istanbul-sehir-ici', 'ege-esya', 'evden-eve-nakliyat'] as const
export type ProjectId = (typeof PROJECT_IDS)[number]

/** What Emrah actually did on the project — facts, not UI copy. */
export type ProjectRole =
  | 'creative-direction' | 'original-design' | 'creative-development'
  | 'seo-architecture' | 'content-scale' | 'publishing-system'
  | 'admin' | 'cms' | 'full-stack' | 'production-performance'

export interface Project {
  readonly id: ProjectId
  /** proper noun — identical in both locales */
  readonly name: string
  readonly url: string
  readonly host: string
  readonly roles: readonly ProjectRole[]
  /** the ink the C2 surface carries for this work; kept with the data so memory can use it later */
  readonly ink: string
  /** filled in when the project worlds are migrated; empty in M0 by design */
  readonly media?: Readonly<Record<string, ResponsiveImage>>
}

export const projects: readonly Project[] = [
  {
    id: 'istanbul-sehir-ici',
    name: 'İstanbul Şehir İçi',
    url: 'https://istanbulsehirici.com/',
    host: 'istanbulsehirici.com',
    roles: ['creative-direction', 'original-design', 'creative-development'],
    ink: '#6b2c14',
  },
  {
    id: 'ege-esya',
    name: 'Ege Eşya',
    url: 'https://egeesya.com/',
    host: 'egeesya.com',
    roles: ['seo-architecture', 'content-scale', 'publishing-system'],
    ink: '#6b1f1f',
  },
  {
    id: 'evden-eve-nakliyat',
    name: 'Evden Eve Nakliyat',
    url: 'https://evenakliyatevden.com/',
    host: 'evenakliyatevden.com',
    roles: ['admin', 'cms', 'full-stack', 'production-performance'],
    ink: '#26443a',
  },
]
