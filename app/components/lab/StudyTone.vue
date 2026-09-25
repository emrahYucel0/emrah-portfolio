<script setup lang="ts">
/**
 * 03 · TONE. (Accepted reference: research lab-reopen/focused-final/tone.)
 *
 * There is no before/after: no source thumbnail, no split, no wipe, no photograph at any scroll position — only the
 * reconstructed material. Scroll does not drive an effect amount; it drives HOW MUCH LINE the material is allowed.
 * At the top a handful of heavy rows can only carry tonal mass; at the bottom many fine rows resolve the subject.
 * Row thickness scales with pitch, so total ink stays roughly constant: only the resolution changes.
 *
 * Engineering (Phase 8A Gate G): the tone analysis is the real toneData(), but it runs at BUILD time
 * (tools/make-tone.mjs) and ships as a small grey map — the device only reads it. That takes the Safari worker
 * fallback and the multi-second PHOTO build off the interaction path entirely.
 */
const { copy, path } = useLocale()
const track = ref<HTMLElement | null>(null)
const cv = ref<HTMLCanvasElement | null>(null)
const rows = ref(0)
const sel = ref(0)
const SOURCES = ['/tone/lab-photo.webp', '/tone/lab-ui.webp', '/tone/lab-texture.webp']
const { S, status, say, run, request, resized } = useStudy({ stages: 3.4, states: 5, track, canvas: cv })

interface Map { tone: Uint8Array; tw: number; th: number }
const maps: (Map | null)[] = [null, null, null]
const loading = new Set<number>()

async function ensure(i: number) {
  if (maps[i] || loading.has(i)) return
  loading.add(i)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = SOURCES[i]!
    await img.decode()
    const tw = img.naturalWidth, th = img.naturalHeight
    const c = Object.assign(document.createElement('canvas'), { width: tw, height: th })
    const x = c.getContext('2d', { willReadFrequently: true })!
    x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, tw, th).data
    const tone = new Uint8Array(tw * th)
    for (let j = 0; j < tone.length; j++) tone[j] = d[j * 4]!
    maps[i] = { tone, tw, th }
    request()
  } catch { /* the rows stay flat — never a spinner */ }
  loading.delete(i)
}
function pick(i: number) {
  sel.value = i
  say(`${copy.value.lab.tone_sources[i]} — ${copy.value.lab.studies.tone.prim}`)
  ensure(i)
  request()
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
function box() {
  const top = S.top + (S.short ? 34 : S.portrait ? 84 : 78)
  const bot = S.short ? 42 : S.portrait ? 92 : 72
  return { x: 0, y: top, w: S.W, h: Math.max(80, S.H - top - bot) }
}
// pitch is geometric in the scroll position: the same number of doublings per screen of travel
const pitchAt = (p: number) => { const a = S.portrait ? 26 : 34, b = S.portrait ? 4 : 5; return a * Math.pow(b / a, clamp(p, 0, 1)) }

function draw(p: number) {
  const ctx = S.ctx
  if (!ctx) return
  ctx.fillStyle = '#efeee9'
  ctx.fillRect(0, 0, S.W, S.H)
  const r = box()
  const sp = pitchAt(p)
  const n = Math.max(1, Math.floor(r.h / sp))
  rows.value = n
  const m = maps[sel.value]
  if (!m) return
  // cover-crop the map into the field once — the crop never changes with scroll
  const k = Math.max(r.w / m.tw, r.h / m.th)
  const cw = r.w / k, ch = r.h / k
  const sx0 = (m.tw - cw) / 2, sy0 = (m.th - ch) / 2
  const th = sp * 0.115
  const xs = S.portrait ? 3 : 4
  const nx = Math.max(2, Math.ceil(r.w / xs))
  const ns = clamp(Math.round(ch / n / 1.5), 1, 6)
  const band = ch / n
  const tops = new Float32Array(nx + 1)
  ctx.beginPath()
  for (let row = 0; row < n; row++) {
    const cy = r.y + (row + 0.5) * (r.h / n)
    const sy = sy0 + ((row + 0.5) / n) * ch
    for (let i = 0; i <= nx; i++) {
      const sxx = Math.min(m.tw - 1, Math.max(0, Math.floor(sx0 + (i / nx) * cw)))
      let acc = 0
      for (let s = 0; s < ns; s++) {
        const yy = Math.min(m.th - 1, Math.max(0, Math.floor(sy + (s / ns - 0.5 + 0.5 / ns) * band)))
        acc += m.tone[yy * m.tw + sxx]!
      }
      tops[i] = th * (0.5 + (acc / ns / 255) * 1.15)
    }
    ctx.moveTo(r.x, cy - tops[0]!)
    for (let i = 1; i <= nx; i++) ctx.lineTo(r.x + (i / nx) * r.w, cy - tops[i]!)
    for (let i = nx; i >= 0; i--) ctx.lineTo(r.x + (i / nx) * r.w, cy + tops[i]!)
    ctx.closePath()
  }
  ctx.fillStyle = '#121212'
  ctx.fill()
}

onMounted(() => {
  pick(0)
  // the other two maps are small; read them while the visitor is looking at the first
  const idle = (window as Window & { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 400))
  idle(() => { ensure(1); ensure(2) })
  resized(() => request())
  let last = -1
  run((p) => {
    draw(p)
    if (rows.value !== last && maps[sel.value]) { last = rows.value; say(`${copy.value.lab.tone_sources[sel.value]}: ${rows.value} ${copy.value.lab.tone_rows}`) }
    return false
  })
})
</script>

<template>
  <div class="study study-tone">
    <h1 class="u-sr">{{ copy.lab.studies.tone.name }} — {{ copy.lab.studies.tone.note }}</h1>
    <canvas ref="cv" class="field" aria-hidden="true" />
    <NuxtLink class="back" :to="path('/lab')">← {{ copy.lab.back }}</NuxtLink>
    <div class="head">
      <span class="no">03</span><span class="nm" aria-hidden="true" lang="en">{{ copy.lab.studies.tone.name }}</span>
      <p>{{ copy.lab.studies.tone.prim }}</p>
    </div>
    <div class="src" role="group" :aria-label="copy.lab.studies.tone.name">
      <button v-for="(s, i) in copy.lab.tone_sources" :key="s" type="button" :aria-current="sel === i ? 'true' : undefined" @click="pick(i)">
        <i aria-hidden="true" />{{ s }}
      </button>
    </div>
    <!-- the row resolution IS the experiment's readout; the canvas that carries it is decorative, so it is read here -->
    <p class="rows"><b>{{ rows }}</b> {{ copy.lab.tone_rows }}</p>
    <div ref="track" class="track" />
    <p class="u-sr" role="status">{{ status }}</p>
  </div>
</template>

<style>
.study-tone .field { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 1; display: block; }
.study-tone .head { position: fixed; right: var(--pad); top: calc(var(--strip) + 14px); z-index: 4; text-align: right; }
.study-tone .head .no { font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; color: var(--ink-muted); margin-right: 9px; vertical-align: 3px; }
.study-tone .head .nm { font-family: 'Archivo Var', system-ui, sans-serif; font-weight: 500; font-size: 24px; letter-spacing: -0.01em; }
.study-tone .head p { margin: 5px 0 0; font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-muted); }
.study-tone .back { left: var(--pad); right: auto; }
.study-tone .src { position: fixed; left: var(--pad); bottom: calc(var(--pad) + 4px); z-index: 4; display: flex; gap: 18px; }
.study-tone .src button { display: inline-flex; align-items: center; gap: 7px; min-height: 32px; padding: 0; background: none; border: 0; cursor: pointer; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); }
.study-tone .src button i { width: 7px; height: 7px; border: 1px solid currentColor; }
.study-tone .src button[aria-current='true'] { color: var(--ink); }
.study-tone .src button[aria-current='true'] i { background: currentColor; }
.study-tone .src button:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
.study-tone .rows { position: fixed; right: var(--pad); bottom: calc(var(--pad) + 10px); z-index: 4; margin: 0; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.08em; color: var(--ink-muted); }
.study-tone .rows b { font-weight: 400; color: var(--ink); }
@media (max-width: 760px) { .study-tone .src { gap: 12px; } .study-tone .head .nm { font-size: 20px; } .study-tone .rows { bottom: calc(var(--pad) + 44px); } }
@media (max-height: 470px) { .study-tone .head p { display: none; } .study-tone .head { top: calc(var(--strip) + 6px); } .study-tone .head .nm { font-size: 17px; } }
</style>
