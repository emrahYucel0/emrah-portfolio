<script setup lang="ts">
import type { NuxtError } from '#app'
import { HTML_LANG, messages, profile } from '~~/shared/content'

defineProps<{ error: NuxtError }>()
// the language of a missing URL cannot be trusted, so the page answers in both
const en = messages('en')
const tr = messages('tr')
useHead({ htmlAttrs: { lang: HTML_LANG.en }, title: `${en.notFound.title} — ${profile.name}`, meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <main class="err">
    <h1>{{ error?.statusCode ?? 404 }}</h1>
    <p :lang="HTML_LANG.en">{{ en.notFound.message }}</p>
    <p :lang="HTML_LANG.tr">{{ tr.notFound.message }}</p>
    <ul class="err-links">
      <li><NuxtLink to="/tr" :hreflang="HTML_LANG.tr" :lang="HTML_LANG.tr">{{ en.localeSwitch.to }}</NuxtLink></li>
      <li><NuxtLink to="/en" :hreflang="HTML_LANG.en" :lang="HTML_LANG.en">{{ tr.localeSwitch.to }}</NuxtLink></li>
    </ul>
  </main>
</template>

<style scoped>
.err {
  min-height: 100svh;
  display: grid;
  align-content: center;
  gap: var(--space-s);
  padding: var(--space-l) var(--gutter);
}
h1 { font-size: var(--step-2); font-weight: 600; }
.err-links { display: flex; gap: var(--space-m); }
.err-links a { display: inline-block; padding-block: var(--space-xs); }
</style>
