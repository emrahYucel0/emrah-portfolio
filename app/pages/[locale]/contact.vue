<script setup lang="ts">
import '~/assets/css/lab-fonts.css'
import { profile } from '~~/shared/content'
import type { Finale, FinaleItem } from '../../../engine/lab/finale/finale'
/**
 * CONTACT — the site's one Contact (user decision): the plotter finale's own route, /[locale]/contact.
 *
 * Like the Lab it is a document route: the C2 runtime is not mounted here (isDocumentRoute), the page wears the
 * runtime's strip in DOM (LabChrome) and keeps the document's own scroll, which the finale reads.
 *
 * The page's meaning is prerendered: every fact of the finale is real DOM, in both languages, with JavaScript or
 * without it (then it reads as a plain list). When script runs, the finale (engine/lab/finale) takes the screen:
 * a pen draws the section and the same cells become the transparent, accessible hit areas over what it drew —
 * the drawing never becomes the source of the content.
 */
definePageMeta({
  validate: (route) => ['tr', 'en'].includes(String(route.params.locale)),
})

const { copy, locale } = useLocale()
useLocaleSeo('contact')
useHead({
  bodyAttrs: { class: 'lab-route lab-route--contact' },
  // ?debug=1 — a diagnostics panel for devices without a web inspector (public/finale-debug.js, loaded only with
  // the flag; a normal visit pays for this one line). Classic and first, so it can report even a bundle that
  // never boots. The build hashes it into the CSP like every inline script.
  script: [{
    key: 'finale-debug',
    tagPosition: 'head',
    innerHTML: "if(/[?&]debug=1/.test(location.search)){var s=document.createElement('script');s.src='/finale-debug.js';s.async=false;document.head.appendChild(s)}",
  }],
})

const github = profile.links.find((l) => l.id === 'github')!
const linkedin = profile.links.find((l) => l.id === 'linkedin')!
// the location may be set on two lines on the narrow sheet ('İstanbul,' / 'Türkiye') — no regex lookbehind
// anywhere here: Safari has it only from 16.4, and iOS 15.4 is the floor (docs/POST-M5-IOS15-COMPATIBILITY.md)
const commaLines = (t: string) => t.split(', ').map((w, i, a) => (i < a.length - 1 ? `${w},` : w))

/** the five cells, in reading order — what the pen writes (`word`) and what the DOM carries (`text`) */
const items = computed<FinaleItem[]>(() => [
  { id: 'email', kind: 'mail', label: copy.value.contact.emailLabel, text: profile.email, word: profile.email, lines: ['info@', 'yucelemrah', '.com'], href: `mailto:${profile.email}`, amp: 3.0 },
  // the number is never broken over lines, and never soaks on the narrow sheet (user decisions — lab-contact README)
  { id: 'phone', kind: 'tel', label: copy.value.contact.phoneLabel, text: profile.phone, word: profile.phone, condense: 0.72, narrowSoak: false, href: `tel:${profile.tel}`, amp: 0.85 },
  { id: 'github', kind: 'link', label: github.label, text: github.href, word: `${github.label} ↗`, valText: github.label, sr: copy.value.finale.githubAria, href: github.href, amp: 0.7 },
  { id: 'linkedin', kind: 'link', label: linkedin.label, text: linkedin.href, word: `${linkedin.label} ↗`, valText: linkedin.label, sr: copy.value.finale.linkedinAria, href: linkedin.href, amp: 0.7 },
  { id: 'location', kind: 'fact', label: copy.value.finale.locationRole, text: copy.value.identity.location, word: copy.value.identity.location, lines: commaLines(copy.value.identity.location), amp: 0.6 },
])

const live = ref(false)
const track = ref<HTMLElement | null>(null)
const paper = ref<HTMLCanvasElement | null>(null)
const ink = ref<HTMLCanvasElement | null>(null)
const contact = ref<HTMLElement | null>(null)
const status = ref<HTMLElement | null>(null)
const footLeft = ref<HTMLElement | null>(null)
const footRight = ref<HTMLElement | null>(null)
let finale: Finale | null = null
let gone = false

onMounted(async () => {
  // the engine is fetched on this route only, after the page's meaning is already on screen
  const { createFinale } = await import('../../../engine/lab/finale/finale.js')
  if (gone || !track.value || !paper.value || !ink.value || !contact.value || !status.value || !footLeft.value || !footRight.value) return
  live.value = true
  await nextTick()
  finale = createFinale({
    track: track.value, paper: paper.value, ink: ink.value, contact: contact.value, status: status.value,
    footLeft: footLeft.value, footRight: footRight.value,
    items: items.value,
    strings: { contact: copy.value.contact, finale: copy.value.finale, labTitle: copy.value.lab.title, registered: copy.value.lab.registered },
    lang: locale.value,
  })
})
onBeforeUnmount(() => { gone = true; finale?.destroy(); finale = null })
</script>

<template>
  <div class="finale" :class="{ 'is-finale': live }">
    <div class="stage">
      <canvas ref="paper" class="paper" aria-hidden="true" />
      <canvas ref="ink" class="ink" aria-hidden="true" />
      <!-- the accessible layer: the page's meaning; with the finale running, its cells are the hit areas -->
      <div ref="contact" class="contact">
        <h1 class="heading">{{ copy.contact.heading }}</h1>
        <address class="facts">
          <a class="cell" data-cell="email" :href="`mailto:${profile.email}`">
            <span class="lbl">{{ copy.contact.emailLabel }}</span> <span class="txt">{{ profile.email }}</span><span class="val" aria-hidden="true" />
          </a>
          <button type="button" class="copy" data-copy hidden :aria-label="copy.finale.copyEmail">{{ copy.finale.copy }}</button>
          <a class="cell" data-cell="phone" :href="`tel:${profile.tel}`">
            <span class="lbl">{{ copy.contact.phoneLabel }}</span> <span class="txt">{{ profile.phone }}</span><span class="val" aria-hidden="true" />
          </a>
          <a class="cell" data-cell="github" :href="github.href" target="_blank" rel="noopener noreferrer">
            <span class="txt">{{ copy.finale.githubAria }}</span><span class="arrow" aria-hidden="true"> ↗</span><span class="hint"> {{ copy.a11y.newTab }}</span><span class="val" aria-hidden="true" />
          </a>
          <a class="cell" data-cell="linkedin" :href="linkedin.href" target="_blank" rel="noopener noreferrer">
            <span class="txt">{{ copy.finale.linkedinAria }}</span><span class="arrow" aria-hidden="true"> ↗</span><span class="hint"> {{ copy.a11y.newTab }}</span><span class="val" aria-hidden="true" />
          </a>
          <button type="button" class="cell cell-fact" data-cell="location">
            <span class="lbl">{{ copy.finale.locationRole }}</span> <span class="txt">{{ copy.identity.location }}</span><span class="val" aria-hidden="true" />
          </button>
        </address>
      </div>
      <!-- the bench's foot band, continued (LabBench .foot): left names the place, right the register -->
      <div class="foot" aria-hidden="true">
        <span ref="footLeft">{{ copy.lab.title }}</span>
        <span ref="footRight">{{ copy.lab.registered }}</span>
      </div>
    </div>
    <!-- only scroll distance: the finale reads its position (useStudy's model) -->
    <div ref="track" class="track" />
    <p ref="status" class="u-sr" role="status" />
  </div>
</template>

<style scoped>
/* ── without script (or before the engine arrives): the page's meaning as a plain sheet ── */
.stage { padding: calc(var(--strip) + var(--space-l)) var(--pad) var(--space-l); }
.stage canvas, .foot, .track { display: none; }
.heading { font-size: var(--step-3); line-height: 1.05; letter-spacing: -0.03em; font-weight: 600; margin-block-end: var(--space-m); }
.facts { font-style: normal; display: grid; justify-items: start; gap: var(--space-xs); }
.cell { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-2xs) var(--space-s); font-size: var(--step-1); padding-block: var(--space-2xs); color: inherit; }
.cell-fact { background: none; border: 0; padding-inline: 0; font: inherit; font-size: var(--step-1); text-align: left; cursor: default; }
.cell .lbl { font: 400 var(--step--1) / 1.4 var(--mono); letter-spacing: 0.06em; text-transform: uppercase; min-width: 8ch; }
.cell .txt { text-decoration: underline; text-underline-offset: 0.18em; }
.cell-fact .txt { text-decoration: none; }
.cell .hint, .cell .val { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ── the finale running: a fixed stage over a tall track; the DOM becomes the hit areas ── */
.is-finale .stage { position: fixed; inset: 0; padding: 0; }
.is-finale .stage canvas { display: block; position: absolute; inset: 0; width: 100%; height: 100%; }
/* the track is only scroll distance: it must never swallow a click meant for the cells */
.is-finale .track { display: block; position: relative; width: 100%; pointer-events: none; }
/* hidden (and out of the tab order) until the frame stands; the rows are the visual layer */
.is-finale .contact { position: absolute; inset: 0; visibility: hidden; }
.is-finale .contact.is-live { visibility: visible; }
.is-finale .heading { position: absolute; width: 1px; height: 1px; margin: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.is-finale .facts { display: block; }
.is-finale .cell {
  position: absolute; left: 0; top: 0; margin: 0; padding: 0; display: block;
  color: transparent; text-decoration: none; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  /* the action must fire on the FIRST tap, undelayed (iOS Safari's double-tap wait) */
  touch-action: manipulation;
}
/* the pen plots the labels and the values; the DOM copies stay for the accessible name only */
.is-finale .cell .lbl, .is-finale .cell .txt, .is-finale .cell .arrow {
  position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
}
/* the plotted fact's own touch target (≥ 44 px, placed over the lettering each frame); a VISIBLE mono line only
   as the fallback, when a cell falls below the monoline floor and the pen leaves that fact to the DOM */
.is-finale .cell .val {
  position: absolute; width: auto; height: auto; clip: auto; overflow: visible; opacity: 0; pointer-events: auto;
  display: flex; align-items: center;
  font: 400 11px/1 var(--mono); letter-spacing: 0.06em; color: var(--ink); white-space: nowrap;
}
.is-finale .cell.is-fallback .val { opacity: 1; }
.is-finale .cell:focus-visible { outline: 2px solid var(--ink); outline-offset: -3px; }
.copy {
  position: absolute; left: 0; top: 0; padding: 8px 10px; margin: 0;
  background: none; border: 0; cursor: pointer; touch-action: manipulation;
  font: 400 9.5px/1 var(--mono); letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-muted);
  text-shadow: 0 0 3px var(--ground), 0 0 3px var(--ground), 0 0 5px var(--ground), 0 0 6px var(--ground);
}
.copy[hidden] { display: none; }
.copy:hover, .copy:focus-visible { color: var(--ink); text-decoration: underline; }
.copy:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
/* the bench's foot band (LabBench .foot, verbatim measures) */
.is-finale .foot {
  display: flex; position: absolute; left: 0; right: 0; bottom: 0; height: 44px; padding: 0 var(--pad);
  align-items: center; justify-content: space-between; border-top: 1px solid var(--rule);
  background: var(--ground);
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-muted);
}
@media (max-width: 760px) { .is-finale .foot { height: 40px; } }
@media (max-height: 470px) { .is-finale .foot { height: 32px; } }
</style>
