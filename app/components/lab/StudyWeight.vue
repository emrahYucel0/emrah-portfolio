<script setup lang="ts">
/**
 * 01 · WEIGHT. (Accepted reference: research lab-reopen/focused-final/weight; mechanism from typography-2026-09-16.)
 *
 * A fixed area, split by a binary partition tree. Each cell's weight is Gaussian attention to the scroll position,
 * times pressure (hold a cell and it asks for more area). Every partition edge is a spring, so the tiling stays tiled
 * while it moves. The type in each cell is SOLVED on two axes — the real width axis (wdth 62–125) and weight —
 * against a measured advance table, so it fills its cell: it is never simply scaled. The rule is the experiment.
 */
const { copy, path } = useLocale()
const track = ref<HTMLElement | null>(null)
const fieldEl = ref<HTMLElement | null>(null)
const scaleEl = ref<HTMLElement | null>(null)
const mk = ref<HTMLElement | null>(null)

const WORDS = ['AREA', 'WEIGHT', 'PRESSURE', 'SHARE', 'LESS', 'MORE']
const FAMILY = "'Archivo Var', system-ui, sans-serif"
const WD = [62, 75, 90, 100, 112, 125]
const WG = [100, 300, 500, 700, 900]
const { S, status, say, run, resized } = useStudy({ stages: WORDS.length - 1 + 0.6, states: WORDS.length, track })

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }

interface Leaf {
  text: string; ch: number; amp: number; press: number; pv: number; pressT: number
  cur: number[]; vel: number[]; target: number[]; rot: number; rv: number; rotT: number
  w: number; adv: number[][]; el?: HTMLElement; t?: HTMLElement; frac?: number
}
interface Node { leaf?: Leaf; kids?: [Node, Node]; vertical: boolean | null; sw?: number }
const LEAVES: Leaf[] = WORDS.map((text, i) => ({ text, ch: i, amp: 1 + (i % 2 ? 0.25 : 0), press: 0, pv: 0, pressT: 0, cur: [0, 0, 0, 0], vel: [0, 0, 0, 0], target: [0, 0, 0, 0], rot: 0, rv: 0, rotT: 0, w: 0, adv: [] }))
const makeTree = (list: Leaf[]): Node => list.length === 1 ? { leaf: list[0], vertical: null } : { kids: [makeTree(list.slice(0, Math.ceil(list.length / 2))), makeTree(list.slice(Math.ceil(list.length / 2)))], vertical: null }
const root = makeTree(LEAVES)
let MIN = 26, CAP = 0.72, BLR = 0.78, attention = 0, booted = false, lastLead: Leaf | null = null
const axis = { works: false }

function measure() {
  const probe = document.createElement('span')
  Object.assign(probe.style, { position: 'absolute', left: '-99999px', top: '0', visibility: 'hidden', whiteSpace: 'pre', lineHeight: '1', fontSize: '100px', fontFamily: FAMILY })
  document.body.appendChild(probe)
  for (const L of LEAVES) {
    probe.textContent = L.text
    L.adv = WG.map((g) => WD.map((w) => { probe.style.fontVariationSettings = `'wdth' ${w}, 'wght' ${g}`; return probe.getBoundingClientRect().width }))
  }
  probe.remove()
  const c = document.createElement('canvas').getContext('2d')!
  c.font = `400 100px ${FAMILY}`
  CAP = c.measureText('H').actualBoundingBoxAscent / 100 || CAP
  const bp = document.createElement('span')
  Object.assign(bp.style, { position: 'absolute', left: '-99999px', top: '0', visibility: 'hidden', fontSize: '100px', lineHeight: '1', fontFamily: FAMILY })
  bp.innerHTML = 'H<i style="display:inline-block;width:0;height:0"></i>'
  document.body.appendChild(bp)
  BLR = (bp.querySelector('i')!.getBoundingClientRect().top - bp.getBoundingClientRect().top) / 100 || BLR
  bp.remove()
  const a = LEAVES[0]!.adv[2]!
  axis.works = Math.abs(a[5]! - a[0]!) > a[0]! * 0.08
}
function advAt(L: Leaf, g: number, w: number) {
  let gi = 0; while (gi < WG.length - 2 && g > WG[gi + 1]!) gi++
  let wi = 0; while (wi < WD.length - 2 && w > WD[wi + 1]!) wi++
  const gt = clamp((g - WG[gi]!) / (WG[gi + 1]! - WG[gi]!), 0, 1), wt = clamp((w - WD[wi]!) / (WD[wi + 1]! - WD[wi]!), 0, 1)
  const A = L.adv
  return lerp(lerp(A[gi]![wi]!, A[gi]![wi + 1]!, wt), lerp(A[gi + 1]![wi]!, A[gi + 1]![wi + 1]!, wt), gt)
}
function fit(L: Leaf, g: number, fw: number, fh: number) {
  let size = Math.max(1, fh / CAP)
  const need = (fw / size) * 100
  const row = WD.map((w) => advAt(L, g, w))
  let wd = WD[0]!, ls = 0
  if (need <= row[0]!) size = (fw / row[0]!) * 100
  else if (need >= row[WD.length - 1]!) {
    wd = WD[WD.length - 1]!
    if (L.text.length > 1) ls = Math.min((fw - (row[WD.length - 1]! * size) / 100) / (L.text.length - 1), size * 0.22)
  } else for (let j = 0; j < WD.length - 1; j++) if (need <= row[j + 1]!) { wd = lerp(WD[j]!, WD[j + 1]!, (need - row[j]!) / (row[j + 1]! - row[j]!)); break }
  return { size, wd, ls }
}
function weights() {
  for (const L of LEAVES) {
    const g = Math.exp(-((attention - L.ch) ** 2) / (2 * 0.42 * 0.42))
    L.w = (0.05 + L.amp * g) * (1 + 1.5 * L.press) + 0.32 * L.press
  }
}
function sumW(n: Node): number { return n.leaf ? n.leaf.w : (n.sw = sumW(n.kids![0]) + sumW(n.kids![1])) }
function minLen(n: Node, v: boolean): number { if (n.leaf) return MIN; const a = minLen(n.kids![0], v), b = minLen(n.kids![1], v); return n.vertical === v ? a + b : Math.max(a, b) }
function layout(n: Node, x: number, y: number, w: number, h: number) {
  if (n.leaf) { const t = n.leaf.target; t[0] = x; t[1] = y; t[2] = x + w; t[3] = y + h; return }
  if (n.vertical === null) n.vertical = w >= h
  const [a, b] = n.kids!
  const wa = a.leaf ? a.leaf.w : a.sw!, wb = b.leaf ? b.leaf.w : b.sw!
  const len = n.vertical ? w : h
  const ma = minLen(a, n.vertical), mb = minLen(b, n.vertical)
  let r = wa / (wa + wb)
  r = ma + mb >= len ? ma / (ma + mb) : clamp(r, ma / len, 1 - mb / len)
  if (n.vertical) { layout(a, x, y, w * r, h); layout(b, x + w * r, y, w * (1 - r), h) } else { layout(a, x, y, w, h * r); layout(b, x, y + h * r, w, h * (1 - r)) }
}
function resetOrient(n: Node) { if (n.kids) { n.vertical = null; n.kids.forEach(resetOrient) } }
function frameBox() {
  const top = S.top + (S.short ? 58 : S.portrait ? 112 : 106)
  const pad = S.portrait ? 16 : 30
  if (scaleEl.value) scaleEl.value.style.top = `${top - (S.short ? 16 : 20)}px`
  return { x: pad, y: top, w: S.W - pad * 2, h: Math.max(120, S.H - top - pad - 18) }
}
function canonical() {
  MIN = S.W < 700 ? 26 : 34
  const a = attention; attention = 0
  weights(); sumW(root); resetOrient(root)
  const b = frameBox(); layout(root, b.x, b.y, b.w, b.h)
  attention = a
  for (const L of LEAVES) L.cur = [...L.target]
}
let down: { L: Leaf; x: number; y: number; t: number; moved: number } | null = null
function onDown(e: PointerEvent, L: Leaf) { down = { L, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 } }
function onMove(e: PointerEvent) { if (!down) return; down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y)); if (down.moved > 12) { down.L.pressT = 0; down = null } }
function release() { if (down) down.L.pressT = 0; down = null }
function onKey(e: KeyboardEvent, L: Leaf) {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  L.pressT = 2.4; setTimeout(() => { L.pressT = 0 }, S.reduced ? 260 : 900)
}
function springEdges(L: Leaf, dt: number) {
  let moving = false
  for (let i = 0; i < 4; i++) {
    const c = 2 * Math.sqrt(150) * 0.8
    L.vel[i]! += ((L.target[i]! - L.cur[i]!) * 150 - L.vel[i]! * c) * dt
    L.cur[i]! += L.vel[i]! * dt
    if (Math.abs(L.vel[i]!) > 0.05 || Math.abs(L.target[i]! - L.cur[i]!) > 0.05) moving = true
  }
  return moving
}
function renderLeaf(L: Leaf, dt: number) {
  let moving = false
  if (S.reduced) L.cur = [...L.target]
  else moving = springEdges(L, dt)
  const [x0, y0, x1, y1] = L.cur as [number, number, number, number]
  const w = Math.max(0, x1 - x0), h = Math.max(0, y1 - y0)
  const el = L.el!
  el.style.transform = `translate3d(${x0}px, ${y0}px, 0)`
  el.style.width = `${w}px`; el.style.height = `${h}px`
  const frac = (w * h) / (S.W * S.H)
  const pad = clamp(Math.min(w, h) * 0.07, 4, 26)
  // The word is solved to fit its cell by ADVANCE, and the advance always fits. A letter's ink is not bound by its
  // advance, though: this face's S at its heaviest and narrowest carries ink past the end of its own advance, and a
  // clip at the cell's edge took the side off it. The type is inset from that edge by `pad` on every side, so the
  // ink may use the inset it was given — and no further. The clip is moved out to exactly there: a word can never
  // reach another word's type, because that word is inset by its own pad too.
  el.style.clipPath = `inset(-${pad.toFixed(1)}px)`
  const fbw = Math.max(1, w - pad * 2), fbh = Math.max(1, h - pad * 2)
  // a tall narrow cell turns its word on its side (hysteresis, as in the source)
  if (L.rotT === 0 && fbh > fbw * 2.2) L.rotT = 1
  else if (L.rotT === 1 && fbw > fbh * 1.15) L.rotT = 0
  if (S.reduced) L.rot = L.rotT
  else { const c = 2 * Math.sqrt(60) * 0.72; L.rv += ((L.rotT - L.rot) * 60 - L.rv * c) * dt; L.rot += L.rv * dt; if (Math.abs(L.rv) > 0.01) moving = true }
  const r = clamp(L.rot, 0, 1)
  const fw = Math.max(1, lerp(fbw, fbh, r)), fh = Math.max(1, lerp(fbh, fbw, r))
  // the weight axis follows the cell's share of the page — a bigger share, a heavier voice
  const G = lerp(120, 900, smooth((frac - 0.01) / 0.28))
  const f = fit(L, G, fw, fh)
  const t = L.t!
  t.style.fontSize = `${f.size}px`
  t.style.letterSpacing = `${f.ls}px`
  t.style.fontVariationSettings = `'wdth' ${f.wd.toFixed(1)}, 'wght' ${G.toFixed(0)}`
  // The type is set so its CAP BAND fills the cell — the em box is taller than that, by the space above the cap
  // and below the baseline, and the difference has to be taken off the axis the cap band is measured on. Upright
  // that axis is y; rotated a quarter turn it is x, because the line box's height is what now runs across the
  // cell. Correcting on y in both cases left every rotated word sitting (BLR - CAP)·size too far across its cell,
  // and the cell clips — which is what sliced the foot off every E, R, A, H and S. The offset follows the turn.
  const capOff = (BLR - CAP) * f.size
  const tx = pad - capOff * r
  const ty = pad - capOff * (1 - r)
  t.style.transform = `translate(${tx}px, ${ty}px) rotate(${-90 * r}deg) translate(${-fw * r}px, 0px)`
  L.frac = frac
  return moving
}

onMounted(async () => {
  const cells = fieldEl.value!.querySelectorAll<HTMLElement>('.cell')
  LEAVES.forEach((L, i) => { L.el = cells[i]!; L.t = cells[i]!.querySelector<HTMLElement>('.t')! })
  try { await document.fonts.load(`500 100px ${FAMILY}`, 'AREAWGHTPRSU'); await document.fonts.ready } catch {}
  measure()
  canonical()
  booted = true
  resized(() => { if (booted) canonical() })
  run((p, dt) => {
    if (!booted) return false
    attention = S.reduced ? Math.round(p * (WORDS.length - 1)) : p * (WORDS.length - 1)
    let moving = false
    for (const L of LEAVES) {
      let target = L.pressT
      if (down && down.L === L && performance.now() - down.t > 150) target = 2.4
      if (S.reduced) L.press = target
      else {
        const building = target > L.press
        const k = building ? 9 : 55, z = building ? 1 : 0.3
        const c = 2 * Math.sqrt(k) * z
        L.pv += ((target - L.press) * k - L.pv * c) * dt
        L.press += L.pv * dt
        if (Math.abs(L.pv) > 0.01 || Math.abs(target - L.press) > 0.01) moving = true
      }
    }
    weights(); sumW(root)
    const b = frameBox(); layout(root, b.x, b.y, b.w, b.h)
    for (const L of LEAVES) if (renderLeaf(L, dt)) moving = true
    if (mk.value) mk.value.style.left = `calc(${(attention / (WORDS.length - 1)) * 100}% - 4px)`
    const lead = LEAVES.reduce((a, b2) => (b2.w > a.w ? b2 : a), LEAVES[0]!)
    if (lead !== lastLead) { lastLead = lead; say(`${lead.text} ${copy.value.lab.weight_holds}`) }
    return moving || !!down
  })
  addEventListener('pointermove', onMove, { passive: true })
  addEventListener('pointerup', release)
  addEventListener('pointercancel', release)
})
onBeforeUnmount(() => { removeEventListener('pointermove', onMove); removeEventListener('pointerup', release); removeEventListener('pointercancel', release) })
defineExpose({ axis })
</script>

<template>
  <div class="study study-weight">
    <h1 class="u-sr">{{ copy.lab.studies.weight.name }} — {{ copy.lab.studies.weight.note }}</h1>
    <div ref="fieldEl" class="field" lang="en">
      <button v-for="L in LEAVES" :key="L.text" class="cell" type="button" :aria-label="L.text" @pointerdown="onDown($event, L)" @keydown="onKey($event, L)">
        <span class="t">{{ L.text }}</span>
      </button>
    </div>
    <div class="head">
      <span class="no">01</span><span class="nm" aria-hidden="true" lang="en">{{ copy.lab.studies.weight.name }}</span>
      <p>{{ copy.lab.studies.weight.prim }}</p>
    </div>
    <NuxtLink class="back" :to="path('/lab')">← {{ copy.lab.back }}</NuxtLink>
    <div ref="scaleEl" class="scale" aria-hidden="true"><span class="rule" /><i v-for="i in WORDS.length" :key="i" :style="{ left: `calc(${((i - 1) / (WORDS.length - 1)) * 100}% - ${i === WORDS.length ? 1 : 0}px)` }" /><span ref="mk" class="mk" /></div>
    <div ref="track" class="track" />
    <p class="u-sr" role="status">{{ status }}</p>
  </div>
</template>

<style>
.study-weight .field { position: fixed; inset: 0; z-index: 2; }
.study-weight .cell {
  position: absolute; left: 0; top: 0; margin: 0; overflow: visible; background: transparent; border: 0; padding: 0; color: var(--ink);
  font-family: 'Archivo Var', system-ui, sans-serif; line-height: 1; display: block; text-align: left; cursor: default;
  -webkit-tap-highlight-color: transparent; touch-action: pan-y;
}
.study-weight .cell .t { position: absolute; left: 0; top: 0; white-space: nowrap; transform-origin: 0 0; }
.study-weight .cell::after { content: ''; position: absolute; inset: 0; border-right: 1px solid rgb(18 18 18 / 0.14); border-bottom: 1px solid rgb(18 18 18 / 0.14); pointer-events: none; }
.study-weight .cell:focus-visible { outline: 2px solid var(--ink); outline-offset: -3px; }
.study-weight .head { position: fixed; left: var(--pad); top: calc(var(--strip) + 18px); z-index: 4; }
.study-weight .head .no { font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; color: var(--ink-muted); margin-right: 9px; vertical-align: 3px; }
.study-weight .head .nm { font-family: 'Archivo Var', system-ui, sans-serif; font-weight: 500; font-size: 24px; letter-spacing: -0.01em; }
.study-weight .head p { margin: 5px 0 0; font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-muted); }
.study .back { position: fixed; right: var(--pad); top: calc(var(--strip) + 18px); z-index: 4; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-muted); text-decoration: none; padding: 6px 0; }
.study .back:hover, .study .back:focus-visible { color: var(--ink); text-decoration: underline; }
.study-weight .scale { position: fixed; left: var(--pad); right: var(--pad); z-index: 4; height: 12px; }
.study-weight .scale .rule { position: absolute; left: 0; right: 0; top: 5px; height: 1px; background: rgb(18 18 18 / 0.22); }
.study-weight .scale i { position: absolute; top: 0; width: 1px; height: 11px; background: rgb(18 18 18 / 0.3); }
.study-weight .scale .mk { position: absolute; top: 1.5px; width: 8px; height: 8px; background: var(--ink); }
.study .track { position: relative; width: 100%; }
@media (max-width: 760px) { .study-weight .head .nm { font-size: 20px; } }
@media (max-height: 470px) { .study-weight .head p { display: none; } .study-weight .head .nm { font-size: 17px; } }
</style>
