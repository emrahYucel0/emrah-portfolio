<script setup lang="ts">
import { projects } from '~~/shared/content'

/*
 * A WORK'S OWN ADDRESS (R8, user decision 2026-10-02): /{locale}/work/{id}. With script the runtime is on this route
 * and opens the work itself, settled on its first frame (engine/c2/main.js, openWorkAt); this page is what the
 * address says without it — to a crawler, a share preview, a reader with script off — the same facts the work's
 * frames carry, in the same words.
 */
definePageMeta({
  validate: (route) => ['tr', 'en'].includes(String(route.params.locale)) && projects.some((p) => p.id === route.params.id),
})

const route = useRoute()
const { copy, path } = useLocale()
const i = computed(() => projects.findIndex((p) => p.id === route.params.id))
const project = computed(() => projects[i.value]!)
const pc = computed(() => copy.value.work.projects[project.value.id])
const next = computed(() => projects[(i.value + 1) % projects.length]!)
const psiRows = computed(() => (['mobile', 'desktop'] as const).map((k) => ({ label: copy.value.psi[k], scores: project.value.psi[k] })))

useLocaleSeo('home', {
  title: `${project.value.name} — ${copy.value.work.heading} — Emrah Yücel`,
  description: `${pc.value.strength}. ${pc.value.line}`,
})
</script>

<template>
  <div class="u-wrap page">
    <article class="work">
      <p class="u-label"><NuxtLink :to="`${path('/')}#work`">{{ copy.work.heading }}</NuxtLink></p>
      <h1 class="heading">{{ project.name }}</h1>
      <p v-if="pc.client" class="client">{{ pc.client }}</p>
      <p class="strength">{{ pc.strength }}</p>
      <p class="u-measure lead">{{ pc.line }}</p>
      <ul class="facts">
        <li v-for="fact in pc.facts" :key="fact">{{ fact }}</li>
      </ul>
      <p class="u-measure">{{ pc.role }}</p>
      <p class="stack" lang="en">{{ pc.stack ?? project.stack }}</p>
      <dl class="psi">
        <dt>{{ copy.psi.head }}</dt>
        <dd v-for="row in psiRows" :key="row.label">
          {{ row.label }}:
          <template v-for="(score, s) in row.scores" :key="s">
            <span v-if="score != null" class="score">{{ copy.psi.labels[s] }} {{ score }}</span>
          </template>
        </dd>
      </dl>
      <p>
        <a class="visit" :href="project.url" target="_blank" rel="noopener noreferrer">
          {{ copy.work.visit }} <span lang="en">{{ project.host }}</span> ↗<span class="u-sr"> {{ copy.a11y.newTab }}</span>
        </a>
      </p>
      <p><NuxtLink class="act" :to="path('/contact')">{{ copy.contact.cta }} →</NuxtLink></p>
      <nav class="wnav" :aria-label="copy.work.projectNav">
        <NuxtLink class="act" :to="`${path('/')}#work`">← {{ copy.work.allWork }}</NuxtLink>
        <NuxtLink class="act" :to="path(`/work/${next.id}`)">{{ copy.work.next }}: {{ next.name }} →</NuxtLink>
      </nav>
    </article>
  </div>
</template>

<style scoped>
.page { padding-block-start: var(--space-l); }
.work { display: grid; gap: var(--space-m); }
.heading { font-size: var(--step-3); line-height: 1.05; letter-spacing: -0.03em; font-weight: 600; }
.client { font-size: var(--step-0); color: var(--ink-muted); }
.strength { font: 400 var(--step--1) / 1.4 var(--mono); letter-spacing: 0.04em; text-transform: uppercase; }
.lead { font-size: var(--step-1); }
.facts { display: grid; gap: var(--space-2xs); padding-inline-start: 1.1em; }
.stack, .psi { font: 400 var(--step--1) / 1.5 var(--mono); letter-spacing: 0.03em; }
.psi dd { margin: 0; }
.psi .score + .score::before { content: ' · '; }
.visit, .act { display: inline-block; padding-block: var(--space-2xs); }
.act { color: var(--act); }
.wnav { display: flex; flex-wrap: wrap; gap: var(--space-xs) var(--space-l); }
</style>
