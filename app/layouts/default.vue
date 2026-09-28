<script setup lang="ts">
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
const inLab = computed(() => /^\/(tr|en)\/(lab(\/|$)|contact\/?$)/.test(route.path))
</script>

<template>
  <div class="u-shell">
    <a class="u-skip" href="#main">{{ copy.nav.skip }}</a>
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
