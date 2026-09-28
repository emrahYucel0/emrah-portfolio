<script setup lang="ts">
import { profile } from '~~/shared/content'
/**
 * CONTACT — the site's one Contact (user decision): the plotter finale's own route, /[locale]/contact.
 *
 * Like the Lab it is a document route: the C2 runtime is not mounted here (layouts/default.vue), the page wears the
 * runtime's strip in DOM (LabChrome) and keeps the document's own scroll, which the finale will read (useStudy).
 *
 * F0 — this is the page's meaning, prerendered: every fact of the finale as real DOM, in both languages, with
 * JavaScript or without it. The finale (canvas, pen, soak) is layered on top of exactly this in F1; it never
 * becomes the source of the content.
 */
definePageMeta({
  validate: (route) => ['tr', 'en'].includes(String(route.params.locale)),
})

const { copy } = useLocale()
useLocaleSeo('contact')
useHead({ bodyAttrs: { class: 'lab-route lab-route--contact' } })

const github = profile.links.find((l) => l.id === 'github')
const linkedin = profile.links.find((l) => l.id === 'linkedin')
</script>

<template>
  <div class="contact-page">
    <h1 class="heading">{{ copy.contact.heading }}</h1>
    <address class="facts">
      <p class="fact">
        <span class="lbl">{{ copy.contact.emailLabel }}</span>
        <a :href="`mailto:${profile.email}`">{{ profile.email }}</a>
      </p>
      <p class="fact">
        <span class="lbl">{{ copy.contact.phoneLabel }}</span>
        <a :href="`tel:${profile.tel}`">{{ profile.phone }}</a>
      </p>
      <p v-if="github" class="fact">
        <a :href="github.href" target="_blank" rel="noopener noreferrer"><span lang="en">{{ github.label }}</span> ↗<span class="u-sr"> {{ copy.a11y.newTab }}</span></a>
      </p>
      <p v-if="linkedin" class="fact">
        <a :href="linkedin.href" target="_blank" rel="noopener noreferrer"><span lang="en">{{ linkedin.label }}</span> ↗<span class="u-sr"> {{ copy.a11y.newTab }}</span></a>
      </p>
      <p class="fact">{{ copy.identity.location }}</p>
    </address>
  </div>
</template>

<style scoped>
/* the plain sheet under the strip; F1 lays the finale over it */
.contact-page {
  min-height: 100vh; /* Safari 15.0–15.3 has no svh */
  min-height: 100svh;
  padding: calc(var(--strip) + var(--space-l)) var(--pad) var(--space-l);
  display: grid; align-content: start; gap: var(--space-m);
}
.heading { font-size: var(--step-3); line-height: 1.05; letter-spacing: -0.03em; font-weight: 600; }
.facts { font-style: normal; display: grid; gap: var(--space-xs); }
.fact { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-2xs) var(--space-s); font-size: var(--step-1); }
.fact .lbl { font: 400 var(--step--1) / 1.4 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; min-width: 8ch; }
.fact a { display: inline-block; padding-block: var(--space-2xs); }
</style>
