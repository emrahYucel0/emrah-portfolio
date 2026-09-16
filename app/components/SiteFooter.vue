<script setup lang="ts">
import { profile } from '~~/shared/content'

const { copy } = useLocale()
</script>

<template>
  <footer id="contact" class="foot">
    <div class="u-wrap foot-inner">
      <h2 class="u-label">{{ copy.contact.heading }}</h2>

      <address class="lines">
        <p class="name">{{ profile.name }}</p>
        <p class="roles" lang="en">{{ copy.roles.creative }} / {{ copy.roles.fullStack }}</p>
        <p>
          <a :href="`mailto:${profile.email}`">{{ profile.email }}</a>
        </p>
        <p>
          <a :href="`tel:${profile.tel}`">{{ profile.phone }}</a>
        </p>
      </address>

      <ul class="links">
        <li v-for="link in profile.links" :key="link.id">
          <a :href="link.href" target="_blank" rel="noopener noreferrer" lang="en">{{ link.label }} ↗</a>
        </li>
      </ul>

      <p class="meta">{{ copy.identity.location }} · {{ copy.identity.status }}</p>
    </div>
  </footer>
</template>

<style scoped>
.foot {
  border-block-start: 1px solid var(--rule);
  padding-block: var(--space-l);
  margin-block-start: var(--space-xl);
}
.foot-inner { display: grid; gap: var(--space-s); }
.lines { font-style: normal; display: grid; gap: var(--space-2xs); }
.name { font-weight: 600; }
.roles { color: var(--ink-muted); }
.links { display: flex; flex-wrap: wrap; gap: var(--space-m); }
.links a, .lines a { display: inline-block; padding-block: var(--space-2xs); }
.links a {
  font: 400 var(--step--1) / 1 var(--mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
}
.links a:hover { text-decoration: underline; }
.meta { color: var(--ink-muted); font-size: var(--step--1); }
</style>
