<script setup lang="ts">
const { copy } = useLocale()
useReducedMotion()
</script>

<template>
  <div class="u-shell">
    <a class="u-skip" href="#main">{{ copy.nav.skip }}</a>
    <SiteHeader />
    <main id="main" tabindex="-1">
      <slot />
    </main>
    <SiteFooter />
    <!-- the frozen C2 runtime; renders nothing here, owns its own DOM on document.body -->
    <C2Surface />
  </div>
</template>

<style scoped>
main:focus { outline: none; }
</style>
