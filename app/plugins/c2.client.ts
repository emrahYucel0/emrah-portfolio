/**
 * The frozen runtime must start when the document does, not when Vue has finished hydrating.
 * The prototype begins fetching and booting C2 as its first script; this plugin gives the transplant the
 * same head start — the import begins in parallel with hydration, and the runtime mounts onto its own DOM
 * as soon as it is ready. Without it the opening began about a second late (measured), which is a visible
 * difference in the very first thing a visitor sees.
 *
 * It starts only on the routes the runtime owns: the x-default entry at / is a language chooser, not the surface,
 * and the document routes — the Lab and the Contact finale — are the document's own (layouts/default.vue does not mount the runtime there). A head start
 * on a Lab route would fetch the engine, its fonts and its textures, and take a WebGL context, for a surface that
 * is never shown and never asked anything — and the visitor is reading a study while it happens.
 */
import { isDocumentRoute } from '~~/shared/site'

export default defineNuxtPlugin({
  name: 'c2-runtime',
  parallel: true,
  setup() {
    if (!import.meta.client) return
    const path = useRouter().currentRoute.value.path
    if (!/^\/(tr|en)(\/|$)/.test(path) || isDocumentRoute(path)) return
    /*
     * #contact is the site's old address for Contact (the semantic footer, still the no-script Contact under the
     * runtime). With script, Contact is the finale's route: the visitor asked for it by name, so it opens settled —
     * and the runtime, which would only be taken off the screen again, is given no head start.
     */
    const m = /^\/(tr|en)\/?$/.exec(path)
    if (m && location.hash === '#contact') {
      const router = useRouter()
      // once the app has hydrated: a navigation asked for during hydration is dropped by the initial one
      onNuxtReady(() => { void router.replace({ path: `/${m[1]}/contact`, state: { [FINALE_ARRIVE]: 'end' } }) })
      return
    }
    const { start } = useC2Engine()
    void start()
  },
})
