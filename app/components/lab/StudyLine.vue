<script setup lang="ts">
import { createLineStudy, LINE_STATES } from '../../../engine/lab/line-study.js'

/**
 * 02 · LINE. One line, one fixed length; every structure is spent from the same run, and what a structure does not
 * spend waits at the edge (the hem). Scroll moves through what the line can be made into — taut, curve, aperture,
 * gathered, released, boundary — and back. The ledger shows the budget as a measure, not only as a number.
 */
const { copy, path } = useLocale()
const track = ref<HTMLElement | null>(null)
const ink = ref<HTMLCanvasElement | null>(null)
const paper = ref<HTMLCanvasElement | null>(null)
const stateIdx = ref(0)
const spent = ref(0)
const { S, status, say, run, resized } = useStudy({ stages: (LINE_STATES - 1) * 1.14, states: LINE_STATES, track, canvas: ink })

onMounted(() => {
  const view = {
    get ctx() { return S.ctx }, get W() { return S.W }, get H() { return S.H }, get DPR() { return S.DPR }, get top() { return S.top },
    reduced: S.reduced, paper: paper.value!,
  }
  const line = createLineStudy(view)
  line.build()
  resized(() => line.build())
  run((p, dt) => {
    const moving = line.frame(p, dt)
    spent.value = line.spent
    const i = Math.min(LINE_STATES - 1, Math.round(Math.min(1, Math.max(0, p)) * (LINE_STATES - 1)))
    if (i !== stateIdx.value) { stateIdx.value = i; say(copy.value.lab.line_says[i]!) }
    return moving
  })
  // a fine pointer can pluck the line; it is an addition, never the only way anything happens
  if (!S.reduced && matchMedia('(pointer: fine)').matches) {
    let px = 0, py = 0, pt = 0
    const onMove = (e: PointerEvent) => {
      const now = performance.now(), dt = Math.max(8, now - pt)
      const vx = ((e.clientX - px) / dt) * 900, vy = ((e.clientY - py) / dt) * 900
      if (pt && Math.hypot(vx, vy) > 34) { line.impulse(e.clientX, e.clientY, vx * 0.05, vy * 0.05); requestAnimationFrame(() => run((p, d) => { const m = line.frame(p, d); spent.value = line.spent; return m })) }
      px = e.clientX; py = e.clientY; pt = now
    }
    addEventListener('pointermove', onMove, { passive: true })
    onBeforeUnmount(() => removeEventListener('pointermove', onMove))
  }
  say(copy.value.lab.line_says[0]!)
})
</script>

<template>
  <div class="study study-line">
    <h1 class="u-sr">{{ copy.lab.studies.line.name }} — {{ copy.lab.studies.line.note }}</h1>
    <div class="stage"><canvas ref="paper" aria-hidden="true" /><canvas ref="ink" aria-hidden="true" /></div>
    <NuxtLink class="back" :to="path('/lab')">← {{ copy.lab.back }}</NuxtLink>
    <!-- the state the run is in. It is the one piece of the experiment that is not geometry, and it was hidden
         from a reader: the canvas is decorative, so this was the only place the current state existed in the DOM.
         It is read where it stands; the live region below still says when it changes. -->
    <div class="state"><b>{{ copy.lab.line_states[stateIdx] }}</b><span>{{ String(stateIdx + 1).padStart(2, '0') }} / {{ String(LINE_STATES).padStart(2, '0') }}</span></div>
    <div class="id">
      <span class="no">02</span>
      <span class="nm" aria-hidden="true" lang="en">{{ copy.lab.studies.line.name }}</span>
      <p>{{ copy.lab.studies.line.prim }}</p>
    </div>
    <p class="ledger"><b>{{ Math.round(spent * 100) }}%</b> {{ copy.lab.line_spent }}<br><span>{{ Math.round((1 - spent) * 100) }}%</span> {{ copy.lab.line_held }}</p>
    <div ref="track" class="track" />
    <p class="u-sr" role="status">{{ status }}</p>
  </div>
</template>

<style>
.study-line .stage { position: fixed; inset: 0; z-index: 1; }
.study-line .stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.study-line .state { position: fixed; left: var(--pad); top: calc(var(--strip) + 18px); z-index: 4; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; }
.study-line .state b { display: block; font-weight: 400; color: var(--ink); }
.study-line .state span { display: block; margin-top: 3px; letter-spacing: 0.18em; color: var(--ink-muted); }
.study-line .id { position: fixed; left: var(--pad); bottom: calc(var(--pad) + 8px); z-index: 4; }
.study-line .id .no { display: block; font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; color: var(--ink-muted); }
.study-line .id .nm { display: block; margin-top: 2px; font-family: 'Archivo Var', system-ui, sans-serif; font-weight: 500; font-size: 26px; letter-spacing: -0.01em; line-height: 1; }
.study-line .id p { margin: 6px 0 0; font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-muted); }
.study-line .ledger { position: fixed; right: var(--pad); bottom: calc(var(--pad) + 8px); z-index: 4; text-align: right; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.08em; color: var(--ink-muted); }
.study-line .ledger b { font-weight: 400; color: var(--ink); }
@media (max-width: 760px) { .study-line .id .nm { font-size: 21px; } .study-line .ledger { font-size: 10px; } }
@media (max-height: 470px) { .study-line .id p { display: none; } .study-line .id .nm { font-size: 18px; } }
</style>
