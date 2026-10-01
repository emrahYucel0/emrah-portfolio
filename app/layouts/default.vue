<script setup lang="ts">
import { isDocumentRoute } from '~~/shared/site'
import bigShoulders from '@fontsource-variable/big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2?url'
import geist from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url'
const { copy } = useLocale()
useReducedMotion()

/**
 * ROUTE-LOCAL C2 ESCAPE. The Lab's studies read the document's own scroll position, and the C2 runtime owns
 * vertical travel everywhere else — so on the Lab routes the runtime is not mounted at all. Unmounting hands the
 * screen back to the shell (`data-c2` is removed), which restores normal scrolling through the rules base.css
 * already carries. Every other route is untouched: the runtime keeps running, and keeps the visit, across them.
 *
 * The Lab is still the fifth destination, though, not a site of its own: it wears the runtime's strip (LabChrome,
 * which continues it in DOM) instead of the semantic header, and it does not carry the semantic Contact section
 * under it — there is one Contact, and it is the runtime's. The Lab landing leaves the site through the same
 * vertical grammar as every other destination (useLabSpine); the studies keep the document's scroll.
 */
const route = useRoute()
// the Contact finale (/[locale]/contact) is the same kind of place: a document route that reads its own scroll,
// without the runtime, in the runtime's strip. It carries the Contact itself, so no footer Contact under it.
const inLab = computed(() => isDocumentRoute(route.path))

/*
 * THE TWO FACES THE FIRST FRAME WAITS FOR (AUDIT-01, round 2). The runtime's chunk brings its stylesheet, and the
 * stylesheet names its fonts, so on a cold visit the fonts were not even asked for until the runtime ran — on a slow
 * link, seven seconds in. Preloaded from the head they arrive alongside the scripts. Only on the runtime's routes,
 * and only the Latin files the name and the first lines are set in (the same files the stylesheets name, so the
 * preload is used, not fetched twice).
 */
const firstFaces = [bigShoulders, geist]
useHead(() => ({
  link: inLab.value ? [] : firstFaces.map((href) => ({ rel: 'preload', as: 'font', type: 'font/woff2', href, crossorigin: 'anonymous' })),
}))

// on those routes, once the page has settled, the runtime is warmed in idle time (useC2Engine.warm): going up to Work
// from the Lab or the finale is then a handover, not a cold boot. requestIdleCallback where it exists (not in Safari);
// elsewhere after the load event and a pause. It never runs before the page's own first seconds.
const { warm } = useC2Engine()
const warmLater = () => {
  const go = () => { if (inLab.value) warm() }
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  const later = () => setTimeout(() => (idle ? idle(go, { timeout: 4000 }) : go()), 2500)
  if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true })
}
onMounted(() => { if (inLab.value) warmLater() })
watch(inLab, (on) => { if (on) warmLater() })
</script>

<template>
  <div class="u-shell">
    <!-- it goes to the content, and says so (AUDIT-01: it said "plain navigation"; the runtime's own skip link is the one that goes there) -->
    <a class="u-skip" href="#main">{{ copy.nav.skipContent }}</a>
    <SiteHeader v-if="!inLab" />
    <LazyLabChrome v-if="inLab" />
    <main id="main" tabindex="-1">
      <slot />
    </main>
    <SiteFooter v-if="!inLab" />
    <!-- what the document paints while the runtime is still arriving; the runtime's own DOM replaces it -->
    <C2Plate v-if="!inLab" />
    <!-- the frozen C2 runtime; renders nothing here, owns its own DOM on document.body -->
    <C2Surface v-if="!inLab" />
  </div>
</template>

<style scoped>
main:focus { outline: none; }
</style>
