<script setup lang="ts">
import { HTML_LANG, profile } from '~~/shared/content'
import type { LabExit } from '~/composables/useLabHandoff'

/**
 * THE LAB'S CHROME. On the Lab routes the C2 runtime is not mounted — that is what gives the studies the document's
 * own scroll — so the strip the runtime draws along the top edge is not there either. This is that strip, in DOM:
 * the same one row at the same height, the same mono capitals, the same identity left and the same four places
 * right, in the same order. The visitor should not be able to tell that the chrome changed hands; only that the
 * Lab is the place they are in.
 *
 * Its four places are the site's, not the Lab's. Work and Contact are destinations on the runtime's index, so they
 * are a navigation back to the locale route carrying which place was asked for (useLabHandoff); About is already a
 * route of its own; Lab is the bench. That is the whole navigation system on these routes — the studies' own return
 * control is stood down in lab.css so there is never a second control for the same place.
 */
const { copy, path, other, switchPath } = useLocale()
const { setLanguage } = useVisit()
const { leave } = useLabHandoff()
const route = useRoute()

const home = computed(() => path('/'))
const onBench = computed(() => /\/lab\/?$/.test(route.path))

// a plain click is the site's navigation; a modified one is the browser's, and is left alone
const go = (e: MouseEvent, to: LabExit) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  void leave(to)
}
</script>

<template>
  <header class="lab-strip" data-strip>
    <a class="id" :href="home" @click="go($event, 'name')">{{ profile.name }}</a>

    <nav :aria-label="copy.nav.label">
      <ul>
        <li><a :href="home" @click="go($event, 'work')">{{ copy.nav.work }}</a></li>
        <li><NuxtLink :to="path('/about')">{{ copy.nav.about }}</NuxtLink></li>
        <!-- On the bench this is where the visitor is. Inside a study the way back to the bench is the study's
             own control, in the study's own field, so the strip does not offer a second one competing with it. -->
        <li v-if="onBench">
          <NuxtLink :to="path('/lab')" aria-current="page">{{ copy.nav.lab }}</NuxtLink>
        </li>
        <li><a :href="home" @click="go($event, 'rest')">{{ copy.nav.contact }}</a></li>
        <li>
          <!-- two quiet letters, as on the runtime's own strip: a language control, not a word of English -->
          <!-- a language change is a step the visitor took, so Back undoes it — as it now does on the C2 routes -->
          <NuxtLink
            class="lang" :to="switchPath"
            :hreflang="HTML_LANG[other]" :lang="HTML_LANG[other]"
            :aria-label="`${copy.localeSwitch.label}: ${copy.localeSwitch.to}`"
            :title="`${copy.localeSwitch.label}: ${copy.localeSwitch.to}`"
            @click="setLanguage(other)"
          >{{ copy.localeSwitch.short }}</NuxtLink>
        </li>
      </ul>
    </nav>
  </header>
</template>

<style>
/* unscoped: the strip is the Lab routes' chrome, and lab.css owns the variables it is measured in */
.lab-strip {
  position: fixed; z-index: 20; left: 0; right: 0; top: 0;
  height: var(--strip); padding: env(safe-area-inset-top, 0px) var(--pad) 0;
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  background: var(--ground); border-bottom: 1px solid var(--rule);
  font: 400 10.5px / 1 var(--mono); letter-spacing: 0.04em; text-transform: uppercase;
  white-space: nowrap; overflow: hidden;
}
.lab-strip a { color: var(--ink-muted); text-decoration: none; padding-block: 10px; }
.lab-strip a:hover, .lab-strip a:focus-visible { color: var(--ink); text-decoration: underline; }
.lab-strip .id { color: var(--ink); }
.lab-strip nav ul { display: flex; align-items: center; gap: 26px; list-style: none; margin: 0; padding: 0; }
.lab-strip nav a[aria-current='page'] { color: var(--ink); }
/* the language control keeps a 24px target though its text is two letters (WCAG 2.2) */
.lab-strip .lang { padding-inline: 10px; margin-inline: -10px; }
@media (max-width: 900px) { .lab-strip nav ul { gap: 16px; } }
@media (max-width: 560px) { .lab-strip { gap: 10px; } .lab-strip nav ul { gap: 11px; } }
/* the narrowest phone still in service: the Turkish places are longer, and the strip clipped its last word */
@media (max-width: 360px) {
  .lab-strip { gap: 6px; letter-spacing: 0.02em; }
  .lab-strip nav ul { gap: 8px; }
  .lab-strip .lang { padding-inline: 6px; margin-inline: -6px; }
}
</style>
