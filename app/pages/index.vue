<script setup lang="ts">
import { LOCALES, messages } from '~/locales'

// x-default entry. It resolves a language; it is not a third version of the portfolio.
definePageMeta({ layout: false })

const site = useRuntimeConfig().public.siteUrl
const copy = messages.en

useHead({
  htmlAttrs: { lang: 'en' },
  link: [
    { rel: 'canonical', href: `${site}/` },
    { rel: 'alternate', hreflang: 'tr-TR', href: `${site}/tr` },
    { rel: 'alternate', hreflang: 'en', href: `${site}/en` },
    { rel: 'alternate', hreflang: 'x-default', href: `${site}/` },
  ],
})
useSeoMeta({
  title: copy.entry.title,
  description: copy.entry.description,
  ogTitle: copy.entry.title,
  ogDescription: copy.entry.description,
  ogUrl: `${site}/`,
  ogType: 'website',
})

// Resolution happens after hydration, so the prerendered HTML stays a real, crawlable x-default page
// with both languages as links. Without JavaScript the visitor simply chooses.
onMounted(() => {
  const stored = sessionStorage.getItem('ey.locale')
  const fromBrowser = navigator.languages?.some((l) => l.toLowerCase().startsWith('tr')) ? 'tr' : 'en'
  const preferred = stored && (LOCALES as readonly string[]).includes(stored) ? stored : fromBrowser
  navigateTo(`/${preferred}`, { replace: true })
})
</script>

<template>
  <main class="entry">
    <h1 class="entry-name">Emrah Yücel</h1>
    <p class="entry-roles">Creative Developer / Full-Stack Developer</p>

    <nav aria-label="Language">
      <p id="choose" class="u-label">{{ messages.en.entry.choose }} · {{ messages.tr.entry.choose }}</p>
      <ul class="entry-langs" aria-labelledby="choose">
        <li><NuxtLink to="/tr" hreflang="tr-TR" lang="tr-TR">Türkçe</NuxtLink></li>
        <li><NuxtLink to="/en" hreflang="en" lang="en">English</NuxtLink></li>
      </ul>
    </nav>
  </main>
</template>

<style scoped>
.entry {
  min-height: 100svh;
  display: grid;
  align-content: center;
  gap: var(--space-s);
  padding: var(--space-l) var(--gutter);
}
.entry-name { font-size: var(--step-2); letter-spacing: -0.02em; font-weight: 600; }
.entry-roles { color: var(--ink-muted); }
.entry-langs { display: flex; gap: var(--space-m); margin-block-start: var(--space-xs); }
.entry-langs a {
  display: inline-block;
  padding-block: var(--space-xs);
  font: 400 var(--step-0) / 1 var(--mono);
  letter-spacing: 0.04em;
}
</style>
