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
  warmC2: (pace?: () => Promise<void>) => Promise<void>
  setLocale: (locale: Locale) => boolean
}

let modulePromise: Promise<C2Module> | null = null
/** the warm-up: the module fetched and prepared (warmC2) while another route has the screen — see warm() below */
let warmPromise: Promise<unknown> | null = null
const loadModule = () => import('../../engine/c2/main.js') as unknown as Promise<C2Module>
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

  // what the runtime must find before its module is evaluated: its host DOM, and that it is hosted, where /public is
  // served and which language it speaks
  const host = () => {
    createHostDom()
    // the module boots itself when loaded standalone; hosted, the shell decides when
    ;(globalThis as Record<string, unknown>).__c2Hosted = true
    // Nuxt serves /public at app.baseURL; Vite's BASE_URL points at the build-asset directory instead
    ;(globalThis as Record<string, unknown>).__c2Base = useRuntimeConfig().app.baseURL
    // the runtime is told its language; it never guesses one from the URL
    ;(globalThis as Record<string, unknown>).__c2Locale = locale.value
  }

  /**
   * THE WARM-UP. The Lab and the Contact finale are routes without the runtime, so a visitor who landed on one of them
   * and then goes up to Work met the runtime's COLD boot there (measured from /tr/contact: 0.6–2.0 s, 3.5–4.3 s with
   * the CPU slowed 4×). Once such a page has settled, in idle time, the runtime is fetched and PREPARED — fonts,
   * surface, textures, DOM, states — but not begun: nothing plays, nothing is shown (the host DOM is hidden off its
   * routes) and its loop does not run. Going to the index then only has to begin. Skipped when the visitor asked to
   * save data.
   */
  const warm = () => {
    if (!import.meta.client || modulePromise || warmPromise) return
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (conn?.saveData) return
    host()
    // Each heavy step (the module's evaluation, the surface, the DOM, the states) waits until the visitor has been
    // still for a moment — no scroll, wheel, pointer, touch or key for 0.7 s — and then for the browser's idle time
    // where there is one (not in Safari). Measured with the CPU slowed 4×: stepping on idle alone still put 50–220 ms
    // tasks beside a drawing being scrolled; stepping on stillness keeps them where nobody is moving.
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    let lastInput = performance.now()
    const moved = () => { lastInput = performance.now() }
    const INPUT = ['scroll', 'wheel', 'pointermove', 'pointerdown', 'touchstart', 'touchmove', 'keydown'] as const
    for (const t of INPUT) addEventListener(t, moved, { passive: true, capture: true })
    const still = () => new Promise<void>((r) => {
      const check = () => {
        const quiet = performance.now() - lastInput
        if (quiet < 700) { setTimeout(check, 720 - quiet); return }
        if (ric) ric(() => r(), { timeout: 1000 }); else r()
      }
      check()
    })
    warmPromise = still()
      // the index route's own page chunk too: the strip's Work is a plain link, so nothing else would fetch it
      .then(() => { void preloadRouteComponents(path('/')).catch(() => {}) })
      .then(() => loadModule())
      .then(async (m) => { m.configure(options()); await m.warmC2(still) })
      .catch(() => { warmPromise = null })
      .finally(() => { for (const t of INPUT) removeEventListener(t, moved, { capture: true }) })
  }

  const start = async () => {
    if (!import.meta.client) return
    host()
    // A remount — the visitor coming back from the Lab — is not a boot: the runtime never stopped and its visit is
    // intact. It is only told where it now is, through the same handover every route change uses. The mount
    // watcher does not fire for the route the component is created on, so this is where that is said.
    if (modulePromise) { await syncRoute(); return modulePromise }
    modulePromise = loadModule().then(async (m) => {
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

  return { start, warm, syncRoute, setActive, locale }
}
