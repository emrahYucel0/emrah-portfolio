<script setup lang="ts">
/**
 * R15 PROTOTYPE — WHERE THE VISITOR IS. Two indicators, asked for by query and kept for the session:
 *
 *   ?r15=a    the strip names the place: the section the visitor is in is marked in the top strip (WORK, ABOUT,
 *             LAB, CONTACT), on the runtime's strip and on the Lab's alike
 *   ?r15=b    a line: one hairline above the bottom strip, a tick per place on the spine, drawn in as far as the
 *             visitor has come — the passage, the work field, the louvers, the bench and the finale included
 *   ?r15=ab   both;  ?r15=off  neither (and forgets the session's choice)
 *
 * In every mode the section's control carries aria-current="location", which the runtime's strip has never had
 * (the Lab's has it as "page" for the bench and the finale). With no key at all this component does nothing: no
 * loop, no element, no attribute.
 *
 * IT READS, IT NEVER STEERS. The runtime is frozen (CLAUDE.md), so this is not part of it: each frame it reads the
 * position the runtime already exposes (window.__lab) or, on the document routes, the bench's record and the
 * finale's scroll — and writes only its own line and the strip's attribute. If the visitor's choice is made, the
 * line moves into the runtime's domUpdate and the Lab's chrome, and this loop goes.
 *
 * Nothing in it moves by itself: the line is wherever the visitor is, frame by frame, so in reduced motion — where
 * the places are cuts — it cuts with them. There is no transition to remove.
 */
const route = useRoute()
type Mode = '' | 'a' | 'b' | 'ab'
const mode = ref<Mode>('')
const KEY = 'r15'
const readMode = () => {
  const q = String(route.query.r15 ?? '')
  try {
    if (q === 'a' || q === 'b' || q === 'ab') sessionStorage.setItem(KEY, q)
    else if (q === 'off') sessionStorage.removeItem(KEY)
    const s = sessionStorage.getItem(KEY) || ''
    mode.value = (s === 'a' || s === 'b' || s === 'ab' ? s : '') as Mode
  } catch { mode.value = (q === 'a' || q === 'b' || q === 'ab' ? q : '') as Mode }
}

// the spine as the runtime last said it; the document routes cannot ask (stops.cjs), so it is remembered
const FALLBACK = ['name', 'creative', 'system', 'linefield', 'work', 'cross', 'lab', 'rest']
let spine: string[] = FALLBACK
const SPINE_KEY = 'r15-spine'
try { const s = sessionStorage.getItem(SPINE_KEY); if (s) spine = JSON.parse(s) } catch { /* the fallback stands */ }
// the strip's sections, by place. Cross Section is the way into the Lab — SURFACE to DEPTH, the louvers closing
// over the bench — so it is the Lab's; the opening (the name, the faces, the passage) is no section of the strip.
const SECTION: Record<string, string> = { work: 'work', cross: 'lab', lab: 'lab', rest: 'rest' }
const STUDY_AT: Record<string, number> = { weight: 1, line: 2, tone: 3 }

type L = { SPINE?: string[]; A: Record<string, any>; works?: unknown[]; lfState?: () => { p: number }; csState?: () => { p: number } | null }
const where = (): { pos: number; section: string | null } | null => {
  const path = route.path
  const at = (n: string) => spine.indexOf(n)
  if (/\/contact\/?$/.test(path)) {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight)
    return { pos: at('rest') + Math.min(1, Math.max(0, scrollY / max)), section: 'rest' }
  }
  const lab = path.match(/\/lab(?:\/([^/]+))?\/?$/)
  if (lab) {
    const recs = [...document.querySelectorAll('.lab-stage .rec')]
    const onBench = recs.findIndex((b) => b.getAttribute('aria-current') === 'true') + 1
    const k = lab[1] ? (STUDY_AT[lab[1]] ?? 1) : Math.max(1, onBench)
    return { pos: at('lab') + 0.5 * (k - 1) / 2, section: 'lab' }
  }
  const lb = (window as unknown as { __lab?: L }).__lab
  if (!lb || document.documentElement.dataset.c2 !== 'on') return null
  if (lb.SPINE && lb.SPINE.join() !== spine.join()) { spine = lb.SPINE; try { sessionStorage.setItem(SPINE_KEY, JSON.stringify(spine)) } catch { /* fine */ } }
  const A = lb.A
  const last = spine.length - 1
  if (A.mode === 'world' || A.mode === 'exit') return { pos: at('work'), section: 'work' }
  const p = Math.min(last, Math.max(0, A.p))
  const i = Math.min(last, Math.floor(p)), f = p - i
  const name = spine[i]
  const N = Math.max(1, (lb.works?.length ?? 3) - 1)
  // a place with an axis of its own spends the first half of its share on that axis, the second on the way out
  const inner = name === 'linefield' ? lb.lfState?.().p : name === 'work' ? Math.min(1, Math.max(0, A.wt / N)) : name === 'cross' ? lb.csState?.()?.p : null
  const pos = inner == null ? i + f : i + 0.5 * inner + 0.5 * f
  return { pos, section: A.aboutOpen ? 'about' : SECTION[spine[Math.min(last, A.base)] ?? ''] ?? null }
}

const line = ref<HTMLElement | null>(null)
const fill = ref<HTMLElement | null>(null)
const ticks = computed(() => spine.map((_, i) => (i / spine.length) * 100))
let raf = 0, lastPos = -1, lastSection: string | null | undefined, lastTone = '', frame = 0
const paint = () => {
  raf = requestAnimationFrame(paint)
  const w = where()
  const visualA = mode.value.includes('a')
  // A, and the attribute in every mode: the section's control is the current location
  const section = w?.section ?? null
  if (section !== lastSection || frame % 30 === 0) {
    lastSection = section
    // only the strip on screen: on the document routes the runtime is warmed in the background (useC2Engine.warm)
    // and its strip is in the DOM, hidden — marking it too told a screen reader of two current locations
    const owns = document.documentElement.dataset.c2 === 'on'
    for (const b of document.querySelectorAll<HTMLElement>('#ui .strip.top .nav [data-go]')) {
      const here = owns && section != null && b.dataset.go === section
      if (here) b.setAttribute('aria-current', 'location'); else b.removeAttribute('aria-current')
      b.classList.toggle('r15-here', here && visualA)
    }
    for (const a of document.querySelectorAll<HTMLElement>('.lab-strip nav a')) a.classList.toggle('r15-here', visualA && a.hasAttribute('aria-current'))
  }
  frame++
  // B
  const el = line.value
  if (!el) return
  const hidden = !w || document.body.classList.contains('in-world') || document.documentElement.classList.contains('c2-failed')
  el.style.visibility = hidden ? 'hidden' : ''
  if (!w) return
  const t = Math.min(1, Math.max(0, (w.pos) / spine.length))
  if (Math.abs(t - lastPos) > 1e-4 && fill.value) {
    fill.value.style.transform = `scaleX(${t.toFixed(4)})`; lastPos = t
    // a place is reached when the line has come to its tick
    for (const k of el.querySelectorAll<HTMLElement>('.r15-tick')) k.classList.toggle('on', +(k.dataset.at ?? 2) <= t + 1e-4)
  }
  // the strip's own colour: the runtime's bottom strip carries the ground's tone, the Lab's strip its ink
  if (frame % 6 === 0) {
    const ref = document.querySelector('#ui .strip.bottom') ?? document.querySelector('.lab-strip .id')
    const tone = ref ? getComputedStyle(ref).color : ''
    if (tone !== lastTone) { el.style.color = tone; lastTone = tone }
  }
}
const start = () => { cancelAnimationFrame(raf); lastPos = -1; lastSection = undefined; if (mode.value) raf = requestAnimationFrame(paint) }
const clear = () => {
  for (const b of document.querySelectorAll('#ui .strip.top .nav [data-go]')) { b.removeAttribute('aria-current'); b.classList.remove('r15-here') }
  for (const a of document.querySelectorAll('.lab-strip nav a')) a.classList.remove('r15-here')
}
onMounted(() => { readMode(); start() })
watch(() => route.fullPath, () => { const was = mode.value; readMode(); if (was !== mode.value) { if (!mode.value) clear(); start() } })
onBeforeUnmount(() => { cancelAnimationFrame(raf); clear() })
</script>

<template>
  <!-- on the body, beside the runtime's own layers: the shell it is mounted in is hidden while the runtime owns the screen -->
  <Teleport to="body">
  <div v-if="mode.includes('b')" ref="line" class="r15-line" aria-hidden="true">
    <i class="r15-track" />
    <i ref="fill" class="r15-fill" />
    <i v-for="(x, i) in ticks" :key="i" class="r15-tick" :class="{ first: i === 0 }" :data-at="x / 100" :style="{ left: `${x}%` }" />
    <i class="r15-tick end" data-at="1" style="left: 100%" />
  </div>
  </Teleport>
</template>

<style>
/* unscoped: A marks controls the runtime and the Lab's chrome draw themselves */
.r15-here { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 6px; }
.lab-strip nav a.r15-here { color: var(--ink); }

/* B sits inside the bottom strip, just under its top edge, inside the page's margins: on the strip it takes the
   strip's own tone (the runtime chooses that by what lies under the strip), where on the edge between field and strip
   it was lost on dark material and read as one more row of the finale's drawing */
.r15-line {
  position: fixed; z-index: 30; pointer-events: none;
  left: var(--pad, 36px); right: var(--pad, 36px);
  bottom: calc(var(--strip, 50px) - 13px); height: 9px;
  color: var(--ink, #121212);
}
.r15-line i { position: absolute; display: block; }
.r15-track { left: 0; right: 0; top: 4px; height: 1px; background: currentColor; opacity: .2; }
.r15-fill { left: 0; right: 0; top: 4px; height: 1px; background: currentColor; opacity: .9; transform-origin: 0 50%; transform: scaleX(0); }
.r15-tick { top: 1px; width: 1px; height: 7px; margin-left: -.5px; background: currentColor; opacity: .32; }
.r15-tick.on { opacity: .95; }
.r15-tick.first, .r15-tick.end { height: 9px; top: 0; }
</style>
