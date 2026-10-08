<script setup lang="ts">
/**
 * THE WHEEL LOG (R15) — what a real mouse sends, read on the device itself. ?wheellog=1 shows it (kept for the
 * session; ?wheellog=0 hides it). Only in `npm run dev` and in a build made with NUXT_PUBLIC_WHEELLOG=1 (the LAN
 * preview): layouts/default.vue's import of this file is behind that flag, so a release build has no chunk for it.
 *
 * It listens, passively and first (capture), and never changes what the site does with the event. Each row: the
 * time since the last event, deltaY / deltaX as the browser reports them, deltaMode (0 pixels, 1 lines, 2 pages),
 * the pixels the site reads (lines × 32, as main.js and the bench do), what that is in stops (× 0.0011 — a stop
 * lands past 0.12, so a lone event needs at least 110 px), and the running sum of the burst it belongs to (events
 * less than 400 ms apart, the site's own gesture gap).
 */
const route = useRoute()
const on = ref(false)
type Row = { n: number; dt: number; dy: number; dx: number; mode: number; px: number; stops: number; burst: number }
const rows = ref<Row[]>([])
const info = ref('')
let n = 0, last = 0, burst = 0
const read = () => {
  const q = String(route.query.wheellog ?? '')
  try {
    if (q === '1') sessionStorage.setItem('wheellog', '1')
    else if (q === '0') sessionStorage.removeItem('wheellog')
    on.value = sessionStorage.getItem('wheellog') === '1'
  } catch { on.value = q === '1' }
}
const onWheel = (e: WheelEvent) => {
  if (!on.value) return
  const t = performance.now(), dt = n ? t - last : 0
  last = t
  const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY
  burst = dt > 0 && dt < 400 ? burst + px : px
  rows.value = [{ n: ++n, dt: Math.round(dt), dy: +e.deltaY.toFixed(2), dx: +e.deltaX.toFixed(2), mode: e.deltaMode, px: +px.toFixed(1), stops: +(px * 0.0011).toFixed(3), burst: Math.round(burst) }, ...rows.value].slice(0, 24)
}
onMounted(() => {
  read()
  info.value = `DPR ${devicePixelRatio} · ${innerWidth}×${innerHeight} · ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 90)}`
  addEventListener('wheel', onWheel, { capture: true, passive: true })
})
watch(() => route.fullPath, read)
onBeforeUnmount(() => removeEventListener('wheel', onWheel, { capture: true }))
</script>

<template>
  <Teleport to="body">
    <div v-if="on" class="wheellog" aria-hidden="true">
      <p>WHEEL LOG — one stop needs a gesture past 0.12 (a lone event ≥ 110 px). {{ info }}</p>
      <table>
        <thead><tr><th>#</th><th>Δt ms</th><th>deltaY</th><th>deltaX</th><th>mode</th><th>px</th><th>stops</th><th>burst px</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.n" :class="{ under: Math.abs(r.stops) <= 0.12 && Math.abs(r.burst) === Math.abs(Math.round(r.px)) }">
            <td>{{ r.n }}</td><td>{{ r.dt }}</td><td>{{ r.dy }}</td><td>{{ r.dx }}</td><td>{{ r.mode }}</td><td>{{ r.px }}</td><td>{{ r.stops }}</td><td>{{ r.burst }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </Teleport>
</template>

<style>
.wheellog {
  position: fixed; z-index: 60; left: 8px; top: 64px; max-width: calc(100vw - 16px); pointer-events: none;
  padding: 8px 10px; background: rgb(14 15 17 / .86); color: #e7e6e0; border-radius: 4px;
  font: 400 11px / 1.35 ui-monospace, Menlo, Consolas, monospace;
}
.wheellog p { margin: 0 0 6px; max-width: 560px; }
.wheellog table { border-collapse: collapse; }
.wheellog th, .wheellog td { padding: 1px 8px 1px 0; text-align: right; }
.wheellog th { opacity: .65; font-weight: 400; }
/* a lone event the site will not land on its own */
.wheellog tr.under td { color: #f0a070; }
</style>
