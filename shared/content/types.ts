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

export const STUDY_IDS = ['weight', 'line', 'tone'] as const
export type StudyId = (typeof STUDY_IDS)[number]

/** one study, as the bench and the study itself name it */
export interface StudyCopy {
  name: string
  prim: string
  note: string
  question: string
}

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
    lab: { title: string; description: string }
    /** the Contact finale's own route (/[locale]/contact) — the site's one Contact */
    contact: { title: string; description: string }
    /** M5: text alternative of the social share image */
    imageAlt: string
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
    /** the visible label of the control that opens the registered project (a pointer instruction) */
    open: string
    /** the same thing said to a finger: the phone has no such control, and no holding either */
    openTouch: string
    visit: string
    allWork: string
    next: string
    again: string
    projectNav: string
    projects: Record<ProjectId, ProjectCopy>
  }
  lab: {
    title: string
    line: string
    heading: string
    /** the bench's own notation */
    registered: string
    registering: string
    open: string
    count: string
    back: string
    studies: Record<StudyId, StudyCopy>
    /** what each study says as it is read */
    line_states: string[]
    line_says: string[]
    line_spent: string
    line_held: string
    tone_sources: string[]
    tone_rows: string
    weight_holds: string
  }
  contact: { heading: string; emailLabel: string; phoneLabel: string }
  /** the Contact finale's own words (engine/lab/finale): the copy control, the revision record, and the three
   *  instructions its foot band shows once (the way in, the cursor's attention, the phone's attention by scroll) */
  finale: {
    copy: string; copied: string; copyEmail: string; locationRole: string
    revision: string; githubAria: string; linkedinAria: string
    hintScroll: string; hintCursor: string; hintKeepScrolling: string
  }
  psi: { head: string; mobile: string; desktop: string; labels: [string, string, string, string]; short: [string, string, string, string] }
  /** the pointer instruction a place shows while it still asks something of the visitor — the hero and the Lab
   *  stop no longer do (About is a control on the hero; the Lab is a route that opens on arrival) */
  hints: {
    quietSeparator: string
    face: string
    faceTouch: string
    work: string
    workTouch: string
    world: string
  }
  a11y: {
    plainNav: string; selectedWork: string; labStudies: string; aboutRegion: string; aboutDetail: string; capabilities: string; projectImages: string
    /** M4: keyboard instructions read by assistive technology, and the new-tab note on external links */
    keys: string; workKeys: string; worldKeys: string; labKeys: string; newTab: string
    /** M4: the name of the control that opens the registered project (its visible text is a pointer instruction) */
    openProject: string
    /** M4: description of that control — no hold is needed from a keyboard or a screen reader */
    openHint: string
  }
  localeSwitch: { label: string; to: string; short: string; hreflang: string }
  entry: { title: string; description: string; choose: string }
  notFound: { title: string; message: string }
}
