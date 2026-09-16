import type { C2Event, C2MountOptions } from '../../engine/c2/types'
import { PROJECT_IDS, projects } from '~/data/projects'

/**
 * Nuxt to C2 adapter — the smallest boundary that lets the shell host the frozen runtime.
 *
 * The C2 host DOM (#media, #surface, #ui) is created once, appended to document.body and NEVER put
 * inside the Vue tree: Vue must not patch, move or unmount the element the WebGL context lives on.
 * That is also what makes a route change safe — the runtime and its session simply keep running.
 */
interface C2Module {
  configure: (o: C2MountOptions) => void
  routeChanged: () => void
  mountC2: () => Promise<void>
}

let modulePromise: Promise<C2Module> | null = null

function createHostDom() {
  if (document.getElementById('surface')) return
  const media = document.createElement('div')
  media.id = 'media'
  media.setAttribute('aria-hidden', 'true')
  const canvas = document.createElement('canvas')
  canvas.id = 'surface'
  canvas.setAttribute('aria-hidden', 'true')
  const ui = document.createElement('div')
  ui.id = 'ui'
  document.body.append(media, canvas, ui)
}

export function useC2Engine() {
  const route = useRoute()
  const router = useRouter()
  const { locale, path } = useLocale()
  const { visit, openProject, markAbout } = useVisit()

  const options = (): C2MountOptions => ({
    homeUrl: path('/'),
    aboutUrl: path('/about'),
    isAboutPath: () => /\/about\/?$/.test(route.path),
    push: (url) => { void router.push(url) },
    back: () => router.back(),
    emit: (type, payload) => onEvent(type, payload),
  })

  /** semantic checkpoints only — this is the whole write surface into Nuxt state */
  const onEvent = (type: C2Event['type'], payload: Record<string, unknown>) => {
    if (type === 'projectOpened') {
      const index = Number(payload.index)
      const id = PROJECT_IDS[index]
      if (id) openProject(id, projects[index]?.ink)
    } else if (type === 'aboutVisited') {
      markAbout({ open: Boolean(payload.open) })
    } else if (type === 'labRoomCommitted') {
      visit.value.lab.rooms.push({ x: Number(payload.x), y: Number(payload.y), height: Number(payload.height), study: null })
    } else if (type === 'scarCommitted') {
      visit.value.scars.push({ x: Number(payload.x), y: Number(payload.y), depth: 1, source: payload.source as 'about' | 'work' | 'lab' })
    }
  }

  const start = async () => {
    if (!import.meta.client) return
    createHostDom()
    // the module boots itself when loaded standalone; hosted, the shell decides when
    ;(globalThis as Record<string, unknown>).__c2Hosted = true
    // Nuxt serves /public at app.baseURL; Vite's BASE_URL points at the build-asset directory instead
    ;(globalThis as Record<string, unknown>).__c2Base = useRuntimeConfig().app.baseURL
    modulePromise ??= import('../../engine/c2/main.js').then(async (mod: unknown) => {
      const m = mod as C2Module
      m.configure(options())
      await m.mountC2()
      document.documentElement.dataset.c2 = 'on'
      return m
    })
    return modulePromise
  }

  /** the shell owns the URL: every route change (push, back, forward, locale) is handed over */
  const syncRoute = async () => {
    const m = await modulePromise
    if (!m) return
    m.configure(options())
    m.routeChanged()
  }

  const setActive = (on: boolean) => {
    if (!import.meta.client) return
    if (on) document.documentElement.dataset.c2 = 'on'
    else delete document.documentElement.dataset.c2
  }

  return { start, syncRoute, setActive, locale }
}
