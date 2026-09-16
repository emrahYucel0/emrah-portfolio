<script setup lang="ts">
import { profile } from '~/data/profile'
import { projects } from '~/data/projects'
import { studies } from '~/data/lab'

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
      <h1 id="name" class="name">Emrah Yücel</h1>
      <p class="roles">{{ copy.roles.creative }} / {{ copy.roles.fullStack }}</p>
      <p class="u-measure lead">{{ copy.home.intro }}</p>
      <p><NuxtLink class="more" :to="path('/about')">{{ copy.home.aboutLink }} →</NuxtLink></p>
    </section>

    <section id="work" class="block" aria-labelledby="work-heading">
      <h2 id="work-heading" class="u-label">{{ copy.home.workHeading }}</h2>
      <ul class="works">
        <li v-for="project in projects" :key="project.id" class="work">
          <h3 class="work-name">{{ project.name }}</h3>
          <p class="work-line">{{ copy.work.lines[project.id] }}</p>
          <p class="work-roles">
            <span v-for="(role, i) in project.roles" :key="role">
              <span v-if="i">· </span>{{ copy.work.roleLabels[role] }}
            </span>
          </p>
          <p>
            <a class="work-link" :href="project.url" target="_blank" rel="noopener noreferrer">
              {{ copy.work.visit }} {{ project.host }} ↗
            </a>
          </p>
        </li>
      </ul>
    </section>

    <section id="lab" class="block" aria-labelledby="lab-heading">
      <h2 id="lab-heading" class="u-label">{{ copy.home.labHeading }}</h2>
      <p class="u-measure">{{ copy.home.labLine }}</p>
      <ul class="studies">
        <li v-for="study in studies" :key="study.id">
          <span class="study-id">{{ study.id }}</span>
          {{ copy.lab.studies[study.id] }}
        </li>
      </ul>
    </section>

    <p class="u-sr">{{ profile.email }} · {{ profile.phone.display }}</p>
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
.work-line { font-size: var(--step-1); }
.work-roles { color: var(--ink-muted); font-size: var(--step--1); }
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
