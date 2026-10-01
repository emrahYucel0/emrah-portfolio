import { profile, projects, studies } from './facts'
import { copies, DEFAULT_LOCALE, HTML_LANG, OG_LOCALE } from './locales'
import { imageSource, type Manifest } from './media'
import { LOCALES, type Locale, type LocaleCopy, type ProjectId } from './types'
import { termHtml } from './term'

export * from './types'
export { termText, termLang, termHtml } from './term'
export { profile, projects, studies, copies, DEFAULT_LOCALE, HTML_LANG, OG_LOCALE }
export type { Manifest }

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value)

/** What the Nuxt shell reads. */
export const messages = (locale: Locale): LocaleCopy => copies[locale]

/** a study's number, as every place that shows one writes it: from the one order in facts.ts ('01', '02', …) */
export const studyNo = (id: (typeof studies)[number]): string => String(studies.indexOf(id) + 1).padStart(2, '0')

export interface C2ContentOptions {
  manifest: Manifest
  /** public asset base, e.g. '/' */
  base: string
  /** scalability harness only (?n=): repeats the real projects */
  count?: number
}

/**
 * What the C2 runtime reads, in the shape its legacy modules already expect.
 * Facts come from `facts.ts`, language from `locales/`, images from the manifest — assembled here so
 * neither consumer keeps a second copy of anything.
 */
export function c2Content(locale: Locale, options: C2ContentOptions) {
  const copy = copies[locale]
  const built = projects.map((p) => {
    const pc = copy.work.projects[p.id]
    const media = Object.fromEntries(
      Object.entries(p.media).map(([key, file]) => [key, imageSource(options.manifest, options.base, file, pc.alts[key] ?? p.name)]),
    )
    return {
      id: p.id, name: p.name, url: p.url, host: p.host, ink: p.ink, rhythm: p.rhythm,
      stack: pc.stack ?? p.stack, stackLang: pc.stack ? locale : 'en',
      strength: pc.strength, client: pc.client ?? '', line: pc.line, role: pc.role, facts: [...pc.facts], captions: Object.fromEntries(Object.entries(pc.captions ?? {}).map(([k, v]) => [k, termHtml(v)])),
      psi: {
        mobile: p.psi.mobile, desktop: p.psi.desktop,
        labels: copy.psi.labels, short: copy.psi.short,
        head: copy.psi.head, mobileLabel: copy.psi.mobile, desktopLabel: copy.psi.desktop,
      },
      media,
    }
  })
  const count = Math.max(1, Math.min(12, options.count ?? built.length))
  const works = Array.from({ length: count }, (_, i) => {
    const source = built[i % built.length]!
    return { ...source, index: i, key: `${source.id}-${i}` }
  })

  return {
    locale,
    identity: {
      name: profile.name,
      primary: copy.roles.creative,
      secondary: copy.roles.fullStack,
      city: copy.identity.city,
      location: copy.identity.location,
      status: copy.identity.status,
      positioning: [...copy.identity.positioning],
    },
    contact: {
      email: profile.email, phone: profile.phone, tel: profile.tel,
      links: profile.links.map((l) => ({ label: l.label, href: l.href })),
      cv: profile.cv,
    },
    about: {
      home: { intro: copy.home.intro, positioning: copy.home.positioning, more: copy.home.more },
      detail: {
        intro: copy.about.intro, background: copy.about.background, transition: copy.about.transition,
        current: copy.about.current, status: copy.about.status, capabilities: [...copy.about.capabilities],
      },
    },
    capabilities: { surface: copy.faces.surface, system: copy.faces.system, stack: copy.faces.stack },
    workIntro: { line: copy.work.intro },
    works,
    // what the runtime's own Lab stop paints: its name, its line, and the way through to the bench
    lab: {
      title: copy.lab.title,
      line: copy.lab.line,
      open: copy.lab.open,
      count: copy.lab.count,
    },
    /** every label, hint and aria name the runtime paints, in the active language */
    ui: copy,
  }
}

export type C2Content = ReturnType<typeof c2Content>
export type C2Work = C2Content['works'][number]
export type { Locale, LocaleCopy, ProjectId }
