<script setup lang="ts">
import { HTML_LANG, profile } from '~~/shared/content'
import type { LabExit } from '~/composables/useLabHandoff'
import { NuxtLink } from '#components'

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
const seam = useContactSeam()
const route = useRoute()

const home = computed(() => path('/'))
const onBench = computed(() => /\/lab\/?$/.test(route.path))
// inside a study the way back to the bench is the study's own control; everywhere else (the bench, the Contact
// finale) the strip offers the Lab like the runtime's own strip does
const inStudy = computed(() => /\/lab\/[^/]+/.test(route.path))
const onContact = computed(() => /\/contact\/?$/.test(route.path))

// a plain click is the site's navigation; a modified one is the browser's, and is left alone
const go = (e: MouseEvent, to: LabExit) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  void leave(to)
}
// Contact is its own route now (F2): asked for by name, the finale opens settled — and pressed while already there,
// it settles the finale in place. Its href is the page itself, so a modified click or no script still reaches it.
// the language control on the finale keeps the reader's place on the drawing (F3); elsewhere it is a plain link
const toLocale = (e: MouseEvent) => {
  setLanguage(other.value)
  if (!onContact.value || !seam.enabled || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  void seam.toLocale(switchPath.value)
}
const contactHref = computed(() => (seam.enabled ? path('/contact') : home.value))
const toContact = (e: MouseEvent) => {
  if (!seam.enabled) return go(e, 'rest')
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  if (onContact.value) dispatchEvent(new Event('finale:arrive'))
  else void seam.toContact('end')
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
        <li v-if="!inStudy">
          <NuxtLink :to="path('/lab')" :aria-current="onBench ? 'page' : undefined">{{ copy.nav.lab }}</NuxtLink>
        </li>
        <li><a :href="contactHref" :aria-current="onContact ? 'page' : undefined" @click="toContact">{{ copy.nav.contact }}</a></li>
        <li>
          <!-- two quiet letters, as on the runtime's own strip: a language control, not a word of English -->
          <!-- a language change is a step the visitor took, so Back undoes it — as it now does on the C2 routes -->
          <!-- on the finale a plain link: the router is asked with the reader's place on the entry (RouterLink would
               navigate before it could be given) -->
          <component
            :is="onContact && seam.enabled ? 'a' : NuxtLink"
            class="lang" :href="onContact && seam.enabled ? switchPath : undefined" :to="onContact && seam.enabled ? undefined : switchPath"
            :hreflang="HTML_LANG[other]" :lang="HTML_LANG[other]"
            :aria-label="`${copy.localeSwitch.label}: ${copy.localeSwitch.to}`"
            :title="`${copy.localeSwitch.label}: ${copy.localeSwitch.to}`"
            @click="toLocale"
          >{{ copy.localeSwitch.short }}</component>
        </li>
      </ul>
    </nav>
  </header>
</template>

<!--
  THE LAB'S CONTRACT TRAVELS WITH ITS CHROME. It used to be imported as a stylesheet from the two page files,
  which meant it arrived with the route's JavaScript chunk: a component's own <style> is inlined into the
  prerendered HTML, an imported stylesheet is not. Until that chunk landed the Lab painted raw — no --pad, no
  --strip, the strip collapsed and the text unwrapped, for as long as the network took. A <style src> is a
  component style, so the contract is in the HTML with the page that needs it, and the file stays one file.
  This component is rendered on every Lab route (layouts/default.vue), which is exactly where it is needed.
-->
<style src="~/assets/css/lab.css"></style>

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
