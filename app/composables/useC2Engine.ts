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
 * Whether the runtime currently owns the screen. start() is asynchronous — the module, its fonts and its textures
 * all arrive later — so by the time it is ready the shell may already have handed the screen to a route the
 * runtime does not own (the Lab, which scrolls). Ownership is checked at the moment of handover, never assumed
 * from the moment it was asked for.
 */
let active = false

/**
 * THE HANDOFF OFF THE LAB ROUTE. The Lab bench is the fifth destination but a route of its own, so a site gesture
 * that leaves it is a navigation — and the place it was aimed at has to survive that navigation. It travels on the
 * history entry, where Back and Forward carry it for free, and never in the URL: it is not an address, it is what
 * the visitor just did. It is spent on arrival, so coming back to the entry later shows the visit as it stands.
 */
export const C2_ARRIVE = 'c2Arrive'
const takeArrival = (): string | null => {
  if (!import.meta.client) return null
  const s = (history.state ?? null) as Record<string, unknown> | null
  const d = s?.[C2_ARRIVE]
  if (typeof d !== 'string') return null
  try { history.replaceState({ ...s, [C2_ARRIVE]: null }, '') } catch { /* a history the page may not rewrite */ }
  return d
}

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
    labUrl: path('/lab'),
    isAboutPath: () => /\/about\/?$/.test(route.path),
    arrival: takeArrival,
    push: (url) => { void router.push(url) },
    replace: (url) => { void router.replace(url) },
    back: () => router.back(),
    // the site's one Contact is the finale's route; the arrival rides on the history entry, as C2_ARRIVE does
    openContact: (how) => { void router.push({ path: path('/contact'), state: { [FINALE_ARRIVE]: how } }) },
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
    } else if (type === 'scarCommitted') {
      visit.value.scars.push({ x: Number(payload.x), y: Number(payload.y), depth: 1, source: payload.source as 'about' | 'work' | 'lab' })
    }
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

  const start = async () => {
    if (!import.meta.client) return
    createHostDom()
    // the module boots itself when loaded standalone; hosted, the shell decides when
    ;(globalThis as Record<string, unknown>).__c2Hosted = true
    // Nuxt serves /public at app.baseURL; Vite's BASE_URL points at the build-asset directory instead
    ;(globalThis as Record<string, unknown>).__c2Base = useRuntimeConfig().app.baseURL
    // the runtime is told its language; it never guesses one from the URL
    ;(globalThis as Record<string, unknown>).__c2Locale = locale.value
    // A remount — the visitor coming back from the Lab — is not a boot: the runtime never stopped and its visit is
    // intact. It is only told where it now is, through the same handover every route change uses. The mount
    // watcher does not fire for the route the component is created on, so this is where that is said.
    if (modulePromise) { await syncRoute(); return modulePromise }
    modulePromise = import('../../engine/c2/main.js').then(async (mod: unknown) => {
      const m = mod as C2Module
      m.configure(options())
      await m.mountC2()
      // the shell keeps the screen until there is something to hand it over to: on a slow connection the
      // runtime's chunk, its fonts and its textures arrive long after Vue has mounted, and retiring the
      // shell at mount left the visitor with an empty page for as long as that took (measured: 3.4 s on
      // Slow 4G, 12 s on a severe link). Nothing is hidden before something has replaced it.
      await firstFrameOnScreen()
      presented = true
      if (active) document.documentElement.dataset.c2 = 'on'
      return m
    })
    return modulePromise
  }

  const setActive = (on: boolean) => {
    if (!import.meta.client) return
    active = on
    // returning to a locale route hands the screen back at once — the runtime is already on it
    if (on) { if (presented) document.documentElement.dataset.c2 = 'on' }
    else delete document.documentElement.dataset.c2
  }

  return { start, syncRoute, setActive, locale }
}
