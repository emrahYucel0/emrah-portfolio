<script setup lang="ts">
import { profile, projects, studies } from '~~/shared/content'

definePageMeta({
  // unknown languages 404 instead of rendering an English page at a Turkish URL
  validate: (route) => ['tr', 'en'].includes(String(route.params.locale)),
})

const { copy, path } = useLocale()
useLocaleSeo('home')
</script>

<template>
  <div class="u-wrap page">
    <section class="intro" aria-labelledby="name">
      <!-- the same heading the runtime gives assistive technology: who, the two roles, where -->
      <h1 id="name" class="name">{{ profile.name }}<span class="u-sr"> — <span lang="en">{{ copy.roles.creative }}</span> {{ copy.roles.and }} <span lang="en">{{ copy.roles.fullStack }}</span>, {{ copy.identity.location }}</span></h1>
      <p class="roles" lang="en">{{ copy.roles.creative }} / {{ copy.roles.fullStack }}</p>
      <p class="u-measure lead">{{ copy.home.intro }}</p>
      <p><NuxtLink class="more" :to="path('/about')">{{ copy.home.more }} →</NuxtLink></p>
    </section>

    <section id="work" class="block" aria-labelledby="work-heading">
      <h2 id="work-heading" class="u-label">{{ copy.work.heading }}</h2>
      <p class="u-measure">{{ copy.work.intro }}</p>
      <ul class="works">
        <li v-for="project in projects" :key="project.id" class="work">
          <h3 class="work-name">{{ project.name }}</h3>
          <p v-if="copy.work.projects[project.id].client" class="work-client">{{ copy.work.projects[project.id].client }}</p>
          <p class="work-line">{{ copy.work.projects[project.id].strength }}</p>
          <ul class="work-facts">
            <li v-for="fact in copy.work.projects[project.id].facts" :key="fact">{{ fact }}</li>
          </ul>
          <p>
            <a class="work-link" :href="project.url" target="_blank" rel="noopener noreferrer">
              {{ copy.work.visit }} <span lang="en">{{ project.host }}</span> ↗
            </a>
          </p>
        </li>
      </ul>
    </section>

    <section id="lab" class="block" aria-labelledby="lab-heading">
      <h2 id="lab-heading" class="u-label">{{ copy.lab.title }}</h2>
      <p class="u-measure">{{ copy.lab.line }}</p>
      <ul class="studies">
        <li v-for="(id, i) in studies" :key="id">
          <span class="study-id">{{ String(i + 1).padStart(2, '0') }}</span>
          <NuxtLink :to="path(`/lab/${id}`)">{{ copy.lab.studies[id].name }}</NuxtLink> — {{ copy.lab.studies[id].note }}
        </li>
      </ul>
      <p><NuxtLink class="more" :to="path('/lab')">{{ copy.lab.open }} →</NuxtLink></p>
    </section>

    <p class="u-sr">{{ profile.email }} · {{ profile.phone }}</p>
  </div>
</template>

<style scoped>
.page { display: grid; gap: var(--space-xl); padding-block-start: var(--space-l); }
.intro { display: grid; gap: var(--space-s); }
.name { font-size: var(--step-3); line-height: 1.02; letter-spacing: -0.03em; font-weight: 600; }
.roles { font-size: var(--step-1); color: var(--ink-muted); }
.lead { font-size: var(--step-1); }
.more { display: inline-block; padding-block: var(--space-2xs); }
.block { display: grid; gap: var(--space-m); }
.works { display: grid; gap: var(--space-l); }
.work { display: grid; gap: var(--space-2xs); border-block-start: 1px solid var(--rule); padding-block-start: var(--space-s); }
.work-name { font-size: var(--step-2); letter-spacing: -0.02em; font-weight: 600; }
.work-client { color: var(--ink-muted); }
.work-line { font-size: var(--step-1); }
.work-facts { color: var(--ink-muted); font-size: var(--step--1); }
.work-facts { display: grid; gap: 2px; margin-block-start: var(--space-2xs); }
.work-link {
  display: inline-block;
  padding-block: var(--space-2xs);
  font: 400 var(--step--1) / 1 var(--mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
}
.work-link:hover { text-decoration: underline; }
.studies { display: grid; gap: var(--space-xs); }
.studies li { display: flex; gap: var(--space-s); align-items: baseline; }
.study-id { font: 400 var(--step--1) / 1 var(--mono); color: var(--ink-muted); }

/* one authored change of behaviour, not a scaled-down desktop: from tablet up the works sit in a row */
@media (min-width: 48rem) {
  .works { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-m); }
}
</style>
