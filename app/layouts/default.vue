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
  </div>
</template>

<style scoped>
main:focus { outline: none; }
</style>
