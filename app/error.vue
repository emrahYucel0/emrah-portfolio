<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()
useHead({ htmlAttrs: { lang: 'en' }, title: 'Not found — Emrah Yücel' })
</script>

<template>
  <main class="err">
    <h1>{{ error?.statusCode ?? 404 }}</h1>
    <p lang="en">This page does not exist.</p>
    <p lang="tr-TR">Bu sayfa bulunamadı.</p>
    <ul class="err-links">
      <li><NuxtLink to="/tr" hreflang="tr-TR" lang="tr-TR">Türkçe</NuxtLink></li>
      <li><NuxtLink to="/en" hreflang="en" lang="en">English</NuxtLink></li>
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
