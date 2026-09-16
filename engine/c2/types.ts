// The Nuxt-facing boundary of the transplanted C2 runtime.
// The engine itself stays JavaScript for M1 (parity first); only this contract is typed.

export type C2Locale = 'tr' | 'en'
export type C2ProjectId = 'istanbul-sehir-ici' | 'ege-esya' | 'evden-eve-nakliyat'

/** Low-frequency semantic checkpoints. Nothing frame-rate-sensitive ever crosses this line. */
export type C2Event =
  | { type: 'projectOpened'; index: number; ink: string }
  | { type: 'aboutVisited'; open: boolean }
  | { type: 'labRoomCommitted'; x: number; y: number; height: number }
  | { type: 'scarCommitted'; x: number; y: number; source: 'about' | 'work' | 'lab' }

/** What the host may ask the runtime to do. */
export interface C2Command {
  /** the host router changed the URL (push, back, forward or a locale switch) */
  routeChanged(): void
  /** re-point the runtime at the host's URLs, e.g. after a locale switch */
  configure(options: C2MountOptions): void
}

export interface C2MountOptions {
  /** the language the host is showing; the runtime never guesses it from the URL */
  locale?: C2Locale
  /** the same page in the other language, for the runtime's quiet language control */
  localeHref?: string
  /** absolute path of the surface's home route, e.g. /en */
  homeUrl?: string
  /** absolute path of the grown-room About route, e.g. /en/about */
  aboutUrl?: string
  /** does the current URL mean "About is open"? */
  isAboutPath?: () => boolean
  /** the runtime asks the host to navigate; the host owns history */
  push?: (url: string, state: unknown) => void
  /** the runtime asks the host to change the URL without adding a history entry (language changes) */
  replace?: (url: string, state: unknown) => void
  /** the runtime asks the host to go back */
  back?: () => void
  /** semantic checkpoints out */
  emit?: (type: C2Event['type'], payload: Record<string, unknown>) => void
}

/** What survives a real remount: meaning, not animation phase. The engine keeps its own richer
 *  snapshot in sessionStorage; this is the serialisable part the Nuxt visit memory mirrors. */
export interface C2Snapshot {
  openedProjects: number[]
  inks: Record<string, string>
  aboutVisited: boolean
  labRooms: number
}
