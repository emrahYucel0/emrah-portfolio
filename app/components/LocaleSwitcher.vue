<script setup lang="ts">
import { HTML_LANG } from '~~/shared/content'

const { locale, other, copy, switchPath } = useLocale()
const { setLanguage } = useVisit()

// the language is recorded on the visit; nothing else about the visit changes
watchEffect(() => setLanguage(locale.value))
</script>

<template>
  <NuxtLink
    class="switch"
    :to="switchPath"
    replace
    :hreflang="HTML_LANG[other]"
    :lang="HTML_LANG[other]"
    :aria-label="`${copy.localeSwitch.label}: ${copy.localeSwitch.to}`"
    @click="setLanguage(other)"
  >
    {{ copy.localeSwitch.to }}
  </NuxtLink>
</template>

<style scoped>
.switch {
  font: 400 var(--step--1) / 1 var(--mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  padding-block: var(--space-2xs);
}
.switch:hover { text-decoration: underline; }
</style>
