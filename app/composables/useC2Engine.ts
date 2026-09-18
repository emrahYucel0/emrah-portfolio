import type { C2Event, C2MountOptions } from '../../engine/c2/types'
import { PROJECT_IDS, projects, type Locale } from '~~/shared/content'

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
  setLocale: (locale: Locale) => boolean
}

let modulePromise: Promise<C2Module> | null = null
/** the runtime has put its first frame on the screen — only then may the semantic shell step aside */
let presented = false

/**
 * POST-M5 LCP/HANDOFF — the moment the runtime's first frame is on the screen.
 * mountC2() resolves when the runtime is ready to draw, one frame before it has drawn. The runtime's own
 * loop is already queued, so the next animation frame draws it and the one after that runs with those
 * pixels composited — the same two-frame confirmation the runtime uses to retire its static hero.
 */
const firstFrameOnScreen = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
})

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
  const { locale, path, switchPath } = useLocale()
  const { visit, openProject, markAbout, setLanguage } = useVisit()

  const options = (): C2MountOptions => ({
    locale: locale.value,
    localeHref: switchPath.value,
    homeUrl: path('/'),
    aboutUrl: path('/about'),
    isAboutPath: () => /\/about\/?$/.test(route.path),
    push: (url) => { void router.push(url) },
    replace: (url) => { void router.replace(url) },
    back: () => router.back(),
    emit: (type, payload) => onEvent(type, payload),
  })

  /** semantic checkpoints only — this is the whole write surface into Nuxt state */
  const onEvent = (type: C2Event['type'], payload: Record<string, unknown>) => {
    if (type === 'projectOpened') {
      const index = Number(payload.index)
      const id = PROJECT_IDS[index % PROJECT_IDS.length]
      if (id) openProject(id, projects[index % projects.length]?.ink)
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
    // the runtime is told its language; it never guesses one from the URL
    ;(globalThis as Record<string, unknown>).__c2Locale = locale.value
    modulePromise ??= import('../../engine/c2/main.js').then(async (mod: unknown) => {
      const m = mod as C2Module
      m.configure(options())
      await m.mountC2()
      // the shell keeps the screen until there is something to hand it over to: on a slow connection the
      // runtime's chunk, its fonts and its textures arrive long after Vue has mounted, and retiring the
      // shell at mount left the visitor with an empty page for as long as that took (measured: 3.4 s on
      // Slow 4G, 12 s on a severe link). Nothing is hidden before something has replaced it.
      await firstFrameOnScreen()
      presented = true
      document.documentElement.dataset.c2 = 'on'
      return m
    })
    return modulePromise
  }

  /** the shell owns the URL and the language: every change is handed over, the runtime keeps running */
  const syncRoute = async () => {
    const m = await modulePromise
    if (!m) return
    m.configure(options())
    m.setLocale(locale.value)
    setLanguage(locale.value)
    m.routeChanged()
  }

  const setActive = (on: boolean) => {
    if (!import.meta.client) return
    // returning to a locale route hands the screen back at once — the runtime is already on it
    if (on) { if (presented) document.documentElement.dataset.c2 = 'on' }
    else delete document.documentElement.dataset.c2
  }

  return { start, syncRoute, setActive, locale }
}
