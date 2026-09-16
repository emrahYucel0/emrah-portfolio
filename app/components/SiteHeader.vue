<script setup lang="ts">
import { profile } from '~~/shared/content'

const { copy, path } = useLocale()
</script>

<template>
  <header class="head">
    <div class="u-wrap head-inner">
      <NuxtLink class="id" :to="path('/')">
        <span class="id-name">{{ profile.name }}</span>
        <span class="u-sr">— {{ copy.roles.creative }} / {{ copy.roles.fullStack }}</span>
      </NuxtLink>

      <nav class="nav" :aria-label="copy.nav.label">
        <ul class="nav-list">
          <li><NuxtLink :to="`${path('/')}#work`">{{ copy.nav.work }}</NuxtLink></li>
          <li><NuxtLink :to="path('/about')">{{ copy.nav.about }}</NuxtLink></li>
          <li><NuxtLink :to="`${path('/')}#lab`">{{ copy.nav.lab }}</NuxtLink></li>
          <li><NuxtLink :to="`${path('/')}#contact`">{{ copy.nav.contact }}</NuxtLink></li>
          <li><LocaleSwitcher /></li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.head { border-block-end: 1px solid var(--rule); }
.head-inner {
  min-height: var(--strip);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs) var(--space-m);
  padding-block: var(--space-xs);
}
.id { text-decoration: none; }
.id-name {
  font: 400 var(--step--1) / 1 var(--mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.nav-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-s) var(--space-m);
}
.nav-list a {
  font: 400 var(--step--1) / 1 var(--mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  display: inline-block;
  padding-block: var(--space-2xs);
}
.nav-list a:hover, .nav-list a.router-link-active { text-decoration: underline; }
</style>
