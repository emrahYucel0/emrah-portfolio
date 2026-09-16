import type { Locale, ProjectId, StudyId } from '~~/shared/content'

/**
 * SESSION STATE CONTRACT — the shape the C2 memory engine will fill later.
 *
 * M0 implements the container and its persistence only: what a visit is, what survives client-side
 * navigation, and what a language switch must NOT reset. No surface behaviour is implemented here.
 */
export interface SurfaceScar {
  /** normalised position on the surface, so it survives any viewport change */
  x: number
  y: number
  /** how much material was taken, 0..1 */
  depth: number
  source: 'about' | 'work' | 'lab'
}

export interface LabRoom {
  x: number
  y: number
  height: number
  study: StudyId | null
}

export interface VisitState {
  /** the language the visitor is reading in; changing it continues the same visit */
  language: Locale | null
  /** works opened, in the order they were opened — this IS the visit order */
  openedProjects: ProjectId[]
  /** ink per opened work, kept so the contact ending and the bridge can use it */
  inks: Partial<Record<ProjectId, string>>
  about: { visited: boolean; open: boolean; detail: boolean }
  lab: { rooms: LabRoom[]; activeStudy: StudyId | null; nextStudy: number }
  /** where the surface has already given way */
  scars: SurfaceScar[]
  startedAt: number
}

const VISIT_KEY = 'ey.visit.v2'
const LOCALE_KEY = 'ey.locale'

const emptyVisit = (): VisitState => ({
  language: null,
  openedProjects: [],
  inks: {},
  about: { visited: false, open: false, detail: false },
  lab: { rooms: [], activeStudy: null, nextStudy: 0 },
  scars: [],
  startedAt: Date.now(),
})

export function useVisit() {
  const visit = useState<VisitState>('visit', emptyVisit)
  const hydrated = useState<boolean>('visit-hydrated', () => false)

  // one visit per tab: restored once, then written on every change. A route change or a language
  // switch never passes through here as a reset.
  if (import.meta.client && !hydrated.value) {
    hydrated.value = true
    try {
      const raw = sessionStorage.getItem(VISIT_KEY)
      if (raw) Object.assign(visit.value, JSON.parse(raw) as Partial<VisitState>)
    } catch {
      /* blocked storage: the visit simply starts fresh */
    }
    watch(
      visit,
      (value) => {
        try {
          sessionStorage.setItem(VISIT_KEY, JSON.stringify(value))
          if (value.language) sessionStorage.setItem(LOCALE_KEY, value.language)
        } catch {
          /* ignore */
        }
      },
      { deep: true, flush: 'post' },
    )
  }

  /** a language switch records the language and nothing else — memory continues */
  const setLanguage = (language: Locale) => {
    if (visit.value.language !== language) visit.value.language = language
  }

  const openProject = (id: ProjectId, ink?: string) => {
    if (!visit.value.openedProjects.includes(id)) visit.value.openedProjects.push(id)
    if (ink) visit.value.inks[id] = ink
  }

  const markAbout = (state: Partial<VisitState['about']>) => {
    visit.value.about = { ...visit.value.about, ...state, visited: true }
  }

  const reset = () => {
    visit.value = emptyVisit()
  }

  return { visit, setLanguage, openProject, markAbout, reset }
}
