/**
 * The frozen runtime must start when the document does, not when Vue has finished hydrating.
 * The prototype begins fetching and booting C2 as its first script; this plugin gives the transplant the
 * same head start — the import begins in parallel with hydration, and the runtime mounts onto its own DOM
 * as soon as it is ready. Without it the opening began about a second late (measured), which is a visible
 * difference in the very first thing a visitor sees.
 *
 * It starts only on the locale routes: the x-default entry at / is a language chooser, not the surface.
 */
export default defineNuxtPlugin({
  name: 'c2-runtime',
  parallel: true,
  setup() {
    if (!import.meta.client) return
    const path = useRouter().currentRoute.value.path
    if (!/^\/(tr|en)(\/|$)/.test(path)) return
    const { start } = useC2Engine()
    void start()
  },
})
