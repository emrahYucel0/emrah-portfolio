<script setup lang="ts">
import { profile, termHtml, termLang, termText } from '~~/shared/content'

definePageMeta({
  validate: (route) => ['tr', 'en'].includes(String(route.params.locale)),
})

const { copy, path } = useLocale()
const { markAbout } = useVisit()

useLocaleSeo('about')
onMounted(() => markAbout({ visited: true }))
</script>

<template>
  <div class="u-wrap page">
    <article class="about">
      <h1 class="heading">{{ copy.about.heading }}</h1>

      <p class="u-measure lead">{{ copy.about.intro }}</p>
      <p class="u-measure">{{ copy.about.background }}</p>
      <p class="u-measure">{{ copy.about.transition }}</p>
      <p class="u-measure">{{ copy.about.current }}</p>

      <section aria-labelledby="capabilities">
        <h2 id="capabilities" class="u-label">{{ copy.about.capabilitiesHeading }}</h2>
        <ul class="caps">
          <li v-for="capability in copy.about.capabilities" :key="termText(capability)" :lang="termLang(capability)" v-html="termHtml(capability)" />
        </ul>
      </section>

      <p class="status">{{ copy.about.status }}</p>

      <address class="contact">
        <a :href="`mailto:${profile.email}`">{{ profile.email }}</a>
        <a :href="`tel:${profile.tel}`">{{ profile.phone }}</a>
      </address>

      <p><NuxtLink class="back" :to="path('/')">← {{ copy.about.back }}</NuxtLink></p>
    </article>
  </div>
</template>

<style scoped>
.page { padding-block-start: var(--space-l); }
.about { display: grid; gap: var(--space-m); }
.heading { font-size: var(--step-3); line-height: 1.05; letter-spacing: -0.03em; font-weight: 600; }
.lead { font-size: var(--step-1); }
.caps { display: grid; gap: var(--space-2xs); margin-block-start: var(--space-xs); }
.caps li { font: 400 var(--step--1) / 1.4 var(--mono); letter-spacing: 0.04em; text-transform: uppercase; }
.status { font-size: var(--step-1); }
.contact { font-style: normal; display: grid; gap: var(--space-2xs); }
.contact a, .back { display: inline-block; padding-block: var(--space-2xs); }

@media (min-width: 48rem) {
  .caps { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2xs) var(--space-m); }
}
</style>
