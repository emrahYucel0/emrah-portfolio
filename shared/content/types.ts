/**
 * The content authority for the whole portfolio.
 *
 * Framework-independent on purpose: no Vue, no Nuxt, no composables, no browser APIs. The Nuxt shell and
 * the C2 runtime both read from here, so a sentence, a label or a number exists exactly once.
 *
 * The split that matters:
 *   FACTS  — locale-independent truth (ids, URLs, inks, media files, PageSpeed numbers)
 *   COPY   — locale-dependent language (labels, descriptions, About prose, metadata)
 */

export const LOCALES = ['tr', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const PROJECT_IDS = ['istanbul', 'ege', 'evden'] as const
export type ProjectId = (typeof PROJECT_IDS)[number]

export const STUDY_IDS = ['01', '02', '03', '04', '05'] as const
export type StudyId = (typeof STUDY_IDS)[number]

/** PageSpeed Insights, as verified. null means not verified, and is never shown. */
export type PsiRow = [number | null, number | null, number | null, number | null]
export interface Psi {
  mobile: PsiRow
  desktop: PsiRow
}

export interface MediaFile {
  /** file name in public/opt/img — one asset serves both locales */
  file: string
  /** which ground the image sits on, for the surface */
  shade: 'light' | 'dark'
}

export interface ProjectFacts {
  id: ProjectId
  /** a brand name: identical in every locale */
  name: string
  url: string
  host: string
  /** the ink this work stains the surface with */
  ink: string
  /** which material rhythm its world uses (see engine/c2/world.js) */
  rhythm: 'authored' | 'scale' | 'system'
  stack: string
  psi: Psi
  media: Record<string, MediaFile>
}

export interface StudyFacts {
  id: StudyId
  w: number
  h: number
}

export interface ProfileFacts {
  name: string
  email: string
  phone: string
  tel: string
  links: { id: string; label: string; href: string }[]
  cv: string | null
}

/**
 * A word that may be English inside Turkish copy. It matters because CSS uppercasing follows the
 * element language: "Creative" becomes "CREATİVE" under Turkish casing rules unless it is marked.
 */
export type TermPart = string | { text: string; lang: 'en' }
export type Term = TermPart | TermPart[]

/** A capability line as the two faces of the surface render it. */
export interface CapabilityItem {
  name: Term
  note: string
}

export interface ProjectCopy {
  /** the one line the work index shows under the name */
  strength: string
  /** what the work is, in one sentence */
  line: string
  /** what Emrah did on it */
  role: string
  /** four factual lines shown inside the project world */
  facts: string[]
  /** captions used by specific world rhythms */
  captions?: Record<string, Term>
  /** when a stack line contains prose rather than technology names, the language may author its own */
  stack?: string
  /** alt text per media key — the image is shared between locales, its description is not */
  alts: Record<string, string>
}

export interface LocaleCopy {
  meta: {
    home: { title: string; description: string }
    about: { title: string; description: string }
  }
  nav: { skip: string; label: string; work: string; about: string; lab: string; contact: string }
  /** professional positioning terms — English in both locales, by decision */
  roles: { creative: string; fullStack: string; and: string }
  identity: {
    city: string
    location: string
    status: string
    /** the two authored lines of the opening positioning */
    positioning: [string, string]
  }
  home: { intro: string; positioning: string; more: string; workHeading: string; labHeading: string }
  about: {
    heading: string
    intro: string
    background: string
    transition: string
    current: string
    status: string
    capabilitiesHeading: string
    capabilities: Term[]
    back: string
  }
  faces: {
    surface: { word: string; role: string; items: CapabilityItem[] }
    system: { word: string; role: string; items: CapabilityItem[] }
    stack: string
  }
  work: {
    heading: string
    intro: string
    open: string
    visit: string
    allWork: string
    next: string
    again: string
    projectNav: string
    projects: Record<ProjectId, ProjectCopy>
  }
  lab: { title: string; line: string; heading: string; studies: Record<StudyId, string> }
  contact: { heading: string; emailLabel: string; phoneLabel: string }
  psi: { head: string; mobile: string; desktop: string; labels: [string, string, string, string]; short: [string, string, string, string] }
  hints: {
    quietSeparator: string
    open: string
    openTouch: string
    face: string
    faceTouch: string
    work: string
    workTouch: string
    lab: string
    world: string
  }
  a11y: { plainNav: string; selectedWork: string; labStudies: string; aboutRegion: string; aboutDetail: string; capabilities: string; projectImages: string }
  localeSwitch: { label: string; to: string; short: string; hreflang: string }
  entry: { title: string; description: string; choose: string }
  notFound: { title: string; message: string }
}
