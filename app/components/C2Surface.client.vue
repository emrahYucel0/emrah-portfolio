<script setup lang="ts">
/**
 * Activator for the frozen C2 runtime. It renders nothing: the runtime's own DOM lives directly on
 * document.body so Vue never patches it, and so a route change cannot destroy the visit.
 */
const route = useRoute()
const { start, syncRoute, setActive } = useC2Engine()

onMounted(() => {
  setActive(true)
  void start()
})

// the shell owns the URL; the runtime is told after every change, including back/forward and locale
watch(() => route.fullPath, () => { void syncRoute() })

// leaving the locale routes (e.g. to the x-default entry) hands the screen back to the semantic shell
onBeforeUnmount(() => setActive(false))
</script>

<template>
  <span class="u-sr">C2 surface active</span>
</template>
