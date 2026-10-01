<script setup lang="ts">
import { profile } from '~~/shared/content'

const { copy, path } = useLocale()
const seam = useContactSeam()
// the site's one Contact is the finale's route; asked for by name, it opens settled
const contactTo = computed(() => path('/contact'))
const toContact = (e: MouseEvent) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  void seam.toContact('end')
}
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
          <!-- plain anchors: a place on this page is not the page itself, and a RouterLink marked both aria-current -->
          <li><a :href="`${path('/')}#work`">{{ copy.nav.work }}</a></li>
          <li><NuxtLink :to="path('/about')">{{ copy.nav.about }}</NuxtLink></li>
          <li><a :href="`${path('/')}#lab`">{{ copy.nav.lab }}</a></li>
          <li>
            <!-- a plain link: the router is asked with the arrival on the history entry (RouterLink would navigate first) -->
            <a :href="contactTo" @click="toContact">{{ copy.nav.contact }}</a>
          </li>
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
